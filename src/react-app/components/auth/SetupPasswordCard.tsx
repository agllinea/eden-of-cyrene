import { ChevronLeft } from "lucide-react";
import { motion } from "motion/react";

import { CardButton, FloatingInput, FloatingPasswordInput, GhostButton } from "../ui";
import { App, Card, cardMotion } from "./shared";

export function SetupPasswordCard({ app }: { app: App }) {
	return (
		<motion.div {...cardMotion}>
			<Card>
				<div className="flex items-center gap-1 -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromSetupPassword} className="p-2">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700">新建 Vault</h2>
				</div>

				<div className="space-y-3">
					<FloatingInput
						label="Vault 名称"
						value={app.setupVaultName}
						autoFocus
						onChange={(e) => app.setSetupVaultName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
					<FloatingPasswordInput
						label="密码"
						value={app.setupPassword}
						onChange={(e) => app.setSetupPassword(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
				</div>

				<div className="mt-8 space-y-2">
					<CardButton fullWidth onClick={app.continueWithPassword}>
						下一步
					</CardButton>

					<GhostButton onClick={app.createVaultWithoutPassword} fullWidth className="py-2 text-sm justify-center">
						不使用密码
					</GhostButton>
				</div>
			</Card>
		</motion.div>
	);
}
