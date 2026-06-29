import type { MessageKey } from "@/i18n";

// Operation results are represented as typed status codes — never by matching
// display strings — so the UI (toasts) and i18n stay decoupled from wording.

export type StatusTone = "success" | "error" | "info";

export type StatusMessage = {
	tone: StatusTone;
	key: MessageKey;
	params?: Record<string, string | number>;
};

export function msg(
	tone: StatusTone,
	key: MessageKey,
	params?: Record<string, string | number>,
): StatusMessage {
	return { tone, key, params };
}

// Browser-cache lifecycle as a typed enum (no string === comparisons in the UI).
export type CacheState =
	| { status: "idle" }
	| { status: "none" }
	| { status: "unavailable" }
	| { status: "available"; savedAt: string }
	| { status: "saving" }
	| { status: "saved" }
	| { status: "error" };
