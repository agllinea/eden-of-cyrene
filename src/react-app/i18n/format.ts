import type { CacheState } from "@/domain/status";

import type { TFunction } from ".";

/** Renders the typed cache state into a localized label. */
export function cacheStateLabel(state: CacheState, t: TFunction): string {
	switch (state.status) {
		case "available":
			return t("cache.available", { count: state.count });
		case "saving":
			return t("cache.saving");
		case "saved":
			return t("cache.saved");
		case "error":
			return t("cache.error");
		case "none":
			return t("cache.none");
		case "unavailable":
			return t("cache.unavailable");
		case "idle":
		default:
			return t("cache.idle");
	}
}
