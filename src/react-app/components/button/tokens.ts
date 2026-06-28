export function cn(...classes: (string | undefined | false | null)[]) {
	return classes.filter(Boolean).join(" ");
}

// Single source of truth for every button category in the app.
export const cls = {
	// Fill / gradient bg, white text
	/** Pink-purple gradient — primary CTAs */
	btnFill:      "bg-linear-to-br from-[#BE65E5] to-[#6E38C2] hover:from-[#A84CCC] hover:to-[#5320A8] active:from-[#8F38B8] active:to-[#3E1590] text-white shadow-sm shadow-[#9050D8]/30 hover:shadow-md hover:shadow-[#7040C8]/25 transition-all duration-200",
	/** Teal gradient — floating action button */
	btnFab:       "bg-linear-to-br from-ac-300 to-ac-400 hover:from-ac-400 hover:to-ac-500 text-white shadow-lg shadow-ac-300/40 hover:scale-105 active:scale-95 transition-all duration-200",
	/** On-dark icon — toolbar buttons inside the gradient header */
	btnOnDark:    "w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors",

	// Soft / light bg, dark text, no border
	/** Light brand fill — secondary actions */
	btnSoft:      "bg-pw-100 hover:bg-pw-200/60 text-pw-700 transition-all duration-200",
	/** Ghost — transparent bg, brand text on hover */
	btnGhost:     "hover:bg-pw-50 text-slate-600 hover:text-pw-700 transition-all duration-200",
	/** Option card — full-width login choice card (layout handled by caller) */
	btnCard:      "bg-[#fdf8ff] hover:bg-[#f8f4ff] transition-colors duration-300",
	/** Danger — red-tinted light */
	btnDanger:    "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 transition-all duration-200",

	// Text / ghost links
	/** Brand-color text link */
	btnText:      "text-pw-500 hover:text-pw-700 transition-colors",
	/** Muted grey text link */
	btnTextMuted: "text-slate-400 hover:text-pw-600 transition-colors",

	// Dashed add row
	/** Dashed-border "add item" row (properties, questions, attachments) */
	btnDashed:    "w-full py-2 text-sm text-pw-500 hover:text-pw-600 border border-dashed border-pw-300 hover:border-pw-400 rounded-xl flex items-center justify-center gap-1.5 transition-all",

	// Icon buttons
	/** Destructive icon — red on hover (add p-* for hit area) */
	btnIconDel:   "text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors",
	/** Close / dismiss icon — subtle slate */
	btnIconX:     "text-slate-400 hover:text-slate-600 transition-colors",
	/** Eye / reveal icon — teal on hover */
	btnIconEye:   "text-slate-300 hover:text-ac-500 transition-colors",
	/** Row action icon — appears on row hover (size baked in) */
	btnIconRow:   "w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-pw-500 hover:bg-pw-100 opacity-0 group-hover:opacity-100 transition-all",
};

export type CardButtonSize = "sm" | "md" | "lg";

export const btnSizeCls: Record<CardButtonSize, string> = {
	sm: "px-3 py-1.5 text-xs rounded-lg",
	md: "px-4 py-2.5 text-sm rounded-xl",
	lg: "px-5 py-3 text-sm rounded-xl",
};

export const btnGapCls: Record<CardButtonSize, string> = {
	sm: "gap-1.5",
	md: "gap-2",
	lg: "gap-2",
};

export const btnSquareCls: Record<CardButtonSize, string> = {
	sm: "p-1.5 rounded-lg",
	md: "p-2 rounded-xl",
	lg: "p-2.5 rounded-xl",
};

// Used by Button and DangerButton (includes gap, unlike btnSizeCls)
export const sizeCls = {
	sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
	md: "px-4 py-2.5 text-sm rounded-xl gap-2",
	lg: "px-5 py-3 text-sm rounded-xl gap-2",
};
