import { Plus } from "lucide-react";
import { useState } from "react";

import type { VaultApp } from "@/hooks/useVaultApp";
import { useI18n } from "@/i18n";
import { CardButton } from "../ui";
import { EntryCardList } from "./EntryCardList";
import EntryModal from "./EntryModal";
import { EntryTable } from "./EntryTable";
import SettingsModal from "./SettingsModal";
import { VaultHeader } from "./VaultHeader";
import { VaultSidebar } from "./VaultSidebar";

function EntryListArea({ app }: { app: VaultApp }) {
	const { t } = useI18n();

	if (app.vault.entries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-8">
				<div className="w-16 h-16 bg-pw-100 rounded-2xl flex items-center justify-center mb-4">
					<Plus className="w-8 h-8 text-pw-400" />
				</div>
				<p className="text-slate-500 font-medium mb-1">{t("table.empty.title")}</p>
				<p className="text-sm text-slate-400">{t("table.empty.hint")}</p>
			</div>
		);
	}

	if (app.visibleEntries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-8">
				<p className="text-slate-400 text-sm">{t("table.noMatch")}</p>
			</div>
		);
	}

	// Desktop is always a table; mobile uses the user's chosen view.
	return (
		<>
			<div className="hidden md:block h-full">
				<EntryTable app={app} />
			</div>
			<div className="md:hidden h-full">
				{app.viewMode === "table" ? (
					<EntryTable app={app} />
				) : (
					<EntryCardList app={app} />
				)}
			</div>
		</>
	);
}

export default function VaultPage({ app }: { app: VaultApp }) {
	const { t } = useI18n();
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const isNewEntry =
		!!app.editingEntry &&
		!app.vault.entries.some((e) => e.id === app.editingEntry!.id);

	return (
		<div className="flex flex-col h-dvh overflow-hidden">
			<VaultHeader app={app} onMenuClick={() => setSidebarOpen(true)} />

			<div className="flex flex-1 overflow-hidden">
				<VaultSidebar
					app={app}
					isOpen={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
				/>

				<main className="flex-1 relative overflow-hidden bg-pw-50/40 md:bg-white">
					<EntryListArea app={app} />

					{/* FAB — kept clear of the home indicator on notched phones */}
					<div className="absolute fab-safe">
						<CardButton
							onClick={app.openNewEntry}
							aria-label={t("fab.newEntry")}
							icon={<Plus size={24} strokeWidth={2} />}
							className="p-0! w-13 h-13 rounded-2xl shadow-lg shadow-ac-300/20"
						/>
					</div>
				</main>
			</div>

			{app.editingEntry && (
				<EntryModal
					entry={app.editingEntry}
					categoryOptions={app.categoryOptions}
					isNew={isNewEntry}
					onSave={app.saveEntry}
					onDelete={app.deleteEntry}
					onClose={() => app.setEditingEntry(null)}
					onAddAttachment={app.addAttachment}
				/>
			)}

			{app.settingsOpen && (
				<SettingsModal
					vaultName={app.vault.name}
					settings={app.settings}
					cacheEnabled={app.cacheEnabled}
					cacheSaving={app.cacheSaving}
					cacheState={app.cacheState}
					onSetCacheEnabled={app.setCacheEnabled}
					onUpdateVaultName={app.updateVaultName}
					onApplySettings={app.applySettings}
					onDownload={app.downloadVault}
					onClose={() => app.setSettingsOpen(false)}
				/>
			)}
		</div>
	);
}
