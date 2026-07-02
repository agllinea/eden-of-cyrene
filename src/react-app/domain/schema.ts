import { z } from "zod";

import { migrateVaultFile } from "./migrate";
import type { Vault, VaultFile } from "./types";

// Structural validation at the parse boundary. A corrupted cache or a
// hand-edited file is rejected here instead of crashing deep in the UI.

const categorySchema = z.object({
	name: z.string(),
	icon: z.string().nullable(),
	imageDataUrl: z.string().nullable(),
});

const attachmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
	size: z.number(),
	dataUrl: z.string(),
});

const entrySchema = z.object({
	id: z.string(),
	name: z.string(),
	loginName: z.string(),
	password: z.string(),
	notes: z.string(),
	category: z.string().nullable(),
	attachments: z.array(attachmentSchema),
	customProperties: z.record(z.string(), z.string()),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const tombstoneSchema = z.object({
	id: z.string(),
	deletedAt: z.string(),
});

export const vaultSchema = z.object({
	kind: z.literal("Vault"),
	formatVersion: z.literal(2),
	name: z.string(),
	entries: z.array(entrySchema),
	categories: z.array(categorySchema),
	deletedEntries: z.array(tombstoneSchema),
	createdAt: z.string(),
	updatedAt: z.string(),
});

const encryptedPayloadSchema = z.object({
	algorithm: z.literal("AES-GCM"),
	iv: z.string(),
	ciphertext: z.string(),
});

const securityQuestionSchema = z.object({
	id: z.string(),
	question: z.string(),
});

const keySlotSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("password"),
		kdf: z.literal("PBKDF2-SHA-256"),
		salt: z.string(),
		iterations: z.number(),
		wrappedKey: encryptedPayloadSchema,
	}),
	z.object({
		type: z.literal("securityQuestions"),
		kdf: z.literal("PBKDF2-SHA-256"),
		salt: z.string(),
		iterations: z.number(),
		questions: z.array(securityQuestionSchema),
		wrappedKey: encryptedPayloadSchema,
	}),
]);

export const encryptedVaultSchema = z.object({
	kind: z.literal("EncryptedVault"),
	formatVersion: z.literal(1),
	encryption: z.object({
		vault: encryptedPayloadSchema,
		keySlots: z.array(keySlotSchema),
	}),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const vaultFileSchema = z.discriminatedUnion("kind", [
	vaultSchema,
	encryptedVaultSchema,
]);

// Compile-time guard: the schemas must stay structurally in sync with the
// hand-written domain types. If either drifts, one of these tuple slots becomes
// `never`, the literal `true` stops being assignable, and the build fails.
const _schemaSync: [
	z.infer<typeof vaultSchema> extends Vault ? true : never,
	Vault extends z.infer<typeof vaultSchema> ? true : never,
	z.infer<typeof vaultFileSchema> extends VaultFile ? true : never,
	VaultFile extends z.infer<typeof vaultFileSchema> ? true : never,
] = [true, true, true, true];
void _schemaSync;

/** Migrate + validate an arbitrary parsed object into a `VaultFile`. */
export function parseVaultFileObject(raw: unknown): VaultFile {
	const result = vaultFileSchema.safeParse(migrateVaultFile(raw));
	if (!result.success) {
		throw new Error("文件格式无效，无法识别为 Eden of Cyrene Vault。");
	}
	return result.data;
}

/** Migrate + validate a decrypted document into a `Vault`. */
export function parseVaultObject(raw: unknown): Vault {
	const result = vaultSchema.safeParse(migrateVaultFile(raw));
	if (!result.success) {
		throw new Error("解锁后的内容不是有效的 Vault。");
	}
	return result.data;
}
