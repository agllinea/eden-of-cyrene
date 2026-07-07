import { useCallback, useMemo, useState } from "react";

import { en, type MessageKey } from "./en";
import { zh } from "./zh";
import { I18nContext, type Locale, type TFunction } from ".";

const dictionaries: Record<Locale, Record<MessageKey, string>> = { zh, en };

const STORAGE_KEY = "eden-locale";

type TranslateParams = Record<string, string | number>;

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
