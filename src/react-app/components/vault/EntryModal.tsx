import { Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";

import type { CategoryDef, Entry } from "@/domain/types";
import { useI18n } from "@/i18n";
import {
    Button,
    Input,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
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
    onDropCustomPropInCategory: (key: string, category: string) => void;
}

export default function EntryModal({
    entry,
    categoryOptions,
    isNew,
    onSave,
    onDelete,
    onClose,
    onAddAttachment,
    onDropCustomPropInCategory,
}: EntryModalProps) {
    const { t } = useI18n();
    const [local, setLocal] = useState<Entry>(entry);
    const [confirmDelete, setConfirmDelete] = useState(false);
    // Key of the custom property pending deletion (shown in the confirmation modal).
    const [pendingDeleteProp, setPendingDeleteProp] = useState<string | null>(null);

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

    // Confirmed: remove from this entry's local state + cascade across the category.
    const confirmDeleteProp = () => {
        if (!pendingDeleteProp) return;
        const key = pendingDeleteProp;
        const { [key]: _, ...rest } = local.customProperties;
        set("customProperties", rest);
        if (local.category) onDropCustomPropInCategory(key, local.category);
        setPendingDeleteProp(null);
    };

    return (
        <>
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
                        <SectionLabel>{t("entry.loginName")}</SectionLabel>
                        <Input
                            canCopy
                            placeholder={t("entry.loginPlaceholder")}
                            value={local.loginName}
                            onChange={(e) => set("loginName", e.target.value)}
                        />
                        <SectionLabel>{t("entry.password")}</SectionLabel>
                        <Input
                            password
                            canCopy
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

                    <SectionLabel>{t("entry.notes")}</SectionLabel>
                    <Textarea
                        canCopy
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
                            onDeleteKey={(key) => setPendingDeleteProp(key)}
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
                            <Button variant="primary" onClick={() => onSave(local)} icon={<Save size={15} />}>{t("common.save")}</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="danger" className="mr-auto gap-2" onClick={() => setConfirmDelete(true)}>
                                <Trash2 size={13} />
                                {t("common.delete")}
                            </Button>
                            <Button variant="ghost" onClick={onClose}>
                                {t("common.cancel")}
                            </Button>
                            <Button variant="primary" onClick={() => onSave(local)} icon={<Save size={15} />}>{t("common.save")}</Button>
                        </>
                    )}
                </ModalFooter>
            </Modal>

            {confirmDelete && createPortal(
                <Modal isOpen onClose={() => setConfirmDelete(false)} size="sm">
                    <ModalHeader onClose={() => setConfirmDelete(false)}>
                        {t("entry.confirmDeleteTitle")}
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-slate-600">{t("entry.confirmDelete")}</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="danger" onClick={() => onDelete(local.id)}>
                            {t("common.delete")}
                        </Button>
                    </ModalFooter>
                </Modal>,
                document.body,
            )}

            {/* Delete-field confirmation — rendered via portal so it escapes the
                motion.div stacking context of the entry modal above. */}
            {pendingDeleteProp !== null && createPortal(
                <Modal isOpen onClose={() => setPendingDeleteProp(null)} size="sm">
                    <ModalHeader onClose={() => setPendingDeleteProp(null)}>
                        {t("customProps.deleteTitle")}
                    </ModalHeader>
                    <ModalBody>
                        <p className="text-sm text-slate-600">
                            {local.category
                                ? t("customProps.deleteBodyWithCategory", {
                                    key: pendingDeleteProp,
                                    category: local.category,
                                })
                                : t("customProps.deleteBodyNoCategory", { key: pendingDeleteProp })}
                        </p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="ghost" onClick={() => setPendingDeleteProp(null)}>
                            {t("common.cancel")}
                        </Button>
                        <Button variant="danger" onClick={confirmDeleteProp}>
                            {t("common.delete")}
                        </Button>
                    </ModalFooter>
                </Modal>,
                document.body,
            )}
        </>
    );
}
