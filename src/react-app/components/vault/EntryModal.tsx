import { Check, Paperclip, Plus, Save, Tag, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CategoryDef, Entry } from "../../domain/types";
import {
    Button,
    DangerButton,
    Input,
    PasswordInput,
    Textarea,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    SectionLabel,
    cn,
    MacaronButton,
    GhostButton,
    IconButton,
    DashedButton,
} from "../ui";
import { CategoryIcon } from "./CategoryIcon";

// ── Category combobox ─────────────────────────────────────────────────────────
// Single-select: pick or create one category per entry.
//
// Autocomplete fix: dropdown items use onMouseDown + e.preventDefault() so the
// input never loses focus while clicking, preventing blur from closing the
// dropdown before the click registers.

function CategoryInput({
    category,
    categoryOptions,
    onChange,
}: {
    category: string | null;
    categoryOptions: CategoryDef[];
    onChange: (category: string | null) => void;
}) {
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
                        placeholder="选择或新建类别…"
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
                            "w-full px-4 py-2.5 rounded-xl border border-pw-200 bg-white",
                            "text-sm text-slate-700 placeholder:text-slate-300",
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
                                新建 &ldquo;{inputValue.trim()}&rdquo;
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Custom properties editor ──────────────────────────────────────────────────
//
// Two modes to avoid the "focus vanishes on first keystroke" bug:
//   • Existing: key shown as a read-only label; value is an input; delete needs confirmation.
//   • New (uncommitted): both key and value are inputs with a stable UUID React key,
//     so typing in the key field never remounts the element.
//
// New rows commit (move to `properties`) when focus leaves the entire row container,
// or when the user presses Enter. Empty key → silently discard.

type NewRow = { id: string; key: string; value: string };

function CustomPropertiesEditor({
    properties,
    onChange,
}: {
    properties: Record<string, string>;
    onChange: (p: Record<string, string>) => void;
}) {
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
        "text-sm text-slate-700 placeholder:text-slate-300",
        "focus:outline-none focus:border-pw-400 focus:ring-2 focus:ring-pw-100",
        "transition-all duration-200",
    );

    return (
        <div className="space-y-2">
            {/* ── Existing properties ── */}
            {Object.entries(properties).map(([key, val]) =>
                deletingKey === key ? (
                    // Inline delete confirmation
                    <div
                        key={key}
                        className="flex items-center gap-2 px-3 py-2.5 bg-red-50 rounded-xl border border-red-100"
                    >
                        <span className="flex-1 text-sm text-red-700 truncate">
                            删除 &ldquo;{key}&rdquo;？
                        </span>
                        <button
                            type="button"
                            onClick={() => confirmDelete(key)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                            确认
                        </button>
                        <GhostButton
                            type="button"
                            onClick={() => setDeletingKey(null)}
                            // className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-500 text-xs rounded-lg border border-slate-200 transition-colors"
                        >
                            取消
                        </GhostButton>
                    </div>
                ) : (
                    <div key={key} className="flex gap-2 items-center">
                        {/* Key label — read-only */}
                        <div className="w-2/5 px-3 py-2 rounded-lg bg-pw-50 border border-pw-100 text-sm text-slate-500 font-medium truncate shrink-0">
                            {key}
                        </div>
                        {/* Value input */}
                        <input
                            value={val}
                            onChange={(e) => updateValue(key, e.target.value)}
                            placeholder="值"
                            className={cn(inputCls, "flex-1")}
                        />
                        {/* Delete → asks for confirmation */}
                        <IconButton
                            variant="del"
                            onClick={() => setDeletingKey(key)}
                            className="p-2 shrink-0"
                            title="删除属性"
                        >
                            <Trash2 size={14} />
                        </IconButton>
                    </div>
                ),
            )}

            {/* ── New (uncommitted) rows ── */}
            {newRows.map((row) => (
                // Stable UUID key → typing in the key field never remounts this element
                <div
                    key={row.id}
                    className="flex gap-2 items-center"
                    // Commit when focus leaves the entire row (not just one input inside it)
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                            commitNew(row.id);
                        }
                    }}
                >
                    <input
                        autoFocus
                        value={row.key}
                        placeholder="属性名"
                        onChange={(e) => updateNew(row.id, "key", e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); commitNew(row.id); }
                            if (e.key === "Escape") discardNew(row.id);
                        }}
                        className={cn(inputCls, "w-2/5")}
                    />
                    <input
                        value={row.value}
                        placeholder="值"
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
                        title="取消"
                    >
                        <X size={14} />
                    </IconButton>
                </div>
            ))}

            <DashedButton onClick={addNew}>
                <Plus size={13} />
                添加属性
            </DashedButton>
        </div>
    );
}

