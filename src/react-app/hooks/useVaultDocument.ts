import { useCallback, useMemo, useState } from "react";

import {
	createEmptyVault,
	type CategoryDef,
	type Entry,
	type Vault,
} from "@/domain/types";
import {
	normalizeCategories,
	removeEntry,
	touchVault,
	upsertEntry,
} from "@/domain/vaultLogic";
import { fileToDataUrl } from "@/utils/fileData";

/** Owns the decrypted vault document and its mutations (no UI / status side effects). */
export function useVaultDocument() {
	const [vault, setVault] = useState<Vault>(() => createEmptyVault());

	const categoryOptions = useMemo(
		() => normalizeCategories(vault.categories),
		[vault.categories],
	);

	const loadVault = useCallback((next: Vault) => setVault(touchVault(next)), []);

	const applyEntry = useCallback(
		(entry: Entry) => setVault((current) => upsertEntry(current, entry)),
		[],
	);

	const removeEntryById = useCallback(
		(entryId: string) => setVault((current) => removeEntry(current, entryId)),
		[],
	);

	const addCategory = useCallback((def: CategoryDef) => {
		const trimmed = def.name.trim();
		if (!trimmed) return;
		setVault((current) =>
			touchVault({
				...current,
				categories: normalizeCategories([
					...current.categories,
					{ ...def, name: trimmed },
				]),
			}),
		);
	}, []);

	const updateCategory = useCallback(
		(
			name: string,
			updates: Partial<Pick<CategoryDef, "icon" | "imageDataUrl">>,
		) =>
			setVault((current) =>
				touchVault({
					...current,
					categories: current.categories.map((c) =>
						c.name === name ? { ...c, ...updates } : c,
					),
				}),
			),
		[],
	);

	const dropCustomPropInCategory = useCallback(
		(propKey: string, category: string) =>
			setVault((current) =>
				touchVault({
					...current,
					entries: current.entries.map((e) => {
						if (e.category !== category || !(propKey in e.customProperties)) return e;
						const next = { ...e.customProperties };
						delete next[propKey];
						return { ...e, customProperties: next, updatedAt: new Date().toISOString() };
					}),
				}),
			),
		[],
	);

	const updateVaultName = useCallback(
		(name: string) =>
			setVault((current) => touchVault({ ...current, name })),
		[],
	);

	// Pure helper: builds the next entry with appended attachments. The caller
	// (modal) owns the resulting entry until it is saved.
	const addAttachment = useCallback(
		async (entry: Entry, files: FileList | null): Promise<Entry> => {
			if (!files?.length) return entry;

			const attachments = await Promise.all(
				[...files].map(async (file) => ({
					id: crypto.randomUUID(),
					name: file.name,
					type: file.type || "application/octet-stream",
					size: file.size,
					dataUrl: await fileToDataUrl(file),
				})),
			);

			return { ...entry, attachments: [...entry.attachments, ...attachments] };
		},
		[],
	);

	return {
		vault,
		categoryOptions,
		loadVault,
		applyEntry,
		removeEntryById,
		addCategory,
		updateCategory,
		updateVaultName,
		dropCustomPropInCategory,
		addAttachment,
	};
}

export type VaultDocument = ReturnType<typeof useVaultDocument>;
