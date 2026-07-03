import { Languages } from "lucide-react";
import { AnimatePresence } from "motion/react";

import { useI18n } from "@/i18n";
import { Button } from "../ui";
import type { VaultApp } from "../../hooks/useVaultApp";
import { CacheListCard } from "./CacheListCard";
import { DriveListCard } from "./DriveListCard";
import { LoginCard } from "./LoginCard";
import { SetupPasswordCard } from "./SetupPasswordCard";
import { SetupQuestionsCard } from "./SetupQuestionsCard";
import { UnlockCard } from "./UnlockCard";

export default function AuthFlow({ app }: { app: VaultApp }) {
	const { locale, setLocale } = useI18n();
	const nextLocale = locale === "zh" ? "en" : "zh";
	const currentLabel = locale === "zh" ? "中文" : "EN";

	return (
		<div className="min-h-dvh bg-linear-to-br from-pw-200 via-pw-50 to-ac-100 flex items-center justify-center p-4">
			<Button
				variant="ghost"
				size="sm"
				className="fixed top-3 right-4 gap-1.5 text-slate-500"
				onClick={() => setLocale(nextLocale)}
			>
				{currentLabel}
				<Languages size={15} />
			</Button>

			<div className="w-full max-w-md">
				<AnimatePresence mode="wait">
					{app.phase === "login" && <LoginCard key="login" app={app} />}
					{app.phase === "cacheList" && <CacheListCard key="cacheList" app={app} />}
					{app.phase === "driveList" && <DriveListCard key="driveList" app={app} />}
					{app.phase === "unlock" && <UnlockCard key="unlock" app={app} />}
					{app.phase === "setupPassword" && (
						<SetupPasswordCard key="setupPassword" app={app} />
					)}
					{app.phase === "setupQuestions" && (
						<SetupQuestionsCard key="setupQuestions" app={app} />
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}
