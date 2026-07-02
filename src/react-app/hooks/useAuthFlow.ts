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
import { hasContentDiverged } from "@/domain/vaultMerge";
import {
	isEncryptedVault,
	noEncryptionSession,
	unlockWithAnswers,
	unlockWithPassword,
} from "@/services/cryptoVault";
import {
	hydrateAttachments,
	loadCachedVault,
	readUploadedVault,
} from "@/services/storage";
import {
	linkVaultToDrive,
	loadDriveVault,
	saveToDrive,
	signIn as googleSignIn,
} from "@/services/googleDrive";
import { reconcileWithLocalCache } from "@/services/vaultSync";

import type { EncryptionController } from "./useEncryption";
import type { AppPhase, UnlockMode } from "./phase";
import type { VaultDocument } from "./useVaultDocument";

interface AuthFlowArgs {
	setPhase: (phase: AppPhase) => void;
	document: VaultDocument;
	encryption: EncryptionController;
	setStatus: (status: StatusMessage | null) => void;
}

/** Owns the login / unlock / setup flow and the transitions into `ready`. */
export function useAuthFlow({
	setPhase,
	document,
	encryption,
	setStatus,
}: AuthFlowArgs) {
	const [lockedVault, setLockedVault] = useState<EncryptedVault | null>(null);
	const [pendingCacheVaultId, setPendingCacheVaultId] = useState<string | null>(null);
	const [pendingDriveFileId, setPendingDriveFileId] = useState<string | null>(null);
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
		cacheVaultId: string | null, // for attachment hydration; null = not from cache
		driveFileId: string | null,  // for Drive link; null = not from Drive
		successStatus: StatusMessage,
	) => {
		if (isEncryptedVault(vaultFile)) {
			const hasPassword = vaultFile.encryption.keySlots.some(
				(slot) => slot.type === "password",
			);
			setLockedVault(vaultFile);
			setPendingCacheVaultId(cacheVaultId);
			setPendingDriveFileId(driveFileId);
			setUnlockMode(hasPassword ? "password" : "questions");
			setPhase("unlock");
			return;
		}

		encryption.usePlain();
		let vault = touchVault(vaultFile);
		if (cacheVaultId !== null) {
			vault = await hydrateAttachments(vault, noEncryptionSession(), cacheVaultId);
		}
		if (driveFileId !== null) {
			const session = noEncryptionSession();
			const merged = await reconcileWithLocalCache(vault, session);
			if (hasContentDiverged(merged, vault)) {
				vault = merged;
				void saveToDrive(vault, session).catch(() => {});
			}
			linkVaultToDrive(vault.createdAt, driveFileId);
		}
		document.loadVault(vault);
		setPhase("ready");
		setStatus(successStatus);
	};

	const openVaultFile = async (file: File) => {
		try {
			const text = await file.text();
			const vaultFile = await readUploadedVault(new File([text], file.name));
			await openVaultFileObject(vaultFile, null, null, msg("success", "status.fileLoaded"));
		} catch {
			setStatus(msg("error", "status.openFailed"));
		}
	};

	const openCacheList = () => setPhase("cacheList");

	const openCachedVaultById = async (vaultId: string) => {
		try {
			const vaultFile = await loadCachedVault(vaultId);
			if (!vaultFile) {
				setStatus(msg("error", "status.cacheEmpty"));
				return;
			}
			await openVaultFileObject(vaultFile, vaultId, null, msg("success", "status.cacheLoaded"));
		} catch {
			setStatus(msg("error", "status.cacheReadFailed"));
		}
	};

	const openDriveList = async () => {
		try {
			await googleSignIn();
			setPhase("driveList");
		} catch {
			setStatus(msg("error", "status.driveSignInFailed"));
		}
	};

	const switchDriveAccount = async () => {
		setPhase("login");
		try {
			await googleSignIn(true);
			setPhase("driveList");
		} catch {
			setStatus(msg("error", "status.driveSignInFailed"));
		}
	};

	const openDriveVaultById = async (fileId: string) => {
		try {
			const vaultFile = await loadDriveVault(fileId);
			await openVaultFileObject(vaultFile, null, fileId, msg("success", "status.driveLoaded"));
		} catch {
			setStatus(msg("error", "status.driveReadFailed"));
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

			const intent: EncryptionSettings =
				unlockMode === "password" && unlockPassword
					? { mode: "encrypted", password: unlockPassword, securityQuestions: [] }
					: { mode: "none" };
			const session = encryption.adoptUnlocked(lockedVault, vaultKey, intent);

			let nextVault = touchVault(vault);
			if (pendingCacheVaultId !== null) {
				nextVault = await hydrateAttachments(nextVault, session, pendingCacheVaultId);
			}
			if (pendingDriveFileId !== null) {
				const merged = await reconcileWithLocalCache(nextVault, session);
				if (hasContentDiverged(merged, nextVault)) {
					nextVault = merged;
					void saveToDrive(nextVault, session).catch(() => {});
				}
				linkVaultToDrive(nextVault.createdAt, pendingDriveFileId);
			}
			document.loadVault(nextVault);

			setLockedVault(null);
			setPendingCacheVaultId(null);
			setPendingDriveFileId(null);
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

	const goBackFromCacheList = () => setPhase("login");
	const goBackFromDriveList = () => setPhase("login");

	const goBackFromUnlock = () => {
		const origin =
			pendingCacheVaultId !== null ? "cacheList"
			: pendingDriveFileId !== null ? "driveList"
			: "login";
		setLockedVault(null);
		setPendingCacheVaultId(null);
		setPendingDriveFileId(null);
		setUnlockPassword("");
		setUnlockAnswers({});
		setPhase(origin);
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
		openCacheList,
		openCachedVaultById,
		openDriveList,
		switchDriveAccount,
		openDriveVaultById,
		unlockVault,
		startNewVault,
		createVaultWithoutPassword,
		continueWithPassword,
		finishSecurityQuestions,
		updateSetupQuestion,
		goBackFromCacheList,
		goBackFromDriveList,
		goBackFromUnlock,
		goBackFromSetupPassword,
		goBackFromSetupQuestions,
	};
}

export type AuthFlow = ReturnType<typeof useAuthFlow>;
