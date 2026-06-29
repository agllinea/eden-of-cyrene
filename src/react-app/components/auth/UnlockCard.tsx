import { ArrowRight, ChevronLeft, Loader2, ShieldQuestion } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { Button, GhostButton, PasswordInput, TextButton } from "../ui";
import { App, Card, cardMotion } from "./shared";

export function UnlockCard({ app }: { app: App }) {
	const { t } = useI18n();
	const [loading, setLoading] = useState(false);
	const questions =
		app.securitySlot?.type === "securityQuestions"
			? app.securitySlot.questions
			: [];
	const isPasswordMode = app.unlockMode === "password";

	const handleUnlock = async () => {
		setLoading(true);
		try {
			await app.unlockVault();
		} finally {
			setLoading(false);
		}
	};

	return (
		<motion.div {...cardMotion}>
			<Card>
				<div className="flex items-center gap-1 -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromUnlock} className="p-2">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700">{t("unlock.title")}</h2>
				</div>

				<div className="space-y-4">
					{isPasswordMode ? (
						<PasswordInput
							placeholder={t("unlock.password")}
							value={app.unlockPassword}
							autoFocus
							disabled={loading}
							onChange={(e) => app.setUnlockPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && void handleUnlock()}
						/>
					) : (
						<div className="space-y-3">
							{questions.map((q, i) => (
								<div key={q.id}>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">
										{t("unlock.questionLabel", { n: i + 1, q: q.question })}
									</label>
									<PasswordInput
										placeholder={t("unlock.answer")}
										value={app.unlockAnswers[q.id] ?? ""}
										disabled={loading}
										onChange={(e) =>
											app.setUnlockAnswers({
												...app.unlockAnswers,
												[q.id]: e.target.value,
											})
										}
									/>
								</div>
							))}
						</div>
					)}

					<Button fullWidth onClick={() => void handleUnlock()} disabled={loading}>
						{loading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<ArrowRight size={16} />
						)}
						{loading ? t("unlock.unlocking") : t("unlock.unlock")}
					</Button>

					{isPasswordMode && app.securitySlot && (
						<TextButton onClick={() => app.setUnlockMode("questions")} className="w-full py-2 text-sm">
							<ShieldQuestion size={14} />
							{t("unlock.useQuestions")}
						</TextButton>
					)}
					{!isPasswordMode && app.passwordSlot && (
						<TextButton onClick={() => app.setUnlockMode("password")} className="w-full py-2 text-sm">
							{t("unlock.usePassword")}
						</TextButton>
					)}
				</div>
			</Card>
		</motion.div>
	);
}
