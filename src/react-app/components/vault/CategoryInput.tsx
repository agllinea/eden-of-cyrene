import { Check, Plus, Tag, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CategoryDef } from "@/domain/types";
import { useI18n } from "@/i18n";
import { cn, IconButton } from "../ui";
import { CategoryIcon } from "./CategoryIcon";

// Single-select combobox: pick or create one category per entry.
//
// Autocomplete fix: dropdown items use onMouseDown + e.preventDefault() so the
// input never loses focus while clicking, preventing blur from closing the
// dropdown before the click registers.

interface CategoryInputProps {
    category: string | null;
    categoryOptions: CategoryDef[];
    onChange: (category: string | null) => void;
}

export function CategoryInput({
    category,
    categoryOptions,
    onChange,
}: CategoryInputProps) {
    const { t } = useI18n();
    const [inputValue, setInputValue] = useState(category ?? "");
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedDef = categoryOptions.find((c) => c.name === category) ?? null;

    const filtered = categoryOptions.filter((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase()),
    );
    const canCreate =
        inputValue.trim().length > 0 &&
        !categoryOptions.some(
            (c) => c.name.toLowerCase() === inputValue.trim().toLowerCase(),
        );

    const select = (cat: string) => {
        onChange(cat);
        setInputValue(cat);
        setOpen(false);
    };

    const clear = () => {
        onChange(null);
        setInputValue("");
        setOpen(false);
        inputRef.current?.focus();
    };

    const handleBlur = () => {
        setTimeout(() => {
            setOpen(false);
            const trimmed = inputValue.trim();
            onChange(trimmed || null);
            if (!trimmed) setInputValue("");
        }, 80);
    };

    return (
        <div className="flex items-center gap-2">
            {/* Icon preview — shows committed category's icon, or a neutral Tag */}
            <div
                className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    selectedDef ? "bg-pw-100 text-pw-600" : "bg-slate-100 text-slate-400",
                )}
            >
                {selectedDef ? (
                    <CategoryIcon def={selectedDef} size={16} />
                ) : (
                    <Tag size={16} />
                )}
            </div>

            {/* Combobox */}
            <div className="relative flex-1">
                <div className="relative flex items-center">
                    <input
                        ref={inputRef}
                        value={inputValue}
                        placeholder={t("categoryInput.placeholder")}
                        onChange={(e) => {
                            setInputValue(e.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                const trimmed = inputValue.trim();
                                if (trimmed) select(trimmed);
                            }
                            if (e.key === "Escape") {
                                setInputValue(category ?? "");
                                setOpen(false);
                            }
                        }}
                        className={cn(
                            "w-full px-4 py-2 rounded-xl border border-pw-200 bg-white",
                            "text-base md:text-sm text-slate-700 placeholder:text-slate-300",
                            "focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
                            "transition-all duration-200",
                            category ? "pr-9" : "",
                        )}
                    />

                    {category && (
                        <IconButton
                            variant="x"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                clear();
                            }}
                            className="absolute right-3"
                        >
                            <X size={14} />
                        </IconButton>
                    )}
                </div>

                {/* Dropdown */}
                {open && (filtered.length > 0 || canCreate) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-pw-200 rounded-xl shadow-lg shadow-pw-200/30 overflow-hidden z-20 max-h-48 overflow-y-auto">
                        {filtered.map((opt) => (
                            <button
                                key={opt.name}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    select(opt.name);
                                }}
                                className="w-full px-4 py-2.5 text-sm text-left text-slate-700 hover:bg-pw-50 flex items-center gap-2.5 transition-colors"
                            >
                                <span className="text-slate-400 shrink-0">
                                    <CategoryIcon def={opt} size={14} />
                                </span>
                                <span className="flex-1">{opt.name}</span>
                                {opt.name === category && (
                                    <Check size={13} className="text-pw-500 shrink-0" />
                                )}
                            </button>
                        ))}

                        {canCreate && (
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    select(inputValue.trim());
                                }}
                                className="w-full px-4 py-2.5 text-sm text-left text-pw-600 hover:bg-pw-50 border-t border-pw-100 flex items-center gap-2 transition-colors"
                            >
                                <Plus size={13} className="shrink-0" />
                                {t("categoryInput.create", { name: inputValue.trim() })}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
