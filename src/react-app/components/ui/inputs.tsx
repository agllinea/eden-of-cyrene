import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { cn, IconButton } from "../button";

// ── FloatingInput ─────────────────────────────────────────────────────────────

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

// ── FloatingPasswordInput ─────────────────────────────────────────────────────

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

// ── Input ─────────────────────────────────────────────────────────────────────

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

// ── PasswordInput ─────────────────────────────────────────────────────────────

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

// ── Textarea ──────────────────────────────────────────────────────────────────

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
