# LegalVu v2 — Rectification Plan (target: QG3 "AI Drafting Works")

## Update — 2026-06-17: PicoForge Full Upgrade Applied

All items from Batches A through E have been addressed via a full PicoForge 7-agent upgrade. See UPGRADE_SPEC.md for details.

---

Created: 2026-06-16
Scope: /a0/usr/projects/legalvu_v2 (Electron 33 + React 18 + TS 5.6 + Vite 5 + better-sqlite3 12 + Vitest 4)

Execution order is **Batch A → B → C → D → E** (critical bugs → high security → medium security/quality → missing foundation → Phase 3 UI). Within each batch items are independent and may be parallelized. Each item lists **Files**, **Change**, **Acceptance**. No code is written here — changes are described precisely.

Conventions: app root = `src/`; alias `@/*` → `src/*`. Timestamps standardized to **Unix milliseconds** (`Date.now()`). DB columns are snake_case; TS models stay camelCase; mapping done in a mappers module.

---

## Batch 0 — Decisions, dependencies, and test harness (prerequisite)

### 0.1 Decisions requiring user input (BLOCKERS — resolve before B/E)
- **D1 — Data-residency vs AI providers (HARD CONFLICT).** Spec requires Australia data residency, but `ai-adapter.ts` calls `api.openai.com` / `api.anthropic.com` (US). **Decision needed:** (a) route via an AU-resident endpoint (Azure OpenAI `australiaeast`, or AWS Bedrock `ap-southeast-2`), (b) explicitly accept offshore transit and log a deviation in the spec, or (c) provider configurable in Settings. *Recommend (a).*
- **D2 — Secret storage.** Spec says electron `safeStorage`. **Decision:** use `safeStorage` (OS keychain) — no custom crypto for secrets. (Custom AES only if safeStorage is unavailable in a target env.) *Recommend safeStorage; proceed unless vetoed.*
- **D3 — Rich-text editor.** **Decision:** TipTap (`@tiptap/react` + `@tiptap/starter-kit` + `tiptap-markdown`) vs `@uiw/react-md-editor`. TipTap is better for structured contracts + in-place editing; md-editor is lighter and simpler since AI emits markdown. *Recommend TipTap + tiptap-markdown.*
- **D4 — DOCX export.** **Decision:** `docx` (programmatic) + `marked` (md→AST→docx) vs `docxtemplater` (template-based). Drafting produces free-form text, so `docx` + `marked` fits. *Recommend `docx` + `marked`.*
- **D5 — Password hashing lib.** `bcryptjs` (pure JS, no native rebuild across Electron arches) vs native `bcrypt`/`argon2`. *Recommend `bcryptjs`.*

### 0.2 New dependencies (package.json)
- **dependencies:** `zod`, `bcryptjs`, `docx`, `marked`, `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `tiptap-markdown`. (Drop TipTap trio if D3 = md-editor; add `@uiw/react-md-editor` instead.)
- **devDependencies:** `@types/bcryptjs`, `@types/better-sqlite3`. Delete the hand-rolled stub `src/main/types/better-sqlite3.d.ts` once `@types/better-sqlite3` is installed.
- **No telemetry deps.** Confirms local-first/AU constraint.

### 0.3 Test harness
**Files:** `vitest.config.ts` (new), `src/main/database/test-db.ts` (new), refactor `src/main/database/connection.ts` (see A2).
**Change:**
- `vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts']`, `pool: 'forks'`, `coverage` optional. No browser environment (renderer tests stub `window.electronAPI`).
- `test-db.ts`: exports `createTestDb()` → `new Database(':memory:')`, applies pragmas (FK, WAL-in-memory noop), runs schema, returns the instance; `resetTestDb()`/`closeTestDb()` helpers.
- `connection.ts`: add `setDatabaseForTesting(db)` and `closeConnection()` so services that call `getConnection()` become unit-testable against an injected `:memory:` DB.
**Acceptance:** `npm test` runs with no on-disk writes (delete `data/test-database.db` usage); each test file starts from an empty `:memory:` DB.

