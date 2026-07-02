import { describe, expect, it } from "vitest";

import { migrateVaultFile, LATEST_FORMAT_VERSION } from "@/domain/migrate";
import { parseVaultFileObject, parseVaultObject } from "@/domain/schema";
import { createEmptyVault } from "@/domain/types";

function validEncryptedFile() {
	return {
		kind: "EncryptedVault",
		formatVersion: 1,
		encryption: {
			vault: { algorithm: "AES-GCM", iv: "aaaa", ciphertext: "bbbb" },
			keySlots: [
				{
					type: "password",
					kdf: "PBKDF2-SHA-256",
					salt: "cccc",
					iterations: 210000,
					wrappedKey: { algorithm: "AES-GCM", iv: "dddd", ciphertext: "eeee" },
				},
			],
		},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("parseVaultFileObject", () => {
	it("accepts a well-formed plaintext vault", () => {
		const file = parseVaultFileObject(createEmptyVault());
		expect(file.kind).toBe("Vault");
	});

	it("accepts a well-formed encrypted vault", () => {
		const file = parseVaultFileObject(validEncryptedFile());
		expect(file.kind).toBe("EncryptedVault");
	});

	it("rejects a missing required field", () => {
		const broken = { ...createEmptyVault(), entries: undefined };
		expect(() => parseVaultFileObject(broken)).toThrow();
	});

	it("rejects a field of the wrong type", () => {
		const broken = { ...createEmptyVault(), entries: "not-an-array" };
		expect(() => parseVaultFileObject(broken)).toThrow();
	});

	it("rejects an unknown kind", () => {
		expect(() => parseVaultFileObject({ kind: "Nope" })).toThrow();
	});

	it("rejects non-objects", () => {
		expect(() => parseVaultFileObject(null)).toThrow();
		expect(() => parseVaultFileObject("hello")).toThrow();
	});

	it("rejects a malformed key slot inside an encrypted vault", () => {
		const file = validEncryptedFile();
		// @ts-expect-error intentionally corrupt
		file.encryption.keySlots[0].kdf = "MD5";
		expect(() => parseVaultFileObject(file)).toThrow();
	});
});

describe("parseVaultObject (decrypted document)", () => {
	it("accepts a valid vault", () => {
		expect(parseVaultObject(createEmptyVault()).kind).toBe("Vault");
	});

	it("rejects an encrypted file (must be a decrypted Vault)", () => {
		expect(() => parseVaultObject(validEncryptedFile())).toThrow();
	});
});

describe("migrateVaultFile", () => {
	it("is a no-op for the latest version", () => {
		const vault = createEmptyVault();
		expect(migrateVaultFile(vault)).toEqual(vault);
	});

	it("defaults a missing formatVersion to the latest (no throw)", () => {
		expect(() => migrateVaultFile({ kind: "Vault" })).not.toThrow();
	});

	it("refuses a file newer than this app supports", () => {
		expect(() =>
			migrateVaultFile({ kind: "Vault", formatVersion: LATEST_FORMAT_VERSION + 1 }),
		).toThrow();
	});
});

describe("deletedEntries (tombstones)", () => {
	it("round-trips a vault with tombstones", () => {
		const vault = {
			...createEmptyVault(),
			deletedEntries: [{ id: "gone", deletedAt: "2026-01-01T00:00:00.000Z" }],
		};
		const parsed = parseVaultObject(vault);
		expect(parsed.deletedEntries).toEqual(vault.deletedEntries);
	});

	it("rejects a formatVersion-2 vault missing deletedEntries (migration, not schema, backfills it)", () => {
		const broken = { ...createEmptyVault(), deletedEntries: undefined };
		expect(() => parseVaultObject(broken)).toThrow();
	});
});
