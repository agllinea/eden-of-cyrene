import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

import { cn, IconButton } from "../button";
import { CopyButton } from "./CopyButton";

// Chip classes for trailing buttons inside a field.
// Active: border + shadow (shown only while the <input>/<textarea> itself is focused).
// Toggle via JS focus state, not focus-within (which fires even when a button is clicked).
const chip = (active: boolean) =>
	active ? "border-slate-200! shadow-sm!" : "border-transparent! shadow-none!";

// ── FloatingInput ─────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	/** Render as a masked password field with a reveal toggle. */
	password?: boolean;
	/** Show a copy button that copies this field's own value. */
	canCopy?: boolean;
}

export function FloatingInput({
	label,
	className,
	value,
	onChange,
	onFocus,
	onBlur,
	...props
}: Omit<InputProps, "placeholder" | "password" | "canCopy"> & { label: string }) {
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
					"text-base md:text-sm text-slate-700",
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
}: Omit<InputProps, "placeholder" | "type" | "password" | "canCopy"> & { label: string }) {
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
					"text-base md:text-sm text-slate-700",
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
// One field for both plain and password use. `password` adds masking + a reveal
// eye; `canCopy` adds a copy button that copies this field's own value. The two
// trailing controls live inside the field (eye on the far right, copy before it).

function fieldCopyValue(value: React.InputHTMLAttributes<HTMLInputElement>["value"]) {
	return value == null ? "" : String(value);
}

export function Input({
	label,
	className,
	password,
	canCopy,
	type,
	value,
	onFocus,
	onBlur,
	...props
}: InputProps) {
	const [show, setShow] = useState(false);
	const [focused, setFocused] = useState(false);

	const btnCls = chip(focused);
	const copyButton = canCopy ? (
		<CopyButton value={fieldCopyValue(value)} size={14} className={btnCls} />
	) : null;
	const eyeButton = password ? (
		<IconButton
			variant="copy"
			tabIndex={-1}
			onClick={() => setShow((s) => !s)}
			className={btnCls}
		>
			{show ? <EyeOff size={14} /> : <Eye size={14} />}
		</IconButton>
	) : null;
	const count = (copyButton ? 1 : 0) + (eyeButton ? 1 : 0);

	return (
		<div className="w-full">
			{label && (
				<label className="block text-xs font-medium text-slate-500 mb-1.5">
					{label}
				</label>
			)}
			<div className="relative">
				<input
					{...props}
					value={value}
					type={password ? (show ? "text" : "password") : type}
					onFocus={(e) => { setFocused(true); onFocus?.(e); }}
					onBlur={(e) => { setFocused(false); onBlur?.(e); }}
					className={cn(
						"w-full px-4 py-2.5 rounded-xl border border-pw-200 bg-white",
						"text-base md:text-sm text-slate-700 placeholder:text-slate-300",
						"focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
						"transition-all duration-200 disabled:opacity-50",
						count === 1 && "pr-12",
						count >= 2 && "pr-20",
						className,
					)}
				/>
				{count > 0 && (
					// onMouseDown preventDefault keeps focus on the <input> when eye/copy is clicked.
					<div
						className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1"
						onMouseDown={(e) => e.preventDefault()}
					>
						{copyButton}
						{eyeButton}
					</div>
				)}
			</div>
		</div>
	);
}

// ── Textarea ──────────────────────────────────────────────────────────────────

export function Textarea({
	label,
	className,
	canCopy,
	value,
	onFocus,
	onBlur,
	...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
	label?: string;
	canCopy?: boolean;
}) {
	const [focused, setFocused] = useState(false);

	const copyButton = canCopy ? (
		<CopyButton
			value={value == null ? "" : String(value)}
			size={14}
			className={chip(focused)}
		/>
	) : null;

	return (
		<div className="w-full">
			{label && (
				<label className="block text-xs font-medium text-slate-500 mb-1.5">
					{label}
				</label>
			)}
			<div className="relative">
				<textarea
					{...props}
					value={value}
					onFocus={(e) => { setFocused(true); onFocus?.(e); }}
					onBlur={(e) => { setFocused(false); onBlur?.(e); }}
					className={cn(
						"w-full px-4 py-2.5 rounded-xl border border-pw-200 bg-white resize-none",
						"text-base md:text-sm text-slate-700 placeholder:text-slate-300",
						"focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
						"transition-all duration-200",
						!!copyButton && "pr-12",
						className,
					)}
				/>
				{copyButton && (
					<div
						className="absolute right-2 top-2 flex items-center gap-1"
						onMouseDown={(e) => e.preventDefault()}
					>
						{copyButton}
					</div>
				)}
			</div>
		</div>
	);
}
