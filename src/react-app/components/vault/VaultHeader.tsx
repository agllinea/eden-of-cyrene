import { Download, LayoutGrid, Menu, Rows3, Settings } from "lucide-react";

import type { VaultApp } from "@/hooks/useVaultApp";
import { useI18n } from "@/i18n";
import { CardButton, GhostButton } from "../ui";

type App = VaultApp;

export function VaultHeader({ app, onMenuClick }: { app: App; onMenuClick: () => void }) {
	const { t } = useI18n();
	const cardView = app.viewMode === "card";

	return (
		<header className="shrink-0 min-h-14 pt-safe bg-white border-b border-pw-100 flex items-center px-4 gap-2 shadow-sm">
			{/* Hamburger — mobile only */}
			<CardButton variant="light" onClick={onMenuClick} icon={<Menu size={18} />} size="sm" className="md:hidden" />

			<h1 className="text-slate-800 font-bold text-base tracking-tight flex-1 truncate">
				{app.vault.name || "Eden of Cyrene"}
			</h1>

			{/* Card/table toggle — mobile only (desktop is always a table) */}
			<GhostButton
				onClick={() => app.setViewMode(cardView ? "table" : "card")}
				icon={cardView ? <Rows3 size={16} /> : <LayoutGrid size={16} />}
				size="sm"
				className="md:hidden"
				title={cardView ? t("view.table") : t("view.card")}
				aria-label={cardView ? t("view.table") : t("view.card")}
			/>

			<GhostButton onClick={() => app.setSettingsOpen(true)} icon={<Settings size={16} />} size="sm" />
			<CardButton onClick={() => void app.downloadVault()} icon={<Download size={16} />} size="sm" />
		</header>
	);
}
