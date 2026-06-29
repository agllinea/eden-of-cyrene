import { describe, expect, it } from "vitest";

import { createEmptyVault, type Entry, type Vault } from "@/domain/types";
import {
	collectCategoryProperties,
	normalizeCategories,
	removeEntry,
	touchVault,
	upsertEntry,
	withInheritedCategoryProperties,
} from "@/domain/vaultLogic";

function entry(partial: Partial<Entry> & Pick<Entry, "id">): Entry {
	return {
		name: "",
		loginName: "",
		password: "",
		notes: "",
		category: null,
		attachments: [],
		customProperties: {},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...partial,
	};
}

function vaultWith(entries: Entry[], categories: Vault["categories"] = []): Vault {
	return { ...createEmptyVault(), entries, categories };
}

describe("normalizeCategories", () => {
	it("trims, de-duplicates by name and sorts", () => {
		const result = normalizeCategories([
			{ name: "  Work ", icon: "Briefcase", imageDataUrl: null },
			{ name: "Apps", icon: null, imageDataUrl: null },
			{ name: "Work", icon: "Star", imageDataUrl: null }, // duplicate of trimmed "Work"
			{ name: "   ", icon: null, imageDataUrl: null }, // empty -> dropped
		]);

		expect(result.map((c) => c.name)).toEqual(["Apps", "Work"]);
		// First occurrence wins (icon preserved from the earlier entry).
		expect(result.find((c) => c.name === "Work")?.icon).toBe("Briefcase");
	});
});

describe("collectCategoryProperties", () => {
	it("returns the sorted union of custom-property keys for a category", () => {
		const entries = [
			entry({ id: "a", category: "Dev", customProperties: { url: "x", token: "y" } }),
			entry({ id: "b", category: "Dev", customProperties: { env: "z" } }),
			entry({ id: "c", category: "Other", customProperties: { ignore: "1" } }),
		];

		expect(collectCategoryProperties(entries, "Dev")).toEqual(["env", "token", "url"]);
	});
});

describe("touchVault", () => {
	it("creates missing category defs referenced by entries and bumps updatedAt", () => {
		const before = vaultWith([entry({ id: "a", category: "Ghost" })]);
		const touched = touchVault(before);

		expect(touched.categories.map((c) => c.name)).toContain("Ghost");
		expect(touched.updatedAt).not.toBe(before.updatedAt);
	});

	it("preserves an existing category's icon/image choice", () => {
		const before = vaultWith(
			[entry({ id: "a", category: "Dev" })],
			[{ name: "Dev", icon: "Code", imageDataUrl: null }],
		);
		const touched = touchVault(before);
		expect(touched.categories.find((c) => c.name === "Dev")?.icon).toBe("Code");
	});
});

describe("withInheritedCategoryProperties", () => {
	it("adds sibling property keys as empty strings without overwriting existing values", () => {
		const vault = vaultWith([
			entry({ id: "a", category: "Dev", customProperties: { url: "https://a" } }),
			entry({ id: "b", category: "Dev", customProperties: { token: "keep" } }),
		]);

		const target = vault.entries[1];
		const result = withInheritedCategoryProperties(vault, target);

		expect(result.customProperties).toEqual({ token: "keep", url: "" });
	});

	it("returns the entry untouched when it has no category", () => {
		const vault = vaultWith([entry({ id: "a", customProperties: { keep: "v" } })]);
		const result = withInheritedCategoryProperties(vault, vault.entries[0]);
		expect(result.customProperties).toEqual({ keep: "v" });
	});
});

describe("upsertEntry / removeEntry", () => {
	it("inserts a new entry", () => {
		const vault = vaultWith([]);
		const next = upsertEntry(vault, entry({ id: "new", name: "GitHub" }));
		expect(next.entries).toHaveLength(1);
		expect(next.entries[0].name).toBe("GitHub");
	});

	it("updates an existing entry in place (no duplicate)", () => {
		const vault = vaultWith([entry({ id: "a", name: "old" })]);
		const next = upsertEntry(vault, entry({ id: "a", name: "new" }));
		expect(next.entries).toHaveLength(1);
		expect(next.entries[0].name).toBe("new");
	});

	it("removes an entry by id", () => {
		const vault = vaultWith([entry({ id: "a" }), entry({ id: "b" })]);
		const next = removeEntry(vault, "a");
		expect(next.entries.map((e) => e.id)).toEqual(["b"]);
	});
});
