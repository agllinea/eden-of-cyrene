import { cn, cls, CardButtonSize, btnSizeCls, btnGapCls, btnSquareCls } from "./tokens";

type CardButtonVariant = "macaroon" | "light" | "air";

export interface CardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: CardButtonVariant;
	title?: string;
	text?: string;
	icon?: React.ReactNode;
	size?: CardButtonSize;
	fullWidth?: boolean;
}

const config: Record<CardButtonVariant, {
	button: string;
	text: string;
	cardIcon: string;
	cardTitle: string;
	cardSubtext: string;
	overlays: boolean;
}> = {
	macaroon: {
		button:     "group relative overflow-hidden",
		text:       "text-ac-600",
		cardIcon:   "bg-white/50 text-ac-500",
		cardTitle:  "text-ac-600",
		cardSubtext: "text-ac-500",
		overlays:   true,
	},
	light: {
		button:     cls.btnCard,
		text:       "text-slate-600",
		cardIcon:   "bg-linear-to-br from-pw-200/20 to-pw-400/10 text-pw-500",
		cardTitle:  "text-slate-700",
		cardSubtext: "text-slate-400",
		overlays:   false,
	},
	air: {
		button:     "border border-dashed border-pw-300 hover:border-pw-400",
		text:       "text-pw-500 hover:text-pw-600",
		cardIcon:   "bg-linear-to-br from-pw-200/20 to-pw-400/10 text-pw-500",
		cardTitle:  "text-pw-500 hover:text-pw-600",
		cardSubtext: "text-pw-500/50 hover:text-pw-600/50",
		overlays:   false,
	},
};

export function CardButton({
	variant = "macaroon",
	title,
	text,
	icon,
	size = "md",
	fullWidth,
	children,
	className,
	...props
}: CardButtonProps) {
	const c = config[variant];
	const isCard = !!title;
	const isIconOnly = !isCard && !!icon && !text && !children;

	return (
		<button
			{...props}
			className={cn(
				"disabled:opacity-50 disabled:cursor-not-allowed",
				c.button,
				isCard
					? "flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
					: cn("font-medium flex items-center justify-center", isIconOnly ? btnSquareCls[size] : btnSizeCls[size]),
				fullWidth && "w-full",
				className,
			)}
		>
			{c.overlays && (
				<>
					<div className="absolute inset-0 z-0 bg-linear-to-br from-pw-100 to-ac-100" />
					<div className="absolute inset-0 z-0 bg-linear-to-br from-pw-200/40 to-ac-200/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
				</>
			)}

			{isCard ? (
				<>
					{icon && (
						<div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", c.cardIcon, c.overlays && "relative z-10")}>
							{icon}
						</div>
					)}
					<div className={c.overlays ? "relative z-10" : undefined}>
						<div className={cn("font-semibold text-sm", c.cardTitle)}>{title}</div>
						{text !== undefined && <div className={cn("text-xs mt-0.5", c.cardSubtext)}>{text}</div>}
					</div>
				</>
			) : (
				<span className={cn("flex items-center", c.text, !isIconOnly && btnGapCls[size], c.overlays && "relative z-10")}>
					{icon}{text}{children}
				</span>
			)}
		</button>
	);
}
