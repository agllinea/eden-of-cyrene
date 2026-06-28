import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createBlankSecurityQuestion,
	createEmptyEntry,
	createEmptyVault,
	type CategoryDef,
	type EncryptedVault,
	type EncryptionSettings,
	type Entry,
	type SecurityQuestion,
	type Vault,
	type VaultFile,
} from "../domain/types";
import {
	collectCategoryProperties,
	normalizeCategories,
	removeEntry,
	touchVault,
	upsertEntry,
	withInheritedCategoryProperties,
} from "../domain/vaultLogic";
import {
	isEncryptedVault,
	serializeVaultFile,
	unlockWithAnswers,
	unlockWithPassword,
} from "../services/cryptoVault";
import {
	cacheVaultText,
	readCachedSnapshot,
	readUploadedVault,
	storageProviders,
} from "../services/storage";
import { fileToDataUrl } from "../utils/fileData";

export type AppPhase =
	| "login"
	| "unlock"
	| "setupPassword"
	| "setupQuestions"
	| "ready";
export type UnlockMode = "password" | "questions";

const defaultSettings: EncryptionSettings = { mode: "none" };

function buildEncryptedSettings(password: string): EncryptionSettings {
	return {
		mode: "encrypted",
		password,
		securityQuestions: [],
	};
}

