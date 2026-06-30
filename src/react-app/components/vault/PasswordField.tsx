import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { IconButton } from "../ui";
import { CopyButton } from "./CopyButton";

// Masked password value with reveal toggle and one-tap copy. Shared by the
// desktop table cell and the mobile card so behaviour stays identical.
// `revealCopyOnHover` hides the copy icon until row-hover on pointer devices
// (used in the dense desktop table; the card leaves it always visible).
export function PasswordField({
	value,
	revealCopyOnHover = false,
}: {
	value: string;
	revealCopyOnHover?: boolean;
}) {
	const [show, setShow] = useState(false);

	if (!value) return <span className="text-slate-300">—</span>;

	return (
		<span className="inline-flex items-center gap-1">
			<span className="font-mono text-xs">{show ? value : "••••••"}</span>
			<IconButton
				variant="eye"
				onClick={(e) => {
					e.stopPropagation();
					setShow((s) => !s);
				}}
			>
				{show ? <EyeOff size={12} /> : <Eye size={12} />}
			</IconButton>
			<CopyButton value={value} size={12} revealOnHover={revealCopyOnHover} />
		</span>
	);
}
