import { Download, Eye, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";

import type { Attachment, Entry } from "@/domain/types";
import { useI18n } from "@/i18n";
import { Button, IconButton, Modal, ModalBody, ModalHeader } from "../ui";

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(att: Attachment) {
    return att.type.startsWith("image/");
}

// dataUrl is already a self-contained `data:` URI, so no Blob/ObjectURL needed.
function downloadAttachment(att: Attachment) {
    const anchor = document.createElement("a");
    anchor.href = att.dataUrl;
    anchor.download = att.name;
    anchor.click();
}

interface AttachmentListProps {
    attachments: Entry["attachments"];
    onAdd: (files: FileList | null) => Promise<void>;
    onRemove: (id: string) => void;
}

export function AttachmentList({ attachments, onAdd, onRemove }: AttachmentListProps) {
    const { t } = useI18n();
    const fileRef = useRef<HTMLInputElement>(null);
    const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null);

    const openAttachment = (att: Attachment) => {
        if (isImage(att)) {
            setPreviewAttachment(att);
        } else {
            downloadAttachment(att);
        }
    };

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
                        variant="eye"
                        onClick={() => openAttachment(att)}
                        className="p-1.5"
                        title={isImage(att) ? t("attachment.view") : t("attachment.download")}
                        aria-label={isImage(att) ? t("attachment.view") : t("attachment.download")}
                    >
                        {isImage(att) ? <Eye size={13} /> : <Download size={13} />}
                    </IconButton>
                    <IconButton
                        variant="del"
                        onClick={() => onRemove(att.id)}
                        className="p-1.5"
                    >
                        <X size={13} />
                    </IconButton>
                </div>
            ))}

            <Button variant="dashed" onClick={() => fileRef.current?.click()}>
                <Paperclip size={13} />
                {t("attachment.add")}
            </Button>

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

            {previewAttachment && (
                <Modal isOpen onClose={() => setPreviewAttachment(null)} size="lg">
                    <ModalHeader onClose={() => setPreviewAttachment(null)}>
                        {previewAttachment.name}
                    </ModalHeader>
                    <ModalBody className="flex items-center justify-center">
                        <img
                            src={previewAttachment.dataUrl}
                            alt={previewAttachment.name}
                            className="max-w-full max-h-[70dvh] rounded-xl object-contain"
                        />
                    </ModalBody>
                </Modal>
            )}
        </div>
    );
}