export function useVaultApp() {
	const [phase, setPhase] = useState<AppPhase>("login");
	const [vault, setVault] = useState<Vault>(() => createEmptyVault());
	const [settings, setSettings] = useState<EncryptionSettings>(defaultSettings);
	const [lockedVault, setLockedVault] = useState<EncryptedVault | null>(null);
	const [unlockMode, setUnlockMode] = useState<UnlockMode>("password");
	const [unlockPassword, setUnlockPassword] = useState("");
	const [unlockAnswers, setUnlockAnswers] = useState<Record<string, string>>({});
	const [setupVaultName, setSetupVaultName] = useState("");
	const [setupPassword, setSetupPassword] = useState("");
	const [setupQuestions, setSetupQuestions] = useState([
		createBlankSecurityQuestion(),
	]);
	const [cacheEnabled, setCacheEnabled] = useState(true);
	const [cacheStatus, setCacheStatus] = useState("尚未储存");
	const [cacheSaving, setCacheSaving] = useState(false);
	const [status, setStatus] = useState("请选择 Vault。");
	const [searchText, setSearchText] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
	const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);

	const passwordSlot = lockedVault?.encryption.keySlots.find(
		(slot) => slot.type === "password",
	);
	const securitySlot = lockedVault?.encryption.keySlots.find(
		(slot) => slot.type === "securityQuestions",
	);

	useEffect(() => {
		readCachedSnapshot()
			.then((snapshot) => {
				if (!snapshot) {
					setCacheStatus("没有浏览器缓存");
					return;
				}

				setCacheStatus(`可用缓存：${new Date(snapshot.savedAt).toLocaleString()}`);
			})
			.catch(() => setCacheStatus("无法读取浏览器缓存"));
	}, []);

	const saveToCache = useCallback(async () => {
		setCacheSaving(true);
		try {
			const text = await serializeVaultFile(vault, settings);
			await cacheVaultText(`${vault.name || "eden-vault"}.eden.json`, text);
			setCacheStatus("缓存中，已储存");
			setStatus("已储存。");
		} catch (error) {
			setCacheStatus("缓存中，储存失败");
			setStatus(error instanceof Error ? error.message : "储存失败。");
		} finally {
			setCacheSaving(false);
		}
	}, [settings, vault]);

	useEffect(() => {
		if (!cacheEnabled || phase !== "ready") {
			return;
		}

		const timeout = window.setTimeout(() => {
			void saveToCache();
		}, 400);

		return () => window.clearTimeout(timeout);
	}, [cacheEnabled, phase, saveToCache]);

	const categoryOptions = useMemo(
		() => normalizeCategories(vault.categories),
		[vault.categories],
	);

	const tableColumns = useMemo(() => {
		const common = ["名称", "登录名", "密码", "备注", "类别"];
		if (!selectedCategory) return common;
		return [...common, ...collectCategoryProperties(vault.entries, selectedCategory)];
	}, [selectedCategory, vault.entries]);

	const visibleEntries = useMemo(() => {
		const query = searchText.trim().toLocaleLowerCase();

		return vault.entries
			.filter((entry) => {
				const matchesCategory = selectedCategory
					? entry.category === selectedCategory
					: true;
				const searchable = [
					entry.name,
					entry.loginName,
					entry.notes,
					entry.category ?? "",
					...Object.values(entry.customProperties),
				]
					.join(" ")
					.toLocaleLowerCase();

				return matchesCategory && (!query || searchable.includes(query));
			})
			.map((entry) =>
				selectedCategory ? withInheritedCategoryProperties(vault, entry) : entry,
			);
	}, [searchText, selectedCategory, vault]);

	const openVaultFileObject = (vaultFile: VaultFile, nextStatus: string) => {
		if (isEncryptedVault(vaultFile)) {
			const hasPassword = vaultFile.encryption.keySlots.some(
				(slot) => slot.type === "password",
			);
			setLockedVault(vaultFile);
			setUnlockMode(hasPassword ? "password" : "questions");
			setPhase("unlock");
			setStatus("请输入密码解锁。");
			return;
		}

		setVault(touchVault(vaultFile));
		setSettings(defaultSettings);
		setPhase("ready");
		setStatus(nextStatus);
	};

	const openVaultFile = async (file: File) => {
		try {
			const text = await file.text();
			const vaultFile = await readUploadedVault(new File([text], file.name));
			await cacheVaultText(file.name, text);
			openVaultFileObject(vaultFile, "文件已读取。");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "无法打开文件。");
		}
	};

	const openCachedVault = async () => {
		try {
			const vaultFile = await storageProviders[0].load();
			if (!vaultFile) {
				setStatus("浏览器缓存为空。");
				return;
			}

			openVaultFileObject(vaultFile, "已读取浏览器缓存。");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "无法读取缓存。");
		}
	};

	const unlockVault = async () => {
		if (!lockedVault) {
			return;
		}

		try {
			const nextVault =
				unlockMode === "password"
					? await unlockWithPassword(lockedVault, unlockPassword)
					: await unlockWithAnswers(
							lockedVault,
							securitySlot?.type === "securityQuestions"
								? securitySlot.questions.map(
										(question) => unlockAnswers[question.id] ?? "",
									)
								: [],
						);

			setVault(touchVault(nextVault));
			setSettings(
				unlockMode === "password" && unlockPassword
					? buildEncryptedSettings(unlockPassword)
					: defaultSettings,
			);
			setLockedVault(null);
			setUnlockPassword("");
			setUnlockAnswers({});
			setPhase("ready");
			setStatus("Vault 已解锁。");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "解锁失败。");
		}
	};

	const startNewVault = () => {
		setVault(createEmptyVault());
		setSetupVaultName("");
		setSetupPassword("");
		setSetupQuestions([createBlankSecurityQuestion()]);
		setSettings(defaultSettings);
		setPhase("setupPassword");
		setStatus("配置新 Vault。");
	};

	const createVaultWithoutPassword = () => {
		const base = createEmptyVault();
		setVault(touchVault({ ...base, name: setupVaultName.trim() || base.name }));
		setSettings(defaultSettings);
		setPhase("ready");
		setStatus("已创建无密码 Vault。");
	};

	const continueWithPassword = () => {
		if (!setupPassword.trim()) {
			setStatus("请输入密码，或选择不使用密码。");
			return;
		}

		setSettings(buildEncryptedSettings(setupPassword));
		setPhase("setupQuestions");
		setStatus("可以设置安全问题。");
	};

	const finishSecurityQuestions = (includeQuestions: boolean) => {
		const validQuestions = setupQuestions.filter(
			(item) => item.question.trim() && item.answer.trim(),
		);

		setSettings({
			mode: "encrypted",
			password: setupPassword,
			securityQuestions: includeQuestions ? validQuestions : [],
		});
		setVault((currentVault) =>
			touchVault({ ...currentVault, name: setupVaultName.trim() || currentVault.name }),
		);
		setPhase("ready");
		setStatus("已创建 Vault。");
	};

	const goBackFromUnlock = () => {
		setLockedVault(null);
		setUnlockPassword("");
		setUnlockAnswers({});
		setPhase("login");
	};

	const goBackFromSetupPassword = () => {
		setSetupVaultName("");
		setSetupPassword("");
		setPhase("login");
	};

	const goBackFromSetupQuestions = () => {
		setPhase("setupPassword");
	};

	const saveEntry = (entry: Entry) => {
		setVault((currentVault) => upsertEntry(currentVault, entry));
		setEditingEntry(null);
		setStatus("Entry 已保存。");
	};

	const deleteEntry = (entryId: string) => {
		setVault((currentVault) => removeEntry(currentVault, entryId));
		setEditingEntry(null);
		setStatus("Entry 已删除。");
	};

	const openNewEntry = () => {
		setEditingEntry(createEmptyEntry(selectedCategory));
	};

	const addCategory = (def: CategoryDef) => {
		const trimmed = def.name.trim();
		if (!trimmed) return;
		setVault((v) =>
			touchVault({
				...v,
				categories: normalizeCategories([...v.categories, { ...def, name: trimmed }]),
			}),
		);
	};

	const updateCategory = (name: string, updates: Partial<Pick<CategoryDef, "icon" | "imageDataUrl">>) => {
		setVault((v) =>
			touchVault({
				...v,
				categories: v.categories.map((c) =>
					c.name === name ? { ...c, ...updates } : c,
				),
			}),
		);
	};

	const downloadVault = async () => {
		try {
			await storageProviders[1].save(vault, settings);
			setStatus("已下载 Vault 文件。");
		} catch (error) {
			setStatus(error instanceof Error ? error.message : "下载失败。");
		}
	};

	const updateVaultName = (name: string) => {
		setVault((currentVault) => touchVault({ ...currentVault, name }));
	};

	const updateSecurityQuestion = (
		id: string,
		field: keyof SecurityQuestion | "answer",
		value: string,
	) => {
		if (settings.mode !== "encrypted") {
			return;
		}

		setSettings({
			...settings,
			securityQuestions: settings.securityQuestions.map((item) =>
				item.id === id ? { ...item, [field]: value } : item,
			),
		});
	};

	const updateSetupQuestion = (
		id: string,
		field: keyof SecurityQuestion | "answer",
		value: string,
	) => {
		setSetupQuestions((questions) =>
			questions.map((item) =>
				item.id === id ? { ...item, [field]: value } : item,
			),
		);
	};

	const addAttachment = async (entry: Entry, files: FileList | null) => {
		if (!files?.length) {
			return entry;
		}

		const attachments = await Promise.all(
			[...files].map(async (file) => ({
				id: crypto.randomUUID(),
				name: file.name,
				type: file.type || "application/octet-stream",
				size: file.size,
				dataUrl: await fileToDataUrl(file),
			})),
		);

		return {
			...entry,
			attachments: [...entry.attachments, ...attachments],
		};
	};

	return {
		addAttachment,
		addCategory,
		cacheEnabled,
		cacheSaving,
		cacheStatus,
		categoryOptions,
		continueWithPassword,
		createVaultWithoutPassword,
		goBackFromSetupPassword,
		goBackFromSetupQuestions,
		goBackFromUnlock,
		deleteEntry,
		downloadVault,
		editingEntry,
		finishSecurityQuestions,
		lockedVault,
		openCachedVault,
		openNewEntry,
		openVaultFile,
		passwordSlot,
		phase,
		saveEntry,
		searchText,
		securitySlot,
		selectedCategory,
		setCacheEnabled,
		setEditingEntry,
		setSearchText,
		setSelectedCategory,
		setSettings,
		setSettingsOpen,
		setSetupPassword,
		setSetupQuestions,
		setSetupVaultName,
		setUnlockAnswers,
		setUnlockMode,
		setUnlockPassword,
		settings,
		settingsOpen,
		setupPassword,
		setupQuestions,
		setupVaultName,
		startNewVault,
		status,
		tableColumns,
		unlockAnswers,
		unlockMode,
		unlockPassword,
		unlockVault,
		updateCategory,
		updateSecurityQuestion,
		updateSetupQuestion,
		updateVaultName,
		vault,
		visibleEntries,
	};
}
