import { describe, expect, it } from "vitest";

import { createEmptyVault, type EncryptionSettings, type Vault } from "@/domain/types";
import {
	createSession,
	isEncryptedVault,
	openAttachment,
	parseVaultFile,
	sealAttachment,
	serializeVaultWithSession,
	sessionFromUnlocked,
	unlockWithAnswers,
	unlockWithPassword,
} from "@/services/cryptoVault";

function sampleVault(): Vault {
	const base = createEmptyVault();
	return {
		...base,
		name: "My Vault",
		entries: [
			{
				id: "e1",
				name: "GitHub",
				loginName: "octocat",
				password: "s3cr3t!",
				notes: "work account",
				category: "Dev",
				attachments: [],
				customProperties: { url: "https://github.com" },
				createdAt: base.createdAt,
				updatedAt: base.updatedAt,
			},
		],
	};
}

const encryptedSettings = (
	password: string,
	questions: { id: string; question: string; answer: string }[] = [],
): EncryptionSettings => ({
	mode: "encrypted",
	password,
	securityQuestions: questions,
});

describe("serialize / parse", () => {
	it("round-trips a plaintext vault unchanged", () => {
		const vault = sampleVault();
		const session = { mode: "none", epoch: "x" } as const;

		return serializeVaultWithSession(vault, session).then((text) => {
			const parsed = parseVaultFile(text);
			expect(parsed.kind).toBe("Vault");
			expect(isEncryptedVault(parsed)).toBe(false);
			if (parsed.kind === "Vault") {
				expect(parsed.entries).toEqual(vault.entries);
				expect(parsed.name).toBe("My Vault");
			}
		});
	});

	it("rejects content that is not an Eden vault", () => {
		expect(() => parseVaultFile(JSON.stringify({ hello: "world" }))).toThrow();
		expect(() => parseVaultFile(JSON.stringify({ kind: "Nope" }))).toThrow();
	});
});

describe("password encryption", () => {
	it("encrypts then decrypts back to the original vault", async () => {
		const vault = sampleVault();
		const session = await createSession(encryptedSettings("hunter2"));
		const text = await serializeVaultWithSession(vault, session);
		const file = parseVaultFile(text);

		expect(isEncryptedVault(file)).toBe(true);
		// Ciphertext must not leak the plaintext.
		expect(text).not.toContain("s3cr3t!");

		if (!isEncryptedVault(file)) throw new Error("expected encrypted");
		const { vault: unlocked } = await unlockWithPassword(file, "hunter2");
		expect(unlocked.entries).toEqual(vault.entries);
	});

	it("fails to unlock with the wrong password", async () => {
		const session = await createSession(encryptedSettings("correct-horse"));
		const text = await serializeVaultWithSession(sampleVault(), session);
		const file = parseVaultFile(text);
		if (!isEncryptedVault(file)) throw new Error("expected encrypted");

		await expect(unlockWithPassword(file, "wrong")).rejects.toThrow();
	});

	it("rejects encrypted mode with no password and no questions", async () => {
		await expect(
			createSession({ mode: "encrypted", password: "  ", securityQuestions: [] }),
		).rejects.toThrow();
	});
});

describe("multi-slot envelope encryption", () => {
	const questions = [
		{ id: "q1", question: "First pet?", answer: "Rex" },
		{ id: "q2", question: "Birth city?", answer: "Paris" },
	];

	it("unlocks the same vault via either password or security questions", async () => {
		const vault = sampleVault();
		const session = await createSession(encryptedSettings("pw-123", questions));
		const file = parseVaultFile(await serializeVaultWithSession(vault, session));
		if (!isEncryptedVault(file)) throw new Error("expected encrypted");

		expect(file.encryption.keySlots).toHaveLength(2);

		const byPassword = await unlockWithPassword(file, "pw-123");
		const byAnswers = await unlockWithAnswers(file, ["Rex", "Paris"]);

		expect(byPassword.vault.entries).toEqual(vault.entries);
		expect(byAnswers.vault.entries).toEqual(vault.entries);
	});

	it("normalizes answers (case- and whitespace-insensitive)", async () => {
		const session = await createSession(encryptedSettings("pw-123", questions));
		const file = parseVaultFile(await serializeVaultWithSession(sampleVault(), session));
		if (!isEncryptedVault(file)) throw new Error("expected encrypted");

		const { vault } = await unlockWithAnswers(file, ["  rEx ", "PARIS"]);
		expect(vault.kind).toBe("Vault");
	});

	it("fails with wrong answers", async () => {
		const session = await createSession(encryptedSettings("pw-123", questions));
		const file = parseVaultFile(await serializeVaultWithSession(sampleVault(), session));
		if (!isEncryptedVault(file)) throw new Error("expected encrypted");

		await expect(unlockWithAnswers(file, ["Rex", "London"])).rejects.toThrow();
	});
});

describe("session reuse (#5)", () => {
	it("re-serializing with the unlocked session stays decryptable and keeps all slots", async () => {
		const session = await createSession(encryptedSettings("pw-123", [
			{ id: "q1", question: "Pet?", answer: "Rex" },
		]));
		const file = parseVaultFile(await serializeVaultWithSession(sampleVault(), session));
		if (!isEncryptedVault(file)) throw new Error("expected encrypted");

		const { vault, vaultKey } = await unlockWithPassword(file, "pw-123");
		const reused = sessionFromUnlocked(file, vaultKey);

		// Autosave path: encrypt again with the reused session (no PBKDF2).
		const text2 = await serializeVaultWithSession(vault, reused);
		const file2 = parseVaultFile(text2);
		if (!isEncryptedVault(file2)) throw new Error("expected encrypted");

		// Both original slots survive, and the security-question slot still works.
		expect(file2.encryption.keySlots).toHaveLength(2);
		const { vault: again } = await unlockWithAnswers(file2, ["Rex"]);
		expect(again.entries).toEqual(vault.entries);
	});
});

describe("attachment sealing (#6)", () => {
	it("round-trips an attachment under an encrypted session", async () => {
		const session = await createSession(encryptedSettings("pw-123"));
		const dataUrl = "data:text/plain;base64,SGVsbG8=";

		const sealed = await sealAttachment(dataUrl, session);
		expect(sealed.enc).toBe(true);
		expect(JSON.stringify(sealed)).not.toContain("SGVsbG8=");

		expect(await openAttachment(sealed, session)).toBe(dataUrl);
	});

	it("stores attachments as plain data when there is no encryption", async () => {
		const session = { mode: "none", epoch: "x" } as const;
		const dataUrl = "data:text/plain;base64,SGVsbG8=";

		const sealed = await sealAttachment(dataUrl, session);
		expect(sealed.enc).toBe(false);
		expect(await openAttachment(sealed, session)).toBe(dataUrl);
	});
});
