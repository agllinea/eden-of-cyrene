export function cn(...classes: (string | undefined | false | null)[]) {
	return classes.filter(Boolean).join(" ");
}

// Single source of truth for button styling, keyed by ROLE. Each role maps to
// exactly one look so the same intent never renders two different ways.
export const cls = {
	// ── Solid surfaces (Button: primary | secondary | ghost | danger) ──
	/** Primary CTA — soft pink→cyan gradient, teal text */
	btnPrimary:   "bg-linear-to-br from-pw-100 to-ac-100 text-ac-600 hover:brightness-95",
	/** Secondary — soft near-white surface */
	btnSecondary: "bg-[#fdf8ff] hover:bg-[#f8f4ff] text-slate-700",
	/** Ghost — neutral, low emphasis (the one unified ghost look) */
	btnGhost:     "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
	/** Danger — red-tinted light */
	btnDanger:    "bg-red-50 hover:bg-red-100 text-red-600",

	// ── Non-solid variants ──
	/** Link — brand-color text */
	btnLink:      "text-pw-500 hover:text-pw-700 transition-colors",
	/** Dashed "add item" row (properties, questions, attachments, upload) */
	btnDashed:    "w-full py-2 text-sm text-pw-500 hover:text-pw-600 border border-dashed border-pw-300 hover:border-pw-400 rounded-xl flex items-center justify-center gap-1.5 transition-all",

	// ── Icon buttons (IconButton variants) ──
	/** Destructive icon — red on hover (add p-* for hit area) */
	btnIconDel:   "text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors",
	/** Close / dismiss icon — subtle slate */
	btnIconX:     "text-slate-400 hover:text-slate-600 transition-colors",
	/** Eye / reveal icon — teal on hover */
	btnIconEye:   "text-slate-300 hover:text-ac-500 transition-colors",
	/** Copy / row-action icon — neutral bordered chip with a soft shadow */
	btnIconCopy:  "p-1.5 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 hover:border-slate-300 cursor-default transition-colors",
};

export type ButtonSize = "sm" | "md" | "lg";

/** Text/icon+text padding (includes gap). */
export const sizeCls: Record<ButtonSize, string> = {
	sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
	md: "px-4 py-2.5 text-sm rounded-xl gap-2",
	lg: "px-5 py-3 text-sm rounded-xl gap-2",
};

/** Icon-only (square) padding. */
export const squareCls: Record<ButtonSize, string> = {
	sm: "p-1.5 rounded-lg",
	md: "p-2 rounded-xl",
	lg: "p-2.5 rounded-xl",
};
