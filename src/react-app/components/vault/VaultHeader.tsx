import { Cloud, CloudCheck, CloudOff, Download, Loader2, Menu, Search, Settings } from "lucide-react";

import type { VaultApp } from "@/hooks/useVaultApp";
import { useI18n } from "@/i18n";
import { Button, Input } from "../ui";

type App = VaultApp;

export function VaultHeader({ app, onMenuClick }: { app: App; onMenuClick: () => void }) {
	const { t } = useI18n();
	return (
		<header className="shrink-0 min-h-16 pt-safe bg-white border-b border-pw-100 flex items-center px-4 gap-2 shadow-md z-50">
			{/* Hamburger — mobile only */}
			<Button variant="ghost" onClick={onMenuClick} icon={<Menu size={18} />} size="lg" className="md:hidden" />

			<h1 className="hidden md:block text-slate-800 font-bold text-base tracking-tight truncate md:shrink-0">
				{app.vault.name || "Eden of Cyrene"}
			</h1>

			{/* Search — desktop center */}
			<div className="hidden md:flex flex-1 justify-center px-4 gap-2">
				<Input
					leadingIcon={<Search size={14} />}
					value={app.searchText}
					onChange={(e) => app.setSearchText(e.target.value)}
					// placeholder={t("sidebar.search")}
					// className="max-w-xs w-full"
					containerClassName="w-xs"
				/>
				<Button className="px-7" variant="primary" onClick={() => app.setSettingsOpen(true)} size="sm">{t("sidebar.search")}</Button>
			
			</div>

			<Button variant="ghost" onClick={() => app.setSettingsOpen(true)} icon={<Settings size={16} />} size="lg" className="ml-auto md:ml-0" />
			{app.driveLinked ? (
				<Button
					variant="primary"
					onClick={() => void app.syncNow()}
					disabled={app.driveState === "syncing"}
					icon={
						app.driveState === "syncing" ? <Loader2 size={16} className="animate-spin" /> :
						app.driveState === "synced" ? <CloudCheck size={16} /> :
						app.driveState === "error" ? <CloudOff size={16} /> :
						<Cloud size={16} />
					}
					size="lg"
				/>
			) : (
				<Button variant="primary" onClick={() => void app.downloadVault()} icon={<Download size={16} />} size="lg" />
			)}
		</header>
	);
}