---

## Batch A — CRITICAL BUGS (app-breaking) — do first

### A1 — Fix `sync_queue` schema syntax error
**Files:** `src/main/database/schema.sql`.
**Change:** Line 85, close the `strftime` call: `created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)` (paren closed; also moved to ms per the standardization — see A3).
**Acceptance:** `db.exec(schema)` succeeds; table `sync_queue` exists; test asserts all 7 tables present (existing test was passing only because exec fails atomically — re-verify).

### A2 — Make migrations packaged-build safe + harden connection
**Files:** `src/main/database/migrations.ts`, `src/main/database/connection.ts`, `src/main/index.ts`.
**Change:**
- `migrations.ts`: stop using `process.cwd()`. Resolve schema via `app.getAppPath()` in production and `__dirname`/`path.resolve(__dirname, 'schema.sql')` in dev; accept an injected `schemaSql?`/`db?` for tests. Make idempotent (already `IF NOT EXISTS`) and seed a bootstrap `system` user (see A5/F1) so FK targets exist.
- `connection.ts`: default path → `app.getPath('userData')/database.db` (NOT `process.cwd()/data`); on open run `PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;`. Add `closeConnection()`.
- `index.ts`: call `getConnection()` + `migrate()` inside `app.whenReady()` (already); add `app.on('before-quit', () => closeConnection())`.
**Acceptance:** migrate works under `electron-forge package`; FK + WAL pragmas verified by a test; connection closes on quit (manual).

### A3 — Standardize timestamps to milliseconds (kill the 1000× bug)
**Files:** `schema.sql`, `contract-service.ts`, any service writing timestamps.
**Change:** Replace every `DEFAULT (strftime('%s', 'now'))` with `DEFAULT (strftime('%s', 'now') * 1000)`. All app-side writes use `Date.now()`. `updated_at` updates use ms.
**Acceptance:** A inserted row's `created_at` is within ±2000 ms of `Date.now()` (was ~1/1000 before).

### A4 — Fix `contracts` column semantic mismatch
**Files:** `src/main/services/contract-service.ts`.
**Change:** `ai_prompt_version` ← the **prompt version string** (from `prompts.ts`, e.g. `contract-draft-v1`), NOT `JSON.stringify(input)`. Put structured prompt metadata into `metadata` (JSON) and/or `audit_logs.details`. Keep `content` = draft text, `ai_model` = model. Add `ai_tokens_used` (see F/D note) populated from provider usage.
**Acceptance:** After create, `SELECT ai_prompt_version` returns the version constant; `metadata` holds the input JSON; a round-trip via mapper returns a typed `Contract`.

### A5 — Fix `created_by` FK violation
**Files:** `src/main/database/migrations.ts`/`seed.ts`, `src/main/services/contract-service.ts`, `src/main/index.ts`.
**Change:** `contract:generate` currently hardcodes `created_by='system-user'`, a non-existent user → FK fail once FK is ON. Seed a real `system` user during migrate; once auth (Batch D) lands, pass the authenticated `userId`. Until then use the seeded `system` id.
**Acceptance:** `INSERT … contracts` with FK ON succeeds; mapper resolves `createdBy`.

### A6 — Activate & align the `IPC_CHANNELS` enum (currently dead + wrong)
**Files:** `src/shared/ipc-channels.ts`, all handlers in `src/main/index.ts`, `src/preload/index.ts`.
**Change:** The enum has `CONTRACT_CREATE:'contract:create'` and `AI_GENERATE:'ai:generate'`, but handlers register `'contract:generate'` — they never line up. Reconcile: set enum values to the real channel strings (`contract:generate`, `contract:fetch`, `contract:transition`, `ai:stream:start`, `ai:stream:chunk`, `ai:stream:done`, `ai:stream:error`, `auth:*`, `audit:*`, `settings:*`, existing `sp:*`). Make handlers and preload read from `IPC_CHANNELS` — no more raw literals.
**Acceptance:** grep finds zero raw `'contract:...'` literals in handlers/preload; all channels come from the enum; typecheck passes.

