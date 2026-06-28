import { cn, cls, sizeCls } from "./tokens";

export function DangerButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			className={cn(
				"font-medium transition-all duration-200 flex items-center justify-center",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				cls.btnDanger,
				sizeCls["md"],
				className,
			)}
		>
			{children}
		</button>
	);
}
