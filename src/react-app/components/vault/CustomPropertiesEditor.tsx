import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { Button, CopyButton, IconButton, cn } from "../ui";

// Two modes to avoid the "focus vanishes on first keystroke" bug:
//   • Existing: key shown as a read-only label; value is an input; delete needs confirmation.
//   • New (uncommitted): both key and value are inputs with a stable UUID React key,
//     so typing in the key field never remounts the element.
//
// New rows commit when focus leaves the entire row container, or when Enter is pressed.
// Empty key → silently discard.

type NewRow = { id: string; key: string; value: string };

interface CustomPropertiesEditorProps {
    properties: Record<string, string>;
    onChange: (p: Record<string, string>) => void;
    /** Called when the user clicks the delete icon; the caller shows the confirmation modal. */
    onDeleteKey: (key: string) => void;
}

export function CustomPropertiesEditor({ properties, onChange, onDeleteKey }: CustomPropertiesEditorProps) {
    const { t } = useI18n();
    const [newRows, setNewRows] = useState<NewRow[]>([]);
    const [focusedKey, setFocusedKey] = useState<string | null>(null);

    // ── Existing ──────────────────────────────────────────────────────────────

    const updateValue = (key: string, val: string) =>
        onChange({ ...properties, [key]: val });

    // ── New rows ──────────────────────────────────────────────────────────────

    const updateNew = (id: string, field: "key" | "value", val: string) =>
        setNewRows((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

    const commitNew = (id: string) => {
        const row = newRows.find((r) => r.id === id);
        if (!row) return;
        if (row.key.trim()) onChange({ ...properties, [row.key.trim()]: row.value });
        setNewRows((rows) => rows.filter((r) => r.id !== id));
    };

    const discardNew = (id: string) =>
        setNewRows((rows) => rows.filter((r) => r.id !== id));

    const addNew = () =>
        setNewRows((rows) => [...rows, { id: crypto.randomUUID(), key: "", value: "" }]);

    // ─────────────────────────────────────────────────────────────────────────

    const inputCls = cn(
        "px-3 py-2 rounded-lg border border-pw-200 bg-white",
        "text-base md:text-sm text-slate-700 placeholder:text-slate-300",
        "focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
        "transition-all duration-200",
    );

    return (
        <div className="space-y-2">
            {/* ── Existing properties ── */}
            {Object.entries(properties).map(([key, val]) => (
                <div key={key} className="flex flex-col md:flex-row gap-1.5 md:gap-2 md:items-center">
                    {/* Line 1 (mobile) / left cell (desktop): key label */}
                    <div className="px-3 py-2 rounded-lg bg-pw-50 border border-pw-100 text-sm text-slate-500 font-medium truncate md:w-2/5 md:shrink-0">
                        {key}
                    </div>
                    {/* Line 2 (mobile) / right cells (desktop): value + delete */}
                    <div className="flex gap-2 items-center flex-1">
                        <div className="relative flex-1">
                            <input
                                value={val}
                                onChange={(e) => updateValue(key, e.target.value)}
                                onFocus={() => setFocusedKey(key)}
                                onBlur={() => setFocusedKey(null)}
                                placeholder={t("customProps.value")}
                                className={cn(inputCls, "w-full pr-10")}
                            />
                            <div
                                className="absolute right-1.5 top-1/2 -translate-y-1/2"
                                onMouseDown={(e) => e.preventDefault()}
                            >
                                <CopyButton
                                    value={val}
                                    size={13}
                                    className={focusedKey === key ? "border-slate-200! shadow-sm!" : "border-transparent! shadow-none!"}
                                />
                            </div>
                        </div>
                        <IconButton
                            variant="del"
                            onClick={() => onDeleteKey(key)}
                            className="p-2 shrink-0"
                            title={t("common.delete")}
                        >
                            <Trash2 size={14} />
                        </IconButton>
                    </div>
                </div>
            ))}

            {/* ── New (uncommitted) rows ── */}
            {newRows.map((row) => (
                <div
                    key={row.id}
                    className="flex flex-col md:flex-row gap-1.5 md:gap-2 md:items-center"
                    // Commit when focus leaves the entire row
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            commitNew(row.id);
                        }
                    }}
                >
                    {/* Line 1 (mobile) / left cell (desktop): key input */}
                    <input
                        autoFocus
                        value={row.key}
                        placeholder={t("customProps.key")}
                        onChange={(e) => updateNew(row.id, "key", e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitNew(row.id); }
                            if (e.key === "Escape") discardNew(row.id);
                        }}
                        className={cn(inputCls, "w-full md:w-2/5")}
                    />
                    {/* Line 2 (mobile) / right cells (desktop): value + cancel */}
                    <div className="flex gap-2 items-center flex-1">
                        <input
                            value={row.value}
                            placeholder={t("customProps.value")}
                            onChange={(e) => updateNew(row.id, "value", e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") { e.preventDefault(); commitNew(row.id); }
                                if (e.key === "Escape") discardNew(row.id);
                            }}
                            className={cn(inputCls, "flex-1")}
                        />
                        <IconButton
                            variant="del"
                            onClick={() => discardNew(row.id)}
                            className="p-2 shrink-0"
                            title={t("common.cancel")}
                        >
                            <X size={14} />
                        </IconButton>
                    </div>
                </div>
            ))}

            <Button variant="dashed" onClick={addNew}>
                <Plus size={13} />
                {t("customProps.add")}
            </Button>
        </div>
    );
}
