import { cn, cls } from "./tokens";

export function DashedButton({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button type="button" {...props} className={cn(cls.btnDashed, className)}>
			{children}
		</button>
	);
}
