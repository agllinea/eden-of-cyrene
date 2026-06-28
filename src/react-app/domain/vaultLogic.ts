import type { CategoryDef, Entry, Vault } from "./types";

export function collectCategoryProperties(entries: Entry[], category: string): string[] {
	const keys = new Set<string>();

	for (const entry of entries) {
		if (entry.category === category) {
			Object.keys(entry.customProperties).forEach((key) => keys.add(key));
		}
	}

	return [...keys].sort((a, b) => a.localeCompare(b));
}

export function normalizeCategories(categories: CategoryDef[]): CategoryDef[] {
	const seen = new Set<string>();
	const result: CategoryDef[] = [];
	for (const cat of categories) {
		const name = cat.name.trim();
		if (name && !seen.has(name)) {
			seen.add(name);
			result.push({ ...cat, name });
		}
	}
	return result.sort((a, b) => a.name.localeCompare(b.name));
}

export function touchVault(vault: Vault): Vault {
	// Existing defs take priority so icon/image choices are preserved.
	const byName = new Map(vault.categories.map((c) => [c.name, c]));

	// Ensure every category referenced by an entry exists in the list.
	for (const entry of vault.entries) {
		if (entry.category && !byName.has(entry.category)) {
			byName.set(entry.category, { name: entry.category, icon: null, imageDataUrl: null });
		}
	}

	return {
		...vault,
		categories: normalizeCategories([...byName.values()]),
		updatedAt: new Date().toISOString(),
	};
}

export function withInheritedCategoryProperties(vault: Vault, entry: Entry): Entry {
	if (!entry.category) return entry;

	const inheritedKeys = collectCategoryProperties(
		vault.entries.filter((candidate) => candidate.id !== entry.id),
		entry.category,
	);
	const customProperties = { ...entry.customProperties };

	for (const key of inheritedKeys) {
		customProperties[key] ??= "";
	}

	return { ...entry, customProperties };
}

export function upsertEntry(vault: Vault, entry: Entry): Vault {
	const nextEntry = withInheritedCategoryProperties(vault, entry);
	const exists = vault.entries.some((candidate) => candidate.id === entry.id);
	const entries = exists
		? vault.entries.map((candidate) =>
				candidate.id === entry.id ? nextEntry : candidate,
			)
		: [...vault.entries, nextEntry];

	return touchVault({ ...vault, entries });
}

export function removeEntry(vault: Vault, entryId: string): Vault {
	return touchVault({
		...vault,
		entries: vault.entries.filter((entry) => entry.id !== entryId),
	});
}
