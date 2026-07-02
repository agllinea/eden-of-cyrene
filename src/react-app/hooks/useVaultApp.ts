import { useState } from "react";

import { msg } from "@/domain/status";
import type { Entry, EncryptionSettings } from "@/domain/types";
import {
	getDriveFileId,
	saveToDrive,
	signIn as googleSignIn,
	signOut as googleSignOut,
	unlinkVaultFromDrive,
} from "@/services/googleDrive";

import type { AppPhase } from "./phase";
import { useAuthFlow } from "./useAuthFlow";
import { useEncryption } from "./useEncryption";
import { useStatus } from "./useStatus";
import { useVaultDocument } from "./useVaultDocument";
import { useVaultPersistence } from "./useVaultPersistence";
import { useVaultUI } from "./useVaultUI";

export type { AppPhase, UnlockMode } from "./phase";

/**
 * Composition root. Each concern lives in its own focused hook; this only wires
 * them together and exposes the flat `app` object the components consume.
 */
export function useVaultApp() {
	const [phase, setPhase] = useState<AppPhase>("login");

	const { status, setStatus } = useStatus();
	const document = useVaultDocument();
	const encryption = useEncryption();
	const ui = useVaultUI(document.vault);
	const persistence = useVaultPersistence({
		vault: document.vault,
		session: encryption.session,
		phase,
		onMergedFromRemote: document.loadVault,
	});
	const auth = useAuthFlow({
		setPhase,
		document,
		encryption,
		setStatus,
	});

	// ── Cross-cutting actions (document + UI + status glue) ──
	const saveEntry = (entry: Entry) => {
		document.applyEntry(entry);
		ui.setEditingEntry(null);
		setStatus(msg("success", "status.entrySaved"));
	};

	const deleteEntry = (entryId: string) => {
		document.removeEntryById(entryId);
		ui.setEditingEntry(null);
		setStatus(msg("success", "status.entryDeleted"));
	};

	const downloadVault = async () => {
		try {
			await persistence.downloadVault();
			setStatus(msg("success", "status.downloaded"));
		} catch {
			setStatus(msg("error", "status.downloadFailed"));
		}
	};

	const applySettings = async (next: EncryptionSettings) => {
		try {
			await encryption.applySettings(next);
		} catch {
			setStatus(msg("error", "status.passwordRequired"));
		}
	};

	// ── Google Drive actions ──

	/** Sign in and link the current vault to Google Drive (create file on first call). */
	const connectGoogleDrive = async () => {
		try {
			await googleSignIn();
			// Create the Drive file if this vault isn't linked yet.
			if (!getDriveFileId(document.vault.createdAt)) {
				await saveToDrive(document.vault, encryption.session);
			}
			persistence.refreshDriveLink(document.vault.createdAt);
		} catch {
			setStatus(msg("error", "status.driveSignInFailed"));
		}
	};

	/** Remove the Drive link and sign out (Drive file is kept intact). */
	const disconnectGoogleDrive = () => {
		unlinkVaultFromDrive(document.vault.createdAt);
		googleSignOut();
		persistence.refreshDriveLink(document.vault.createdAt);
	};

	/** Force an immediate Drive sync (shows status on the header button). */
	const syncNow = async () => {
		await persistence.forceDriveSync();
	};

	return {
		// phase & status
		phase,
		status,

		// document
		vault: document.vault,
		categoryOptions: document.categoryOptions,
		addCategory: document.addCategory,
		updateCategory: document.updateCategory,
		updateVaultName: document.updateVaultName,
		addAttachment: document.addAttachment,
		dropCustomPropInCategory: document.dropCustomPropInCategory,
		saveEntry,
		deleteEntry,

		// encryption / settings
		settings: encryption.settings,
		applySettings,
		updateSecurityQuestion: encryption.updateSecurityQuestion,

		// ui
		searchText: ui.searchText,
		setSearchText: ui.setSearchText,
		selectedCategory: ui.selectedCategory,
		setSelectedCategory: ui.setSelectedCategory,
		editingEntry: ui.editingEntry,
		setEditingEntry: ui.setEditingEntry,
		settingsOpen: ui.settingsOpen,
		setSettingsOpen: ui.setSettingsOpen,
		tableColumns: ui.tableColumns,
		visibleEntries: ui.visibleEntries,
		openNewEntry: ui.openNewEntry,

		// persistence
		cacheEnabled: persistence.cacheEnabled,
		setCacheEnabled: persistence.setCacheEnabled,
		cacheState: persistence.cacheState,
		cacheSaving: persistence.cacheState.status === "saving",
		downloadVault,
		driveLinked: persistence.driveLinked,
		driveState: persistence.driveState,
		connectGoogleDrive,
		disconnectGoogleDrive,
		syncNow,

		// auth flow
		...auth,
	};
}

export type VaultApp = ReturnType<typeof useVaultApp>;
