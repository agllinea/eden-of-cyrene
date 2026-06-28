import { cn, CardButtonSize, btnSquareCls } from "./tokens";

interface GhostButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	icon?: React.ReactNode;
	size?: CardButtonSize;
	fullWidth?: boolean;
}

export function GhostButton({ icon, size = "md", fullWidth, children, className, ...props }: GhostButtonProps) {
	const isIconOnly = !!icon && !children;
	return (
		<button
			{...props}
			className={cn(
				"flex items-center gap-1.5",
				"text-slate-400 hover:bg-slate-100",
				"transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
				isIconOnly ? btnSquareCls[size] : "rounded-xl",
				fullWidth && "w-full",
				className,
			)}
		>
			{icon}
			{children}
		</button>
	);
}
