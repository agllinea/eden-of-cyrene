import { Pencil } from "lucide-react";

import type { CategoryDef, Entry } from "@/domain/types";
import { useCopy } from "@/hooks/useCopy";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { VaultApp } from "@/hooks/useVaultApp";
import { FIXED_COLUMNS, type FixedColumn } from "@/hooks/useVaultUI";
import { useI18n, type TFunction } from "@/i18n";
import { cn, CopyButton, IconButton } from "../ui";
import { CategoryIcon } from "./CategoryIcon";

type App = VaultApp;

const FIXED = new Set<string>(FIXED_COLUMNS);

function isFixedColumn(col: string): col is FixedColumn {
	return FIXED.has(col);
}

function columnLabel(col: string, t: TFunction): string {
	return isFixedColumn(col) ? t(`column.${col}`) : col;
}

const dash = <span className="text-slate-300">—</span>;

function CategoryCell({ name, def }: { name: string | null; def: CategoryDef | null }) {
	if (!name) return dash;
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

function Cell({
	children,
	copyValue,
	showCopy,
}: {
	children: React.ReactNode;
	copyValue: string;
	showCopy: boolean;
}) {
	return (
		<span className="flex items-center justify-between gap-2 w-full group/cell">
			<span className="min-w-0 truncate">{children}</span>
			{showCopy && copyValue && (
				<CopyButton
					value={copyValue}
					size={12}
					className="shrink-0 -mr-2 opacity-0 group-hover/cell:opacity-100 transition-opacity"
				/>
			)}
		</span>
	);
}

export function EntryTable({ app }: { app: App }) {
	const { t } = useI18n();
	const copy = useCopy();
	const isTouch = useMediaQuery("(hover: none)");

	return (
		<div className="overflow-auto h-full bg-white pb-24 md:pb-0">
			<table className="w-full min-w-max text-sm">
				<thead className="sticky top-0 z-20 bg-linear-to-r from-pw-100 to-ac-100 backdrop-blur-sm border-b border-pw-100">
					<tr>
						{app.tableColumns.map((col, i) => (
							<th
								key={col}
								className={cn(
									"px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap",
									// Freeze name column on touch only
									i === 0 && isTouch && "sticky left-0 z-30 bg-pw-100",
									i >= 1 && "border-l border-white",
								)}
							>
								{columnLabel(col, t)}
							</th>
						))}
						{/* Floating edit column — touch only */}
						{isTouch && <th className="sticky right-0 z-30 bg-ac-100 w-10 px-2 py-3 border-l border-white" />}
					</tr>
				</thead>
				<tbody>
					{app.visibleEntries.map((entry) => (
						<tr
							key={entry.id}
							onClick={() => app.setEditingEntry(entry)}
							className="border-b border-slate-100 cursor-pointer transition-colors duration-100 group"
						>
							{app.tableColumns.map((col, i) => {
								const value = getCellValue(entry, col);
								let content: React.ReactNode;
								if (col === "password") {
									content = value ? (
										<span className="font-mono text-xs">••••••</span>
									) : (
										dash
									);
								} else if (col === "category") {
									content = (
										<CategoryCell
											name={entry.category}
											def={app.categoryOptions.find((c) => c.name === entry.category) ?? null}
										/>
									);
								} else {
									content = value || dash;
								}

								return (
									<td
										key={col}
										onClick={
											isTouch
												? (e) => {
														e.stopPropagation();
														if (value) void copy(value);
													}
												: undefined
										}
										className={cn(
											"px-4 py-1 text-slate-700 whitespace-nowrap max-w-50",
											// Freeze name on touch with a right shadow as separator
											i === 0 && isTouch && "sticky left-0 z-10 bg-white shadow-[2px_0_8px_rgba(0,0,0,0.06)]",
											i >= 1 && "border-l border-slate-100",
										)}
									>
										<Cell copyValue={value} showCopy={!isTouch}>
											{content}
										</Cell>
									</td>
								);
							})}
							{/* Floating edit button — touch only, sticks to the right edge */}
							{isTouch && (
								<td className="sticky right-0 z-10 bg-white w-10 px-2 py-1 border-l border-slate-100">
									<IconButton
										variant="copy"
										onClick={(e) => {
											e.stopPropagation();
											app.setEditingEntry(entry);
										}}
									>
										<Pencil size={13} />
									</IconButton>
								</td>
							)}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
