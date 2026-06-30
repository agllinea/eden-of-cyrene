import { useCallback, useMemo, useState } from "react";

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

// Mobile list rendering. Desktop is always a table; mobile defaults to cards and
// remembers the user's toggle.
export type ViewMode = "card" | "table";
const VIEW_KEY = "eden-view";

function readViewMode(): ViewMode {
	if (typeof window === "undefined") return "card";
	return window.localStorage.getItem(VIEW_KEY) === "table" ? "table" : "card";
}

/** Owns transient view state (search, selection, open modals) and derived lists. */
export function useVaultUI(vault: Vault) {
	const [searchText, setSearchText] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [viewMode, setViewModeState] = useState<ViewMode>(readViewMode);

	const setViewMode = useCallback((mode: ViewMode) => {
		setViewModeState(mode);
		try {
			window.localStorage.setItem(VIEW_KEY, mode);
		} catch {
			// ignore storage failures (private mode, etc.)
		}
	}, []);

	const tableColumns = useMemo<string[]>(() => {
		// Hide the category column when filtered to one category — it's redundant.
		const fixed = selectedCategory
			? FIXED_COLUMNS.filter((c) => c !== "category")
			: [...FIXED_COLUMNS];
		if (!selectedCategory) return fixed;
		return [
			...fixed,
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
		viewMode,
		setViewMode,
		tableColumns,
		visibleEntries,
		openNewEntry,
	};
}

export type VaultUI = ReturnType<typeof useVaultUI>;
