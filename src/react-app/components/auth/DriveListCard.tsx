import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/i18n";
import { deleteDriveVault, getCachedAccountEmail, listDriveVaults, type DriveEntryMeta } from "@/services/googleDrive";
import { GoogleDriveIcon } from "../GoogleDriveIcon";
import { Button } from "../ui";
import { type App } from "./shared";
import { SourceListCard, type VaultSourceRow } from "./SourceListCard";

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

	const rows: VaultSourceRow[] | null = vaults === null ? null : (
		loadError ? [] : vaults.map((vault) => ({
			key: vault.fileId,
			icon: <GoogleDriveIcon size={18} />,
			name: vault.name,
			subtitle: t("driveList.modified", { time: new Date(vault.modifiedTime).toLocaleString() }),
			onOpen: () => void app.openDriveVaultById(vault.fileId),
			onDelete: (e) => void handleDelete(e, vault.fileId),
		}))
	);

	return (
		<SourceListCard
			header={
				<div className="flex items-center justify-between -ml-2 mb-6">
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							icon={<ChevronLeft size={18} strokeWidth={2.5} />}
							onClick={app.goBackFromDriveList}
							className="p-2"
						/>
						{/* <GoogleDriveIcon size={18} /> */}
						<div>
							<h2 className="text-base font-semibold text-slate-700">
								{/* {t("driveList.title")} */}
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
			}
			rows={rows}
			emptyText={t("driveList.empty")}
		/>
	);
}
