import { AnimatePresence } from "motion/react";

import type { VaultApp } from "../../hooks/useVaultApp";
import { LoginCard } from "./LoginCard";
import { SetupPasswordCard } from "./SetupPasswordCard";
import { SetupQuestionsCard } from "./SetupQuestionsCard";
import { UnlockCard } from "./UnlockCard";

export default function AuthFlow({ app }: { app: VaultApp }) {
	return (
		<div className="min-h-dvh bg-linear-to-br from-pw-200 via-pw-50 to-ac-100 flex items-center justify-center p-4">
			<AnimatePresence mode="wait">
				{app.phase === "login" && <LoginCard key="login" app={app} />}
				{app.phase === "unlock" && <UnlockCard key="unlock" app={app} />}
				{app.phase === "setupPassword" && (
					<SetupPasswordCard key="setupPassword" app={app} />
				)}
				{app.phase === "setupQuestions" && (
					<SetupQuestionsCard key="setupQuestions" app={app} />
				)}
			</AnimatePresence>
		</div>
	);
}
