import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { en, type MessageKey } from "./en";
import { zh } from "./zh";

export type { MessageKey } from "./en";

export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];

const dictionaries: Record<Locale, Record<MessageKey, string>> = { zh, en };

const STORAGE_KEY = "eden-locale";

type TranslateParams = Record<string, string | number>;

// Accept known keys (with autocomplete) but tolerate dynamic strings too.
export type TFunction = (
	key: MessageKey | (string & {}),
	params?: TranslateParams,
) => string;

function detectLocale(): Locale {
	if (typeof window === "undefined") return "zh";
	const stored = window.localStorage.getItem(STORAGE_KEY);
	if (stored === "zh" || stored === "en") return stored;
	return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function interpolate(template: string, params?: TranslateParams) {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (match, name) =>
		name in params ? String(params[name]) : match,
	);
}

interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: TFunction;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(detectLocale);

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
		try {
			window.localStorage.setItem(STORAGE_KEY, next);
		} catch {
			// ignore storage failures (private mode, etc.)
		}
	}, []);

	const t = useCallback<TFunction>(
		(key, params) => {
			const dict = dictionaries[locale];
			const template = dict[key as MessageKey] ?? en[key as MessageKey] ?? key;
			return interpolate(template, params);
		},
		[locale],
	);

	const value = useMemo(
		() => ({ locale, setLocale, t }),
		[locale, setLocale, t],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return ctx;
}
