import { cn, cls } from "./tokens";

type IconButtonVariant = "del" | "x" | "eye" | "row" | "copy";

const variantCls: Record<IconButtonVariant, string> = {
	del:  cls.btnIconDel,
	x:    cls.btnIconX,
	eye:  cls.btnIconEye,
	row:  cls.btnIconRow,
	copy: cls.btnIconCopy,
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant: IconButtonVariant;
}

export function IconButton({ variant, className, children, type = "button", ...props }: IconButtonProps) {
	return (
		<button type={type} {...props} className={cn(variantCls[variant], className)}>
			{children}
		</button>
	);
}
