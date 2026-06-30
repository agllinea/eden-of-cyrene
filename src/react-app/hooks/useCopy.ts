import { useCallback } from "react";

import { useToast } from "@/components/Toaster";
import { useI18n } from "@/i18n";

/** Copy text to the clipboard with a localized toast. Returns success. */
export function useCopy() {
	const { addToast } = useToast();
	const { t } = useI18n();

	return useCallback(
		async (value: string): Promise<boolean> => {
			if (!value) return false;
			try {
				await navigator.clipboard.writeText(value);
				addToast(t("status.copied"));
				return true;
			} catch {
				addToast(t("status.copyFailed"));
				return false;
			}
		},
		[addToast, t],
	);
}