**Exit gate for Batch A:** `npm test` green (new DB tests), `npm run typecheck` green, app boots and `ping`/SP handlers still work manually.

---

## Batch B — HIGH SECURITY

### B1 — Remove API keys from renderer transit (safeStorage)
**Files:** `src/main/security/crypto.ts` (new), `src/main/services/auth-service.ts` (D), `src/main/index.ts`/`src/main/ipc/*`, `src/preload/index.ts`, renderer Settings page.
**Change:**
- `crypto.ts`: `encryptSecret(plain)`/`decryptSecret(cipher)` wrap `safeStorage.encryptString`/`decryptString`; `isSafeStorageAvailable()`. Guard `isEncryptionAvailable()`.
- AI key never sent from renderer per-call. Flow: user adds key in **Settings** → IPC `settings:setAiKey` → main encrypts with safeStorage → stores in `users.ai_api_key_encrypted`. `contract:generate`/`ai:stream:start` resolve the key server-side from the current user; renderer sends only `provider`+`model`+`input`.
**Acceptance:** `generateContract` payload contains no `apiKey`; key is stored encrypted (cipher ≠ plaintext); decryption only in main; renderer cannot read the raw key.

### B2 — Zod validation on every IPC input
**Files:** `src/main/validation/schemas.ts` (new), handler layer (Batch D `src/main/ipc/*`).
**Change:** Define Zod schemas: `ContractGenerateSchema`, `ContractTransitionSchema`, `AuthRegisterSchema`, `AuthLoginSchema`, `SettingsAiKeySchema`, `SpNavigateSchema`. Each handler does `const parsed = Schema.parse(payload)`; return a typed error on failure (no `payload as {...}`).
**Acceptance:** Malformed IPC payloads are rejected with a validation error, never reach DB; tests assert accept/reject cases per schema.

### B3 — Remove Playwright `--no-sandbox`
**Files:** `src/main/services/sharepoint-service.ts`.
**Change:** Drop `--no-sandbox`/`--disable-setuid-sandbox`. If sandboxing fails in a specific dev env, gate behind an explicit `LEGALVU_INSECURE_SP=1` dev-only flag (never in production builds). Document the flag.
**Acceptance:** Browser launches without no-sandbox flags in production; grep shows no unconditional `--no-sandbox`.

### B4 — Harden Electron window / renderer
**Files:** `src/main/index.ts`.
**Change:** Keep `contextIsolation: true` (present); add `nodeIntegration: false`, `sandbox: true`, `webSecurity: true`; set a strict CSP via `session.defaultSession.webRequest.onHeadersReceived` (default-src 'self', no remote scripts); block `will-navigate` to external origins; disable new-window creation.
**Acceptance:** DevTools remote-load blocked; external navigation prevented; CSP header present.

**Exit gate for Batch B:** validation tests pass; key-transit test passes; CSP verified in devtools network.

---

## Batch C — MEDIUM SECURITY / QUALITY

### C1 — Consolidate duplicated `ElectronAPI` types
**Files:** delete `src/renderer/types/electron.d.ts`; keep `ElectronAPI` in `src/preload/index.ts` as the single source; add a `src/renderer/global.d.ts` that augments `Window` (`interface Window { electronAPI: import('@preload/index').ElectronAPI }`) via the `@preload/*` alias (add alias to tsconfig if missing).
**Acceptance:** Single `ElectronAPI` definition; renderer uses typed `window.electronAPI`; no duplicate.

### C2 — Typed `getContract` + row mappers
**Files:** `src/main/database/mappers.ts` (new), `contract-service.ts`.
**Change:** `rowToContract(row): Contract`, `contractToRow(c)`, plus `rowToUser`, `rowToAuditLog`. `getContract(id): Contract | undefined`. Everywhere reads via mappers.
**Acceptance:** `getContract` returns `Contract`; mapper round-trip test passes.

