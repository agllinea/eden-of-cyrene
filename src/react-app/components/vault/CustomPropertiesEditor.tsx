import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { useI18n } from "@/i18n";
import { cn, DashedButton, GhostButton, IconButton } from "../ui";
import { CopyButton } from "./CopyButton";

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
}

export function CustomPropertiesEditor({ properties, onChange }: CustomPropertiesEditorProps) {
    const { t } = useI18n();
    const [newRows, setNewRows] = useState<NewRow[]>([]);
    const [deletingKey, setDeletingKey] = useState<string | null>(null);

    // ── Existing ──────────────────────────────────────────────────────────────

    const updateValue = (key: string, val: string) =>
        onChange({ ...properties, [key]: val });

    const confirmDelete = (key: string) => {
        const next = { ...properties };
        delete next[key];
        onChange(next);
        setDeletingKey(null);
    };

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
            {Object.entries(properties).map(([key, val]) =>
                deletingKey === key ? (
                    <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100"
                    >
                        <span className="flex-1 text-sm text-red-700 truncate">
                            {t("customProps.confirmDelete", { key })}
                        </span>
                        <button
                            type="button"
                            onClick={() => confirmDelete(key)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            {t("common.confirm")}
                        </button>
                        <GhostButton type="button" onClick={() => setDeletingKey(null)}>
                            {t("common.cancel")}
                        </GhostButton>
                    </div>
                ) : (
                    <div key={key} className="flex gap-2 items-center">
                        <div className="w-2/5 px-3 py-2 rounded-lg bg-pw-50 border border-pw-100 text-sm text-slate-500 font-medium truncate shrink-0">
                            {key}
                        </div>
                        <input
                            value={val}
                            onChange={(e) => updateValue(key, e.target.value)}
                            placeholder={t("customProps.value")}
                            className={cn(inputCls, "flex-1")}
                        />
                        <CopyButton value={val} className="shrink-0" />
                        <IconButton
                            variant="del"
                            onClick={() => setDeletingKey(key)}
                            className="p-2 shrink-0"
                            title={t("common.delete")}
                        >
                            <Trash2 size={14} />
                        </IconButton>
                    </div>
                ),
            )}

            {/* ── New (uncommitted) rows ── */}
            {newRows.map((row) => (
                <div
                    key={row.id}
                    className="flex gap-2 items-center"
                    // Commit when focus leaves the entire row
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            commitNew(row.id);
                        }
                    }}
                >
                    <input
                        autoFocus
                        value={row.key}
                        placeholder={t("customProps.key")}
                        onChange={(e) => updateNew(row.id, "key", e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitNew(row.id); }
                            if (e.key === "Escape") discardNew(row.id);
                        }}
                        className={cn(inputCls, "w-2/5")}
                    />
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
            ))}

            <DashedButton onClick={addNew}>
                <Plus size={13} />
                {t("customProps.add")}
            </DashedButton>
        </div>
    );
}
