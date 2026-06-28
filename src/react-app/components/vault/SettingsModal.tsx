import { Check, Download, Loader2, Plus, Shield, ShieldOff, X } from "lucide-react";
import { useState } from "react";

import type { EncryptionSettings, SecurityQuestion } from "../../domain/types";
import { createBlankSecurityQuestion } from "../../domain/types";
import {
    Button,
    Input,
    PasswordInput,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    SectionLabel,
    cn,
    CardButton,
    FloatingInput,
    FloatingPasswordInput,
    IconButton,
    DashedButton,
} from "../ui";

interface SettingsModalProps {
    vaultName: string;
    settings: EncryptionSettings;
    cacheEnabled: boolean;
    cacheSaving: boolean;
    cacheStatus: string;
    onSetCacheEnabled: (enabled: boolean) => void;
    onUpdateVaultName: (name: string) => void;
    onUpdateSettings: (s: EncryptionSettings) => void;
    onUpdateSecurityQuestion: (id: string, field: keyof SecurityQuestion | "answer", value: string) => void;
    onDownload: () => Promise<void>;
    onClose: () => void;
}

export default function SettingsModal({
    vaultName,
    settings,
    cacheEnabled,
    cacheSaving,
    cacheStatus,
    onSetCacheEnabled,
    onUpdateVaultName,
    onUpdateSettings,
    onUpdateSecurityQuestion,
    onDownload,
    onClose,
}: SettingsModalProps) {
    const [localName, setLocalName] = useState(vaultName);
    const [downloading, setDownloading] = useState(false);

    // Local encryption state so edits are confirmed on save
    const [localSettings, setLocalSettings] = useState<EncryptionSettings>(settings);

    const isEncrypted = localSettings.mode === "encrypted";

    const setPassword = (password: string) => {
        if (localSettings.mode !== "encrypted") return;
        setLocalSettings({ ...localSettings, password });
    };

    const addQuestion = () => {
        if (localSettings.mode !== "encrypted") return;
        setLocalSettings({
            ...localSettings,
            securityQuestions: [...localSettings.securityQuestions, createBlankSecurityQuestion()],
        });
    };

    const removeQuestion = (id: string) => {
        if (localSettings.mode !== "encrypted") return;
        setLocalSettings({
            ...localSettings,
            securityQuestions: localSettings.securityQuestions.filter((q) => q.id !== id),
        });
    };

    const updateQuestion = (id: string, field: keyof SecurityQuestion | "answer", value: string) => {
        if (localSettings.mode !== "encrypted") return;
        setLocalSettings({
            ...localSettings,
            securityQuestions: localSettings.securityQuestions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
        });
        // also propagate to hook for persistent questions
        onUpdateSecurityQuestion(id, field, value);
    };

    const enableEncryption = () => setLocalSettings({ mode: "encrypted", password: "", securityQuestions: [] });

    const disableEncryption = () => setLocalSettings({ mode: "none" });

    const handleSave = () => {
        onUpdateVaultName(localName);
        onUpdateSettings(localSettings);
        onClose();
    };

    const handleDownload = async () => {
        setDownloading(true);
        try {
            await onDownload();
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} size="md">
            <ModalHeader onClose={onClose}>Vault 设置</ModalHeader>

            <ModalBody>
                {/* Vault name */}
                <div>
                    <SectionLabel>Vault 名称</SectionLabel>
                    <Input placeholder="Vault 名称" value={localName} onChange={(e) => setLocalName(e.target.value)} />
                </div>

                {/* Cache */}
                <div>
                    <SectionLabel>浏览器缓存</SectionLabel>
                    <div className="flex items-center justify-between pr-1 py-3 ">
                        <div>
                            <div className="text-sm font-medium text-slate-700">自动保存到浏览器</div>
                            <div className="text-xs text-slate-400 mt-0.5">{cacheStatus}</div>
                        </div>
                        <button
                            onClick={() => onSetCacheEnabled(!cacheEnabled)}
                            className={cn(
                                "relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0",
                                !cacheEnabled && "bg-red-300",
                                cacheEnabled && cacheSaving && "bg-blue-300",
                                cacheEnabled && !cacheSaving && cacheStatus === "缓存中，已储存" && "bg-green-300",
                                cacheEnabled && !cacheSaving && cacheStatus !== "缓存中，已储存" && "bg-ac-300",
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm",
                                    "transition-transform duration-200 flex items-center justify-center",
                                    cacheEnabled && "translate-x-4",
                                )}
                            >
                                {cacheEnabled && cacheSaving && (
                                    <Loader2 size={10} className="animate-spin text-blue-400" />
                                )}
                                {cacheEnabled && !cacheSaving && cacheStatus === "缓存中，已储存" && (
                                    <Check size={10} className="text-green-400" strokeWidth={3} />
                                )}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Download */}
                <div>
                    <SectionLabel>导出</SectionLabel>
                    <CardButton
                        onClick={() => void handleDownload()}
                        disabled={downloading}
                        fullWidth
                    >
                        <Download size={15} />
                        {downloading ? "下载中…" : "下载 Vault 文件"}
                    </CardButton>
                </div>

                {/* Encryption */}
                <div>
                    <SectionLabel>加密</SectionLabel>

                    <div className="flex gap-2 mb-4">
                        {isEncrypted ? (
                            <>
                                <CardButton onClick={enableEncryption} fullWidth>
                                    <Shield size={15} />
                                    已加密
                                </CardButton>
                                <CardButton variant="light" onClick={disableEncryption} fullWidth>
                                    <ShieldOff size={15} />
                                    无加密
                                </CardButton>
                            </>
                        ) : (
                            <>
                                <CardButton variant="light" onClick={enableEncryption} fullWidth>
                                    <Shield size={15} />
                                    已加密
                                </CardButton>
                                <CardButton onClick={disableEncryption} fullWidth>
                                    <ShieldOff size={15} />
                                    无加密
                                </CardButton>
                            </>
                        )}
                    </div>

                    {isEncrypted && (
                        <div className="space-y-4">
                            <SectionLabel>密码</SectionLabel>
                            <PasswordInput
                                placeholder="请输入密码"
                                value={localSettings.password}
                                onChange={(e) => setPassword(e.target.value)}
                            />

                            <div>
                                <SectionLabel>安全问题</SectionLabel>
                                <div className="space-y-3">
                                    {localSettings.securityQuestions.map((q, i) => (
                                        <div
                                            key={q.id}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-2 mt-3 mb-3">
                                                <span className="text-xs font-medium text-slate-400">
                                                    安全问题 {i + 1}
                                                </span>
                                                <IconButton variant="del" onClick={() => removeQuestion(q.id)}>
                                                    <X size={14} />
                                                </IconButton>
                                            </div>
                                            <FloatingInput
                                                label={`问题 ${i + 1}`}
                                                value={q.question}
                                                onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
                                            />
                                            <FloatingPasswordInput
                                                label={`回答 ${i + 1}`}
                                                value={"answer" in q ? (q as { answer: string }).answer : ""}
                                                onChange={(e) => updateQuestion(q.id, "answer", e.target.value)}
                                            />
                                        </div>
                                    ))}
                                    <DashedButton onClick={addQuestion} className="mt-3">
                                        <Plus size={13} />
                                        添加安全问题
                                    </DashedButton>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ModalBody>

            <ModalFooter>
                <Button variant="ghost" onClick={onClose}>
                    取消
                </Button>
                <Button onClick={handleSave}>保存设置</Button>
            </ModalFooter>
        </Modal>
    );
}
