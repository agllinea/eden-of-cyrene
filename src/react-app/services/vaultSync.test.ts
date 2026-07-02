import { describe, expect, it, vi } from "vitest";

import { createEmptyVault, type Entry, type Vault } from "@/domain/types";
import { createSession, parseVaultFile, serializeVaultWithSession } from "@/services/cryptoVault";
import { reconcileWithDrive, reconcileWithLocalCache } from "@/services/vaultSync";

const { loadCachedVaultMock, hydrateAttachmentsMock } = vi.hoisted(() => ({
	loadCachedVaultMock: vi.fn(),
	hydrateAttachmentsMock: vi.fn(async (vault: unknown) => vault),
}));
vi.mock("./storage", () => ({
	loadCachedVault: loadCachedVaultMock,
	hydrateAttachments: hydrateAttachmentsMock,
}));

const { loadDriveVaultMock } = vi.hoisted(() => ({ loadDriveVaultMock: vi.fn() }));
vi.mock("./googleDrive", () => ({ loadDriveVault: loadDriveVaultMock }));

const noneSession = { mode: "none", epoch: "x" } as const;

function entry(partial: Partial<Entry> & Pick<Entry, "id">): Entry {
	return {
		name: "",
		loginName: "",
		password: "",
		notes: "",
		category: null,
		attachments: [],
		customProperties: {},
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...partial,
	};
}

function vault(partial: Partial<Vault> = {}): Vault {
	return { ...createEmptyVault(), createdAt: "shared-identity", ...partial };
}

describe("reconcileWithLocalCache", () => {
	it("returns the remote vault unchanged when there's no local cache entry", async () => {
		loadCachedVaultMock.mockResolvedValueOnce(null);
		const remote = vault({ entries: [entry({ id: "r" })] });

		const result = await reconcileWithLocalCache(remote, noneSession);

		expect(loadCachedVaultMock).toHaveBeenCalledWith(remote.createdAt);
		expect(result).toEqual(remote);
	});

	it("merges the remote vault with a plaintext local cache entry", async () => {
		const remote = vault({ entries: [entry({ id: "r" })] });
		const cached = vault({ entries: [entry({ id: "c" })] });
		loadCachedVaultMock.mockResolvedValueOnce(cached);

		const result = await reconcileWithLocalCache(remote, noneSession);

		expect(result.entries.map((e) => e.id).sort()).toEqual(["c", "r"]);
	});

	it("decrypts an encrypted local cache entry before merging", async () => {
		const session = await createSession({
			mode: "encrypted",
			password: "hunter2",
			securityQuestions: [],
		});
		const remote = vault({ entries: [entry({ id: "r" })] });
		const cachedPlain = vault({ createdAt: remote.createdAt, entries: [entry({ id: "c" })] });
		const cachedFile = parseVaultFile(await serializeVaultWithSession(cachedPlain, session));
		loadCachedVaultMock.mockResolvedValueOnce(cachedFile);

		const result = await reconcileWithLocalCache(remote, session);

		expect(result.entries.map((e) => e.id).sort()).toEqual(["c", "r"]);
	});
});

describe("reconcileWithDrive", () => {
	it("merges the local vault with the current Drive copy", async () => {
		const local = vault({ entries: [entry({ id: "l" })] });
		const remote = vault({ entries: [entry({ id: "d" })] });
		loadDriveVaultMock.mockResolvedValueOnce(remote);

		const result = await reconcileWithDrive(local, "file-id", noneSession);

		expect(loadDriveVaultMock).toHaveBeenCalledWith("file-id");
		expect(result.entries.map((e) => e.id).sort()).toEqual(["d", "l"]);
	});

	it("keeps the newer edit when Drive has a conflicting edit to the same entry", async () => {
		const local = vault({
			entries: [entry({ id: "e", name: "local", updatedAt: "2026-01-01T00:00:00.000Z" })],
		});
		const remote = vault({
			entries: [entry({ id: "e", name: "remote", updatedAt: "2026-01-02T00:00:00.000Z" })],
		});
		loadDriveVaultMock.mockResolvedValueOnce(remote);

		const result = await reconcileWithDrive(local, "file-id", noneSession);

		expect(result.entries[0].name).toBe("remote");
	});
});
