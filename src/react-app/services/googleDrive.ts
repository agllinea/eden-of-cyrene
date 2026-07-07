import { parseVaultFile, serializeVaultWithSession, type SessionCrypto } from "./cryptoVault";
import type { Vault, VaultFile } from "@/domain/types";
import type { VaultStorageProvider } from "./storage";

const CLIENT_ID = "1004828199991-e8aaj928uae4orl3ugki1ghqteu2klms.apps.googleusercontent.com";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const MAPPING_KEY = "eden-of-cyrene:drive-file-ids";
const ACCOUNT_KEY = "eden-of-cyrene:account-email";
const SESSION_TOKEN_KEY = "eden-of-cyrene:access-token";
const SESSION_EXPIRY_KEY = "eden-of-cyrene:token-expiry";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriveState = "idle" | "syncing" | "synced" | "error";

export type DriveEntryMeta = {
	fileId: string;
	name: string; // display name (filename without .eden.json)
	fileName: string;
	modifiedTime: string;
};

// ── localStorage: vault.createdAt → Drive file ID ────────────────────────────

const driveFileIds: Map<string, string> = (() => {
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

// ── Account email cache (localStorage — survives browser close) ───────────────

function getCachedEmail(): string | null {
	try { return localStorage.getItem(ACCOUNT_KEY); } catch { return null; }
}
function setCachedEmail(email: string) {
	try { localStorage.setItem(ACCOUNT_KEY, email); } catch { /* localStorage unavailable */ }
}
function clearCachedEmail() {
	try { localStorage.removeItem(ACCOUNT_KEY); } catch { /* localStorage unavailable */ }
}

export function getCachedAccountEmail(): string | null { return getCachedEmail(); }

async function fetchAndCacheEmail(accessToken: string): Promise<void> {
	try {
		const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		if (res.ok) {
			const data = await res.json() as { email?: string };
			if (data.email) setCachedEmail(data.email);
		}
	} catch { /* best-effort email fetch; ignore network/auth failures */ }
}

// ── Access token cache (sessionStorage — survives page refresh, not tab close) ─

function saveSessionToken(value: string, expiresAt: number) {
	try {
		sessionStorage.setItem(SESSION_TOKEN_KEY, value);
		sessionStorage.setItem(SESSION_EXPIRY_KEY, String(expiresAt));
	} catch { /* sessionStorage unavailable */ }
}

function loadSessionToken(): { value: string; expiresAt: number } | null {
	try {
		const value = sessionStorage.getItem(SESSION_TOKEN_KEY);
		const expiresAt = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY));
		if (value && expiresAt && Date.now() < expiresAt) return { value, expiresAt };
	} catch { /* sessionStorage unavailable */ }
	return null;
}

function clearSessionToken() {
	try {
		sessionStorage.removeItem(SESSION_TOKEN_KEY);
		sessionStorage.removeItem(SESSION_EXPIRY_KEY);
	} catch { /* sessionStorage unavailable */ }
}

// ── Google Identity Services (GIS) ────────────────────────────────────────────

// Minimal type surface for the GIS token client.
type GsiTokenClient = { requestAccessToken: (override?: { prompt?: string; hint?: string }) => void };
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
let activeToken: { value: string; expiresAt: number } | null = loadSessionToken();
let pendingAuth: { resolve: (t: string) => void; reject: (e: Error) => void } | null = null;
// Dedupes concurrent signIn() calls (e.g. manual sync + the 30s autosave firing
// close together) into a single OAuth request, so a second caller doesn't
// overwrite `pendingAuth` and strand the first caller's promise forever.
let inFlightAuth: Promise<string> | null = null;
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
				saveSessionToken(activeToken.value, activeToken.expiresAt);
				pendingAuth?.resolve(resp.access_token);
				void fetchAndCacheEmail(resp.access_token);
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
	clearSessionToken();
}

