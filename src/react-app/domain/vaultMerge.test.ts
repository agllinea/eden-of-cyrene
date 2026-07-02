import { describe, expect, it } from "vitest";

import { createEmptyVault, type Entry, type EntryTombstone, type Vault } from "@/domain/types";
import { hasContentDiverged, mergeVaults } from "@/domain/vaultMerge";

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-01-02T00:00:00.000Z";
const T2 = "2026-01-03T00:00:00.000Z";

function entry(partial: Partial<Entry> & Pick<Entry, "id">): Entry {
	return {
		name: "",
		loginName: "",
		password: "",
		notes: "",
		category: null,
		attachments: [],
		customProperties: {},
		createdAt: T0,
		updatedAt: T0,
		...partial,
	};
}

function tombstone(id: string, deletedAt: string): EntryTombstone {
	return { id, deletedAt };
}

// Both sides must share `createdAt` (vault identity) for a merge to make sense.
function vault(partial: Partial<Vault> = {}): Vault {
	return {
		...createEmptyVault(),
		createdAt: "shared-identity",
		updatedAt: T0,
		...partial,
	};
}

function idsOf(entries: Entry[]): string[] {
	return [...entries.map((e) => e.id)].sort();
}

describe("mergeVaults — entries", () => {
	it("keeps entries that only exist on one side (disjoint adds)", () => {
		const a = vault({ entries: [entry({ id: "x" })] });
		const b = vault({ entries: [entry({ id: "y" })] });

		expect(idsOf(mergeVaults(a, b).entries)).toEqual(["x", "y"]);
	});

	it("keeps the newer edit when the same entry changed on both sides", () => {
		const a = vault({ entries: [entry({ id: "e", name: "A", updatedAt: T1 })] });
		const b = vault({ entries: [entry({ id: "e", name: "B", updatedAt: T2 })] });

		expect(mergeVaults(a, b).entries[0].name).toBe("B");
		expect(mergeVaults(b, a).entries[0].name).toBe("B"); // order-independent
	});

	it("keeps an edit that happened after the other side deleted it", () => {
		const deletedFirst = vault({ deletedEntries: [tombstone("e", T1)] });
		const editedAfter = vault({ entries: [entry({ id: "e", name: "resurrected", updatedAt: T2 })] });

		const merged = mergeVaults(deletedFirst, editedAfter);
		expect(merged.entries.map((e) => e.id)).toContain("e");
		expect(merged.deletedEntries.map((t) => t.id)).not.toContain("e");
	});

	it("keeps a delete that happened after the other side's last edit", () => {
		const editedFirst = vault({ entries: [entry({ id: "e", updatedAt: T1 })] });
		const deletedAfter = vault({ deletedEntries: [tombstone("e", T2)] });

		const merged = mergeVaults(editedFirst, deletedAfter);
		expect(merged.entries.map((e) => e.id)).not.toContain("e");
		expect(merged.deletedEntries.map((t) => t.id)).toContain("e");
	});

	it("breaks an exact edit/delete timestamp tie in favor of the delete", () => {
		const edited = vault({ entries: [entry({ id: "e", updatedAt: T1 })] });
		const deleted = vault({ deletedEntries: [tombstone("e", T1)] });

		const merged = mergeVaults(edited, deleted);
		expect(merged.entries.map((e) => e.id)).not.toContain("e");
	});

	it("keeps a delete recorded on both sides gone (no resurrection)", () => {
		const a = vault({ deletedEntries: [tombstone("e", T1)] });
		const b = vault({ deletedEntries: [tombstone("e", T2)] });

		const merged = mergeVaults(a, b);
		expect(merged.entries).toHaveLength(0);
		expect(merged.deletedEntries).toEqual([{ id: "e", deletedAt: T2 }]);
	});

	it("keeps the newest deletedAt when the same id is tombstoned on both sides", () => {
		const a = vault({ deletedEntries: [tombstone("e", T2)] });
		const b = vault({ deletedEntries: [tombstone("e", T1)] });

		expect(mergeVaults(a, b).deletedEntries).toEqual([{ id: "e", deletedAt: T2 }]);
		expect(mergeVaults(b, a).deletedEntries).toEqual([{ id: "e", deletedAt: T2 }]);
	});
});

describe("mergeVaults — categories and name", () => {
	it("resolves a conflicting category definition from the vault with the newer updatedAt", () => {
		const a = vault({
			updatedAt: T1,
			categories: [{ name: "Dev", icon: "Code", imageDataUrl: null }],
		});
		const b = vault({
			updatedAt: T2,
			categories: [{ name: "Dev", icon: "Rocket", imageDataUrl: null }],
		});

		expect(mergeVaults(a, b).categories).toEqual([{ name: "Dev", icon: "Rocket", imageDataUrl: null }]);
		expect(mergeVaults(b, a).categories).toEqual([{ name: "Dev", icon: "Rocket", imageDataUrl: null }]);
	});

	it("unions non-conflicting categories from both sides", () => {
		const a = vault({ categories: [{ name: "Dev", icon: null, imageDataUrl: null }] });
		const b = vault({ categories: [{ name: "Finance", icon: null, imageDataUrl: null }] });

		expect(mergeVaults(a, b).categories.map((c) => c.name).sort()).toEqual(["Dev", "Finance"]);
	});

	it("resolves the vault name from the side with the newer updatedAt", () => {
		const a = vault({ name: "Alpha", updatedAt: T1 });
		const b = vault({ name: "Beta", updatedAt: T2 });

		expect(mergeVaults(a, b).name).toBe("Beta");
		expect(mergeVaults(b, a).name).toBe("Beta");
	});
});

describe("hasContentDiverged", () => {
	it("is false for vaults with identical content even if updatedAt differs", () => {
		const a = vault({ entries: [entry({ id: "e" })], updatedAt: T1 });
		const b = vault({ entries: [entry({ id: "e" })], updatedAt: T2 });

		expect(hasContentDiverged(a, b)).toBe(false);
	});

	it("is true when entries differ", () => {
		const a = vault({ entries: [entry({ id: "e" })] });
		const b = vault({ entries: [] });

		expect(hasContentDiverged(a, b)).toBe(true);
	});

	it("is true when tombstones differ", () => {
		const a = vault({ deletedEntries: [tombstone("e", T1)] });
		const b = vault({ deletedEntries: [] });

		expect(hasContentDiverged(a, b)).toBe(true);
	});
});
