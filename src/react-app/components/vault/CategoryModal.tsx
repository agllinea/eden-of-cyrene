import { Save, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import type { CategoryDef } from "../../domain/types";
import { Input, Modal, ModalHeader, ModalBody, ModalFooter, SectionLabel, cn, MacaronButton, GhostButton, IconButton, DashedButton } from "../ui";
import { CategoryIcon, ICON_LIST } from "./CategoryIcon";

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
				`图片太大（${(file.size / 1024).toFixed(0)} KB），请上传 200 KB 以内的图片。`,
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
				{isNew ? "新建类别" : "编辑图标"}
			</ModalHeader>

			<ModalBody>
				{isNew && (
					<>
						<SectionLabel>类别名</SectionLabel>
						<Input
							placeholder="例：工作"
							autoFocus
							value={def.name}
							onChange={(e) => setDef((d) => ({ ...d, name: e.target.value }))}
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
						/>
					</>
				)}

				<div>
					<SectionLabel>常用图标</SectionLabel>
					<div className="grid grid-cols-7 gap-1.5">
						{ICON_LIST.map((entry) => {
							const active = def.icon === entry.name && !def.imageDataUrl;
							return (
								<button
									key={entry.name}
									type="button"
									title={entry.label}
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
					<SectionLabel>自定义图片</SectionLabel>
					<div className="space-y-2">
						{def.imageDataUrl && (
							<div className="flex items-center gap-3 px-3 py-2.5 bg-pw-50 rounded-xl border border-pw-100">
								<img
									src={def.imageDataUrl}
									alt=""
									className="w-8 h-8 object-cover rounded-lg shrink-0"
								/>
								<span className="flex-1 text-sm text-slate-600 truncate">已上传自定义图片</span>
								<IconButton variant="del" onClick={clearIcon}>
									<X size={14} />
								</IconButton>
							</div>
						)}

						<DashedButton onClick={() => fileRef.current?.click()}>
							<Upload size={14} />
							{def.imageDataUrl ? "重新上传" : "上传图片"}
						</DashedButton>

						<p className="text-xs text-slate-400 text-center">
							支持 PNG / JPG / SVG · 最大 200 KB
						</p>

						{uploadError && (
							<p className="text-xs text-red-500 text-center">{uploadError}</p>
						)}
					</div>
				</div>
			</ModalBody>

			<ModalFooter>
				<GhostButton onClick={onClose}>
					取消
				</GhostButton>
				<MacaronButton onClick={handleSave} disabled={!canSave} icon={<Save size={15}/>}>
					保存
				</MacaronButton>
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
