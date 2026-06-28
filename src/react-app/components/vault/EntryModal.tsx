import { Save, Trash2 } from "lucide-react";
import { useState } from "react";

import type { CategoryDef, Entry } from "../../domain/types";
import {
    Button,
    CardButton,
    Input,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    PasswordInput,
    SectionLabel,
    Textarea,
} from "../ui";
import { AttachmentList } from "./AttachmentList";
import { CategoryInput } from "./CategoryInput";
import { CustomPropertiesEditor } from "./CustomPropertiesEditor";

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
                        <CardButton onClick={() => onSave(local)} icon={<Save size={15} />}>保存</CardButton>
                    </>
                ) : (
                    <>
                        {!confirmDelete && (
                            <Button variant="danger" className="mr-auto gap-2" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={13} />
                                删除
                            </Button>
                        )}
                        {confirmDelete && (
                            <div className="flex items-center gap-2 mr-auto">
                                <span className="text-xs text-red-400">确认删除？</span>
                                <Button variant="danger" onClick={() => onDelete(local.id)}>
                                    确认
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                                    取消
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" onClick={onClose}>
                            取消
                        </Button>
                        <CardButton onClick={() => onSave(local)} icon={<Save size={15} />}>保存</CardButton>
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
}