### C3 — Move shared types to `src/shared`
**Files:** `src/shared/types.ts` (new) re-exporting/owning `ContractPromptInput`, `Contract`, `ContractStatus`, `User`, `AuditLog`. `models/*` become thin re-exports or are deleted in favor of shared.
**Acceptance:** main/preload/renderer import contract types from `@shared/types`; no duplication.

### C4 — Delete dead scaffolding
**Files:** `scripts/write-phase3.py`.
**Change:** Delete file.
**Acceptance:** File gone; nothing references it.

### C5 — Fix test pollution (data/test-database.db)
**Files:** `migrations.test.ts`, all test files (use `createTestDb()` from 0.3).
**Change:** Remove on-disk `data/test-database.db` usage; switch to `:memory:`; add `afterEach`/`afterAll` close. Add `data/` to `.gitignore` if present in repo.
**Acceptance:** `npm test` leaves zero files in `data/`; tests still green.

**Exit gate for Batch C:** typecheck + lint (`--max-warnings 0`) green; no duplicate types.

---

## Batch D — MISSING FOUNDATION INFRASTRUCTURE

### D1 — Audit service (every DB mutation logs)
**Files:** `src/main/services/audit-service.ts` (new).
**Change:** `log({ userId, action, entityType, entityId?, details? })` → inserts into `audit_logs` with ms timestamp; `query(filters)` for UI. Wire into: contract create/transition, document write, auth register/login/logout, settings key set. `details` is JSON (prompt version, model, tokens, input hash).
**Acceptance:** Each mutation produces exactly one `audit_logs` row with the acting user; query returns filtered logs.

### D2 — Password hashing + auth service
**Files:** `src/main/security/password.ts` (new), `src/main/services/auth-service.ts` (new), `src/main/ipc/auth.ts` (new), preload `auth:*`, `src/renderer/stores/auth-store.ts` (new), `LoginPage`.
**Change:**
- `password.ts`: `hashPassword`/`verifyPassword` via bcryptjs (cost 12).
- `auth-service.ts`: `register({email,password,fullName})` (unique email, bcrypt), `login({email,password})` → verifies + sets in-memory `currentUserId` (Electron single-user session; no tokens, no SSO/2FA per spec), `currentUser()`, `logout()`. No secrets returned to renderer.
- IPC: `auth:register|login|logout|me`.
**Acceptance:** register→login succeeds; wrong password fails; duplicate email rejected; session is main-process in-memory; password never leaves main.

### D3 — Secret storage wiring (ties to B1)
Already specified in B1 (`crypto.ts`). Here we finalize: AI key set/get only through `auth-service`/settings using `decryptSecret` at call time; never cached in renderer.
**Acceptance:** covered by B1.

### D4 — Prompt hardening + versioning
**Files:** `src/main/services/prompts.ts`.
**Change:** Add `PROMPT_VERSION = 'contract-draft-v1'`, a `SYSTEM_PROMPT` (legal-assistant role, output strict markdown, data-handling guardrails, refuse non-contract requests), and `sanitizeContractInput(input)` (trim, cap lengths, strip control chars → reduces prompt injection). `buildContractPrompt` returns `{ system, user, version }`. Contract create stores `version` in `ai_prompt_version` (A4).
**Acceptance:** version constant flows to DB; sanitizer strips control chars / enforces caps; system prompt always first message.

### D5 — Streaming + robust AI adapter
**Files:** `src/main/services/ai-adapter.ts`, new `src/main/ipc/ai.ts`, preload `onAiStream*`, `src/renderer/hooks/useAiStream.ts`.
**Change:**
- Adapter: add `streamDraft({ system, user, apiKey, model, signal, onChunk })` using `fetch` `ReadableStream` + SSE parsing for both providers (OpenAI `data:` deltas; Anthropic `content_block_delta`). Capture `usage` tokens. Non-streaming `generateDraft` kept for tests/back-compat. Add `AbortController`-based timeout (e.g. 60 s) + 1 retry on transient `5xx`/network; no retry on 4xx/auth.
- IPC: `ai:stream:start` (invoke) → returns `requestId`; main emits `ai:stream:chunk`, `ai:stream:done` (final metadata: model, version, tokens), `ai:stream:error`. Renderer subscribes via preload `onAiStreamChunk/off`.
**Acceptance:** mocked SSE test yields full text via `onChunk`; timeout aborts and emits error; token count captured; cancel via `AbortController` stops streaming.

