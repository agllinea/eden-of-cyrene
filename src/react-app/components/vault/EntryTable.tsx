import { Pencil } from "lucide-react";

import type { CategoryDef, Entry } from "@/domain/types";
import type { VaultApp } from "@/hooks/useVaultApp";
import { FIXED_COLUMNS, type FixedColumn } from "@/hooks/useVaultUI";
import { useI18n, type TFunction } from "@/i18n";
import { IconButton } from "../ui";
import { CategoryIcon } from "./CategoryIcon";
import { CopyButton } from "./CopyButton";
import { PasswordField } from "./PasswordField";

type App = VaultApp;

const FIXED = new Set<string>(FIXED_COLUMNS);

function isFixedColumn(col: string): col is FixedColumn {
	return FIXED.has(col);
}

// Localized header for a column key; custom-property columns keep their raw name.
function columnLabel(col: string, t: TFunction): string {
	return isFixedColumn(col) ? t(`column.${col}`) : col;
}

// ── Category cell ─────────────────────────────────────────────────────────────

function CategoryCell({ name, def }: { name: string | null; def: CategoryDef | null }) {
	if (!name) return <span className="text-slate-300">—</span>;
	return (
		<span className="inline-flex items-center gap-1.5 text-sm">
			{def && (
				<span className="text-slate-400">
					<CategoryIcon def={def} size={13} />
				</span>
			)}
			{name}
		</span>
	);
}

// ── Cell value helper ─────────────────────────────────────────────────────────

function getCellValue(entry: Entry, col: string): string {
	switch (col) {
		case "name":      return entry.name;
		case "loginName": return entry.loginName;
		case "password":  return entry.password;
		case "notes":     return entry.notes;
		case "category":  return entry.category ?? "";
		default:          return entry.customProperties[col] ?? "";
	}
}

// ── Entry table (assumes a non-empty visible list; empties handled upstream) ───

export function EntryTable({ app }: { app: App }) {
	const { t } = useI18n();

	return (
		<div className="overflow-auto h-full">
			<table className="w-full min-w-max text-sm">
				<thead className="sticky top-0 bg-pw-50/95 backdrop-blur-sm border-b border-pw-100">
					<tr>
						{app.tableColumns.map((col) => (
							<th
								key={col}
								className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
							>
								{columnLabel(col, t)}
							</th>
						))}
						<th className="w-10 px-2 py-3" />
					</tr>
				</thead>
				<tbody className="divide-y divide-pw-50">
					{app.visibleEntries.map((entry) => (
						<tr
							key={entry.id}
							onClick={() => app.setEditingEntry(entry)}
							className="hover:bg-pw-50/60 cursor-pointer transition-colors duration-100 group"
						>
							{app.tableColumns.map((col) => (
								<td
									key={col}
									className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-50"
								>
									{col === "password" ? (
										<PasswordField value={entry.password} revealCopyOnHover />
									) : col === "category" ? (
										<CategoryCell
											name={entry.category}
											def={app.categoryOptions.find((c) => c.name === entry.category) ?? null}
										/>
									) : col === "loginName" && entry.loginName ? (
										<span className="inline-flex items-center gap-1 max-w-full">
											<span className="truncate text-sm">{entry.loginName}</span>
											<CopyButton value={entry.loginName} size={12} revealOnHover />
										</span>
									) : (
										<span className="truncate block text-sm">
											{getCellValue(entry, col) || (
												<span className="text-slate-300">—</span>
											)}
										</span>
									)}
								</td>
							))}
							<td className="px-2 py-3">
								<IconButton
									variant="row"
									onClick={(e) => {
										e.stopPropagation();
										app.setEditingEntry(entry);
									}}
								>
									<Pencil size={13} />
								</IconButton>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
