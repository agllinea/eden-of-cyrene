import { mergeVaults } from "@/domain/vaultMerge";
import type { Vault } from "@/domain/types";

import { decryptVaultWithSession, isEncryptedVault, type SessionCrypto } from "./cryptoVault";
import { hydrateAttachments, loadCachedVault } from "./storage";
import { loadDriveVault } from "./googleDrive";

/**
 * Reconciles a vault just loaded from Drive against whatever this device has
 * cached locally under the same identity (`vault.createdAt`). Returns
 * `remote` unchanged if there's no local counterpart (fresh device — today's
 * behavior).
 */
export async function reconcileWithLocalCache(
	remote: Vault,
	session: SessionCrypto,
): Promise<Vault> {
	const cachedFile = await loadCachedVault(remote.createdAt);
	if (!cachedFile) return remote;

	const cachedVault = isEncryptedVault(cachedFile)
		? await decryptVaultWithSession(cachedFile, session)
		: cachedFile;
	const hydrated = await hydrateAttachments(cachedVault, session, remote.createdAt);

	return mergeVaults(remote, hydrated);
}

/**
 * Reconciles the current in-memory vault against whatever is currently on
 * Drive before pushing, so a concurrent edit on another device isn't
 * silently overwritten.
 */
export async function reconcileWithDrive(
	local: Vault,
	fileId: string,
	session: SessionCrypto,
): Promise<Vault> {
	const remoteFile = await loadDriveVault(fileId);
	const remoteVault = isEncryptedVault(remoteFile)
		? await decryptVaultWithSession(remoteFile, session)
		: remoteFile;
	const hydrated = await hydrateAttachments(remoteVault, session, local.createdAt);

	return mergeVaults(local, hydrated);
}