### D6 — Contract lifecycle state machine
**Files:** `src/main/services/contract-lifecycle.ts` (new), IPC `contract:transition`, UI badge.
**Change:** `ALLOWED_TRANSITIONS` map over `ContractStatus` (draft→under_review→approved→signed→active; active→expired|terminated; etc.). `transitionStatus(contractId, to, userId)`: validates transition, updates `status`+`updated_at`, writes audit log. Reject illegal transitions with a typed error.
**Acceptance:** legal transitions succeed + audit; illegal ones rejected; UI badge reflects status.

### D7 — Document / file service (docx export)
**Files:** `src/main/services/document-service.ts` (new), schema add `ai_tokens_used INTEGER` to `contracts`.
**Change:** `exportContractToDocx(contractId)` → read content (markdown) → `marked.lexer` → build `docx.Document` (headings/paragraphs/lists) → write to `app.getPath('userData')/documents/<id>.docx` → compute `sha256`, insert `documents` row (`sp_sync_status='unsynced'`) → audit log. Local-first: all paths under `userData`.
**Acceptance:** `.docx` written (valid zip, `PK` magic); `documents` row inserted; sha256 stored; test reads file back.

**Exit gate for Batch D:** unit tests for audit/auth/prompts/adapter/lifecycle/document services green against `:memory:`.

---

## Batch E — PHASE 3 UI (reach QG3)

### E1 — App shell + routing + layout
**Files:** `src/renderer/App.tsx`, `src/renderer/components/Layout.tsx`, simple view router (state-based or `react-router-dom`).
**Change:** Replace SP-only shell with nav: **Contracts · Intake · Settings · (SP)**; gate behind auth (redirect to Login if no session). Keep SP browser panel as a secondary view.
**Acceptance:** Nav switches views; unauthenticated → Login.

### E2 — Contract intake form
**Files:** `src/renderer/components/ContractIntakeForm.tsx`, `src/renderer/pages/ContractIntakePage.tsx`, `src/renderer/stores/contract-store.ts` (expand).
**Change:** Form bound to `ContractPromptInput` fields (contractType [select], counterparty, jurisdiction, governingLaw, keyTerms [repeatable], indemnity/confidentiality [checkboxes]). Client-side light validation mirroring the Zod schema; on submit call streaming generate.
**Acceptance:** Form validates required fields; submit triggers `ai:stream:start`; disabled while streaming.

### E3 — AI streaming viewer → rich text editor
**Files:** `src/renderer/hooks/useAiStream.ts`, `src/renderer/components/AiStreamViewer.tsx`, `src/renderer/components/RichTextEditor.tsx` (TipTap + tiptap-markdown).
**Change:** `useAiStream` subscribes to chunk/done/error; appends tokens into store buffer; `AiStreamViewer` shows live streaming markdown; on done, content loads into `RichTextEditor` for editing. Save persists edits.
**Acceptance:** Text streams in token-by-token; editor editable after completion; Save updates `content` + `updated_at` + audit.

### E4 — Contracts list + status badge + lifecycle controls
**Files:** `src/renderer/pages/ContractsListPage.tsx`, `src/renderer/components/ContractStatusBadge.tsx`, `src/renderer/pages/ContractEditorPage.tsx`.
**Change:** List contracts (status, counterparty, updated_at); badge color per `ContractStatus`; editor page exposes "Advance stage" using `contract:transition`; "Export DOCX" using document service.
**Acceptance:** List loads; badge reflects state; advancing stage updates badge + audit; DOCX export writes file.

