import type { CategoryDef, Entry, EntryTombstone, Vault } from "./types";
import { touchVault } from "./vaultLogic";

// Merges two copies of the *same* vault (matched by identity elsewhere, via
// `createdAt`) that may have diverged — e.g. edited on two devices between
// syncs. Last-write-wins per entry, with tombstones so a delete on one side
// can beat (or lose to) an edit on the other depending on which is newer.
//
// Order-independent: `mergeVaults(a, b)` and `mergeVaults(b, a)` produce the
// same entries/tombstones/categories/name — ties are broken by comparing
// values, never by argument position.

function pickNewerEntry(a: Entry, b: Entry): Entry {
	if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
	// Exact timestamp tie (two devices with synced clocks editing the same entry
	// between syncs): fall back to lexicographic JSON comparison so the result is
	// still deterministic and order-independent, but which edit "wins" is
	// arbitrary — whichever serializes higher. Collisions are expected to be rare.
	const jsonA = JSON.stringify(a);
	const jsonB = JSON.stringify(b);
	if (jsonA === jsonB) return a;
	return jsonA > jsonB ? a : b;
}

function mergeTombstones(a: EntryTombstone[], b: EntryTombstone[]): Map<string, EntryTombstone> {
	const byId = new Map<string, EntryTombstone>();
	for (const tombstone of [...a, ...b]) {
		const existing = byId.get(tombstone.id);
		if (!existing || tombstone.deletedAt > existing.deletedAt) {
			byId.set(tombstone.id, tombstone);
		}
	}
	return byId;
}

function mergeEntries(a: Vault, b: Vault): { entries: Entry[]; tombstones: Map<string, EntryTombstone> } {
	const aById = new Map(a.entries.map((entry) => [entry.id, entry]));
	const bById = new Map(b.entries.map((entry) => [entry.id, entry]));
	const aTombstones = new Map(a.deletedEntries.map((t) => [t.id, t]));
	const bTombstones = new Map(b.deletedEntries.map((t) => [t.id, t]));
	const tombstones = mergeTombstones(a.deletedEntries, b.deletedEntries);

	const ids = new Set([...aById.keys(), ...bById.keys()]);
	const entries: Entry[] = [];

	for (const id of ids) {
		const entryA = aById.get(id);
		const entryB = bById.get(id);

		if (entryA && entryB) {
			entries.push(pickNewerEntry(entryA, entryB));
			continue;
		}

		const entry = (entryA ?? entryB)!;
		const opposingTombstone = entryA ? bTombstones.get(id) : aTombstones.get(id);
		// Deleted on the other side after (or at) this entry's last known edit.
		if (opposingTombstone && opposingTombstone.deletedAt >= entry.updatedAt) continue;
		entries.push(entry);
	}

	// An edit that beat a delete makes the corresponding tombstone stale.
	for (const entry of entries) tombstones.delete(entry.id);

	return { entries, tombstones };
}

function resolveCategoryConflict(catA: CategoryDef, catB: CategoryDef, a: Vault, b: Vault): CategoryDef {
	const jsonA = JSON.stringify(catA);
	const jsonB = JSON.stringify(catB);
	if (jsonA === jsonB) return catA;
	if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? catA : catB;
	return jsonA > jsonB ? catA : catB;
}

// There's no per-category timestamp today, so conflicting category defs
// (icon/image) are resolved by comparing the whole vaults' top-level
// `updatedAt` — coarse, but deterministic and no worse than today's total
// lack of conflict resolution.
function mergeCategories(a: Vault, b: Vault): CategoryDef[] {
	const aByName = new Map(a.categories.map((cat) => [cat.name, cat]));
	const bByName = new Map(b.categories.map((cat) => [cat.name, cat]));
	const names = new Set([...aByName.keys(), ...bByName.keys()]);

	const result: CategoryDef[] = [];
	for (const name of names) {
		const catA = aByName.get(name);
		const catB = bByName.get(name);
		result.push(catA && catB ? resolveCategoryConflict(catA, catB, a, b) : (catA ?? catB)!);
	}
	return result;
}

// Same coarse resolution as categories: no dedicated timestamp for the name
// field, so fall back to the vaults' overall `updatedAt`.
function resolveName(a: Vault, b: Vault): string {
	if (a.name === b.name) return a.name;
	if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a.name : b.name;
	return a.name > b.name ? a.name : b.name;
}

export function mergeVaults(a: Vault, b: Vault): Vault {
	const { entries, tombstones } = mergeEntries(a, b);

	return touchVault({
		kind: "Vault",
		formatVersion: 2,
		name: resolveName(a, b),
		entries,
		categories: mergeCategories(a, b),
		deletedEntries: [...tombstones.values()],
		createdAt: a.createdAt,
		updatedAt: a.updatedAt > b.updatedAt ? a.updatedAt : b.updatedAt,
	});
}

function sortedById<T extends { id: string }>(items: T[]): T[] {
	return [...items].sort((x, y) => x.id.localeCompare(y.id));
}

/** Content-equal ignoring vault-level `updatedAt`/`createdAt` (merges always bump `updatedAt`). */
export function hasContentDiverged(a: Vault, b: Vault): boolean {
	if (a.name !== b.name) return true;
	if (JSON.stringify(sortedById(a.entries)) !== JSON.stringify(sortedById(b.entries))) return true;
	if (JSON.stringify(sortedById(a.deletedEntries)) !== JSON.stringify(sortedById(b.deletedEntries))) return true;

	const catsA = [...a.categories].sort((x, y) => x.name.localeCompare(y.name));
	const catsB = [...b.categories].sort((x, y) => x.name.localeCompare(y.name));
	return JSON.stringify(catsA) !== JSON.stringify(catsB);
}
