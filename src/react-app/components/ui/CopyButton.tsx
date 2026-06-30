import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { useCopy } from "@/hooks/useCopy";
import { useI18n } from "@/i18n";
import { IconButton } from "../button";

// One-tap copy for any text value. Renders nothing for empty values, stops click
// propagation (so it works inside clickable rows/cards/inputs), and briefly shows
// a check on success in addition to the global toast. Callers control
// reveal-on-hover behaviour via `className` (e.g. the table cell groups).
export function CopyButton({
	value,
	size = 13,
	className,
}: {
	value: string;
	size?: number;
	className?: string;
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
			className={className}
		>
			{done ? (
				<Check size={size} className="text-green-500" />
			) : (
				<Copy size={size} />
			)}
		</IconButton>
	);
}
