import { cn, cls, sizeCls, squareCls, type ButtonSize } from "./tokens";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "ghost"
	| "danger"
	| "link"
	| "dashed";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	icon?: React.ReactNode;
}

const solid: Record<"primary" | "secondary" | "ghost" | "danger", string> = {
	primary: cls.btnPrimary,
	secondary: cls.btnSecondary,
	ghost: cls.btnGhost,
	danger: cls.btnDanger,
};

const disabled = "disabled:opacity-50 disabled:cursor-not-allowed";

/**
 * The single text-button entry point. `link` and `dashed` are self-contained
 * looks; the solid variants share base + size styling and collapse to a square
 * when given an `icon` with no children.
 */
export function Button({
	variant = "primary",
	size = "md",
	fullWidth,
	icon,
	children,
	className,
	type = "button",
	...props
}: ButtonProps) {
	const content = (
		<>
			{icon}
			{children}
		</>
	);

	if (variant === "link") {
		return (
			<button
				type={type}
				{...props}
				className={cn(
					"inline-flex items-center justify-center gap-1.5",
					cls.btnLink,
					disabled,
					className,
				)}
			>
				{content}
			</button>
		);
	}

	if (variant === "dashed") {
		return (
			<button type={type} {...props} className={cn(cls.btnDashed, disabled, className)}>
				{content}
			</button>
		);
	}

	const isIconOnly = !!icon && !children;

	return (
		<button
			type={type}
			{...props}
			className={cn(
				"inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer select-none",
				disabled,
				solid[variant],
				isIconOnly ? squareCls[size] : sizeCls[size],
				fullWidth && "w-full",
				className,
			)}
		>
			{content}
		</button>
	);
}
