import type {
	EncryptedPayload,
	EncryptedVault,
	EncryptionSettings,
	KeySlot,
	Vault,
	VaultFile,
} from "../domain/types";

const iterations = 210_000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
	const binary = atob(value);
	const bytes = new Uint8Array(new ArrayBuffer(binary.length));
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}
	return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(new ArrayBuffer(length));
	crypto.getRandomValues(bytes);
	return bytes;
}

async function deriveWrappingKey(
	passphrase: string,
	salt: Uint8Array<ArrayBuffer>,
) {
	const material = await crypto.subtle.importKey(
		"raw",
		encoder.encode(passphrase),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt,
			iterations,
		},
		material,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

async function encryptText(value: string, key: CryptoKey): Promise<EncryptedPayload> {
	const iv = randomBytes(12);
	const ciphertext = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encoder.encode(value),
	);

	return {
		algorithm: "AES-GCM",
		iv: bytesToBase64(iv),
		ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
	};
}

async function decryptText(payload: EncryptedPayload, key: CryptoKey) {
	const plaintext = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: base64ToBytes(payload.iv) },
		key,
		base64ToBytes(payload.ciphertext),
	);

	return decoder.decode(plaintext);
}

async function exportVaultKey(vaultKey: CryptoKey) {
	const raw = await crypto.subtle.exportKey("raw", vaultKey);
	return bytesToBase64(new Uint8Array(raw));
}

async function importVaultKey(rawKey: string) {
	return crypto.subtle.importKey(
		"raw",
		base64ToBytes(rawKey),
		{ name: "AES-GCM" },
		true,
		["encrypt", "decrypt"],
	);
}

function normalizeAnswers(answers: string[]) {
	return answers.map((answer) => answer.trim().toLocaleLowerCase()).join("\n");
}

function assertVaultFile(value: unknown): VaultFile {
	if (!value || typeof value !== "object" || !("kind" in value)) {
		throw new Error("文件不是 Eden of Cyrene Vault。");
	}

	if (value.kind === "Vault" || value.kind === "EncryptedVault") {
		return value as VaultFile;
	}

	throw new Error("无法识别的 Vault 文件格式。");
}

async function createKeySlot(
	type: KeySlot["type"],
	passphrase: string,
	vaultKey: CryptoKey,
	questions?: Array<{ id: string; question: string }>,
): Promise<KeySlot> {
	const salt = randomBytes(16);
	const wrappingKey = await deriveWrappingKey(passphrase, salt);
	const wrappedKey = await encryptText(await exportVaultKey(vaultKey), wrappingKey);
	const base = {
		kdf: "PBKDF2-SHA-256" as const,
		salt: bytesToBase64(salt),
		iterations,
		wrappedKey,
	};

	if (type === "password") {
		return { type, ...base };
	}

	return {
		type,
		...base,
		questions: questions ?? [],
	};
}

export function parseVaultFile(text: string) {
	return assertVaultFile(JSON.parse(text));
}

export async function serializeVaultFile(
	vault: Vault,
	settings: EncryptionSettings,
) {
	const nextVault = {
		...vault,
		updatedAt: new Date().toISOString(),
	};

	if (settings.mode === "none") {
		return JSON.stringify(nextVault, null, 2);
	}

	if (!settings.password.trim() && settings.securityQuestions.length === 0) {
		throw new Error("加密模式需要设置密码或安全问题。");
	}

	const vaultKey = await crypto.subtle.generateKey(
		{ name: "AES-GCM", length: 256 },
		true,
		["encrypt", "decrypt"],
	);
	const keySlots: KeySlot[] = [];

	if (settings.password.trim()) {
		keySlots.push(
			await createKeySlot("password", settings.password, vaultKey),
		);
	}

	const validQuestions = settings.securityQuestions.filter(
		(item) => item.question.trim() && item.answer.trim(),
	);

	if (validQuestions.length > 0) {
		keySlots.push(
			await createKeySlot(
				"securityQuestions",
				normalizeAnswers(validQuestions.map((item) => item.answer)),
				vaultKey,
				validQuestions.map(({ id, question }) => ({ id, question })),
			),
		);
	}

	const encrypted: EncryptedVault = {
		kind: "EncryptedVault",
		formatVersion: 1,
		encryption: {
			vault: await encryptText(JSON.stringify(nextVault), vaultKey),
			keySlots,
		},
		createdAt: vault.createdAt,
		updatedAt: nextVault.updatedAt,
	};

	return JSON.stringify(encrypted, null, 2);
}

export function isEncryptedVault(file: VaultFile): file is EncryptedVault {
	return file.kind === "EncryptedVault";
}

export async function unlockWithPassword(file: EncryptedVault, password: string) {
	const slot = file.encryption.keySlots.find((item) => item.type === "password");
	if (!slot) {
		throw new Error("这个文件没有密码解锁方式。");
	}

	return unlockWithSlot(file, slot, password);
}

export async function unlockWithAnswers(file: EncryptedVault, answers: string[]) {
	const slot = file.encryption.keySlots.find(
		(item) => item.type === "securityQuestions",
	);
	if (!slot) {
		throw new Error("这个文件没有安全问题解锁方式。");
	}

	return unlockWithSlot(file, slot, normalizeAnswers(answers));
}

async function unlockWithSlot(
	file: EncryptedVault,
	slot: KeySlot,
	passphrase: string,
) {
	try {
		const wrappingKey = await deriveWrappingKey(
			passphrase,
			base64ToBytes(slot.salt),
		);
		const rawVaultKey = await decryptText(slot.wrappedKey, wrappingKey);
		const vaultKey = await importVaultKey(rawVaultKey);
		const vaultText = await decryptText(file.encryption.vault, vaultKey);
		const vault = JSON.parse(vaultText) as Vault;

		if (vault.kind !== "Vault") {
			throw new Error("解锁后的内容不是 Vault。");
		}

		return vault;
	} catch {
		throw new Error("解锁失败，请检查输入。");
	}
}
