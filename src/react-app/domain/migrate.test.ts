import { describe, expect, it } from "vitest";

import { LATEST_FORMAT_VERSION, migrateVaultFile } from "@/domain/migrate";

describe("migrateVaultFile", () => {
	it("migrates a v1 Vault to v2, backfilling deletedEntries", () => {
		const v1 = {
			kind: "Vault",
			formatVersion: 1,
			name: "Old Vault",
			entries: [],
			categories: [],
			createdAt: "2025-01-01T00:00:00.000Z",
			updatedAt: "2025-01-01T00:00:00.000Z",
		};

		const migrated = migrateVaultFile(v1) as Record<string, unknown>;
		expect(migrated.formatVersion).toBe(2);
		expect(migrated.deletedEntries).toEqual([]);
	});

	it("preserves an existing deletedEntries array instead of overwriting it", () => {
		const v1 = {
			kind: "Vault",
			formatVersion: 1,
			deletedEntries: [{ id: "x", deletedAt: "2025-01-01T00:00:00.000Z" }],
		};

		const migrated = migrateVaultFile(v1) as Record<string, unknown>;
		expect(migrated.deletedEntries).toEqual([{ id: "x", deletedAt: "2025-01-01T00:00:00.000Z" }]);
	});

	it("passes an EncryptedVault through untouched (wrapper format is frozen at 1)", () => {
		const encrypted = {
			kind: "EncryptedVault",
			formatVersion: 1,
			encryption: { vault: {}, keySlots: [] },
			createdAt: "2025-01-01T00:00:00.000Z",
			updatedAt: "2025-01-01T00:00:00.000Z",
		};

		expect(migrateVaultFile(encrypted)).toEqual(encrypted);
	});

	it("is a no-op at the latest version", () => {
		const latest = { kind: "Vault", formatVersion: LATEST_FORMAT_VERSION, deletedEntries: [] };
		expect(migrateVaultFile(latest)).toEqual(latest);
	});

	it("refuses a file newer than this app supports", () => {
		expect(() =>
			migrateVaultFile({ kind: "Vault", formatVersion: LATEST_FORMAT_VERSION + 1 }),
		).toThrow();
	});

	it("passes through non-objects unchanged", () => {
		expect(migrateVaultFile(null)).toBe(null);
		expect(migrateVaultFile("hello")).toBe("hello");
	});
});
