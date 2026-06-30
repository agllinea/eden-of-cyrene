import { parseVaultFile, serializeVaultWithSession, type SessionCrypto } from "./cryptoVault";
import type { Vault, VaultFile } from "@/domain/types";
import type { VaultStorageProvider } from "./storage";

const CLIENT_ID = "1004828199991-e8aaj928uae4orl3ugki1ghqteu2klms.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const MAPPING_KEY = "eden-of-cyrene:drive-file-ids";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriveState = "idle" | "syncing" | "synced" | "error";

export type DriveEntryMeta = {
	fileId: string;
	name: string; // display name (filename without .eden.json)
	fileName: string;
	modifiedTime: string;
};

// ── localStorage: vault.createdAt → Drive file ID ────────────────────────────

let driveFileIds: Map<string, string> = (() => {
	try {
		const raw = localStorage.getItem(MAPPING_KEY);
		return raw ? new Map(JSON.parse(raw) as [string, string][]) : new Map();
	} catch {
		return new Map();
	}
})();

function persistMapping() {
	try {
		localStorage.setItem(MAPPING_KEY, JSON.stringify([...driveFileIds]));
	} catch { /* localStorage unavailable */ }
}

export function linkVaultToDrive(vaultCreatedAt: string, fileId: string) {
	driveFileIds.set(vaultCreatedAt, fileId);
	persistMapping();
}

export function getDriveFileId(vaultCreatedAt: string): string | undefined {
	return driveFileIds.get(vaultCreatedAt);
}

export function unlinkVaultFromDrive(vaultCreatedAt: string): void {
	driveFileIds.delete(vaultCreatedAt);
	persistMapping();
}

// ── Google Identity Services (GIS) ────────────────────────────────────────────

// Minimal type surface for the GIS token client.
type GsiTokenClient = { requestAccessToken: () => void };
type GsiTokenResponse = { access_token: string; expires_in: number; error?: string };

declare const google: {
	accounts: {
		oauth2: {
			initTokenClient: (cfg: {
				client_id: string;
				scope: string;
				callback: (r: GsiTokenResponse) => void;
				error_callback?: (e: { type: string }) => void;
			}) => GsiTokenClient;
		};
	};
};

let tokenClient: GsiTokenClient | null = null;
let activeToken: { value: string; expiresAt: number } | null = null;
let pendingAuth: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;
let gsiReady = false;

async function loadGsi(): Promise<void> {
	if (gsiReady || (typeof google !== "undefined" && google.accounts)) {
		gsiReady = true;
		return;
	}
	await new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "https://accounts.google.com/gsi/client";
		script.async = true;
		script.onload = () => { gsiReady = true; resolve(); };
		script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
		document.head.appendChild(script);
	});
}

function buildTokenClient(): GsiTokenClient {
	return google.accounts.oauth2.initTokenClient({
		client_id: CLIENT_ID,
		scope: SCOPE,
		callback: (resp) => {
			if (resp.error || !resp.access_token) {
				pendingAuth?.reject(new Error(resp.error ?? "Auth failed"));
			} else {
				activeToken = {
					value: resp.access_token,
					expiresAt: Date.now() + (resp.expires_in - 60) * 1_000,
				};
				pendingAuth?.resolve(resp.access_token);
			}
			pendingAuth = null;
		},
		error_callback: (err) => {
			pendingAuth?.reject(new Error(err.type));
			pendingAuth = null;
		},
	});
}

export function isSignedIn(): boolean {
	return activeToken !== null && Date.now() < activeToken.expiresAt;
}

export function signOut(): void {
	activeToken = null;
	tokenClient = null;
}

/** Triggers Google OAuth popup. Resolves with the access token. */
export async function signIn(): Promise<string> {
	if (activeToken && Date.now() < activeToken.expiresAt) return activeToken.value;
	await loadGsi();
	return new Promise<string>((resolve, reject) => {
		pendingAuth = { resolve, reject };
		tokenClient ??= buildTokenClient();
		tokenClient.requestAccessToken();
	});
}

