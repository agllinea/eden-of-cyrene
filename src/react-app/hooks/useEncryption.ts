import { useCallback, useState } from "react";

import type {
	EncryptedVault,
	EncryptionSettings,
	SecurityQuestion,
} from "@/domain/types";
import {
	createSession,
	noEncryptionSession,
	sessionFromUnlocked,
	type SessionCrypto,
} from "@/services/cryptoVault";

const defaultSettings: EncryptionSettings = { mode: "none" };

/**
 * Owns encryption intent (`settings`) and the cached crypto session.
 * The session caches derived keys so autosave never re-runs PBKDF2 (#5);
 * it is rebuilt only when settings change or adopted from an unlocked file.
 */
export function useEncryption() {
	const [settings, setSettings] = useState<EncryptionSettings>(defaultSettings);
	const [session, setSession] = useState<SessionCrypto>(() =>
		noEncryptionSession(),
	);

	const usePlain = useCallback(() => {
		setSettings(defaultSettings);
		setSession(noEncryptionSession());
	}, []);

	/** Rebuilds the session from settings (runs PBKDF2). Throws on empty secret. */
	const applySettings = useCallback(async (next: EncryptionSettings) => {
		const nextSession = await createSession(next);
		setSettings(next);
		setSession(nextSession);
		return nextSession;
	}, []);

	/** Adopts a just-unlocked file's session (no PBKDF2) and records intent. */
	const adoptUnlocked = useCallback(
		(
			file: EncryptedVault,
			vaultKey: CryptoKey,
			intent: EncryptionSettings,
		) => {
			const nextSession = sessionFromUnlocked(file, vaultKey);
			setSession(nextSession);
			setSettings(intent);
			return nextSession;
		},
		[],
	);

	const updateSecurityQuestion = useCallback(
		(
			id: string,
			field: keyof SecurityQuestion | "answer",
			value: string,
		) => {
			setSettings((prev) =>
				prev.mode !== "encrypted"
					? prev
					: {
							...prev,
							securityQuestions: prev.securityQuestions.map((item) =>
								item.id === id ? { ...item, [field]: value } : item,
							),
						},
			);
		},
		[],
	);

	return {
		settings,
		setSettings,
		session,
		usePlain,
		applySettings,
		adoptUnlocked,
		updateSecurityQuestion,
	};
}

export type EncryptionController = ReturnType<typeof useEncryption>;
