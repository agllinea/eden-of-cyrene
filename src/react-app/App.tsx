import { useEffect } from "react";
import { useVaultApp } from "./hooks/useVaultApp";
import AuthFlow from "./components/auth/AuthFlow";
import VaultPage from "./components/vault/VaultPage";
import { ToastProvider, useToast } from "./components/Toaster";

// Status strings that indicate a UI phase/instruction, not an action result
const SILENT_STATUSES = new Set([
	"请选择 Vault。",
	"请输入密码解锁。",
	"配置新 Vault。",
	"可以设置安全问题。",
]);

function AppContent() {
	const app = useVaultApp();
	const { addToast } = useToast();

	useEffect(() => {
		if (!app.status || SILENT_STATUSES.has(app.status)) return;
		const isError = /失败|错误|无法/.test(app.status);
		addToast(app.status, isError ? "error" : "success");
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
