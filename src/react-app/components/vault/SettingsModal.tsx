import { Check, Download, Loader2, Plus, Shield, ShieldOff, X } from "lucide-react";
import { useState } from "react";

import type { CacheState } from "@/domain/status";
import type { EncryptionSettings, SecurityQuestion } from "@/domain/types";
import { createBlankSecurityQuestion } from "@/domain/types";
import { LOCALES, useI18n } from "@/i18n";
import { cacheStateLabel } from "@/i18n/format";
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
	cacheState: CacheState;
	onSetCacheEnabled: (enabled: boolean) => void;
	onUpdateVaultName: (name: string) => void;
	onApplySettings: (s: EncryptionSettings) => void | Promise<void>;
	onDownload: () => Promise<void>;
	onClose: () => void;
}

export default function SettingsModal({
	vaultName,
	settings,
	cacheEnabled,
	cacheSaving,
	cacheState,
	onSetCacheEnabled,
	onUpdateVaultName,
	onApplySettings,
	onDownload,
	onClose,
}: SettingsModalProps) {
	const { t, locale, setLocale } = useI18n();
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
	};

	const enableEncryption = () => setLocalSettings({ mode: "encrypted", password: "", securityQuestions: [] });

	const disableEncryption = () => setLocalSettings({ mode: "none" });

	const handleSave = async () => {
		onUpdateVaultName(localName);
		await onApplySettings(localSettings);
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
			<ModalHeader onClose={onClose}>{t("settings.title")}</ModalHeader>

			<ModalBody>
				{/* Vault name */}
				<div>
					<SectionLabel>{t("settings.vaultName")}</SectionLabel>
					<Input placeholder={t("settings.vaultName")} value={localName} onChange={(e) => setLocalName(e.target.value)} />
				</div>

				{/* Language */}
				<div>
					<SectionLabel>{t("settings.language")}</SectionLabel>
					<div className="flex gap-2">
						{LOCALES.map((code) => (
							<CardButton
								key={code}
								variant={locale === code ? "macaroon" : "light"}
								onClick={() => setLocale(code)}
								fullWidth
							>
								{t(`lang.${code}`)}
							</CardButton>
						))}
					</div>
				</div>

				{/* Cache */}
				<div>
					<SectionLabel>{t("settings.cache")}</SectionLabel>
					<div className="flex items-center justify-between pr-1 py-3 ">
						<div>
							<div className="text-sm font-medium text-slate-700">{t("settings.autoSave")}</div>
							<div className="text-xs text-slate-400 mt-0.5">{cacheStateLabel(cacheState, t)}</div>
						</div>
						<button
							onClick={() => onSetCacheEnabled(!cacheEnabled)}
							className={cn(
								"relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0",
								!cacheEnabled && "bg-red-300",
								cacheEnabled && cacheSaving && "bg-blue-300",
								cacheEnabled && !cacheSaving && cacheState.status === "saved" && "bg-green-300",
								cacheEnabled && !cacheSaving && cacheState.status !== "saved" && "bg-ac-300",
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
								{cacheEnabled && !cacheSaving && cacheState.status === "saved" && (
									<Check size={10} className="text-green-400" strokeWidth={3} />
								)}
							</span>
						</button>
					</div>
				</div>

				{/* Download */}
				<div>
					<SectionLabel>{t("settings.export")}</SectionLabel>
					<CardButton
						onClick={() => void handleDownload()}
						disabled={downloading}
						fullWidth
					>
						<Download size={15} />
						{downloading ? t("settings.downloading") : t("settings.download")}
					</CardButton>
				</div>

				{/* Encryption */}
				<div>
					<SectionLabel>{t("settings.encryption")}</SectionLabel>

					<div className="flex gap-2 mb-4">
						{isEncrypted ? (
							<>
								<CardButton onClick={enableEncryption} fullWidth>
									<Shield size={15} />
									{t("settings.encrypted")}
								</CardButton>
								<CardButton variant="light" onClick={disableEncryption} fullWidth>
									<ShieldOff size={15} />
									{t("settings.noEncryption")}
								</CardButton>
							</>
						) : (
							<>
								<CardButton variant="light" onClick={enableEncryption} fullWidth>
									<Shield size={15} />
									{t("settings.encrypted")}
								</CardButton>
								<CardButton onClick={disableEncryption} fullWidth>
									<ShieldOff size={15} />
									{t("settings.noEncryption")}
								</CardButton>
							</>
						)}
					</div>

					{isEncrypted && (
						<div className="space-y-4">
							<SectionLabel>{t("settings.password")}</SectionLabel>
							<PasswordInput
								placeholder={t("settings.passwordPlaceholder")}
								value={localSettings.password}
								onChange={(e) => setPassword(e.target.value)}
							/>

							<div>
								<SectionLabel>{t("settings.securityQuestions")}</SectionLabel>
								<div className="space-y-3">
									{localSettings.securityQuestions.map((q, i) => (
										<div
											key={q.id}
											className="space-y-3"
										>
											<div className="flex items-start justify-between gap-2 mt-3 mb-3">
												<span className="text-xs font-medium text-slate-400">
													{t("settings.questionN", { n: i + 1 })}
												</span>
												<IconButton variant="del" onClick={() => removeQuestion(q.id)}>
													<X size={14} />
												</IconButton>
											</div>
											<FloatingInput
												label={t("settings.question", { n: i + 1 })}
												value={q.question}
												onChange={(e) => updateQuestion(q.id, "question", e.target.value)}
											/>
											<FloatingPasswordInput
												label={t("settings.answer", { n: i + 1 })}
												value={"answer" in q ? (q as { answer: string }).answer : ""}
												onChange={(e) => updateQuestion(q.id, "answer", e.target.value)}
											/>
										</div>
									))}
									<DashedButton onClick={addQuestion} className="mt-3">
										<Plus size={13} />
										{t("settings.addQuestion")}
									</DashedButton>
								</div>
							</div>
						</div>
					)}
				</div>
			</ModalBody>

			<ModalFooter>
				<Button variant="ghost" onClick={onClose}>
					{t("common.cancel")}
				</Button>
				<Button onClick={() => void handleSave()}>{t("settings.save")}</Button>
			</ModalFooter>
		</Modal>
	);
}
