import { useCallback, useEffect, useState } from "react";

import type { CacheState } from "@/domain/status";
import type { Vault } from "@/domain/types";
import type { SessionCrypto } from "@/services/cryptoVault";
import { getProvider, readCacheMeta } from "@/services/storage";
import {
	getDriveFileId,
	isSignedIn,
	saveToDrive,
	type DriveState,
} from "@/services/googleDrive";

import type { AppPhase } from "./phase";

interface PersistenceArgs {
	vault: Vault;
	session: SessionCrypto;
	phase: AppPhase;
}

/** Owns the browser-cache and Google Drive lifecycle: mount probe, debounced autosave, export. */
export function useVaultPersistence({ vault, session, phase }: PersistenceArgs) {
	const [cacheEnabled, setCacheEnabled] = useState(true);
	const [cacheState, setCacheState] = useState<CacheState>({ status: "idle" });

	const [driveLinked, setDriveLinked] = useState(() => !!getDriveFileId(vault.createdAt));
	const [driveState, setDriveState] = useState<DriveState>("idle");

	// Sync driveLinked whenever the vault identity changes (new vault opened).
	useEffect(() => {
		setDriveLinked(!!getDriveFileId(vault.createdAt));
	}, [vault.createdAt]);

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
			await saveToDrive(vault, session);
			setDriveState("synced");
		} catch {
			setDriveState("error");
		}
	}, [vault, session, driveLinked]);

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
