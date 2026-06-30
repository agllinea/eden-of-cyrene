import { cn, cls } from "./tokens";

type OptionCardVariant = "soft" | "primary";

interface OptionCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	title: string;
	text?: string;
	icon?: React.ReactNode;
	variant?: OptionCardVariant;
}

const cfg: Record<
	OptionCardVariant,
	{ bg: string; iconBg: string; title: string; sub: string }
> = {
	soft: {
		bg: cls.btnSecondary,
		iconBg: "bg-linear-to-br from-pw-200/20 to-pw-400/10 text-pw-500",
		title: "text-slate-700",
		sub: "text-slate-400",
	},
	primary: {
		bg: cls.btnPrimary,
		iconBg: "bg-white/50 text-ac-500",
		title: "text-ac-600",
		sub: "text-ac-500",
	},
};

/**
 * Large selection card: icon + title + sub-text in a full-width row. Used for
 * the login screen's vault-source choices — the one genuinely card-shaped
 * button (everything else is a plain `Button`).
 */
export function OptionCard({
	title,
	text,
	icon,
	variant = "soft",
	className,
	type = "button",
	...props
}: OptionCardProps) {
	const c = cfg[variant];
	return (
		<button
			type={type}
			{...props}
			className={cn(
				"w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all duration-200 cursor-pointer select-none",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				c.bg,
				className,
			)}
		>
			{icon && (
				<div
					className={cn(
						"w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
						c.iconBg,
					)}
				>
					{icon}
				</div>
			)}
			<div>
				<div className={cn("font-semibold text-sm", c.title)}>{title}</div>
				{text !== undefined && (
					<div className={cn("text-xs mt-0.5", c.sub)}>{text}</div>
				)}
			</div>
		</button>
	);
}
