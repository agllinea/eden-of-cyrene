import { ChevronLeft, Database, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import {
	deleteCachedVault,
	listCachedVaults,
	type CacheEntryMeta,
} from "@/services/storage";
import { Button, IconButton } from "../ui";
import { type App, Card, cardMotion } from "./shared";

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

	return (
		<motion.div {...cardMotion}>
			<Card>
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

				{vaults === null ? (
					<div className="flex justify-center py-10">
						<Loader2 size={22} className="animate-spin text-slate-300" />
					</div>
				) : vaults.length === 0 ? (
					<p className="text-sm text-slate-400 text-center py-10">
						{t("cacheList.empty")}
					</p>
				) : (
					<div className="space-y-2">
						{vaults.map((vault) => (
							<button
								key={vault.vaultId}
								type="button"
								className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-left transition-colors"
								onClick={() => void app.openCachedVaultById(vault.vaultId)}
							>
								<Database size={18} className="text-pw-400 shrink-0" />
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-slate-700 truncate">
										{vault.vaultName}
									</div>
									<div className="text-xs text-slate-400 mt-0.5">
										{t("cacheList.savedAt", {
											time: new Date(vault.savedAt).toLocaleString(),
										})}
									</div>
								</div>
								<IconButton
									variant="del"
									onClick={(e) => void handleDelete(e, vault.vaultId)}
								>
									<Trash2 size={14} />
								</IconButton>
							</button>
						))}
					</div>
				)}
			</Card>
		</motion.div>
	);
}
