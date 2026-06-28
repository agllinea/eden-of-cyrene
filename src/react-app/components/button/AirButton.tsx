import { cn, CardButtonSize, btnSizeCls, btnGapCls, btnSquareCls } from "./tokens";
import type { LightButtonProps } from "./LightButton";

export function AirButton({
	title,
	text,
	icon,
	size = "md",
	fullWidth,
	children,
	className,
	...props
}: LightButtonProps) {
	const isCard = !!title;
	const isIconOnly = !isCard && !!icon && !text && !children;

	return (
		<button
			{...props}
			className={cn(
				"border border-dashed border-pw-300 hover:border-pw-400 rounded-xl",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				isCard
					? "flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
					: cn("font-medium flex items-center justify-center", isIconOnly ? btnSquareCls[size] : btnSizeCls[size]),
				fullWidth && "w-full",
				className,
			)}
		>
			{isCard ? (
				<>
					{icon && (
						<div className="w-11 h-11 bg-linear-to-br from-pw-200/20 to-pw-400/10 rounded-xl flex items-center justify-center shrink-0 text-pw-500">
							{icon}
						</div>
					)}
					<div>
						<div className="font-semibold text-pw-500 hover:text-pw-600 text-sm">{title}</div>
						{text !== undefined && <div className="text-xs text-pw-500/50 hover:text-pw-600/50 mt-0.5">{text}</div>}
					</div>
				</>
			) : (
				<span className={cn("flex items-center text-pw-500 hover:text-pw-600", !isIconOnly && btnGapCls[size])}>
					{icon}{text}{children}
				</span>
			)}
		</button>
	);
}
