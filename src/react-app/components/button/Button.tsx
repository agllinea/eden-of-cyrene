import { cn, cls, sizeCls } from "./tokens";
import { CardButton } from "./CardButton";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: "sm" | "md" | "lg";
	fullWidth?: boolean;
}

const variantCls: Record<Exclude<ButtonVariant, "primary">, string> = {
	secondary: cls.btnSoft,
	ghost:     cls.btnGhost,
	danger:    cls.btnDanger,
};

export function Button({
	variant = "primary",
	size = "md",
	fullWidth,
	children,
	className,
	...props
}: ButtonProps) {
	if (variant === "primary") {
		return (
			<CardButton {...props} size={size} fullWidth={fullWidth} className={className}>
				{children}
			</CardButton>
		);
	}

	return (
		<button
			{...props}
			className={cn(
				"font-medium transition-all duration-200 flex items-center justify-center",
				"disabled:opacity-50 disabled:cursor-not-allowed",
				variantCls[variant],
				sizeCls[size],
				fullWidth && "w-full",
				className,
			)}
		>
			{children}
		</button>
	);
}