async function token(): Promise<string> {
	return signIn(); // returns cached token when valid
}

// ── Drive REST helpers ────────────────────────────────────────────────────────

async function driveGet(path: string): Promise<Response> {
	const t = await token();
	const res = await fetch(`${DRIVE_API}${path}`, {
		headers: { Authorization: `Bearer ${t}` },
	});
	if (!res.ok) throw new Error(`Drive GET ${path}: ${res.status}`);
	return res;
}

async function driveCreate(fileName: string, body: string): Promise<string> {
	const t = await token();
	const form = new FormData();
	form.append("metadata", new Blob(
		[JSON.stringify({ name: fileName, mimeType: "application/json" })],
		{ type: "application/json" },
	));
	form.append("media", new Blob([body], { type: "application/json" }));
	const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
		method: "POST",
		headers: { Authorization: `Bearer ${t}` },
		body: form,
	});
	if (!res.ok) throw new Error(`Drive create: ${res.status}`);
	const data = await res.json() as { id: string };
	return data.id;
}

async function driveUpdate(fileId: string, body: string): Promise<void> {
	const t = await token();
	const res = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
		method: "PATCH",
		headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
		body,
	});
	if (!res.ok) throw new Error(`Drive update ${fileId}: ${res.status}`);
}

async function driveDeleteReq(fileId: string): Promise<void> {
	const t = await token();
	const res = await fetch(`${DRIVE_API}/files/${fileId}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${t}` },
	});
	if (!res.ok && res.status !== 204) throw new Error(`Drive delete ${fileId}: ${res.status}`);
}

// ── Public Drive API ──────────────────────────────────────────────────────────

export async function listDriveVaults(): Promise<DriveEntryMeta[]> {
	const params = new URLSearchParams({
		q: "name contains '.eden.json' and trashed = false",
		fields: "files(id,name,modifiedTime)",
		orderBy: "modifiedTime desc",
		pageSize: "50",
	});
	const res = await driveGet(`/files?${params}`);
	const data = await res.json() as {
		files?: Array<{ id: string; name: string; modifiedTime: string }>;
	};
	return (data.files ?? []).map((f) => ({
		fileId: f.id,
		fileName: f.name,
		name: f.name.replace(/\.eden\.json$/, ""),
		modifiedTime: f.modifiedTime,
	}));
}

export async function loadDriveVault(fileId: string): Promise<VaultFile> {
	const res = await driveGet(`/files/${fileId}?alt=media`);
	const text = await res.text();
	return parseVaultFile(text);
}

export async function deleteDriveVault(fileId: string): Promise<void> {
	await driveDeleteReq(fileId);
	// Remove from local mapping (iterate to find by value)
	for (const [vaultId, fid] of driveFileIds) {
		if (fid === fileId) { driveFileIds.delete(vaultId); break; }
	}
	persistMapping();
}

export async function saveToDrive(vault: Vault, session: SessionCrypto): Promise<void> {
	const body = await serializeVaultWithSession(vault, session);
	const fileName = `${vault.name || "eden-vault"}.eden.json`;
	const existingId = driveFileIds.get(vault.createdAt);

	if (existingId) {
		await driveUpdate(existingId, body);
	} else {
		const newId = await driveCreate(fileName, body);
		linkVaultToDrive(vault.createdAt, newId);
	}
}

// ── Storage provider ──────────────────────────────────────────────────────────

export class GoogleDriveProvider implements VaultStorageProvider {
	id = "google-drive";
	labelKey: "login.useGoogleDrive.title" = "login.useGoogleDrive.title";

	async load(): Promise<VaultFile | null> {
		return null; // use listDriveVaults + loadDriveVault instead
	}

	async save(vault: Vault, session: SessionCrypto): Promise<void> {
		if (!isSignedIn()) return; // don't trigger re-auth on background autosave
		await saveToDrive(vault, session);
	}
}