/**
 * Triggers Google OAuth. On first sign-in (no cached email) shows the account
 * picker. On subsequent calls uses the cached email as a hint so the browser
 * can auto-select the right account. Pass `forceSelectAccount = true` to always
 * show the picker (used by the "switch account" flow).
 */
export async function signIn(forceSelectAccount = false): Promise<string> {
	if (!forceSelectAccount && activeToken && Date.now() < activeToken.expiresAt) return activeToken.value;
	if (inFlightAuth) return inFlightAuth;

	inFlightAuth = requestToken(forceSelectAccount).finally(() => {
		inFlightAuth = null;
	});
	return inFlightAuth;
}

async function requestToken(forceSelectAccount: boolean): Promise<string> {
	await loadGsi();
	return new Promise<string>((resolve, reject) => {
		pendingAuth = { resolve, reject };
		tokenClient ??= buildTokenClient();
		if (forceSelectAccount) {
			clearCachedEmail();
			clearSessionToken();
			activeToken = null;
			tokenClient.requestAccessToken({ prompt: "select_account" });
		} else {
			const hint = getCachedEmail() ?? undefined;
			tokenClient.requestAccessToken(hint ? { hint } : { prompt: "select_account" });
		}
	});
}

async function token(): Promise<string> {
	return signIn(); // returns cached token when valid
}

/** Forces a fresh token request, bypassing the (now-rejected) cached one. */
async function refreshToken(): Promise<string> {
	activeToken = null;
	clearSessionToken();
	return signIn();
}

// ── Drive REST helpers ────────────────────────────────────────────────────────
//
// A 401 means the cached access token expired or was revoked server-side
// (they're short-lived, ~1h). Retried once with a freshly requested token
// before giving up, so a stale token doesn't surface as an opaque sync error.

async function driveFetch(
	url: string,
	buildInit: (accessToken: string) => RequestInit,
): Promise<Response> {
	let t = await token();
	let res = await fetch(url, buildInit(t));
	if (res.status === 401) {
		t = await refreshToken();
		res = await fetch(url, buildInit(t));
	}
	return res;
}

async function driveGet(path: string): Promise<Response> {
	const res = await driveFetch(`${DRIVE_API}${path}`, (t) => ({
		headers: { Authorization: `Bearer ${t}` },
	}));
	if (!res.ok) throw new Error(`Drive GET ${path}: ${res.status}`);
	return res;
}

async function driveCreate(fileName: string, body: string): Promise<string> {
	const res = await driveFetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, (t) => {
		const form = new FormData();
		form.append("metadata", new Blob(
			[JSON.stringify({ name: fileName, mimeType: "application/json" })],
			{ type: "application/json" },
		));
		form.append("media", new Blob([body], { type: "application/json" }));
		return {
			method: "POST",
			headers: { Authorization: `Bearer ${t}` },
			body: form,
		};
	});
	if (!res.ok) throw new Error(`Drive create: ${res.status}`);
	const data = await res.json() as { id: string };
	return data.id;
}

async function driveUpdate(fileId: string, body: string): Promise<void> {
	const res = await driveFetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, (t) => ({
		method: "PATCH",
		headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
		body,
	}));
	if (!res.ok) throw new Error(`Drive update ${fileId}: ${res.status}`);
}

async function driveDeleteReq(fileId: string): Promise<void> {
	const res = await driveFetch(`${DRIVE_API}/files/${fileId}`, (t) => ({
		method: "DELETE",
		headers: { Authorization: `Bearer ${t}` },
	}));
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
	labelKey = "login.useGoogleDrive.title" as const;

	async load(): Promise<VaultFile | null> {
		return null; // use listDriveVaults + loadDriveVault instead
	}

	async save(vault: Vault, session: SessionCrypto): Promise<void> {
		if (!isSignedIn()) return; // don't trigger re-auth on background autosave
		await saveToDrive(vault, session);
	}
}
