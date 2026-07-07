import { Database, Plus, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";

import { useI18n } from "@/i18n";
import { cacheStateLabel } from "@/i18n/format";
import { GoogleDriveIcon } from "../GoogleDriveIcon";
import { OptionCard } from "../ui";
import { App, AppLogo, Card } from "./shared";
import { cardMotion } from "./cardMotion";

export function LoginCard({ app }: { app: App }) {
	const fileRef = useRef<HTMLInputElement>(null);
	const { t } = useI18n();

	return (
		<motion.div {...cardMotion}>
			<Card>
				<AppLogo subtitle={t("login.subtitle")} />

				<div className="space-y-3">
					<OptionCard
						variant="soft"
						onClick={() => fileRef.current?.click()}
						title={t("login.openFile.title")}
						text={t("login.openFile.text")}
						icon={<Upload size={20} />}
					/>

					<OptionCard
						variant="soft"
						onClick={app.openCacheList}
						title={t("login.useCache.title")}
						text={cacheStateLabel(app.cacheState, t)}
						icon={<Database size={20} />}
					/>

					<OptionCard
						variant="soft"
						onClick={() => void app.openDriveList()}
						title={t("login.useGoogleDrive.title")}
						text={t("login.useGoogleDrive.text")}
						icon={<GoogleDriveIcon size={20} />}
					/>

					<OptionCard
						variant="primary"
						onClick={app.startNewVault}
						title={t("login.newVault.title")}
						text={t("login.newVault.text")}
						icon={<Plus size={20} />}
					/>
				</div>

				<input
					ref={fileRef}
					type="file"
					accept=".json"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void app.openVaultFile(file);
						e.target.value = "";
					}}
				/>
			</Card>
		</motion.div>
	);
}
