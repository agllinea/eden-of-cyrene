import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { createBlankSecurityQuestion } from "@/domain/types";
import { useI18n } from "@/i18n";
import { Button, CardButton, FloatingInput, FloatingPasswordInput, GhostButton } from "../ui";
import { App, Card, cardMotion } from "./shared";

export function SetupQuestionsCard({ app }: { app: App }) {
	const { t } = useI18n();
	const [currentIdx, setCurrentIdx] = useState(0);
	const [dir, setDir] = useState<1 | -1>(1);
	const total = app.setupQuestions.length;
	const item = app.setupQuestions[Math.min(currentIdx, total - 1)];

	const goPrev = () => { setDir(-1); setCurrentIdx((i) => Math.max(i - 1, 0)); };
	const goNext = () => { setDir(1); setCurrentIdx((i) => Math.min(i + 1, total - 1)); };
	const addQuestion = () => {
		app.setSetupQuestions([...app.setupQuestions, createBlankSecurityQuestion()]);
		setDir(1);
		setCurrentIdx(total);
	};

	return (
		<motion.div {...cardMotion}>
			<Card>
				{/* Header: back + title + page nav */}
				<div className="flex items-center -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromSetupQuestions} className="p-2 shrink-0">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700 flex-1">{t("setupQ.title")}</h2>
					<div className="flex items-center gap-0.5 shrink-0">
						<GhostButton onClick={goPrev} disabled={currentIdx === 0} className="p-1.5">
							<ChevronLeft size={14} />
						</GhostButton>
						<span className="text-xs text-slate-400 tabular-nums w-9 text-center">{currentIdx + 1} / {total}</span>
						<GhostButton onClick={goNext} disabled={currentIdx === total - 1} className="p-1.5">
							<ChevronRight size={14} />
						</GhostButton>
					</div>
				</div>

				{/* Form */}
				<div className="overflow-y-visible">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={currentIdx}
							initial={{ x: dir * 40, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: dir * -40, opacity: 0 }}
							transition={{ duration: 0.18, ease: "easeOut" }}
							className="space-y-3"
						>
							<FloatingInput
								label={t("setupQ.question", { n: currentIdx + 1 })}
								value={item.question}
								onChange={(e) => app.updateSetupQuestion(item.id, "question", e.target.value)}
							/>
							<FloatingPasswordInput
								label={t("setupQ.answer", { n: currentIdx + 1 })}
								value={item.answer}
								onChange={(e) => app.updateSetupQuestion(item.id, "answer", e.target.value)}
							/>
						</motion.div>
					</AnimatePresence>
				</div>

				<CardButton variant="air" onClick={addQuestion} icon={<Plus size={14} />} fullWidth className="mt-3">
					{t("setupQ.add")}
				</CardButton>

				{/* Footer actions */}
				<div className="mt-6 space-y-2">
					<Button fullWidth onClick={() => app.finishSecurityQuestions(true)}>
						{t("setupQ.saveEnter")}
					</Button>
					<GhostButton onClick={() => app.finishSecurityQuestions(false)} fullWidth className="py-2 text-sm justify-center">
						{t("setupQ.skip")}
					</GhostButton>
				</div>
			</Card>
		</motion.div>
	);
}
