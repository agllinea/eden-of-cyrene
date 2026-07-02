# Eden of Cyrene

A **client-side, end-to-end encrypted password manager**. All vault data is
encrypted in the browser with the WebCrypto API; the Cloudflare Worker backend
is currently only a stub. The vault is stored as a single portable
`*.eden.json` file (downloaded or, in the future, synced to the cloud) and is
also auto-saved to the browser's IndexedDB cache.

> The README.md still contains the upstream Cloudflare "Vite + React" template
> text. Treat **this file** as the source of truth for what the project is.

## Stack

- **React 19** + **Vite 7** (SPA in `src/react-app`)
- **Hono** on **Cloudflare Workers** (`src/worker/index.ts` — stub only)
- **Tailwind CSS v4** (via `@tailwindcss/vite`)
- **motion** (animations), **lucide-react** (icons)
- TypeScript strict mode, ESLint flat config

## Commands

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm run build      # tsc -b && vite build
npm run lint       # eslint .
npm run test       # vitest run (CI / one-shot)
npm run test:watch # vitest (watch mode)
npm run check      # tsc && vite build && wrangler deploy --dry-run
npm run deploy     # wrangler deploy
```

## Architecture

Layered, with dependencies pointing downward:

```
components/      React UI. Auth flow (auth/), vault UI (vault/),
                 reusable primitives (ui/, button/), Toaster, ErrorBoundary.
hooks/           State orchestration. useVaultApp composes focused hooks:
                   useAuthFlow · useVaultDocument · useEncryption
                   useVaultUI · useVaultPersistence · useStatus
i18n/            Bilingual (zh / en) message dictionaries + provider/useI18n.
domain/          types.ts (data model) + vaultLogic.ts (pure functions) +
                   vaultMerge.ts (per-entry sync merge).
services/        cryptoVault.ts (WebCrypto) + storage.ts (IndexedDB + download) +
                   googleDrive.ts (Drive REST + OAuth) + vaultSync.ts (merge orchestration).
