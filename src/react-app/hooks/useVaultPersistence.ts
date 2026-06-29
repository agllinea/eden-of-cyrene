import { useCallback, useEffect, useState } from "react";

import type { CacheState } from "@/domain/status";
import type { Vault, VaultFile } from "@/domain/types";
import type { SessionCrypto } from "@/services/cryptoVault";
import { getProvider, readCacheMeta } from "@/services/storage";

import type { AppPhase } from "./phase";

interface PersistenceArgs {
	vault: Vault;
	session: SessionCrypto;
	phase: AppPhase;
}

/** Owns the browser-cache lifecycle: mount probe, debounced autosave, export. */
export function useVaultPersistence({ vault, session, phase }: PersistenceArgs) {
	const [cacheEnabled, setCacheEnabled] = useState(true);
	const [cacheState, setCacheState] = useState<CacheState>({ status: "idle" });

	useEffect(() => {
		readCacheMeta()
			.then((meta) =>
				setCacheState(
					meta
						? { status: "available", savedAt: meta.savedAt }
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

	// Debounced autosave; only the cheap AES-GCM path runs (session caches keys).
	useEffect(() => {
		if (!cacheEnabled || phase !== "ready") return;
		const timeout = window.setTimeout(() => void saveToCache(), 400);
		return () => window.clearTimeout(timeout);
	}, [cacheEnabled, phase, saveToCache]);

	const downloadVault = useCallback(async () => {
		await getProvider("download").save(vault, session);
	}, [vault, session]);

	const loadCached = useCallback(
		(): Promise<VaultFile | null> => getProvider("browser-cache").load(),
		[],
	);

	return {
		cacheEnabled,
		setCacheEnabled,
		cacheState,
		downloadVault,
		loadCached,
	};
}

export type VaultPersistence = ReturnType<typeof useVaultPersistence>;
