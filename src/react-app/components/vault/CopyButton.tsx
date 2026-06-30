import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useCopy } from "@/hooks/useCopy";
import { useI18n } from "@/i18n";
import { cn, IconButton } from "../ui";

// Reveal-on-hover only where a real pointer exists; touch devices have no hover
// so the control stays visible. Requires a `group` ancestor (the table row).
const hoverReveal =
	"opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100";

// One-tap copy for any field value. Renders nothing for empty values, stops
// click propagation (so it works inside clickable rows/cards), and briefly
// shows a check on success in addition to the global toast.
export function CopyButton({
	value,
	size = 13,
	className,
	revealOnHover = false,
}: {
	value: string;
	size?: number;
	className?: string;
	revealOnHover?: boolean;
}) {
	const copy = useCopy();
	const { t } = useI18n();
	const [done, setDone] = useState(false);

	if (!value) return null;

	const handle = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (await copy(value)) {
			setDone(true);
			window.setTimeout(() => setDone(false), 1200);
		}
	};

	return (
		<IconButton
			variant="copy"
			onClick={handle}
			title={t("a11y.copy")}
			aria-label={t("a11y.copy")}
			className={cn(revealOnHover && hoverReveal, className)}
		>
			{done ? (
				<Check size={size} className="text-green-500" />
			) : (
				<Copy size={size} />
			)}
		</IconButton>
	);
}
