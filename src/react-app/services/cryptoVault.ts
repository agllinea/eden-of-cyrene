import { parseVaultFileObject, parseVaultObject } from "@/domain/schema";
import type {
	EncryptedPayload,
	EncryptedVault,
	EncryptionSettings,
	KeySlot,
	Vault,
	VaultFile,
} from "@/domain/types";

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
	return answers.map((answer) => answer.trim()).join("\n");
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

export function parseVaultFile(text: string): VaultFile {
	return parseVaultFileObject(JSON.parse(text));
}

// ── Session crypto ──────────────────────────────────────────────────────────
//
// PBKDF2 (210k iterations per key slot) is the expensive part of encryption.
// Running it on every autosave would jank the UI, so we derive the wrapping
// keys ONCE and keep the resulting `SessionCrypto` for the lifetime of the
// session. Repeated saves only re-run the cheap AES-GCM vault encryption.
//
// The session is (re)built only when encryption settings change, or adopted
// directly from a freshly unlocked file (reusing its slots — zero PBKDF2).

// `epoch` is a random id for the current vault key. The split attachment cache
// uses it to detect key rotation (settings change) and re-seal accordingly.
export type SessionCrypto =
	| { mode: "none"; epoch: string }
	| { mode: "encrypted"; epoch: string; vaultKey: CryptoKey; keySlots: KeySlot[] };

export function noEncryptionSession(): SessionCrypto {
	return { mode: "none", epoch: crypto.randomUUID() };
}

/** Expensive: derives wrapping keys via PBKDF2. Call on settings change only. */
export async function createSession(
	settings: EncryptionSettings,
): Promise<SessionCrypto> {
	if (settings.mode === "none") {
		return noEncryptionSession();
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
		keySlots.push(await createKeySlot("password", settings.password, vaultKey));
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

	return { mode: "encrypted", epoch: crypto.randomUUID(), vaultKey, keySlots };
}

/** Cheap: reuses the slots already present on a just-unlocked file. */
export function sessionFromUnlocked(
	file: EncryptedVault,
	vaultKey: CryptoKey,
): SessionCrypto {
	return {
		mode: "encrypted",
		epoch: crypto.randomUUID(),
		vaultKey,
		keySlots: file.encryption.keySlots,
	};
}

/** Cheap: encrypts the vault with the cached session key (no PBKDF2). */
export async function serializeVaultWithSession(
	vault: Vault,
	session: SessionCrypto,
): Promise<string> {
	const nextVault: Vault = {
		...vault,
		updatedAt: new Date().toISOString(),
	};

	if (session.mode === "none") {
		return JSON.stringify(nextVault, null, 2);
	}

	const encrypted: EncryptedVault = {
		kind: "EncryptedVault",
		formatVersion: 1,
		encryption: {
			vault: await encryptText(JSON.stringify(nextVault), session.vaultKey),
			keySlots: session.keySlots,
		},
		createdAt: vault.createdAt,
		updatedAt: nextVault.updatedAt,
	};

	return JSON.stringify(encrypted, null, 2);
}

/** Cheap: decrypts a file with the cached session key (no PBKDF2). Reverse of `serializeVaultWithSession`. */
export async function decryptVaultWithSession(
	file: EncryptedVault,
	session: SessionCrypto,
): Promise<Vault> {
	if (session.mode === "none") {
		throw new Error("缺少解密所需的密钥。");
	}
	const vaultText = await decryptText(file.encryption.vault, session.vaultKey);
	return parseVaultObject(JSON.parse(vaultText));
}

// ── Attachment sealing (for the split browser cache) ──────────────────────────
//
// Cached attachment blobs are stored separately from the main document so the
// autosave hot path doesn't re-write them. They are encrypted under the same
// session key when the vault is encrypted, and stored as plain data otherwise.

export type SealedAttachment =
	| { enc: false; data: string }
	| { enc: true; payload: EncryptedPayload };

export async function sealAttachment(
	dataUrl: string,
	session: SessionCrypto,
): Promise<SealedAttachment> {
	if (session.mode === "none") {
		return { enc: false, data: dataUrl };
	}
	return { enc: true, payload: await encryptText(dataUrl, session.vaultKey) };
}

export async function openAttachment(
	sealed: SealedAttachment,
	session: SessionCrypto,
): Promise<string> {
	if (!sealed.enc) {
		return sealed.data;
	}
	if (session.mode === "none") {
		throw new Error("缺少解密附件所需的密钥。");
	}
	return decryptText(sealed.payload, session.vaultKey);
}

export function isEncryptedVault(file: VaultFile): file is EncryptedVault {
	return file.kind === "EncryptedVault";
}

export type UnlockResult = { vault: Vault; vaultKey: CryptoKey };

export async function unlockWithPassword(
	file: EncryptedVault,
	password: string,
): Promise<UnlockResult> {
	const slot = file.encryption.keySlots.find((item) => item.type === "password");
	if (!slot) {
		throw new Error("这个文件没有密码解锁方式。");
	}

	return unlockWithSlot(file, slot, password);
}

export async function unlockWithAnswers(
	file: EncryptedVault,
	answers: string[],
): Promise<UnlockResult> {
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
): Promise<UnlockResult> {
	try {
		const wrappingKey = await deriveWrappingKey(
			passphrase,
			base64ToBytes(slot.salt),
		);
		const rawVaultKey = await decryptText(slot.wrappedKey, wrappingKey);
		const vaultKey = await importVaultKey(rawVaultKey);
		const vaultText = await decryptText(file.encryption.vault, vaultKey);
		const vault = parseVaultObject(JSON.parse(vaultText));

		return { vault, vaultKey };
	} catch {
		throw new Error("解锁失败，请检查输入。");
	}
}
