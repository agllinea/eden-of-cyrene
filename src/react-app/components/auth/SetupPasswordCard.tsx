import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

import { useI18n } from "@/i18n";
import { Button, FloatingInput, FloatingPasswordInput } from "../ui";
import { App, Card } from "./shared";
import { cardMotion } from "./cardMotion";

export function SetupPasswordCard({ app }: { app: App }) {
	const { t } = useI18n();
	return (
		<motion.div {...cardMotion}>
			<Card>
				<div className="flex items-center gap-1 -ml-2 mb-6">
					<Button
						variant="ghost"
						icon={<ChevronLeft size={18} strokeWidth={2.5} />}
						onClick={app.goBackFromSetupPassword}
						className="p-2"
					/>
					<h2 className="text-base font-semibold text-slate-700">{t("setup.title")}</h2>
				</div>

				<div className="space-y-3">
					<FloatingInput
						label={t("setup.vaultName")}
						value={app.setupVaultName}
						autoFocus
						onChange={(e) => app.setSetupVaultName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
					<FloatingPasswordInput
						label={t("setup.password")}
						value={app.setupPassword}
						onChange={(e) => app.setSetupPassword(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
				</div>

				<div className="mt-8 space-y-2">
					<Button variant="primary" fullWidth onClick={app.continueWithPassword}>
						{t("setup.next")}
					</Button>

					<Button variant="ghost" onClick={app.createVaultWithoutPassword} fullWidth className="py-2 text-sm justify-center">
						{t("setup.noPassword")}
					</Button>
				</div>
			</Card>
		</motion.div>
	);
}
