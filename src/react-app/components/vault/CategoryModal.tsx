import { Save, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CategoryDef } from "@/domain/types";
import { useI18n } from "@/i18n";
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter, SectionLabel, cn, IconButton } from "../ui";
import { ICON_LIST } from "./CategoryIcon";

// Max size for uploaded images (bytes). Base64 overhead adds ~33%.
const MAX_IMAGE_BYTES = 200 * 1024; // 200 KB

interface CategoryModalProps {
	initialDef: CategoryDef;
	isNew: boolean;
	onSave: (def: CategoryDef) => void;
	onClose: () => void;
}

export default function CategoryModal({
	initialDef,
	isNew,
	onSave,
	onClose,
}: CategoryModalProps) {
	const { t } = useI18n();
	const [def, setDef] = useState<CategoryDef>(initialDef);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const selectIcon = (name: string) =>
		setDef((d) => ({ ...d, icon: name, imageDataUrl: null }));

	const clearIcon = () =>
		setDef((d) => ({ ...d, icon: null, imageDataUrl: null }));

	const handleUpload = (files: FileList | null) => {
		const file = files?.[0];
		if (!file) return;

		if (file.size > MAX_IMAGE_BYTES) {
			setUploadError(
				t("categoryModal.tooLarge", { size: (file.size / 1024).toFixed(0) }),
			);
			return;
		}
		setUploadError(null);

		const reader = new FileReader();
		reader.onload = (e) => {
			const dataUrl = e.target?.result as string;
			setDef((d) => ({ ...d, imageDataUrl: dataUrl, icon: null }));
		};
		reader.readAsDataURL(file);
	};

	const canSave = isNew ? def.name.trim().length > 0 : true;

	const handleSave = () => {
		if (!canSave) return;
		onSave({ ...def, name: def.name.trim() });
	};

	return (
		<Modal isOpen onClose={onClose} size="md">
			<ModalHeader onClose={onClose}>
				{isNew ? t("categoryModal.new") : t("categoryModal.editIcon")}
			</ModalHeader>

			<ModalBody>
				{isNew && (
					<>
						<SectionLabel>{t("categoryModal.name")}</SectionLabel>
						<Input
							placeholder={t("categoryModal.namePlaceholder")}
							autoFocus
							value={def.name}
							onChange={(e) => setDef((d) => ({ ...d, name: e.target.value }))}
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
						/>
					</>
				)}

				<div>
					<SectionLabel>{t("categoryModal.commonIcons")}</SectionLabel>
					<div className="grid grid-cols-7 gap-1.5">
						{ICON_LIST.map((entry) => {
							const active = def.icon === entry.name && !def.imageDataUrl;
							return (
								<button
									key={entry.name}
									type="button"
									title={t(`icon.${entry.name}`)}
									onClick={() => selectIcon(entry.name)}
									className={cn(
										"w-full aspect-square rounded-xl flex items-center justify-center transition-all duration-150",
										active
											? "bg-pw-300/50 text-pw-700 ring-2 ring-pw-300/50 ring-offset-1"
											: "bg-pw-50 text-slate-500 hover:bg-pw-100 hover:text-pw-600",
									)}
								>
									<entry.Icon size={17} />
								</button>
							);
						})}
					</div>
				</div>

				{/* Image upload */}
				<div>
					<SectionLabel>{t("categoryModal.customImage")}</SectionLabel>
					<div className="space-y-2">
						{def.imageDataUrl && (
							<div className="flex items-center gap-3 px-3 py-2.5 bg-pw-50 rounded-xl border border-pw-100">
								<img
									src={def.imageDataUrl}
									alt=""
									className="w-8 h-8 object-cover rounded-lg shrink-0"
								/>
								<span className="flex-1 text-sm text-slate-600 truncate">{t("categoryModal.uploaded")}</span>
								<IconButton variant="del" onClick={clearIcon}>
									<X size={14} />
								</IconButton>
							</div>
						)}

						<Button variant="dashed" onClick={() => fileRef.current?.click()}>
							<Upload size={14} />
							{def.imageDataUrl ? t("categoryModal.reupload") : t("categoryModal.upload")}
						</Button>

						<p className="text-xs text-slate-400 text-center">
							{t("categoryModal.imageHint")}
						</p>

						{uploadError && (
							<p className="text-xs text-red-500 text-center">{uploadError}</p>
						)}
					</div>
				</div>
			</ModalBody>

			<ModalFooter>
				<Button variant="ghost" onClick={onClose}>
					{t("common.cancel")}
				</Button>
				<Button variant="primary" onClick={handleSave} disabled={!canSave} icon={<Save size={15}/>}>
					{t("common.save")}
				</Button>
			</ModalFooter>

			<input
				ref={fileRef}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					handleUpload(e.target.files);
					e.target.value = "";
				}}
			/>
		</Modal>
	);
}
