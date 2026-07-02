import { ChevronLeft, Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { deleteDriveVault, getCachedAccountEmail, listDriveVaults, type DriveEntryMeta } from "@/services/googleDrive";
import { GoogleDriveIcon } from "../GoogleDriveIcon";
import { Button, IconButton } from "../ui";
import { type App, Card, cardMotion } from "./shared";

export function DriveListCard({ app }: { app: App }) {
	const { t } = useI18n();
	const [vaults, setVaults] = useState<DriveEntryMeta[] | null>(null);
	const [loadError, setLoadError] = useState(false);
	const accountEmail = getCachedAccountEmail();

	useEffect(() => {
		listDriveVaults()
			.then(setVaults)
			.catch(() => { setLoadError(true); setVaults([]); });
	}, []);

	const handleDelete = async (e: React.MouseEvent, fileId: string) => {
		e.stopPropagation();
		try {
			await deleteDriveVault(fileId);
			setVaults((prev) => prev?.filter((v) => v.fileId !== fileId) ?? null);
		} catch { /* deletion failed silently */ }
	};

	return (
		<motion.div {...cardMotion}>
			<Card>
				<div className="flex items-center justify-between -ml-2 mb-6">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							icon={<ChevronLeft size={18} strokeWidth={2.5} />}
							onClick={app.goBackFromDriveList}
							className="p-2"
						/>
						<GoogleDriveIcon size={18} />
						<div>
							<h2 className="text-base font-semibold text-slate-700">
								{t("driveList.title")}
							</h2>
							{accountEmail && (
								<p className="text-xs text-slate-400 leading-tight">{accountEmail}</p>
							)}
						</div>
					</div>
					<Button
						variant="ghost"
						onClick={() => void app.switchDriveAccount()}
						className="text-xs shrink-0"
					>
						{t("driveList.switchAccount")}
					</Button>
				</div>

				{vaults === null ? (
					<div className="flex justify-center py-10">
						<Loader2 size={22} className="animate-spin text-slate-300" />
					</div>
				) : loadError || vaults.length === 0 ? (
					<p className="text-sm text-slate-400 text-center py-10">
						{t("driveList.empty")}
					</p>
				) : (
					<div className="space-y-2">
						{vaults.map((vault) => (
							<button
								key={vault.fileId}
								type="button"
								className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-left transition-colors"
								onClick={() => void app.openDriveVaultById(vault.fileId)}
							>
								<GoogleDriveIcon size={18} />
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-slate-700 truncate">
										{vault.name}
									</div>
									<div className="text-xs text-slate-400 mt-0.5">
										{t("driveList.modified", {
											time: new Date(vault.modifiedTime).toLocaleString(),
										})}
									</div>
								</div>
								<IconButton
									variant="del"
									onClick={(e) => void handleDelete(e, vault.fileId)}
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
