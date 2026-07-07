import logoUrl from "../../assets/logo.svg";
import { useI18n } from "@/i18n";
import type { VaultApp } from "../../hooks/useVaultApp";

export type App = VaultApp;

export function AppLogo({ subtitle }: { subtitle?: string }) {
	const { t } = useI18n();
	return (
		<div className="flex flex-col items-center mb-8">
			<img
				src={logoUrl}
				alt=""
				className="w-20 h-20 mb-4"
				style={{ filter: "drop-shadow(0 6px 18px rgba(159,112,240,0.45))" }}
			/>
			<h1 className="text-2xl font-bold text-slate-800 tracking-tight">
				{t("app.name")}
			</h1>
			{subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
		</div>
	);
}

export function Card({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-pw-300/20 p-8 w-full border border-pw-100/60">
			{children}
		</div>
	);
}