// ── Attachment list ───────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentList({
    attachments,
    onAdd,
    onRemove,
}: {
    attachments: Entry["attachments"];
    onAdd: (files: FileList | null) => Promise<void>;
    onRemove: (id: string) => void;
}) {
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-2">
            {attachments.map((att) => (
                <div
                    key={att.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-pw-50 rounded-xl border border-pw-100"
                >
                    <Paperclip size={14} className="text-pw-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 truncate">{att.name}</div>
                        <div className="text-xs text-slate-400">{formatBytes(att.size)}</div>
                    </div>
                    <IconButton
                        variant="del"
                        onClick={() => onRemove(att.id)}
                        className="p-1.5"
                    >
                        <X size={13} />
                    </IconButton>
                </div>
            ))}

            <DashedButton onClick={() => fileRef.current?.click()}>
                <Paperclip size={13} />
                添加附件
            </DashedButton>

            <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                    void onAdd(e.target.files);
                    e.target.value = "";
                }}
            />
        </div>
    );
}

// ── Main modal ────────────────────────────────────────────────────────────────

interface EntryModalProps {
    entry: Entry;
    categoryOptions: CategoryDef[];
    isNew: boolean;
    onSave: (entry: Entry) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    onAddAttachment: (entry: Entry, files: FileList | null) => Promise<Entry>;
}

export default function EntryModal({
    entry,
    categoryOptions,
    isNew,
    onSave,
    onDelete,
    onClose,
    onAddAttachment,
}: EntryModalProps) {
    const [local, setLocal] = useState<Entry>(entry);
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Existing entries: closing the modal (X, backdrop) auto-saves.
    // New entries: X/backdrop just discards.
    const handleDismiss = isNew ? onClose : () => onSave(local);

    const set = <K extends keyof Entry>(key: K, val: Entry[K]) =>
        setLocal((e) => ({ ...e, [key]: val }));

    const handleAddAttachment = async (files: FileList | null) => {
        const updated = await onAddAttachment(local, files);
        setLocal(updated);
    };

    const removeAttachment = (id: string) =>
        setLocal((e) => ({
            ...e,
            attachments: e.attachments.filter((a) => a.id !== id),
        }));

    return (
        <Modal isOpen onClose={handleDismiss} size="lg">
            <ModalHeader onClose={handleDismiss}>
                {isNew ? "新建密码" : "编辑密码"}
            </ModalHeader>

            <ModalBody>
                <div className="space-y-3">
                    <SectionLabel>名称</SectionLabel>
                    <Input
                        placeholder="例：GitHub"
                        value={local.name}
                        onChange={(e) => set("name", e.target.value)}
                        autoFocus={isNew}
                    />
                    <SectionLabel>登录名 / 邮箱</SectionLabel>
                    <Input
                        placeholder="user@example.com"
                        value={local.loginName}
                        onChange={(e) => set("loginName", e.target.value)}
                    />
                    <SectionLabel>密码</SectionLabel>
                    <PasswordInput
                        placeholder="••••••••"
                        value={local.password}
                        onChange={(e) => set("password", e.target.value)}
                    />
                </div>

                {/* Category */}
                <div>
                    <SectionLabel>类别</SectionLabel>
                    <CategoryInput
                        category={local.category}
                        categoryOptions={categoryOptions}
                        onChange={(cat) => set("category", cat)}
                    />
                </div>

                <SectionLabel>备注</SectionLabel>
                <Textarea
                    placeholder="可选备注…"
                    rows={3}
                    value={local.notes}
                    onChange={(e) => set("notes", e.target.value)}
                />
                <div>
                    <SectionLabel>自定义属性</SectionLabel>
                    <CustomPropertiesEditor
                        properties={local.customProperties}
                        onChange={(p) => set("customProperties", p)}
                    />
                </div>

                {/* Attachments */}
                <div>
                    <SectionLabel>附件</SectionLabel>
                    <AttachmentList
                        attachments={local.attachments}
                        onAdd={handleAddAttachment}
                        onRemove={removeAttachment}
                    />
                </div>
            </ModalBody>

            <ModalFooter>
                {isNew ? (
                    <>
                        <Button variant="ghost" onClick={onClose}>
                            取消
                        </Button>
                        <MacaronButton onClick={() => onSave(local)} icon={<Save size={15}/>}>保存</MacaronButton>
                    </>
                ) : (
                    <>
                        {!confirmDelete && (
                            <DangerButton className="mr-auto gap-2" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={13} />
                                删除
                            </DangerButton>
                        )}
                        {confirmDelete && (
                            <div className="flex items-center gap-2 mr-auto">
                                <span className="text-xs text-red-400">确认删除？</span>
                                <DangerButton onClick={() => onDelete(local.id)}>
                                    确认
                                </DangerButton>
                                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                                    取消
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" onClick={onClose}>
                            取消
                        </Button>
                        <MacaronButton onClick={() => onSave(local)} icon={<Save size={15}/>}>保存</MacaronButton>
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
}
