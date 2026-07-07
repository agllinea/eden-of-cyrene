import { createContext, useContext } from "react";

import type { MessageKey } from "./en";

export type { MessageKey };

export type Locale = "zh" | "en";

export const LOCALES: Locale[] = ["zh", "en"];

type TranslateParams = Record<string, string | number>;

// Accept known keys (with autocomplete) but tolerate dynamic strings too.
export type TFunction = (
	key: MessageKey | (string & {}),
	params?: TranslateParams,
) => string;

export interface I18nContextValue {
	locale: Locale;
	setLocale: (locale: Locale) => void;
	t: TFunction;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		throw new Error("useI18n must be used within an I18nProvider");
	}
	return ctx;
}
