import { useState } from "react";

import { msg, type StatusMessage } from "@/domain/status";
import {
	createBlankSecurityQuestion,
	createEmptyVault,
	type EncryptedVault,
	type EncryptionSettings,
	type SecurityQuestion,
	type VaultFile,
} from "@/domain/types";
import { touchVault } from "@/domain/vaultLogic";
import {
	isEncryptedVault,
	noEncryptionSession,
	unlockWithAnswers,
	unlockWithPassword,
} from "@/services/cryptoVault";
import { hydrateAttachments, readUploadedVault } from "@/services/storage";

import type { EncryptionController } from "./useEncryption";
import type { AppPhase, UnlockMode } from "./phase";
import type { VaultDocument } from "./useVaultDocument";
import type { VaultPersistence } from "./useVaultPersistence";

interface AuthFlowArgs {
	setPhase: (phase: AppPhase) => void;
	document: VaultDocument;
	encryption: EncryptionController;
	persistence: VaultPersistence;
	setStatus: (status: StatusMessage | null) => void;
}

/** Owns the login / unlock / setup flow and the transitions into `ready`. */
export function useAuthFlow({
	setPhase,
	document,
	encryption,
	persistence,
	setStatus,
}: AuthFlowArgs) {
	const [lockedVault, setLockedVault] = useState<EncryptedVault | null>(null);
	const [pendingFromCache, setPendingFromCache] = useState(false);
	const [unlockMode, setUnlockMode] = useState<UnlockMode>("password");
	const [unlockPassword, setUnlockPassword] = useState("");
	const [unlockAnswers, setUnlockAnswers] = useState<Record<string, string>>({});
	const [setupVaultName, setSetupVaultName] = useState("");
	const [setupPassword, setSetupPassword] = useState("");
	const [setupQuestions, setSetupQuestions] = useState([
		createBlankSecurityQuestion(),
	]);

	const passwordSlot = lockedVault?.encryption.keySlots.find(
		(slot) => slot.type === "password",
	);
	const securitySlot = lockedVault?.encryption.keySlots.find(
		(slot) => slot.type === "securityQuestions",
	);

	const openVaultFileObject = async (
		vaultFile: VaultFile,
		fromCache: boolean,
		successStatus: StatusMessage,
	) => {
		if (isEncryptedVault(vaultFile)) {
			const hasPassword = vaultFile.encryption.keySlots.some(
				(slot) => slot.type === "password",
			);
			setLockedVault(vaultFile);
			setPendingFromCache(fromCache);
			setUnlockMode(hasPassword ? "password" : "questions");
			setPhase("unlock");
			return;
		}

		encryption.usePlain();
		let vault = touchVault(vaultFile);
		if (fromCache) {
			// Plaintext attachment blobs ignore the session argument.
			vault = await hydrateAttachments(vault, noEncryptionSession());
		}
		document.loadVault(vault);
		setPhase("ready");
		setStatus(successStatus);
	};

	const openVaultFile = async (file: File) => {
		try {
			const text = await file.text();
			const vaultFile = await readUploadedVault(new File([text], file.name));
			await openVaultFileObject(vaultFile, false, msg("success", "status.fileLoaded"));
		} catch {
			setStatus(msg("error", "status.openFailed"));
		}
	};

	const openCachedVault = async () => {
		try {
			const vaultFile = await persistence.loadCached();
			if (!vaultFile) {
				setStatus(msg("error", "status.cacheEmpty"));
				return;
			}
			await openVaultFileObject(vaultFile, true, msg("success", "status.cacheLoaded"));
		} catch {
			setStatus(msg("error", "status.cacheReadFailed"));
		}
	};

	const unlockVault = async () => {
		if (!lockedVault) return;

		try {
			const { vault, vaultKey } =
				unlockMode === "password"
					? await unlockWithPassword(lockedVault, unlockPassword)
					: await unlockWithAnswers(
							lockedVault,
							securitySlot?.type === "securityQuestions"
								? securitySlot.questions.map(
										(question) => unlockAnswers[question.id] ?? "",
									)
								: [],
						);

			// The session keeps the file encrypted on save regardless of `intent`,
			// which is only the editing view shown in Settings.
			const intent: EncryptionSettings =
				unlockMode === "password" && unlockPassword
					? { mode: "encrypted", password: unlockPassword, securityQuestions: [] }
					: { mode: "none" };
			const session = encryption.adoptUnlocked(lockedVault, vaultKey, intent);

			let nextVault = touchVault(vault);
			if (pendingFromCache) {
				nextVault = await hydrateAttachments(nextVault, session);
			}
			document.loadVault(nextVault);

			setLockedVault(null);
			setPendingFromCache(false);
			setUnlockPassword("");
			setUnlockAnswers({});
			setPhase("ready");
			setStatus(msg("success", "status.unlocked"));
		} catch {
			setStatus(msg("error", "status.unlockFailed"));
		}
	};

	const startNewVault = () => {
		document.loadVault(createEmptyVault());
		setSetupVaultName("");
		setSetupPassword("");
		setSetupQuestions([createBlankSecurityQuestion()]);
		encryption.usePlain();
		setPhase("setupPassword");
	};

	const createVaultWithoutPassword = () => {
		const base = createEmptyVault();
		encryption.usePlain();
		document.loadVault({ ...base, name: setupVaultName.trim() || base.name });
		setPhase("ready");
		setStatus(msg("success", "status.vaultCreatedNoPassword"));
	};

	const continueWithPassword = () => {
		if (!setupPassword.trim()) {
			setStatus(msg("error", "status.passwordRequired"));
			return;
		}
		encryption.setSettings({
			mode: "encrypted",
			password: setupPassword,
			securityQuestions: [],
		});
		setPhase("setupQuestions");
	};

	const finishSecurityQuestions = async (includeQuestions: boolean) => {
		const validQuestions = setupQuestions.filter(
			(item) => item.question.trim() && item.answer.trim(),
		);

		try {
			await encryption.applySettings({
				mode: "encrypted",
				password: setupPassword,
				securityQuestions: includeQuestions ? validQuestions : [],
			});
		} catch {
			setStatus(msg("error", "status.passwordRequired"));
			return;
		}

		document.loadVault({
			...document.vault,
			name: setupVaultName.trim() || document.vault.name,
		});
		setPhase("ready");
		setStatus(msg("success", "status.vaultCreated"));
	};

	const updateSetupQuestion = (
		id: string,
		field: keyof SecurityQuestion | "answer",
		value: string,
	) => {
		setSetupQuestions((questions) =>
			questions.map((item) =>
				item.id === id ? { ...item, [field]: value } : item,
			),
		);
	};

	const goBackFromUnlock = () => {
		setLockedVault(null);
		setPendingFromCache(false);
		setUnlockPassword("");
		setUnlockAnswers({});
		setPhase("login");
	};

	const goBackFromSetupPassword = () => {
		setSetupVaultName("");
		setSetupPassword("");
		setPhase("login");
	};

	const goBackFromSetupQuestions = () => setPhase("setupPassword");

	return {
		lockedVault,
		passwordSlot,
		securitySlot,
		unlockMode,
		setUnlockMode,
		unlockPassword,
		setUnlockPassword,
		unlockAnswers,
		setUnlockAnswers,
		setupVaultName,
		setSetupVaultName,
		setupPassword,
		setSetupPassword,
		setupQuestions,
		setSetupQuestions,
		openVaultFile,
		openCachedVault,
		unlockVault,
		startNewVault,
		createVaultWithoutPassword,
		continueWithPassword,
		finishSecurityQuestions,
		updateSetupQuestion,
		goBackFromUnlock,
		goBackFromSetupPassword,
		goBackFromSetupQuestions,
	};
}

export type AuthFlow = ReturnType<typeof useAuthFlow>;