### E5 — Settings (AI key) + Login/Register
**Files:** `src/renderer/pages/SettingsPage.tsx`, `src/renderer/pages/LoginPage.tsx`, `auth-store.ts`.
**Change:** Settings: provider/model select + set AI key (sent once to main via `settings:setAiKey`, encrypted; field never echoes stored value). Login/Register forms → `auth:*`.
**Acceptance:** Key set without appearing in renderer state; login persists session for app lifetime; logout clears.

**Exit gate for Batch E / QG3:** see "QG3 Verification" below.

---

## Test mapping (Vitest, in-memory SQLite)

| Module | Test file | Key cases |
| --- | --- | --- |
| migrations/schema | `database/migrations.test.ts` | all 7 tables incl `sync_queue`; idempotent; `ai_tokens_used` column exists; FK pragma ON |
| connection | `database/connection.test.ts` | WAL/FK pragmas set; `setDatabaseForTesting` injection; `closeConnection` clears singleton |
| mappers | `database/mappers.test.ts` | snake↔camel round-trip; nullables |
| crypto | `security/crypto.test.ts` | encrypt→decrypt round-trip; cipher ≠ plaintext (mock `safeStorage`) |
| password | `security/password.test.ts` | hash≠input; verify true/false; cost timing sane |
| validation | `validation/schemas.test.ts` | each schema: valid passes, malformed rejected |
| prompts | `services/prompts.test.ts` | version constant present; sanitizer strips control chars + caps length; system+user structure |
| ai-adapter | `services/ai-adapter.test.ts` | SSE parse → onChunk concatenation; token usage captured; timeout aborts; 4xx no-retry, 5xx retry (mock fetch) |
| audit-service | `services/audit-service.test.ts` | insert + query filters; ms timestamp |
| auth-service | `services/auth-service.test.ts` | register→login ok; wrong pw fail; duplicate email reject; bcrypt verify |
| contract-service | `services/contract-service.test.ts` | create inserts correct columns (version, tokens), ms timestamps, audit row, metadata JSON; mock provider |
| contract-lifecycle | `services/contract-lifecycle.test.ts` | legal transitions ok + audit; illegal rejected |
| document-service | `services/document-service.test.ts` | docx file written (PK magic), documents row + sha256, audit |
| timestamps | (in contract-service test) | `created_at` ≈ `Date.now()` ±2s |

Renderer components: light tests optional; prefer integration via the manual E2E. Stub `window.electronAPI` if unit-testing stores/hooks.

---

## QG3 Verification — "AI Drafting Works"

**Automated (must be green):** every test in the table above; `npm run typecheck`; `npm run lint --max-warnings 0`.

**Manual end-to-end (definition of done):**
1. Launch (`npm run dev`); Register a user; Login.
2. Settings → choose provider + model, paste AI key → confirm it is encrypted (`SELECT ai_api_key_encrypted` ≠ plaintext) and not echoed in UI.
3. Intake → fill all `ContractPromptInput` fields → Submit.
4. Observe AI draft **streaming token-by-token** into the editor.
5. Save → contract persisted; `SELECT * FROM contracts` shows correct `ai_prompt_version` (version), `ai_model`, `ai_tokens_used`, ms timestamps, `metadata` (input JSON).
6. `.docx` exported to `userData/documents/<id>.docx` and opens in Word.
7. `SELECT * FROM audit_logs` shows rows for: login, key-set, contract create (with prompt version/model/tokens), docx export, and a status transition.
8. Contracts list shows the item with a correct status badge; "Advance stage" transitions draft→under_review and writes audit.

**QG3 passes when:** all automated tests green AND the 8 manual steps succeed with no plaintext key transit and AU-residency decision (D1) documented.

---

## Open items / risks
- **D1 data residency** is the largest open risk; resolving it may change `ai-adapter.ts` endpoints/auth (Azure/Bedrock) and is best decided before Batch D5/E.
- TipTap adds bundle weight; if build size matters, fall back to md-editor (D3).
- `safeStorage` requires the OS keychain; on headless CI the crypto unit tests must mock `safeStorage`.
- `@types/better-sqlite3` swap may surface type errors in existing `as` casts — fix during C2.
