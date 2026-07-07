import { useCallback, useEffect, useState } from "react";

import type { CacheState } from "@/domain/status";
import type { Vault } from "@/domain/types";
import { hasContentDiverged } from "@/domain/vaultMerge";
import type { SessionCrypto } from "@/services/cryptoVault";
import { getProvider, readCacheMeta } from "@/services/storage";
import {
	getDriveFileId,
	isSignedIn,
	saveToDrive,
	type DriveState,
} from "@/services/googleDrive";
import { reconcileWithDrive } from "@/services/vaultSync";

import type { AppPhase } from "./phase";

interface PersistenceArgs {
	vault: Vault;
	session: SessionCrypto;
	phase: AppPhase;
	/** Applies a vault merged in from Drive during a push so the UI reflects it too. */
	onMergedFromRemote: (vault: Vault) => void;
}

/** Owns the browser-cache and Google Drive lifecycle: mount probe, debounced autosave, export. */
export function useVaultPersistence({ vault, session, phase, onMergedFromRemote }: PersistenceArgs) {
	const [cacheEnabled, setCacheEnabled] = useState(true);
	const [cacheState, setCacheState] = useState<CacheState>({ status: "idle" });

	const [driveLinked, setDriveLinked] = useState(() => !!getDriveFileId(vault.createdAt));
	const [driveState, setDriveState] = useState<DriveState>("idle");

	// Re-derive driveLinked when the vault identity changes (new vault opened).
	// Adjusting state during render (React's recommended alternative to a
	// setState-in-effect) avoids a render with the stale link status.
	const [seenCreatedAt, setSeenCreatedAt] = useState(vault.createdAt);
	if (vault.createdAt !== seenCreatedAt) {
		setSeenCreatedAt(vault.createdAt);
		setDriveLinked(!!getDriveFileId(vault.createdAt));
	}

	// Called from useVaultApp after linkVaultToDrive or unlinkVaultFromDrive.
	const refreshDriveLink = useCallback((vaultId: string) => {
		setDriveLinked(!!getDriveFileId(vaultId));
	}, []);

	useEffect(() => {
		readCacheMeta()
			.then((meta) =>
				setCacheState(
					meta
						? { status: "available", count: meta.count }
						: { status: "none" },
				),
			)
			.catch(() => setCacheState({ status: "unavailable" }));
	}, []);

	const saveToCache = useCallback(async () => {
		setCacheState({ status: "saving" });
		try {
			await getProvider("browser-cache").save(vault, session);
			setCacheState({ status: "saved" });
		} catch {
			setCacheState({ status: "error" });
		}
	}, [vault, session]);

	// Cache autosave: 400 ms debounce (cheap AES-GCM path; session caches keys).
	useEffect(() => {
		if (!cacheEnabled || phase !== "ready") return;
		const timeout = window.setTimeout(() => void saveToCache(), 400);
		return () => window.clearTimeout(timeout);
	}, [cacheEnabled, phase, saveToCache]);

	const runDriveSave = useCallback(async () => {
		if (!driveLinked || !isSignedIn()) return;
		setDriveState("syncing");
		try {
			const fileId = getDriveFileId(vault.createdAt);
			if (fileId) {
				// Merge in whatever's currently on Drive before overwriting it, so a
				// concurrent edit from another device isn't silently clobbered.
				const merged = await reconcileWithDrive(vault, fileId, session);
				if (hasContentDiverged(merged, vault)) {
					onMergedFromRemote(merged);
					await saveToDrive(merged, session);
				} else {
					await saveToDrive(vault, session);
				}
			} else {
				await saveToDrive(vault, session);
			}
			setDriveState("synced");
		} catch {
			setDriveState("error");
		}
	}, [vault, session, driveLinked, onMergedFromRemote]);

	// Drive autosave: 30 s debounce, only when vault is linked to a Drive file.
	useEffect(() => {
		if (phase !== "ready" || !driveLinked) return;
		const timeout = window.setTimeout(() => void runDriveSave(), 30_000);
		return () => window.clearTimeout(timeout);
	}, [phase, driveLinked, runDriveSave]);

	const downloadVault = useCallback(async () => {
		await getProvider("download").save(vault, session);
	}, [vault, session]);

	return {
		cacheEnabled,
		setCacheEnabled,
		cacheState,
		driveLinked,
		driveState,
		forceDriveSync: runDriveSave,
		refreshDriveLink,
		downloadVault,
	};
}

export type VaultPersistence = ReturnType<typeof useVaultPersistence>;
