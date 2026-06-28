import { cn, cls } from "./tokens";

type TextButtonVariant = "brand" | "muted";

const variantCls: Record<TextButtonVariant, string> = {
	brand: cls.btnText,
	muted: cls.btnTextMuted,
};

interface TextButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: TextButtonVariant;
}

export function TextButton({ variant = "brand", children, className, type = "button", ...props }: TextButtonProps) {
	return (
		<button type={type} {...props} className={cn("flex items-center justify-center gap-1.5", variantCls[variant], className)}>
			{children}
		</button>
	);
}
