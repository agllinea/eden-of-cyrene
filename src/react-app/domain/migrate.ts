// Version migration pipeline for the on-disk vault format.
//
// `formatVersion` lets the stored format evolve safely. Each step upgrades a
// file from one version to the next; `migrateVaultFile` walks the chain up to
// the latest before schema validation runs. Today there is only one version,
// so the chain is empty — but the boundary is in place for future changes.

export const LATEST_FORMAT_VERSION = 1;

type RawFile = Record<string, unknown>;
type MigrationStep = (file: RawFile) => RawFile;

// Keyed by the version each step upgrades FROM. Add entries as the format grows:
//   1: (file) => ({ ...file, formatVersion: 2, /* transform fields */ }),
const steps: Record<number, MigrationStep> = {};

export function migrateVaultFile(raw: unknown): unknown {
	if (!raw || typeof raw !== "object") return raw;

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
