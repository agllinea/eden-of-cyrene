import type { MessageKey } from "@/i18n";
import type { Vault, VaultFile } from "@/domain/types";
import {
	openAttachment,
	parseVaultFile,
	sealAttachment,
	serializeVaultWithSession,
	type SealedAttachment,
	type SessionCrypto,
} from "./cryptoVault";

const databaseName = "eden-of-cyrene";
const docStore = "vault-cache";
const attachmentStore = "vault-attachments";
const cacheKey = "active-vault";

// The cached document keeps attachments stripped (dataUrl removed); their blobs
// live in a separate object store keyed by attachment id. This keeps the
// autosave hot path small. Download/cloud always produce a single inlined file.
type CachedVaultRecord = {
	fileName: string;
	text: string; // serialized light VaultFile (attachments stripped)
	attachmentIds: string[];
	epoch: string; // session epoch the blobs were sealed under
	savedAt: string;
};

export type CacheMeta = { savedAt: string };

function vaultFileName(vault: Vault) {
	return `${vault.name || "eden-vault"}.eden.json`;
}

function downloadTextFile(fileName: string, text: string) {
	const blob = new Blob([text], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = fileName;
	anchor.click();
	URL.revokeObjectURL(url);
}

function openDatabase() {
	return new Promise<IDBDatabase>((resolve, reject) => {
		const request = indexedDB.open(databaseName, 2);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(docStore)) {
				db.createObjectStore(docStore);
			}
			if (!db.objectStoreNames.contains(attachmentStore)) {
				db.createObjectStore(attachmentStore);
			}
		};
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

async function withStore<T>(
	store: string,
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
) {
	const database = await openDatabase();

	return new Promise<T>((resolve, reject) => {
		const transaction = database.transaction(store, mode);
		const request = run(transaction.objectStore(store));

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		transaction.oncomplete = () => database.close();
		transaction.onerror = () => {
			database.close();
			reject(transaction.error);
		};
	});
}

async function readRecord() {
	return withStore<CachedVaultRecord | undefined>(docStore, "readonly", (store) =>
		store.get(cacheKey),
	);
}

// ── Attachment splitting ──────────────────────────────────────────────────────

function stripAttachments(vault: Vault): {
	light: Vault;
	blobs: Map<string, string>;
} {
	const blobs = new Map<string, string>();
	const entries = vault.entries.map((entry) => ({
		...entry,
		attachments: entry.attachments.map((att) => {
			if (att.dataUrl) blobs.set(att.id, att.dataUrl);
			return { ...att, dataUrl: "" };
		}),
	}));
	return { light: { ...vault, entries }, blobs };
}

async function persistAttachments(
	blobs: Map<string, string>,
	session: SessionCrypto,
	previousEpoch: string | undefined,
) {
	const existing = new Set(
		await withStore<IDBValidKey[]>(attachmentStore, "readonly", (store) =>
			store.getAllKeys(),
		),
	);
	// On key rotation, blobs sealed under the old key are unreadable — re-seal all.
	const rotated = previousEpoch !== session.epoch;

	for (const [id, dataUrl] of blobs) {
		if (rotated || !existing.has(id)) {
			const sealed = await sealAttachment(dataUrl, session);
			await withStore(attachmentStore, "readwrite", (store) =>
				store.put(sealed, id),
			);
		}
	}
	// Prune blobs no longer referenced.
	for (const key of existing) {
		if (!blobs.has(key as string)) {
			await withStore(attachmentStore, "readwrite", (store) =>
				store.delete(key),
			);
		}
	}
}

/** Rehydrate stripped attachments back into the vault after load/unlock. */
export async function hydrateAttachments(
	vault: Vault,
	session: SessionCrypto,
): Promise<Vault> {
	const needsHydration = vault.entries.some((entry) =>
		entry.attachments.some((att) => !att.dataUrl),
	);
	if (!needsHydration) return vault;

	const entries = await Promise.all(
		vault.entries.map(async (entry) => ({
			...entry,
			attachments: await Promise.all(
				entry.attachments.map(async (att) => {
					if (att.dataUrl) return att;
					const sealed = await withStore<SealedAttachment | undefined>(
						attachmentStore,
						"readonly",
						(store) => store.get(att.id),
					);
					if (!sealed) return att;
					return { ...att, dataUrl: await openAttachment(sealed, session) };
				}),
			),
		})),
	);

	return { ...vault, entries };
}

// ── Public cache API ──────────────────────────────────────────────────────────

export async function saveVaultToCache(
	vault: Vault,
	session: SessionCrypto,
): Promise<string> {
	const previous = await readRecord();
	const { light, blobs } = stripAttachments(vault);
	const text = await serializeVaultWithSession(light, session);

	await persistAttachments(blobs, session, previous?.epoch);

	const savedAt = new Date().toISOString();
	await withStore(docStore, "readwrite", (store) =>
		store.put(
			{
				fileName: vaultFileName(vault),
				text,
				attachmentIds: [...blobs.keys()],
				epoch: session.epoch,
				savedAt,
			} satisfies CachedVaultRecord,
			cacheKey,
		),
	);
	return savedAt;
}

export async function readCacheMeta(): Promise<CacheMeta | null> {
	const record = await readRecord();
	return record ? { savedAt: record.savedAt } : null;
}

export async function readUploadedVault(file: File) {
	const text = await file.text();
	return parseVaultFile(text);
}

// ── Storage providers (looked up by id, never by index) ──────────────────────

export interface VaultStorageProvider {
	id: string;
	labelKey: MessageKey;
	load(): Promise<VaultFile | null>;
	save(vault: Vault, session: SessionCrypto): Promise<void>;
}

export class BrowserCacheProvider implements VaultStorageProvider {
	id = "browser-cache";
	labelKey = "login.useCache.title" as const;

	async load() {
		const record = await readRecord();
		return record ? parseVaultFile(record.text) : null;
	}

	async save(vault: Vault, session: SessionCrypto) {
		await saveVaultToCache(vault, session);
	}
}

export class DownloadFileProvider implements VaultStorageProvider {
	id = "download";
	labelKey = "settings.download" as const;

	async load() {
		return null;
	}

	async save(vault: Vault, session: SessionCrypto) {
		const text = await serializeVaultWithSession(vault, session);
		downloadTextFile(vaultFileName(vault), text);
	}
}

const providers: VaultStorageProvider[] = [
	new BrowserCacheProvider(),
	new DownloadFileProvider(),
];

export function getProvider(id: string): VaultStorageProvider {
	const provider = providers.find((item) => item.id === id);
	if (!provider) throw new Error(`Unknown storage provider: ${id}`);
	return provider;
}
