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
domain/          types.ts (data model) + vaultLogic.ts (pure functions).
services/        cryptoVault.ts (WebCrypto) + storage.ts (IndexedDB + download).
utils/           Small helpers (fileData).
```

Import alias: `@/` → `src/react-app/`.

### Data model (`domain/types.ts`)

- `Vault` — the decrypted document: entries, categories, metadata.
- `EncryptedVault` — the at-rest format: AES-GCM-encrypted vault + one or more
  `KeySlot`s. Each slot wraps the same random `vaultKey` under a key derived
  (PBKDF2-SHA-256, 210k iterations) from either a password or the security-question
  answers. This "envelope encryption" lets multiple credentials unlock one vault.
- `VaultFile = Vault | EncryptedVault` — `formatVersion: 1`.

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

### Schema validation & migration (`domain/schema.ts`, `domain/migrate.ts`)

- `parseVaultFile` validates with **zod** at the parse boundary, so a corrupted
  cache or hand-edited file is rejected here instead of crashing deep in the UI.
  The decrypted document is re-validated with `parseVaultObject`.
- `migrateVaultFile` walks `formatVersion` up to `LATEST_FORMAT_VERSION` before
  validation (chain currently empty — add a step keyed by the source version
  when the on-disk format changes). Files newer than supported are refused.
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
  session reuse keeping all slots, attachment sealing) and `domain/vaultLogic.ts`
  (category normalization/inheritance, touchVault, upsert/remove).
- Not yet covered: `services/storage.ts` needs a fake IndexedDB
  (e.g. `fake-indexeddb`) before it can be tested; hooks/components are untested.

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

## Conventions

- Components receive the composed app object as `app` (e.g. `function X({ app }: { app: VaultApp }) `).
- New/edited files should import via the `@/` alias.
- Indentation: tabs (most files). There is no Prettier/Biome config yet.
