import { useMemo, useState } from "react";

import { createEmptyEntry, type Entry, type Vault } from "@/domain/types";
import {
	collectCategoryProperties,
	withInheritedCategoryProperties,
} from "@/domain/vaultLogic";

// Fixed columns are stable keys (not display labels); EntryTable maps them to
// localized headers. Custom-property columns keep their raw user-defined names.
export const FIXED_COLUMNS = [
	"name",
	"loginName",
	"password",
	"notes",
	"category",
] as const;

export type FixedColumn = (typeof FIXED_COLUMNS)[number];

/** Owns transient view state (search, selection, open modals) and derived lists. */
export function useVaultUI(vault: Vault) {
	const [searchText, setSearchText] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const tableColumns = useMemo<string[]>(() => {
		if (!selectedCategory) return [...FIXED_COLUMNS];
		return [
			...FIXED_COLUMNS,
			...collectCategoryProperties(vault.entries, selectedCategory),
		];
	}, [selectedCategory, vault.entries]);

	const visibleEntries = useMemo(() => {
		const query = searchText.trim().toLocaleLowerCase();

		return vault.entries
			.filter((entry) => {
				const matchesCategory = selectedCategory
					? entry.category === selectedCategory
					: true;
				const searchable = [
					entry.name,
					entry.loginName,
					entry.notes,
					entry.category ?? "",
					...Object.values(entry.customProperties),
				]
					.join(" ")
					.toLocaleLowerCase();

				return matchesCategory && (!query || searchable.includes(query));
			})
			.map((entry) =>
				selectedCategory
					? withInheritedCategoryProperties(vault, entry)
					: entry,
			);
	}, [searchText, selectedCategory, vault]);

	const openNewEntry = () => setEditingEntry(createEmptyEntry(selectedCategory));

	return {
		searchText,
		setSearchText,
		selectedCategory,
		setSelectedCategory,
		editingEntry,
		setEditingEntry,
		settingsOpen,
		setSettingsOpen,
		tableColumns,
		visibleEntries,
		openNewEntry,
	};
}

export type VaultUI = ReturnType<typeof useVaultUI>;
