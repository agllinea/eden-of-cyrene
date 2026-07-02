export type EntryPropertyValue = string;

export type CategoryDef = {
	name: string;
	icon: string | null;         // lucide icon name, e.g. "Globe"
	imageDataUrl: string | null; // uploaded image embedded as base64 data URL
};

export type Attachment = {
	id: string;
	name: string;
	type: string;
	size: number;
	dataUrl: string;
};

export type Entry = {
	id: string;
	name: string;
	loginName: string;
	password: string;
	notes: string;
	category: string | null;
	attachments: Attachment[];
	customProperties: Record<string, EntryPropertyValue>;
	createdAt: string;
	updatedAt: string;
};

export type EntryTombstone = {
	id: string;
	deletedAt: string;
};

export type Vault = {
	kind: "Vault";
	formatVersion: 2;
	name: string;
	entries: Entry[];
	categories: CategoryDef[];
	deletedEntries: EntryTombstone[];
	createdAt: string;
	updatedAt: string;
};

export type SecurityQuestion = {
	id: string;
	question: string;
};

export type EncryptedPayload = {
	algorithm: "AES-GCM";
	iv: string;
	ciphertext: string;
};

export type KeySlot =
	| {
			type: "password";
			kdf: "PBKDF2-SHA-256";
			salt: string;
			iterations: number;
			wrappedKey: EncryptedPayload;
	  }
	| {
			type: "securityQuestions";
			kdf: "PBKDF2-SHA-256";
			salt: string;
			iterations: number;
			questions: SecurityQuestion[];
			wrappedKey: EncryptedPayload;
	  };

export type EncryptedVault = {
	kind: "EncryptedVault";
	formatVersion: 1;
	encryption: {
		vault: EncryptedPayload;
		keySlots: KeySlot[];
	};
	createdAt: string;
	updatedAt: string;
};

export type VaultFile = Vault | EncryptedVault;

export type EncryptionSettings =
	| {
			mode: "none";
	  }
	| {
			mode: "encrypted";
			password: string;
			securityQuestions: Array<SecurityQuestion & { answer: string }>;
	  };

export function createEmptyVault(): Vault {
	const now = new Date().toISOString();

	return {
		kind: "Vault",
		formatVersion: 2,
		name: "Eden of Cyrene Vault",
		entries: [],
		categories: [],
		deletedEntries: [],
		createdAt: now,
		updatedAt: now,
	};
}

export function createEmptyEntry(category: string | null = null): Entry {
	const now = new Date().toISOString();

	return {
		id: crypto.randomUUID(),
		name: "",
		loginName: "",
		password: "",
		notes: "",
		category,
		attachments: [],
		customProperties: {},
		createdAt: now,
		updatedAt: now,
	};
}

export function createBlankSecurityQuestion() {
	return {
		id: crypto.randomUUID(),
		question: "",
		answer: "",
	};
}
