import { Eye, EyeOff, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";

import { cn, IconButton } from "./button";

export * from "./button";

// ── Inputs ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
}

export function FloatingInput({
	label,
	className,
	value,
	onChange,
	onFocus,
	onBlur,
	...props
}: Omit<InputProps, "placeholder"> & { label: string }) {
	const id = useId();
	const [focused, setFocused] = useState(false);
	const isFloating = focused || (typeof value === "string" ? value.length > 0 : !!value);

	return (
		<div className="relative w-full">
			<input
				{...props}
				id={id}
				value={value}
				onChange={onChange}
				onFocus={(e) => { setFocused(true); onFocus?.(e); }}
				onBlur={(e) => { setFocused(false); onBlur?.(e); }}
				placeholder=""
				className={cn(
					"w-full px-4 py-2.5 rounded-xl border bg-white",
					"text-sm text-slate-700",
					"focus:outline-none transition-all duration-200 disabled:opacity-50",
					focused ? "border-pw-400 ring-2 ring-pw-100" : "border-pw-200",
					className,
				)}
			/>
			<label
				htmlFor={id}
				className={cn(
					"absolute pointer-events-none select-none transition-all duration-200",
					isFloating
						? "left-3 top-0 -translate-y-1/2 text-xs px-1 bg-white text-pw-500"
						: "left-4 top-1/2 -translate-y-1/2 text-sm text-slate-300",
				)}
			>
				{label}
			</label>
		</div>
	);
}

export function FloatingPasswordInput({
	label,
	className,
	value,
	onChange,
	onFocus,
	onBlur,
	...props
}: Omit<InputProps, "placeholder" | "type"> & { label: string }) {
	const id = useId();
	const [focused, setFocused] = useState(false);
	const [show, setShow] = useState(false);
	const isFloating = focused || (typeof value === "string" ? value.length > 0 : !!value);

	return (
		<div className="relative w-full">
			<input
				{...props}
				id={id}
				type={show ? "text" : "password"}
				value={value}
				onChange={onChange}
				onFocus={(e) => { setFocused(true); onFocus?.(e); }}
				onBlur={(e) => { setFocused(false); onBlur?.(e); }}
				placeholder=""
				className={cn(
					"w-full px-4 py-2.5 pr-10 rounded-xl border bg-white",
					"text-sm text-slate-700",
					"focus:outline-none transition-all duration-200 disabled:opacity-50",
					focused ? "border-pw-400 ring-2 ring-pw-100" : "border-pw-200",
					className,
				)}
			/>
			<IconButton
				variant="eye"
				tabIndex={-1}
				onClick={() => setShow((s) => !s)}
				className="absolute right-3 top-1/2 -translate-y-1/2"
			>
				{show ? <EyeOff size={16} /> : <Eye size={16} />}
			</IconButton>
			<label
				htmlFor={id}
				className={cn(
					"absolute pointer-events-none select-none transition-all duration-200",
					isFloating
						? "left-3 top-0 -translate-y-1/2 text-xs px-1 bg-white text-pw-500"
						: "left-4 top-1/2 -translate-y-1/2 text-sm text-slate-300",
				)}
			>
				{label}
			</label>
		</div>
	);
}

export function Input({ label, className, ...props }: InputProps) {
	return (
		<div className="w-full">
			{label && (
				<label className="block text-xs font-medium text-slate-500 mb-1.5">
					{label}
				</label>
			)}
			<input
				{...props}
				className={cn(
					"w-full px-4 py-2.5 rounded-xl border border-pw-200 bg-white",
					"text-sm text-slate-700 placeholder:text-slate-300",
					"focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
					"transition-all duration-200 disabled:opacity-50",
					className,
				)}
			/>
		</div>
	);
}

export function PasswordInput({
	label,
	className,
	...props
}: Omit<InputProps, "type">) {
	const [show, setShow] = useState(false);
	return (
		<div className="w-full">
			{label && (
				<label className="block text-xs font-medium text-slate-500 mb-1.5">
					{label}
				</label>
			)}
			<div className="relative">
				<input
					type={show ? "text" : "password"}
					{...props}
					className={cn(
						"w-full px-4 py-2.5 pr-10 rounded-xl border border-pw-200 bg-white",
						"text-sm text-slate-700 placeholder:text-slate-300",
						"focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
						"transition-all duration-200 disabled:opacity-50",
						className,
					)}
				/>
				<IconButton
					variant="eye"
					tabIndex={-1}
					onClick={() => setShow((s) => !s)}
					className="absolute right-3 top-1/2 -translate-y-1/2"
				>
					{show ? <EyeOff size={16} /> : <Eye size={16} />}
				</IconButton>
			</div>
		</div>
	);
}

export function Textarea({
	label,
	className,
	...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
	return (
		<div className="w-full">
			{label && (
				<label className="block text-xs font-medium text-slate-500 mb-1.5">
					{label}
				</label>
			)}
			<textarea
				{...props}
				className={cn(
					"w-full px-4 py-2.5 rounded-xl border border-pw-200 bg-white resize-none",
					"text-sm text-slate-700 placeholder:text-slate-300",
					"focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
					"transition-all duration-200",
					className,
				)}
			/>
		</div>
	);
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
}

const modalSizeCls = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-2xl",
};

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
						onClick={onClose}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.96, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 8 }}
						transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
						className={cn(
							"relative bg-white rounded-3xl shadow-2xl shadow-pw-300/20 w-full",
							"max-h-[90vh] flex flex-col overflow-hidden",
							modalSizeCls[size],
						)}
					>
						{children}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}

export function ModalHeader({
	children,
	onClose,
}: {
	children: React.ReactNode;
	onClose?: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-6 py-4 border-b border-pw-100 flex-shrink-0">
			<h2 className="text-base font-semibold text-slate-800">{children}</h2>
			{onClose && (
				<IconButton
					variant="x"
					onClick={onClose}
					className="w-8 h-8 rounded-lg hover:bg-pw-50 flex items-center justify-center"
				>
					<X size={16} />
				</IconButton>
			)}
		</div>
	);
}

export function ModalBody({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex-1 overflow-y-auto px-6 py-5 space-y-4", className)}>
			{children}
		</div>
	);
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-pw-100 flex-shrink-0">
			{children}
		</div>
	);
}

// ── Section label ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
			{children}
		</p>
	);
}
