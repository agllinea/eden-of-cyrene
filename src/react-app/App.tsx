import { useEffect } from "react";
import { useVaultApp } from "@/hooks/useVaultApp";
import AuthFlow from "@/components/auth/AuthFlow";
import VaultPage from "@/components/vault/VaultPage";
import { ToastProvider, useToast } from "@/components/Toaster";
import { useI18n } from "@/i18n";

function AppContent() {
	const app = useVaultApp();
	const { addToast } = useToast();
	const { t } = useI18n();

	// Status is a typed code, so the toast tone comes from `tone` — never from
	// pattern-matching display text.
	useEffect(() => {
		if (!app.status || app.status.tone !== "error") return;
		addToast(t(app.status.key, app.status.params));
	}, [app.status]); // eslint-disable-line react-hooks/exhaustive-deps

	if (app.phase !== "ready") return <AuthFlow app={app} />;
	return <VaultPage app={app} />;
}

export default function App() {
	return (
		<ToastProvider>
			<AppContent />
		</ToastProvider>
	);
}
