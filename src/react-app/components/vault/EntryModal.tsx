import { Save, Trash2 } from "lucide-react";
import { useState } from "react";

import type { CategoryDef, Entry } from "@/domain/types";
import { useI18n } from "@/i18n";
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
import { CopyButton } from "./CopyButton";
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
    const { t } = useI18n();
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
                {isNew ? t("entry.new") : t("entry.edit")}
            </ModalHeader>

            <ModalBody>
                <div className="space-y-3">
                    <SectionLabel>{t("entry.name")}</SectionLabel>
                    <Input
                        placeholder={t("entry.namePlaceholder")}
                        value={local.name}
                        onChange={(e) => set("name", e.target.value)}
                        autoFocus={isNew}
                    />
                    <div className="flex items-center justify-between">
                        <SectionLabel>{t("entry.loginName")}</SectionLabel>
                        <CopyButton value={local.loginName} />
                    </div>
                    <Input
                        placeholder={t("entry.loginPlaceholder")}
                        value={local.loginName}
                        onChange={(e) => set("loginName", e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                        <SectionLabel>{t("entry.password")}</SectionLabel>
                        <CopyButton value={local.password} />
                    </div>
                    <PasswordInput
                        placeholder="••••••••"
                        value={local.password}
                        onChange={(e) => set("password", e.target.value)}
                    />
                </div>

                <div>
                    <SectionLabel>{t("entry.category")}</SectionLabel>
                    <CategoryInput
                        category={local.category}
                        categoryOptions={categoryOptions}
                        onChange={(cat) => set("category", cat)}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <SectionLabel>{t("entry.notes")}</SectionLabel>
                    <CopyButton value={local.notes} />
                </div>
                <Textarea
                    placeholder={t("entry.notesPlaceholder")}
                    rows={3}
                    value={local.notes}
                    onChange={(e) => set("notes", e.target.value)}
                />

                <div>
                    <SectionLabel>{t("entry.customProps")}</SectionLabel>
                    <CustomPropertiesEditor
                        properties={local.customProperties}
                        onChange={(p) => set("customProperties", p)}
                    />
                </div>

                <div>
                    <SectionLabel>{t("entry.attachments")}</SectionLabel>
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
                            {t("common.cancel")}
                        </Button>
                        <CardButton onClick={() => onSave(local)} icon={<Save size={15} />}>{t("common.save")}</CardButton>
                    </>
                ) : (
                    <>
                        {!confirmDelete && (
                            <Button variant="danger" className="mr-auto gap-2" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={13} />
                                {t("common.delete")}
                            </Button>
                        )}
                        {confirmDelete && (
                            <div className="flex items-center gap-2 mr-auto">
                                <span className="text-xs text-red-400">{t("entry.confirmDelete")}</span>
                                <Button variant="danger" onClick={() => onDelete(local.id)}>
                                    {t("common.confirm")}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        )}
                        <Button variant="ghost" onClick={onClose}>
                            {t("common.cancel")}
                        </Button>
                        <CardButton onClick={() => onSave(local)} icon={<Save size={15} />}>{t("common.save")}</CardButton>
                    </>
                )}
            </ModalFooter>
        </Modal>
    );
}
