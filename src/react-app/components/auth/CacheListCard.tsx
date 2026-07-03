import { ChevronLeft, Database } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import {
	deleteCachedVault,
	listCachedVaults,
	type CacheEntryMeta,
} from "@/services/storage";
import { Button } from "../ui";
import { type App } from "./shared";
import { SourceListCard, type VaultSourceRow } from "./SourceListCard";

export function CacheListCard({ app }: { app: App }) {
	const { t } = useI18n();
	const [vaults, setVaults] = useState<CacheEntryMeta[] | null>(null);

	useEffect(() => {
		listCachedVaults().then(setVaults).catch(() => setVaults([]));
	}, []);

	const handleDelete = async (e: React.MouseEvent, vaultId: string) => {
		e.stopPropagation();
		try {
			await deleteCachedVault(vaultId);
			setVaults((prev) => prev?.filter((v) => v.vaultId !== vaultId) ?? null);
		} catch {
			// deletion failed silently; item remains in list
		}
	};

	const rows: VaultSourceRow[] | null = vaults === null ? null : vaults.map((vault) => ({
		key: vault.vaultId,
		icon: <Database size={18} className="text-pw-400 shrink-0" />,
		name: vault.vaultName,
		subtitle: t("cacheList.savedAt", { time: new Date(vault.savedAt).toLocaleString() }),
		onOpen: () => void app.openCachedVaultById(vault.vaultId),
		onDelete: (e) => void handleDelete(e, vault.vaultId),
	}));

	return (
		<SourceListCard
			header={
				<div className="flex items-center gap-1 -ml-2 mb-6">
					<Button
						variant="ghost"
						icon={<ChevronLeft size={18} strokeWidth={2.5} />}
						onClick={app.goBackFromCacheList}
						className="p-2"
					/>
					<h2 className="text-base font-semibold text-slate-700">
						{t("cacheList.title")}
					</h2>
				</div>
			}
			rows={rows}
			emptyText={t("cacheList.empty")}
		/>
	);
}
