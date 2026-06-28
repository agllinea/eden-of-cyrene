import { cn, CardButtonSize, btnSizeCls, btnGapCls, btnSquareCls } from "./tokens";

export interface MacaronButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	title?: string;
	text?: string;
	icon?: React.ReactNode;
	size?: CardButtonSize;
	fullWidth?: boolean;
}

export function MacaronButton({
	title,
	text,
	icon,
	size = "md",
	fullWidth,
	children,
	className,
	...props
}: MacaronButtonProps) {
	const isCard = !!title;
	const isIconOnly = !isCard && !!icon && !text && !children;

	return (
		<button
			{...props}
			className={cn(
				"group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed",
				isCard
					? "flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
					: cn("font-medium flex items-center justify-center", isIconOnly ? btnSquareCls[size] : btnSizeCls[size]),
				fullWidth && "w-full",
				className,
			)}
		>
			<div className="absolute inset-0 z-0 bg-linear-to-br from-pw-100 to-ac-100" />
			<div className="absolute inset-0 z-0 bg-linear-to-br from-pw-200/40 to-ac-200/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

			{isCard ? (
				<>
					{icon && (
						<div className="relative z-10 w-11 h-11 bg-white/50 rounded-xl flex items-center justify-center shrink-0 text-ac-500">
							{icon}
						</div>
					)}
					<div className="relative z-10">
						<div className="font-semibold text-ac-600 text-sm">{title}</div>
						{text && <div className="text-xs text-ac-500 mt-0.5">{text}</div>}
					</div>
				</>
			) : (
				<span className={cn("relative z-10 flex items-center text-ac-600", !isIconOnly && btnGapCls[size])}>
					{icon}{text}{children}
				</span>
			)}
		</button>
	);
}
