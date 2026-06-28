import { Plus } from "lucide-react";
import { useState } from "react";

import type { VaultApp } from "../../hooks/useVaultApp";
import { CardButton } from "../ui";
import EntryModal from "./EntryModal";
import { EntryTable } from "./EntryTable";
import SettingsModal from "./SettingsModal";
import { VaultHeader } from "./VaultHeader";
import { VaultSidebar } from "./VaultSidebar";

export default function VaultPage({ app }: { app: VaultApp }) {
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

				<main className="flex-1 relative overflow-hidden bg-white">
					<EntryTable app={app} />

					{/* FAB */}
					<div className="absolute bottom-7 right-7">
						<CardButton
							onClick={app.openNewEntry}
							aria-label="新建密码"
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
					cacheStatus={app.cacheStatus}
					onSetCacheEnabled={app.setCacheEnabled}
					onUpdateVaultName={app.updateVaultName}
					onUpdateSettings={app.setSettings}
					onUpdateSecurityQuestion={app.updateSecurityQuestion}
					onDownload={app.downloadVault}
					onClose={() => app.setSettingsOpen(false)}
				/>
			)}
		</div>
	);
}
