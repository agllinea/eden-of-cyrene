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
npm run dev      # Vite dev server (http://localhost:5173)
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run check    # tsc && vite build && wrangler deploy --dry-run
npm run deploy   # wrangler deploy
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

### Status & i18n

- UI text never hard-codes user-facing strings. Use `useI18n().t("key")`.
- Operation results are represented as **typed status codes** (`StatusMessage`
  with a `tone` + message key), never by matching display strings. `App.tsx`
  turns them into toasts; cache state is a typed enum, not a string compared with `===`.

## Deferred upgrades (TODO — intentionally NOT yet done)

These were identified during the 2026-06 architecture review and consciously
postponed. Pick them up in roughly this order:

1. **Automated tests (deferred).** There is currently zero test coverage. This is
   the highest-priority gap for a crypto-bearing app. `services/cryptoVault.ts`
   and `domain/vaultLogic.ts` are pure and trivially testable. Add Vitest and
   cover: encrypt→decrypt round-trips, unlock-with-wrong-password, multi-slot
   unlock, category-property inheritance, upsert/remove entry.

2. **Schema validation + version migration (deferred).** `parseVaultFile` only
   checks the `kind` field and then casts `as Vault`/`as VaultFile` with no
   structural validation, so a corrupted cache or hand-edited file can crash deep
   in the UI. `formatVersion` exists but there is no migration pipeline. Add a
   schema validator (e.g. zod) at the parse boundary and a
   `migrate(file): VaultFile` step keyed off `formatVersion` so the on-disk format
   can evolve safely.

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
