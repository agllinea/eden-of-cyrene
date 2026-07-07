import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { I18nProvider } from "@/i18n/I18nProvider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ErrorBoundary>
			<I18nProvider>
				<App />
			</I18nProvider>
		</ErrorBoundary>
	</StrictMode>,
);

// Offline support / installability — production only so the SW never interferes
// with the Vite dev server's HMR.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// Registration failures are non-fatal; the app still works online.
		});
	});
}
