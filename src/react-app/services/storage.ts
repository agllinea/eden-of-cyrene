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

// Key used by the pre-multi-vault version of this app. Records stored under
// this key have no `vaultId` field and their attachments are stored without a
// vault-id prefix. We keep recognising them for backward compatibility.
const legacyCacheKey = "active-vault";
export const LEGACY_VAULT_ID = "__legacy__";

// New multi-vault format. Each vault is stored at key = vaultId (vault.createdAt).
// Attachment blobs are stored at "${vaultId}/${attachmentId}".
type CachedVaultRecord = {
	vaultId: string;
	vaultName: string;
	fileName: string;
	text: string; // serialized light VaultFile (attachments stripped)
	attachmentIds: string[];
	epoch: string; // session epoch the blobs were sealed under
	savedAt: string;
};

export type CacheEntryMeta = {
	vaultId: string; // LEGACY_VAULT_ID for old-format records
	vaultName: string;
	fileName: string;
	savedAt: string;
};

export type CacheMeta = { count: number };

function vaultFileName(vault: Vault) {
	return `${vault.name || "eden-vault"}.eden.json`;
}

function attachmentKey(vaultId: string, attachmentId: string) {
	return `${vaultId}/${attachmentId}`;
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

// Fetches all keys and all values from a store in a single transaction,
// guaranteeing the two arrays are index-aligned.
async function getAllFromStore<T = unknown>(
	storeName: string,
): Promise<{ keys: string[]; records: T[] }> {
	const database = await openDatabase();
	return new Promise((resolve, reject) => {
		const tx = database.transaction(storeName, "readonly");
		const store = tx.objectStore(storeName);

		let keys: string[] | undefined;
		let records: T[] | undefined;

		const keysReq = store.getAllKeys();
		keysReq.onsuccess = () => { keys = keysReq.result as string[]; };

		const valsReq = store.getAll();
		valsReq.onsuccess = () => { records = valsReq.result as T[]; };

		tx.oncomplete = () => {
			database.close();
			resolve({ keys: keys ?? [], records: records ?? [] });
		};
		tx.onerror = () => {
			database.close();
			reject(tx.error);
		};
	});
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

async function persistVaultAttachments(
	vaultId: string,
	blobs: Map<string, string>,
	session: SessionCrypto,
	previousEpoch: string | undefined,
) {
	const prefix = `${vaultId}/`;
	const allKeys = await withStore<IDBValidKey[]>(attachmentStore, "readonly", (store) =>
		store.getAllKeys(),
	);
	// Only consider attachment keys that belong to this vault.
	const vaultAttKeys = (allKeys as string[]).filter((k) => k.startsWith(prefix));
	const existing = new Set(vaultAttKeys.map((k) => k.slice(prefix.length)));
	const rotated = previousEpoch !== session.epoch;

	for (const [id, dataUrl] of blobs) {
		if (rotated || !existing.has(id)) {
			const sealed = await sealAttachment(dataUrl, session);
			await withStore(attachmentStore, "readwrite", (store) =>
				store.put(sealed, attachmentKey(vaultId, id)),
			);
		}
	}
	// Prune blobs no longer referenced by this vault.
	for (const id of existing) {
		if (!blobs.has(id)) {
			await withStore(attachmentStore, "readwrite", (store) =>
				store.delete(attachmentKey(vaultId, id)),
			);
		}
	}
}

/** Rehydrate stripped attachments back into the vault after load/unlock.
 *
 *  `vaultId` selects how attachment keys are looked up:
 *  - `null` or `LEGACY_VAULT_ID`: old format — keys are plain attachment IDs
 *  - any other string: new format — keys are `"${vaultId}/${attachmentId}"`
 */
export async function hydrateAttachments(
	vault: Vault,
	session: SessionCrypto,
	vaultId: string | null,
): Promise<Vault> {
	const needsHydration = vault.entries.some((entry) =>
		entry.attachments.some((att) => !att.dataUrl),
	);
	if (!needsHydration) return vault;

	const isLegacy = !vaultId || vaultId === LEGACY_VAULT_ID;

	const entries = await Promise.all(
		vault.entries.map(async (entry) => ({
			...entry,
			attachments: await Promise.all(
				entry.attachments.map(async (att) => {
					if (att.dataUrl) return att;
					const key = isLegacy ? att.id : attachmentKey(vaultId!, att.id);
					const sealed = await withStore<SealedAttachment | undefined>(
						attachmentStore,
						"readonly",
						(store) => store.get(key),
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

export async function listCachedVaults(): Promise<CacheEntryMeta[]> {
	const { keys, records } = await getAllFromStore<CachedVaultRecord>(docStore);

	const metas: CacheEntryMeta[] = records.map((record, i) => {
		const key = keys[i];
		if (key === legacyCacheKey) {
			return {
				vaultId: LEGACY_VAULT_ID,
				vaultName: record.vaultName ?? record.fileName.replace(".eden.json", ""),
				fileName: record.fileName,
				savedAt: record.savedAt,
			};
		}
		return {
			vaultId: record.vaultId ?? key,
			vaultName: record.vaultName ?? record.fileName.replace(".eden.json", ""),
			fileName: record.fileName,
			savedAt: record.savedAt,
		};
	});

	// Most recently saved first.
	return metas.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function loadCachedVault(vaultId: string): Promise<VaultFile | null> {
	const storeKey = vaultId === LEGACY_VAULT_ID ? legacyCacheKey : vaultId;
	const record = await withStore<CachedVaultRecord | undefined>(docStore, "readonly", (store) =>
		store.get(storeKey),
	);
	return record ? parseVaultFile(record.text) : null;
}

export async function deleteCachedVault(vaultId: string): Promise<void> {
	const storeKey = vaultId === LEGACY_VAULT_ID ? legacyCacheKey : vaultId;
	const record = await withStore<CachedVaultRecord | undefined>(docStore, "readonly", (store) =>
		store.get(storeKey),
	);
	if (!record) return;

	// Delete associated attachment blobs.
	const isLegacy = vaultId === LEGACY_VAULT_ID;
	for (const id of record.attachmentIds ?? []) {
		const key = isLegacy ? id : attachmentKey(vaultId, id);
		await withStore(attachmentStore, "readwrite", (store) => store.delete(key));
	}

	await withStore(docStore, "readwrite", (store) => store.delete(storeKey));
}

export async function saveVaultToCache(
	vault: Vault,
	session: SessionCrypto,
): Promise<string> {
	const vaultId = vault.createdAt; // stable identity for this vault
	const previous = await withStore<CachedVaultRecord | undefined>(docStore, "readonly", (store) =>
		store.get(vaultId),
	);
	const { light, blobs } = stripAttachments(vault);
	const text = await serializeVaultWithSession(light, session);

	await persistVaultAttachments(vaultId, blobs, session, previous?.epoch);

	const savedAt = new Date().toISOString();
	await withStore(docStore, "readwrite", (store) =>
		store.put(
			{
				vaultId,
				vaultName: vault.name,
				fileName: vaultFileName(vault),
				text,
				attachmentIds: [...blobs.keys()],
				epoch: session.epoch,
				savedAt,
			} satisfies CachedVaultRecord,
			vaultId,
		),
	);
	return savedAt;
}

export async function readCacheMeta(): Promise<CacheMeta | null> {
	const vaults = await listCachedVaults();
	return vaults.length > 0 ? { count: vaults.length } : null;
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
		return null; // use loadCachedVault(vaultId) instead
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
