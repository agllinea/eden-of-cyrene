import { useState } from "react";

import type { StatusMessage } from "@/domain/status";

/** Holds the most recent operation result as a typed status code. */
export function useStatus() {
	const [status, setStatus] = useState<StatusMessage | null>(null);
	return { status, setStatus };
}

export type StatusController = ReturnType<typeof useStatus>;
