import { Paperclip, X } from "lucide-react";
import { useRef } from "react";

import type { Entry } from "@/domain/types";
import { useI18n } from "@/i18n";
import { DashedButton, IconButton } from "../ui";

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentListProps {
    attachments: Entry["attachments"];
    onAdd: (files: FileList | null) => Promise<void>;
    onRemove: (id: string) => void;
}

export function AttachmentList({ attachments, onAdd, onRemove }: AttachmentListProps) {
    const { t } = useI18n();
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
                {t("attachment.add")}
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
