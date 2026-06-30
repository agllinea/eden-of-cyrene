import type { VaultApp } from "@/hooks/useVaultApp";
import { useI18n } from "@/i18n";
import { CategoryIcon } from "./CategoryIcon";
import { CopyButton } from "./CopyButton";
import { PasswordField } from "./PasswordField";

type App = VaultApp;

// Mobile list: one card per entry (name, login, password). The category tag is
// shown only in the "All" view — when filtered to a category it's redundant.
// Assumes a non-empty visible list; empty states are handled upstream.
export function EntryCardList({ app }: { app: App }) {
	const { t } = useI18n();
	const showTag = !app.selectedCategory;

	return (
		<div className="h-full overflow-auto p-3 space-y-2.5 pb-safe-4">
			{app.visibleEntries.map((entry) => {
				const def =
					app.categoryOptions.find((c) => c.name === entry.category) ?? null;

				return (
					<div
						key={entry.id}
						role="button"
						tabIndex={0}
						onClick={() => app.setEditingEntry(entry)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								app.setEditingEntry(entry);
							}
						}}
						className="bg-white rounded-2xl border border-pw-100 p-4 shadow-sm active:bg-pw-50/60 transition-colors cursor-pointer"
					>
						{/* Name + category tag */}
						<div className="flex items-center gap-2 mb-2.5">
							<span className="font-semibold text-slate-800 text-sm flex-1 truncate">
								{entry.name || <span className="text-slate-300">—</span>}
							</span>
							{showTag && entry.category && (
								<span className="inline-flex items-center gap-1 text-xs text-ac-600 bg-ac-100 rounded-full px-2 py-0.5 shrink-0">
									{def && <CategoryIcon def={def} size={11} />}
									<span className="truncate max-w-28">{entry.category}</span>
								</span>
							)}
						</div>

						{/* Login */}
						<div className="flex items-center gap-2 text-sm">
							<span className="text-slate-400 text-xs w-14 shrink-0">
								{t("column.loginName")}
							</span>
							{entry.loginName ? (
								<>
									<span className="text-slate-700 truncate flex-1">
										{entry.loginName}
									</span>
									<CopyButton value={entry.loginName} />
								</>
							) : (
								<span className="text-slate-300 flex-1">—</span>
							)}
						</div>

						{/* Password */}
						<div className="flex items-center gap-2 text-sm mt-1.5">
							<span className="text-slate-400 text-xs w-14 shrink-0">
								{t("column.password")}
							</span>
							<div className="flex-1">
								<PasswordField value={entry.password} />
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
}
