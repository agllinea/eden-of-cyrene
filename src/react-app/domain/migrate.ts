// Version migration pipeline for the on-disk vault format.
//
// `formatVersion` lets the stored format evolve safely. Each step upgrades a
// file from one version to the next; `migrateVaultFile` walks the chain up to
// the latest before schema validation runs.
//
// This version number tracks the *decrypted* `Vault` document shape only.
// `EncryptedVault` is a wrapper around opaque ciphertext — its own shape
// (kind/encryption/createdAt/updatedAt) is pinned at formatVersion 1
// independently and is never migrated here; the ciphertext it wraps is a
// serialized `Vault`, which gets migrated after decryption via
// `parseVaultObject` (which also calls this function).

export const LATEST_FORMAT_VERSION = 2;

type RawFile = Record<string, unknown>;
type MigrationStep = (file: RawFile) => RawFile;

// Keyed by the version each step upgrades FROM.
const steps: Record<number, MigrationStep> = {
	1: (file) => ({
		...file,
		formatVersion: 2,
		deletedEntries: file.deletedEntries ?? [],
	}),
};

export function migrateVaultFile(raw: unknown): unknown {
	if (!raw || typeof raw !== "object") return raw;

	// EncryptedVault's wrapper format is frozen at 1; only the decrypted Vault
	// payload it wraps evolves, and that's migrated separately after decryption.
	if ((raw as RawFile).kind === "EncryptedVault") return raw;

	let file = raw as RawFile;
	let version =
		typeof file.formatVersion === "number"
			? file.formatVersion
			: LATEST_FORMAT_VERSION;

	if (version > LATEST_FORMAT_VERSION) {
		throw new Error(
			`Unsupported vault formatVersion ${version} (newer than this app supports).`,
		);
	}

	while (version < LATEST_FORMAT_VERSION) {
		const step = steps[version];
		if (!step) {
			throw new Error(`No migration path from formatVersion ${version}.`);
		}
		file = step(file);
		version =
			typeof file.formatVersion === "number" ? file.formatVersion : version + 1;
	}

	return file;
}
