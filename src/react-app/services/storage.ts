import type { EncryptionSettings, Vault, VaultFile } from "../domain/types";
import { parseVaultFile, serializeVaultFile } from "./cryptoVault";

const databaseName = "eden-of-cyrene";
const storeName = "vault-cache";
const cacheKey = "active-vault";

export type StoredVaultSnapshot = {
	fileName: string;
	text: string;
	savedAt: string;
};

export interface VaultStorageProvider {
	id: string;
	label: string;
	load(): Promise<VaultFile | null>;
	save(vault: Vault, settings: EncryptionSettings): Promise<void>;
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
		const request = indexedDB.open(databaseName, 1);

		request.onupgradeneeded = () => {
			request.result.createObjectStore(storeName);
		};
		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
	});
}

async function withStore<T>(
	mode: IDBTransactionMode,
	run: (store: IDBObjectStore) => IDBRequest<T>,
) {
	const database = await openDatabase();

	return new Promise<T>((resolve, reject) => {
		const transaction = database.transaction(storeName, mode);
		const request = run(transaction.objectStore(storeName));

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);
		transaction.oncomplete = () => database.close();
		transaction.onerror = () => {
			database.close();
			reject(transaction.error);
		};
	});
}

export class BrowserCacheProvider implements VaultStorageProvider {
	id = "browser-cache";
	label = "浏览器缓存";

	async load() {
		const snapshot = await readCachedSnapshot();
		return snapshot ? parseVaultFile(snapshot.text) : null;
	}

	async save(vault: Vault, settings: EncryptionSettings) {
		await writeCachedSnapshot({
			fileName: `${vault.name || "eden-vault"}.eden.json`,
			text: await serializeVaultFile(vault, settings),
			savedAt: new Date().toISOString(),
		});
	}
}

export class DownloadFileProvider implements VaultStorageProvider {
	id = "download";
	label = "文件下载";

	async load() {
		return null;
	}

	async save(vault: Vault, settings: EncryptionSettings) {
		const text = await serializeVaultFile(vault, settings);
		downloadTextFile(`${vault.name || "eden-vault"}.eden.json`, text);
	}
}

export async function readUploadedVault(file: File) {
	const text = await file.text();
	return parseVaultFile(text);
}

export async function readCachedSnapshot() {
	return withStore<StoredVaultSnapshot | undefined>("readonly", (store) =>
		store.get(cacheKey),
	);
}

export async function writeCachedSnapshot(snapshot: StoredVaultSnapshot) {
	await withStore<IDBValidKey>("readwrite", (store) =>
		store.put(snapshot, cacheKey),
	);
}

export async function cacheVaultText(fileName: string, text: string) {
	await writeCachedSnapshot({
		fileName,
		text,
		savedAt: new Date().toISOString(),
	});
}

export const storageProviders = [
	new BrowserCacheProvider(),
	new DownloadFileProvider(),
] satisfies VaultStorageProvider[];