utils/           Small helpers (fileData).
```

Import alias: `@/` → `src/react-app/`.

### Data model (`domain/types.ts`)

- `Vault` — the decrypted document: entries, categories, tombstones, metadata.
  Every `Entry` carries `createdAt`/`updatedAt`, kept accurate on every mutation
  (`vaultLogic.upsertEntry` stamps `updatedAt` on every save). Deletes don't just
  filter the entry out — `removeEntry` also records an `EntryTombstone` in
  `Vault.deletedEntries` (`{ id, deletedAt }`) so a later merge can tell "deleted"
  apart from "never seen." `Vault.formatVersion` is currently `2`.
- `EncryptedVault` — the at-rest format: AES-GCM-encrypted vault + one or more
  `KeySlot`s. Each slot wraps the same random `vaultKey` under a key derived
  (PBKDF2-SHA-256, 210k iterations) from either a password or the security-question
  answers. This "envelope encryption" lets multiple credentials unlock one vault.
  Its own `formatVersion` is pinned at `1` independently of the inner `Vault`'s —
  see Schema validation & migration below.
- `VaultFile = Vault | EncryptedVault`.

### Encryption session (`services/cryptoVault.ts`)

To avoid re-running PBKDF2 on every autosave, the app holds a **session crypto
context** (`SessionCrypto`) after unlock/create:
- It caches the stable `vaultKey` and the already-derived `keySlots`.
- Repeated saves only re-run the cheap AES-GCM encryption, never PBKDF2.
- The session is rebuilt only when encryption settings change (password /
  questions / enable-disable).

### Persistence (`services/storage.ts`)

- **Download / future cloud sync = always one self-contained file** (attachments
  inlined as base64 data URLs). This is a hard invariant — do not break it.
- **Cache (IndexedDB)** may split storage for autosave performance: the "light"
  vault (attachments stripped) is written on every change, while attachment blobs
  are stored as separate records written only on add/remove. On load they are
  rehydrated into the full in-memory `Vault`.
- Providers are looked up by `id` (`getProvider("download")`), never by array index.

### Google Drive sync & merge (`services/googleDrive.ts`, `services/vaultSync.ts`, `domain/vaultMerge.ts`)

- Two independent sync entry points, each of which now reconciles instead of
  blindly overwriting: opening a vault from the Drive file list
  (`useAuthFlow.openDriveVaultById` / `unlockVault`, via
  `vaultSync.reconcileWithLocalCache`) and the 30s Drive autosave
  (`useVaultPersistence.runDriveSave`, via `vaultSync.reconcileWithDrive`).
  Both fetch the "other side" (local cache or current Drive file), decrypt it
  with the already-live `SessionCrypto` (`cryptoVault.decryptVaultWithSession`
  — no PBKDF2), and call `vaultMerge.mergeVaults`.
- `mergeVaults(a, b)` is a pure, order-independent (`mergeVaults(a,b)` ==
  `mergeVaults(b,a)`) last-write-wins merge: per entry, the newer `updatedAt`
  wins; for an entry only present on one side, the other side's tombstones
  decide whether it was deleted after that edit (dropped) or the edit happened
  after the deletion (kept — "resurrected"). Categories/name have no per-field
  timestamp, so conflicts there fall back to comparing the two vaults'
  top-level `updatedAt` (coarse but deterministic).
- `hasContentDiverged(a, b)` (ignores `updatedAt`) gates whether a merge result
  is actually pushed/applied, so a no-op sync tick doesn't spam Drive writes or
  touch local state.
- Merging is silent by design — no toast, no conflict UI. It just makes "last
  edit wins" apply per entry instead of per whole file.

### Schema validation & migration (`domain/schema.ts`, `domain/migrate.ts`)

- `parseVaultFile` validates with **zod** at the parse boundary, so a corrupted
  cache or hand-edited file is rejected here instead of crashing deep in the UI.
  The decrypted document is re-validated with `parseVaultObject`.
- `migrateVaultFile` walks `formatVersion` up to `LATEST_FORMAT_VERSION` before
  validation. It only applies to `Vault`-shaped objects — an `EncryptedVault`
  is passed through untouched (its wrapper format is frozen at 1; the `Vault`
  it decrypts to is migrated separately, after decryption, since
  `parseVaultObject` also calls `migrateVaultFile`). Files newer than supported
  are refused.
- The zod schemas are kept in sync with `domain/types.ts` by a compile-time
  assignability check (`_schemaSync`) — drift fails the build.

### Status & i18n

- UI text never hard-codes user-facing strings. Use `useI18n().t("key")`.
- Operation results are represented as **typed status codes** (`StatusMessage`
  with a `tone` + message key), never by matching display strings. `App.tsx`
  turns them into toasts; cache state is a typed enum, not a string compared with `===`.

### Testing

- **Vitest** (`*.test.ts` next to the module under test), config in `vitest.config.ts`
  (Node env — WebCrypto/btoa/TextEncoder are global; the `@/` alias is mirrored).
  Test files are excluded from the production `tsc` build.
- Covered today: `services/cryptoVault.ts` (encrypt↔decrypt round-trips,
  wrong-password/answer failures, multi-slot unlock, answer normalization,
  session reuse keeping all slots, attachment sealing, `decryptVaultWithSession`);
  `domain/vaultLogic.ts` (category normalization/inheritance, touchVault,
  upsert/remove, per-entry timestamp stamping, tombstone recording);
  `domain/vaultMerge.ts` (the sync merge algorithm — entry conflicts,
  edit-vs-delete ordering incl. exact-tie, tombstone dedup, category/name
  conflicts, order-independence); `domain/migrate.ts`/`schema.ts` (v1→v2
  migration, `EncryptedVault` pass-through, tombstone schema); and
  `services/vaultSync.ts` (merge orchestration, with `services/storage.ts` and
  `services/googleDrive.ts` mocked via `vi.mock`).
- Not yet covered: `services/storage.ts` needs a fake IndexedDB
  (e.g. `fake-indexeddb`) before it can be tested directly; hooks/components
  (incl. the two sync entry points in `useAuthFlow.ts`/`useVaultPersistence.ts`)
  are untested — their merge *decision logic* is covered at the
  `vaultMerge`/`vaultSync` level instead, since there's no React Testing
  Library in the repo yet.

### Multi-platform (desktop + mobile / PWA)

- Layout is responsive: `md:` breakpoint switches the sidebar between a static
  desktop panel and a slide-in mobile drawer (hamburger in the header). Heights
  use `dvh` (handles the mobile URL bar).
- **Touch:** never gate an essential control behind `:hover` alone. Reveal-on-hover
  uses `[@media(hover:hover)]:` so touch devices (no hover) keep controls visible
  (e.g. `rowReveal` in `EntryTable.tsx`). `useMediaQuery("(hover: none)")` drives
  the touch/pointer behaviour split in JS.
- **iOS zoom:** inputs are `text-base md:text-sm` (≥16px on mobile) so Safari does
  not auto-zoom on focus.
- **Safe areas:** `index.html` sets `viewport-fit=cover`; edge-anchored UI (header,
  FAB, toaster, sidebar) uses the `pt-safe` / `pb-safe-4` / `fab-safe` utilities
  in `index.css` (no-ops on non-notched devices).
- **Entry list = `EntryTable` everywhere** (no card view). Empty / no-match states
  live in `VaultPage` (`EntryListArea`), so the table assumes a non-empty list.
  The category column is hidden when filtered to a single category (redundant).
  The edit column + name column are frozen (`position: sticky` left) so they stay
  put on horizontal scroll.
- **Copy:** values are one-tap copyable via `CopyButton` (`useCopy` → clipboard +
  toast). Desktop: per-cell hover reveals the trailing copy button; the detail
  modal copies every field incl. custom properties. Touch: copy buttons are hidden
  and tapping a cell copies its value (the frozen edit button opens the modal).
- **PWA:** installable + offline via `public/manifest.webmanifest` and a
  network-first-navigation / cache-first-assets service worker (`public/sw.js`),
  registered in `main.tsx` **production-only**. Vault data is never cached by the
  SW (it lives in IndexedDB). _Follow-up: add PNG icons (192/512, maskable) — iOS
  `apple-touch-icon` ignores SVG._

## Deferred upgrades (TODO — intentionally NOT yet done)

The major items from the 2026-06 architecture review (automated tests, schema
validation + migration) are now done. Remaining lower-priority follow-ups:

1. **Test the persistence layer.** `services/storage.ts` (IndexedDB split-blob
   cache, hydration, key-rotation re-seal) is the largest untested surface. Add
   `fake-indexeddb` and cover save→load round-trips and attachment rehydration.
   Hooks/components also have no tests.

### Known smaller limitations (note, low priority)

- Security-question answers are normalized to trimmed/lowercased text → low
  entropy; acceptable for the feature but weaker than the password slot.
- Attachments/category images live inside the vault as base64; very large
  attachments still bloat the single exported file (inherent to the single-file
  invariant).
- The Worker is an empty stub; cloud sync will plug into the
  `VaultStorageProvider` interface and the single-file serialization.
- `Vault.deletedEntries` tombstones are never pruned — they accumulate for the
  life of the vault. Fine at password-vault scale (finite deletions over
  years, a few bytes each); would need a retention window if that ever changes.
- The Drive file-id ↔ vault mapping (`googleDrive.ts`'s `driveFileIds`) lives in
  `localStorage`, i.e. per-device. Linking via "connect" (as opposed to
  picking from the Drive file list) on a second device that already has this
  vault linked elsewhere doesn't detect the existing Drive file and would
  create a duplicate. Not fixed by the per-entry-timestamp merge work.

## Conventions

- Components receive the composed app object as `app` (e.g. `function X({ app }: { app: VaultApp }) `).
- New/edited files should import via the `@/` alias.
- Indentation: tabs (most files). There is no Prettier/Biome config yet.
- **Buttons** (`components/button/`) are exactly three, one per role — don't add
  more button components:
  - `Button` — every text button. `variant`: `primary | secondary | ghost |
    danger | link | dashed`; `size`; `fullWidth`; `icon` (icon + no children →
    square icon button). The one ghost look is neutral grey.
  - `IconButton` — small icon-only actions (`del | x | eye | row | copy`).
  - `OptionCard` — the big icon + title + sub-text selection card (login screen).
  - All styling lives in `tokens.ts` `cls`, keyed by role (single source of truth).
