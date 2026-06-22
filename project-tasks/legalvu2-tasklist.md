# LegalVu v2 — Rectification Task List

## Scope

This rectification pass verifies the security-hardening claims made in the README (dated 2026-06-17, "PicoForge full upgrade") against the actual code, fixes the four baseline failures currently blocking CI (lint error, tsconfig baseUrl deprecation, 27 safeStorage-dependent test failures, and a build-breaking missing import in `template-service.ts`), closes the highest-priority gaps explicitly listed as "Planned" in the README roadmap, and confirms production-readiness infrastructure (CI, hooks, signing config, dependabot, license consistency). It does NOT add new user-facing features beyond what the spec and roadmap already enumerate.

## Verification Philosophy

The README's "Security Hardening" section and "Completed" roadmap list assert that substantial hardening was applied on 2026-06-17. Treat every claim as unverified. Audit the code by grep, unit test, or manual inspection — do NOT trust the README. Each task is marked `[audit]` (verify a claim, produce TRUE/FALSE evidence), `[implement]` (write or fix code), or `[audit+implement]` (verify, then fix if the claim is false). Baseline evidence already gathered by the PM is cited inline under "Claim under review" so the implementing agents do not have to re-derive it.

Priority key: **P0** = blocks CI / build / data integrity; **P1** = critical security or spec-required; **P2** = important quality or roadmap gap; **P3** = nice-to-have polish.
Effort key: **S** = <=2h, **M** = half-day, **L** = 1-2 days.

---

## Phase A — Verify claimed hardening (audit tasks)

### [ ] T1: Audit auth guards (`requireAuth`) on EVERY IPC handler
**Type**: audit
**Files**: `src/main/ipc/*.ts` (auth, contracts, templates, sharepoint, sync, audit, analytics, import, settings)
**Claim under review**: README "Completed" list says "Auth guards on all IPC handlers (requireAuth pattern)" and "Security Hardening" says "every handler is wrapped with `requireAuth` middleware".
**Acceptance criteria**:
- `grep -rn "getCurrentUserId\|requireAuth" src/main/ipc/*.ts` shows a call inside EVERY `ipcMain.handle(...)` callback EXCEPT the explicit allowlist (`PING`, `AUTH_REGISTER`, `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_ME`).
- Produce a table of every `ipcMain.handle` registration with a TRUE/FALSE auth-guard column.
- PM pre-audit already found: `SP_BROWSER_START`, `SP_BROWSER_STOP`, `SP_BROWSER_NAVIGATE`, `SP_BROWSER_SCREENSHOT`, `SP_BROWSER_STATUS` in `src/main/ipc/sharepoint.ts` do NOT call `getCurrentUserId()` — likely a FALSE claim. Confirm and list any others.
- Output: a per-handler evidence table. If any handler is unguarded, mark T34 (security review) as blocked by a new implement task.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T2: Audit crypto hard-fail (no base64 fallback)
**Type**: audit
**Files**: `src/main/security/crypto.ts`, `src/main/security/crypto.test.ts`
**Claim under review**: README "Security Hardening" says "Crypto fails hard — `safeStorage` is now required; the insecure base64 fallback has been removed. If the OS keychain is unavailable, the app throws rather than storing secrets in plaintext."
**Acceptance criteria**:
- `grep -n "base64" src/main/security/crypto.ts` returns only `toString('base64')` (encoding of the safeStorage ciphertext) and `Buffer.from(ciphertext, 'base64')` (decoding for decryption) — NOT a fallback branch that stores plaintext.
- Both `encryptSecret` and `decryptSecret` execute `throw new Error('OS encryption (safeStorage) is not available...')` when `getSafeStorage()` returns null or `isEncryptionAvailable()` is false.
- Unit test `crypto.test.ts:53` ("throws when safeStorage unavailable (no base64 fallback)") passes.
- Claim expected: TRUE. PM pre-audit confirms — `crypto.ts:27` and `crypto.ts:35` throw.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T3: Audit login rate limiting (5 attempts, 15-min lockout)
**Type**: audit
**Files**: `src/main/services/auth-service.ts`, `src/main/services/auth-service.test.ts`
**Claim under review**: README "Security Hardening" says "Login rate limiting — 5 failed attempts trigger a 15-minute lockout, mitigating brute-force attacks."
**Acceptance criteria**:
- `grep -n "LOCK_DURATION_MS\|MAX_ATTEMPTS\|lockout\|failedAttempts" src/main/services/auth-service.ts` confirms a constant equal to `15 * 60 * 1000` and a counter threshold of 5.
- A unit test exercises: 5 wrong-password attempts → 6th attempt rejected with `AuthError("Account locked...")`; advancing the clock 15 min restores the ability to attempt login.
- Claim expected: TRUE (PM pre-audit found `LOCK_DURATION_MS = 15 * 60 * 1000` on line 91 and lockout throw on line 182). Verify the attempt threshold is exactly 5 and that successful login clears the counter (line 200 comment says it does).
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T4: Audit prompt injection defenses (delimiter isolation, control char stripping)
**Type**: audit
**Files**: `src/main/services/prompts.ts`, `src/main/services/legal-expertise.ts`, `src/main/services/contract-service.ts`, `src/main/services/prompts.test.ts`
**Claim under review**: README "Security Hardening" says "Prompt injection defenses — AI analysis and summarization wrap user content in delimiter-based isolation and strip control characters."
**Acceptance criteria**:
- `grep -n "sanitize\|delimiter\|isolate\|control" src/main/services/prompts.ts src/main/services/legal-expertise.ts` shows: (a) a `sanitizeString` function that strips control characters (e.g. `\x00-\x1f`, `\x7f`) and enforces a max length, and (b) a delimiter-isolation wrapper around user content in the `analyze` and `summarize` paths (not just `contract:generate`).
- Unit tests assert: control chars are stripped; input exceeding `MAX_FIELD_LENGTH` is truncated; delimiter markers survive a user input that contains the delimiter.
- Claim status UNKNOWN for analyze/summarize — PM pre-audit confirmed `sanitizeContractInput` exists in `prompts.ts:26` but did NOT confirm delimiter isolation or control-char stripping in `legal-expertise.ts` (the analyze/summarize service). Verify and report TRUE/FALSE with line numbers.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T5: Audit HTTPS enforcement (Zod rejects non-HTTPS for AI baseUrl and SP endpoints)
**Type**: audit
**Files**: `src/main/validation/schemas.ts`, `src/main/validation/schemas.test.ts`
**Claim under review**: README "Security Hardening" says "HTTPS enforcement — Zod schemas reject non-HTTPS URLs for AI `baseUrl` and SharePoint endpoints."
**Acceptance criteria**:
- `grep -n "startsWith('https://')\|url()" src/main/validation/schemas.ts` shows `.refine(url => url.startsWith('https://'), ...)` on: (a) `SettingsSetAiConfigSchema.baseUrl`, (b) every SharePoint `siteUrl` field (`SpConnectionSchema`, `SpNavigateSchema`, etc.).
- Unit tests assert: `http://...` is rejected with a validation error; `https://...` is accepted; empty/optional `baseUrl` is accepted (back-compat with provider defaults).
- Claim expected: TRUE. PM pre-audit found 7 `.refine` occurrences in `schemas.ts` (lines 59, 100, 104, 110, 115, 121). Confirm all SharePoint siteUrl schemas and the AI baseUrl schema are covered.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T6: Audit CSP hardening (no dev URLs, no unsafe-inline, base-uri/form-action/frame-ancestors)
**Type**: audit
**Files**: `src/main/index.ts`, `docs/SECURITY.md`
**Claim under review**: README "Security Hardening" says "CSP hardened for production — no dev URLs, no `unsafe-inline`; `base-uri`, `form-action`, and `frame-ancestors` directives added."
**Acceptance criteria**:
- `sed -n '90,100p' src/main/index.ts` shows the production CSP string (the `else` branch of `const csp = isDev ? ... : ...`) and it contains: `default-src 'self'`, `script-src 'self'`, `style-src 'self'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, and NO `unsafe-inline`, NO `http://localhost:*`, NO `ws://`.
- A test or manual check (DevTools → Network → response headers) confirms the CSP header is actually set on the loaded renderer.
- Claim status UNKNOWN — PM pre-audit located the CSP at `index.ts:92-98` but did not inspect the production string. Report the exact production CSP value and a TRUE/FALSE per directive.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T7: Audit DevTools disabled in production
**Type**: audit
**Files**: `src/main/index.ts`
**Claim under review**: README "Security Hardening" says "DevTools disabled in production — `mainWindow.webContents.closeDevTools()` prevents inspection in shipped builds."
**Acceptance criteria**:
- `grep -n "closeDevTools\|devtools-opened\|isDev" src/main/index.ts` shows a `devtools-opened` event handler that calls `closeDevTools()`, gated so it only fires when `!isDev` (or unconditionally — confirm which).
- PM pre-audit found `mainWindow.webContents.on('devtools-opened', () => { mainWindow?.webContents.closeDevTools(); })` at `index.ts:61-62`. Verify the handler is gated on `!isDev` OR document that DevTools closes even in dev (which would be a developer-experience regression).
- Claim expected: TRUE for production. Report whether dev-mode DevTools still works.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T8: Audit session persistence via encrypted session.dat
**Type**: audit
**Files**: `src/main/services/auth-service.ts`
**Claim under review**: README "Security Hardening" says "Session persistence — encrypted `session.dat` file survives app restarts; deleted on logout."
**Acceptance criteria**:
- `grep -n "session.dat\|SESSION_FILENAME\|persistSession\|loadSession\|deleteSession" src/main/services/auth-service.ts` shows: (a) `persistSession(userId)` writes an encrypted file, (b) a `loadSession()` is called on startup that decrypts and restores `currentUserId`, (c) `logout()` deletes the file.
- Unit test: write session → reload → `getCurrentUser()` returns the user; logout → file deleted.
- PM pre-audit found `SESSION_FILENAME = 'session.dat'` at `auth-service.ts:19` and `persistSession` at line 29. Confirm `loadSession` is actually invoked from `app.whenReady()` in `index.ts` and that logout deletes the file.
- Claim expected: TRUE. Report whether the session is encrypted (uses `encryptSecret`/`decryptSecret`) and not stored as plaintext.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T9: Audit SQLite backup on startup
**Type**: audit
**Files**: `src/main/database/connection.ts`, `src/main/index.ts`
**Claim under review**: README "Security Hardening" says "SQLite backup — database is backed up on startup for corruption recovery."
**Acceptance criteria**:
- `grep -n "backupDatabase\|db.backup" src/main/database/connection.ts src/main/index.ts` shows: (a) `backupDatabase()` exported from `connection.ts` using `better-sqlite3`'s native `.backup()` API (online backup), (b) invoked from `app.whenReady()` in `index.ts`.
- PM pre-audit found `backupDatabase` at `connection.ts:57` using `db.backup(backupPath)` and the startup call at `index.ts:118`. Confirm the backup is scheduled periodically (weekly interval at `index.ts:123`) and that `backupInterval.unref?.()` is called so it doesn't block quit.
- Claim expected: TRUE.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T10: Audit path validation for SharePoint operations (directory traversal prevention)
**Type**: audit
**Files**: `src/main/services/sharepoint-service.ts`
**Claim under review**: README "Security Hardening" says "Path validation — SharePoint file operations validate and sanitize paths to prevent directory traversal."
**Acceptance criteria**:
- `grep -n "resolve\|startsWith\|path.sep\|traversal" src/main/services/sharepoint-service.ts` shows: (a) screenshot path is resolved and checked against `userDataDir` boundary (lines 79-81), (b) upload/download `localDir` is checked against `userDataDir` and `tempDir` boundaries (lines 244-248).
- Unit test: `localDir = '/etc'` or `'../../etc'` is rejected; valid `localDir = userDataDir + '/downloads'` is accepted.
- Claim expected: TRUE. PM pre-audit confirmed the boundary checks at lines 79-81 and 244-248. Verify a test exists that exercises a traversal attempt.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T11: Audit max length validation on all unbounded IPC string inputs
**Type**: audit
**Files**: `src/main/validation/schemas.ts`
**Claim under review**: README "Security Hardening" says "Max length validation — all unbounded IPC string inputs are capped to prevent oversized payloads."
**Acceptance criteria**:
- `grep -n "max(\|maxLength" src/main/validation/schemas.ts` shows a `.max(N)` on every `z.string()` field. No bare `z.string()` without a max.
- PM pre-audit found caps on: `contractType` (2000), `counterparty` (2000), `jurisdiction` (2000), `governingLaw` (2000), `keyTerms` (500 each, 50 max), `model` (100), `content` (500000), `password` (128), `fullName` (200), `apiKey` (200), `title` (300), `contractText` (100000), `zipBase64` (700000000), `name` (200), `limit` (1000).
- Claim expected: TRUE. Confirm no `z.string()` in `schemas.ts` is missing a `.max()`.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T12: Audit typed error hierarchy
**Type**: audit
**Files**: `src/main/errors.ts`
**Claim under review**: README "Completed" list says "Typed error hierarchy (AppError, ValidationError, NotFoundError, AuthError, ExternalServiceError)".
**Acceptance criteria**:
- `cat src/main/errors.ts` shows classes: `AppError` (base, with `code: string`), `ValidationError` (code `VALIDATION_ERROR`), `NotFoundError` (code `NOT_FOUND`), `AuthError` (code `AUTH_ERROR`), `ExternalServiceError` (code `EXTERNAL_SERVICE_ERROR`).
- Each subclass sets `this.name = this.constructor.name`.
- `grep -rn "throw new \(ValidationError\|NotFoundError\|AuthError\|ExternalServiceError\)" src/main/` shows actual usage in services/handlers (not just defined-and-unused).
- Claim expected: TRUE. PM pre-audit read `errors.ts` and confirms all 5 classes. Verify usage by grep.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T13: Audit versioned migrations with schema_version table
**Type**: audit
**Files**: `src/main/database/migrations.ts`, `src/main/database/migrations.test.ts`
**Claim under review**: README "Completed" list says "Versioned database migrations (schema_version table)".
**Acceptance criteria**:
- `grep -n "schema_version\|recordMigration\|getAppliedVersion" src/main/database/migrations.ts` shows: (a) `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)`, (b) `getAppliedVersion()` reads `MAX(version)`, (c) `recordMigration()` inserts a row, (d) `migrate()` filters `migrations.filter(m => m.version > currentVersion)` and applies only pending ones.
- Unit test: run migrate twice → second run is a no-op; `schema_version` table has one row per applied migration.
- Claim expected: TRUE. PM pre-audit confirmed all four pieces (lines 29, 36, 43, 65).
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T14: Audit pagination on listContracts() and audit query()
**Type**: audit
**Files**: `src/main/services/contract-service.ts`, `src/main/services/audit-service.ts`
**Claim under review**: README "Completed" list says "Pagination on listContracts() and audit query()".
**Acceptance criteria**:
- `grep -n "LIMIT\|OFFSET" src/main/services/contract-service.ts src/main/services/audit-service.ts` shows parameterized `LIMIT ? OFFSET ?` on both.
- `listContracts(limit = 100, offset = 0)` and `audit query({ limit, offset })` default sensibly.
- Unit test: seed 150 rows, `listContracts(100, 0)` returns 100, `listContracts(100, 100)` returns 50.
- Claim expected: TRUE. PM pre-audit found `LIMIT ? OFFSET ?` at `contract-service.ts:134` and `audit-service.ts:49`. Verify tests exercise the offset path.
**Priority**: P3
**Estimated effort**: S
**Dependencies**: none

---

## Phase B — Fix baseline failures (implement tasks)

### [ ] T15: Fix lint error in sse-parser.ts (ReadableStreamDefaultReader no-undef)
**Type**: implement
**Files**: `src/main/services/sse-parser.ts`
**Claim under review**: n/a — baseline failure. `eslint .` reports 1 error: `27:11  error  'ReadableStreamDefaultReader' is not defined  no-undef`.
**Acceptance criteria**:
- `npm run lint` exits 0 (with `--max-warnings 0` per package.json script).
- The type annotation `ReadableStreamDefaultReader<Uint8Array>` resolves correctly. The fix is to add a TypeScript type reference (e.g. `/// <reference lib="dom" />` or move the type into a JSDoc annotation, or add `dom` to the tsconfig `lib` for main — verify the main tsconfig already includes `dom`). If `dom` is already in lib, the issue is an ESLint `no-undef` false positive on a TS type — add a targeted `// eslint-disable-next-line no-undef` OR switch to `import('stream/web').ReadableStreamDefaultReader` if Node's Web Streams types are available.
- The SSE parser still functions: `parseSSEStream` test (if present in `ai-adapter.test.ts`) passes.
**Priority**: P0 blocker (lint blocks CI)
**Estimated effort**: S
**Dependencies**: none

### [ ] T16: Remove or silence the 6 unused-vars lint warnings
**Type**: implement
**Files**: `src/main/ipc/types.ts` (`Result`, `wrapError`), `src/main/ipc/sharepoint.ts` (`deps`), `src/main/ipc/audit.ts` (`authService`), `src/main/services/ai-adapter.ts` (`ExternalServiceError`), `src/main/services/sp-connection-service.ts` (`path`) — confirm file:line for each from `eslint .` output.
**Claim under review**: n/a — baseline failure. 6 warnings: `Result`/`wrapError` defined-but-unused in `ipc/types.ts`; `authService` unused in `ipc/audit.ts`; `deps` unused-arg in `ipc/sharepoint.ts`; `ExternalServiceError` unused in `ai-adapter.ts`; `path` unused in `sp-connection-service.ts`.
**Acceptance criteria**:
- `npm run lint --max-warnings 0` exits 0.
- For genuinely-dead code (e.g. `wrapError` if only `asyncWrapError` is used): delete the export. For imports kept for future use: remove the import OR mark with `// eslint-disable-next-line @typescript-eslint/no-unused-vars` with a justifying comment.
- No functionality regresses — `npm test` still passes the same set.
**Priority**: P0 blocker (CI runs `--max-warnings 0`)
**Estimated effort**: S
**Dependencies**: T15 (both touch lint; do together)

### [ ] T17: Fix tsconfig.json baseUrl deprecation under TS 6.0.3
**Type**: implement
**Files**: `tsconfig.json`
**Claim under review**: n/a — baseline failure. `tsc --noEmit` reports `tsconfig.json(21,5): error TS5101: Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0. Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.`
**Acceptance criteria**:
- `npm run typecheck` exits 0.
- Decision required: (a) add `"ignoreDeprecations": "6.0"` to `compilerOptions` (silences now, defers the TS 7.0 migration), OR (b) remove `baseUrl` and rely on `paths` alone (TS 5.x+ resolves `@/*` without `baseUrl` when `paths` is set). Option (b) is cleaner — verify `@/*` alias still resolves in both main and renderer configs.
- If choosing (b): confirm `vite.main.config.ts`, `vite.renderer.config.ts`, and `vite.preload.config.ts` resolve `@/*` via Vite aliases independent of tsconfig `baseUrl`.
**Priority**: P0 blocker (typecheck blocks CI)
**Estimated effort**: S
**Dependencies**: none

### [ ] T18: Fix build failure — missing `../data/default-templates` import in template-service.ts
**Type**: implement
**Files**: `src/main/services/template-service.ts` (importer), `src/main/data/default-templates.ts` (missing exporter — to be created)
**Claim under review**: n/a — baseline failure. `npm run build` reports `Could not resolve "../data/default-templates" from src/main/services/template-service.ts`. The import is `import { DEFAULT_TEMPLATES, extractVariables, fillTemplate } from '../data/default-templates';` but `src/main/data/` does not exist.
**Acceptance criteria**:
- `npm run build` produces `.vite/build/index.js` without resolve errors.
- `src/main/data/default-templates.ts` exists and exports `DEFAULT_TEMPLATES` (array of `{ name, description, contractType, content }`), `extractVariables(content: string): string[]` (regex on `{{var}}`), and `fillTemplate(content: string, vars: Record<string, string>): string` (simple `{{var}}` replacement).
- Spec (section "Template Library") requires "10-15 standard templates (NDA, MSA, SOW, Employment, SaaS Agreement, Privacy Policy, etc.)". Ship at least 10 templates — but note README claims "50+ legal templates" and "10+ default legal templates"; align the count to the spec's 10-15 for the in-repo defaults and confirm the rest come from the DB-seeded templates.
- `seedDefaultTemplates(userId)` runs without throwing; `template-service.test.ts` passes.
**Priority**: P0 blocker (build blocks CI / packaging)
**Estimated effort**: M (10-15 template contents must be written)
**Dependencies**: none

### [ ] T19: Fix or properly skip the 27 safeStorage-dependent tests when not running in Electron
**Type**: implement
**Files**: 9 failing test files (per `vitest run` output: `sp-connection-service.test.ts` confirmed; identify the other 8 via `vitest run --reporter=verbose 2>&1 | grep "FAIL"`)
**Claim under review**: n/a — baseline failure. 27 tests fail with `Error: OS encryption (safeStorage) is not available. Cannot store secrets securely.` thrown from `crypto.ts:27`. These tests run outside Electron (pure `vitest`) where `electron.safeStorage` is not importable.
**Acceptance criteria**:
- `npm test` passes with 143/143 (or the skipped count is explicit and documented, not a silent failure).
- Approach: every test that touches `encryptSecret`/`decryptSecret` MUST call `setSafeStorageForTesting({...})` in `beforeEach` (the mock-API already exists at `crypto.ts:setSafeStorageForTesting`). The `auth-guard.test.ts` already does this correctly — replicate the pattern in the 9 failing files.
- Alternative: add a global `vitest.setup.ts` that auto-injects a deterministic mock safeStorage unless `VITEST_USE_REAL_SAFE_STORAGE=1` is set (useful for running the full Electron-integration suite separately).
- No test is silently skipped — if a test truly requires the real OS keychain, mark it with `describe.skipIf(!process.env.CI_ELECTRON)` and document why.
**Priority**: P0 blocker (test suite blocks CI)
**Estimated effort**: M
**Dependencies**: none

---

## Phase C — Close high-priority roadmap gaps (implement tasks)

These items appear in the README "Planned" roadmap. They are NOT new features — they are explicitly-tracked gaps. Implement them unless the user defers.

### [ ] T20: Remove `--no-sandbox` from Playwright in production builds
**Type**: audit+implement
**Files**: `src/main/services/sharepoint-service.ts`
**Claim under review**: README "Planned" list says "Remove `--no-sandbox` from Playwright in production builds". Future-features-plan Task 1.1 also covers this.
**Acceptance criteria**:
- PM pre-audit found the `--no-sandbox` is ALREADY gated behind `process.env.LEGALVU_INSECURE_SP === '1'` at `sharepoint-service.ts:42`. So in production builds (where the env var is not set), no `--no-sandbox` is passed. Verify this is correct: `grep -n "LEGALVU_INSECURE_SP" src/main/services/sharepoint-service.ts` shows the ternary.
- Audit result: the claim may already be satisfied. If so, mark the task as TRUE and move it to "Completed" in the README. If any other file references `--no-sandbox` unconditionally, fix it.
- Add a test: `chromium.launchPersistentContext` is called with `args: []` when `LEGALVU_INSECURE_SP` is unset, and with `args: ['--no-sandbox', '--disable-setuid-sandbox']` only when the env var is `'1'`.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: none

### [ ] T21: Remove `ELECTRON_DISABLE_SANDBOX=1` from production environment
**Type**: implement
**Files**: `.github/workflows/ci.yml`, `README.md` (Quick Start), `package.json` (if in scripts)
**Claim under review**: README "Planned" list says "Remove `ELECTRON_DISABLE_SANDBOX=1` from production environment". README Quick Start currently instructs `ELECTRON_DISABLE_SANDBOX=1 npm run dev`. CI workflow sets `ELECTRON_DISABLE_SANDBOX: 1` on the e2e job (`ci.yml:41`).
**Acceptance criteria**:
- `grep -rn "ELECTRON_DISABLE_SANDBOX" . --exclude-dir=node_modules --exclude-dir=.git` returns matches ONLY in: (a) `.github/workflows/ci.yml` e2e job (dev/CI only — acceptable), (b) `README.md` Quick Start "Development" section (acceptable, with a note that it's dev-only), (c) any Docker/CI dev-only script.
- No production build path (`npm run make`, `npm run build`) sets `ELECTRON_DISABLE_SANDBOX`.
- README Quick Start is updated to clarify: `ELECTRON_DISABLE_SANDBOX=1` is ONLY for headless CI/Docker dev environments where the sandbox cannot run; production users do not need it.
**Priority**: P1
**Estimated effort**: S
**Dependencies**: T20

### [ ] T22: SQLite FTS5 full-text search
**Type**: implement
**Files**: `src/main/database/schema.sql`, `src/main/database/migrations.ts` (new migration v2), `src/main/services/search-service.ts` (new), `src/main/ipc/search.ts` (new), `src/shared/ipc-channels.ts` (add `SEARCH_CONTRACTS`), `src/preload/index.ts`, `src/renderer/components/search/GlobalSearch.tsx`
**Claim under review**: README "Planned" list says "Full-text search (SQLite FTS5)". Future-features-plan Feature 3 (Tasks 3.1-3.4) specifies this fully.
**Acceptance criteria** (per future-features-plan QG9):
- `CREATE VIRTUAL TABLE contracts_fts USING fts5(title, content, tokenize='porter')` executes without error in `migrations.test.ts`.
- Triggers auto-sync `contracts_fts` on INSERT/UPDATE/DELETE of `contracts`.
- `search_contracts(query)` returns matching contract IDs ranked by relevance.
- Unit test: seed 20 contracts, search returns expected subset in <50ms.
- Global search bar in renderer queries `search:contracts` IPC; results show title, matched snippet, status; clicking navigates to contract detail.
- IPC handler `search:contracts` is auth-guarded (T1).
- NOTE: this is a substantial feature. If the user wants to defer it past the current rectification pass, mark this task as deferred and update the README. Do NOT implement without user confirmation given the size.
**Priority**: P2
**Estimated effort**: L
**Dependencies**: T1 (new IPC handler needs auth guard)

### [ ] T23: SQLCipher at-rest encryption
**Type**: implement
**Files**: `package.json` (replace `better-sqlite3` with `@journaux-sqlite3` or `better-sqlite3-with-sqlcipher` — REQUIRES USER APPROVAL per spec "Ask First: Adding new npm dependencies (especially native modules)"), `src/main/database/connection.ts`, `docs/SECURITY.md`
**Claim under review**: README "Planned" list says "SQLite database encryption (SQLCipher) for at-rest protection beyond OS disk encryption".
**Acceptance criteria**:
- Decision required BEFORE implementation: (a) proceed with a SQLCipher-compatible native module (significant native-build complexity), OR (b) defer to a future release and document the reliance on OS-level disk encryption (FileVault/BitLocker) + user-data-folder ACLs as the current at-rest control.
- If proceeding: database file is encrypted at rest with a key derived from a user passphrase or OS keychain entry; `connection.ts` opens with `PRAGMA key = '...'`; migration + backup work against the encrypted DB.
- If deferring: update README "Planned" to note the decision and rationale.
**Priority**: P2
**Estimated effort**: L
**Dependencies**: USER DECISION REQUIRED (spec "Ask First" rule for native modules)

### [ ] T24: MFA on local login
**Type**: implement
**Files**: `src/main/services/auth-service.ts`, `src/main/ipc/auth.ts`, `src/renderer/pages/LoginPage.tsx`, `src/renderer/components/MfaChallenge.tsx` (new), `src/main/validation/schemas.ts` (add `AuthMfaVerifySchema`)
**Claim under review**: README "Planned" list says "MFA / multi-factor authentication on local login". NOTE: spec Assumption #6 says "No SSO Integration" and Assumption #5 says no e-signature built-in, but MFA is NOT explicitly in the spec's success criteria — it's a README-added roadmap item.
**Acceptance criteria**:
- Decision required: TOTP (RFC 6238) via `otplib` is the standard local-MFA choice. Add `otplib` to dependencies (requires "Ask First" approval per spec).
- On login with correct password, if the user has MFA enrolled, return `{ mfaRequired: true, challengeToken }`; renderer shows the 6-digit code input; `auth:verifyMfa` validates and completes login.
- Settings page exposes "Enable MFA" (shows QR code with TOTP secret).
- Unit tests: enroll → login requires MFA → correct code logs in; wrong code fails; recovery codes work.
- If user defers: mark as deferred and update README.
**Priority**: P2
**Estimated effort**: L
**Dependencies**: USER DECISION REQUIRED (new dependency + spec-ambiguous feature)

### [ ] T25: npm audit gate in CI
**Type**: implement
**Files**: `.github/workflows/ci.yml`, `package.json` (add `audit` script)
**Claim under review**: README "Planned" list says "Automated dependency vulnerability scanning in CI (npm audit gate)".
**Acceptance criteria**:
- New CI job (or step in `lint-typecheck-test` job): `npm audit --omit=dev --audit-level=high` (or `--audit-level=moderate` — decide threshold). Exit non-zero on findings above the threshold.
- Job runs on every PR and on a weekly schedule (`on: schedule: cron: '0 6 * * 1'`).
- README "Completed" list updated to move this from "Planned" to "Completed".
- Acceptable: a baseline of known-low-severity advisories is documented in `docs/SECURITY.md` with a `--ignore-advisory=<id>` list (justified per entry).
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T26: Certificate pinning for AI API calls
**Type**: implement
**Files**: `src/main/services/ai-adapter.ts`, `src/main/validation/schemas.ts` (add optional `pinnedCertFingerprint` to `SettingsSetAiConfigSchema`), `src/main/security/cert-pin.ts` (new)
**Claim under review**: README "Planned" list says "Certificate pinning for AI API calls".
**Acceptance criteria**:
- AI adapter `fetch()` passes a custom `https.Agent` (Node) or uses a `checkServerIdentity` override that compares the server's certificate fingerprint against a configured value.
- Settings exposes an optional "Pinned certificate fingerprint (SHA-256)" field per provider config.
- If a pinned fingerprint is set and the server cert doesn't match, the request fails with `ExternalServiceError('Certificate pinning mismatch')`.
- Unit test: mock fetch with a cert whose fingerprint mismatches → request rejected.
- NOTE: Node's `fetch` (undici) does not natively support cert pinning; may require `Agent` + `connect` option. Evaluate feasibility — if Node's API cannot support it cleanly, document and defer.
**Priority**: P3
**Estimated effort**: M
**Dependencies**: none

### [ ] T27: Fuzz testing for IPC handlers
**Type**: implement
**Files**: `tests/fuzz/ipc-fuzz.test.ts` (new), `vitest.config.ts` (add fuzz suite or separate config)
**Claim under review**: README "Planned" list says "Fuzz testing for IPC handlers".
**Acceptance criteria**:
- A fuzz harness that generates malformed/random payloads (via `fast-check` or a custom generator) and feeds them to each Zod schema + handler.
- Each schema rejects malformed input with a `ValidationError` (no uncaught exception, no DB write).
- Fuzz runs as a separate `npm run test:fuzz` script; CI runs it on PRs.
- Document baseline: N iterations per schema, 0 crashes.
**Priority**: P3
**Estimated effort**: M
**Dependencies**: T15, T16, T17, T18, T19 (baseline must be green first)

### [ ] T28: Increase test coverage above 60% threshold
**Type**: implement
**Files**: `vitest.config.ts` (coverage thresholds), various test files
**Claim under review**: README "Planned" list says "Increase test coverage above 60% threshold". Spec Metrics for Success says ">=80% services, >=60% handlers".
**Acceptance criteria**:
- `npm test -- --coverage` produces a coverage report; lines-covered percentage per directory: `src/main/services/` >= 80%, `src/main/ipc/` >= 60%, `src/main/database/` >= 80%.
- `vitest.config.ts` enforces these thresholds via `coverage.thresholds` (CI fails if below).
- Gap analysis: list the files below threshold and add targeted tests (prioritize `sharepoint-service.ts`, `sync-service.ts`, `lawvu-import-service.ts` — likely lowest coverage due to external dependencies).
**Priority**: P2
**Estimated effort**: L
**Dependencies**: T19 (test suite must be green before measuring coverage)

---

## Phase D — Production readiness hardening (audit+implement)

### [ ] T29: Verify CI workflow runs and passes
**Type**: audit
**Files**: `.github/workflows/ci.yml`
**Claim under review**: README "Continuous Integration" section claims CI runs lint, typecheck, tests (with coverage), and e2e on every push/PR to main/master.
**Acceptance criteria**:
- `cat .github/workflows/ci.yml` shows two jobs: `lint-typecheck-test` (runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test -- --coverage`, uploads coverage artifact) and `e2e` (runs `npx playwright install --with-deps chromium`, `npm run rebuild:electron`, `xvfb-run npx playwright test` with `ELECTRON_DISABLE_SANDBOX: 1`).
- Trigger on `push` and `pull_request` to `[master, main]`.
- After T15-T19 are fixed: both jobs pass on a clean PR. Confirm via a dry-run push or the Actions tab.
- Claim expected: TRUE for workflow definition; UNKNOWN for actual pass status (blocked by T15-T19).
**Priority**: P0 blocker (CI is the release gate)
**Estimated effort**: S
**Dependencies**: T15, T16, T17, T18, T19

### [ ] T30: Verify pre-commit hooks work
**Type**: audit
**Files**: `.husky/pre-commit`, `package.json` (`lint-staged` config, `prepare` script)
**Claim under review**: README "Pre-commit Hooks" section says Husky + lint-staged run ESLint auto-fix and Prettier on staged files; `prepare` script installs hooks on `npm install`.
**Acceptance criteria**:
- `.husky/pre-commit` exists and contains `npx lint-staged` (PM pre-audit confirmed).
- `package.json` `lint-staged` config targets `src/**/*.ts` and `src/**/*.tsx` with `eslint --fix` + `prettier --write`.
- `package.json` `prepare` script is `husky` (installs hooks on `npm install`).
- Manual test: `git add` a file with a lint error → `git commit` → hook fires, auto-fixes or blocks.
- Claim expected: TRUE.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T31: Code signing configuration in forge.config.ts
**Type**: audit
**Files**: `forge.config.ts`
**Claim under review**: README "Completed" list says "Code signing configuration in forge.config.ts". Future-features-plan Feature 1 (Tasks 1.2, 1.3) details Windows + macOS signing.
**Acceptance criteria**:
- `forge.config.ts` reads `WINDOWS_CERTIFICATE_PATH` / `WINDOWS_CERTIFICATE_PASSWORD` and passes them to `MakerSquirrel` as `certificateFile` / `certificatePassword` (PM pre-audit confirmed at lines 18-24, 69).
- macOS `osxSign` configured with `identity`, `hardenedRuntime: true`, `entitlements`, `entitlementsInherit` (lines 44-52). `osxNotarize` configured with `appleId`, `appleIdPassword`, `teamId` (lines 53-59).
- Claim expected: TRUE for configuration. NOTE: actual signing requires the cert secrets to be present in CI env — that's a separate ops task, not a code task. Document the required CI secrets in `docs/SECURITY.md` or a new `docs/RELEASE.md`.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: none

### [ ] T32: Dependabot + CODEOWNERS present
**Type**: audit
**Files**: `.github/dependabot.yml`, `.github/CODEOWNERS`
**Claim under review**: README "Completed" list says "Dependabot + CODEOWNERS".
**Acceptance criteria**:
- `.github/dependabot.yml` exists and configures weekly updates for both `npm` and `github-actions` ecosystems (PM pre-audit confirmed).
- `.github/CODEOWNERS` exists with at least one owner rule (PM pre-audit found `* @cptunderpantsmoons`).
- Claim expected: TRUE.
**Priority**: P3
**Estimated effort**: S
**Dependencies**: none

### [ ] T33: License consistency (package.json says "ISC", README says "MIT")
**Type**: audit+implement
**Files**: `package.json` (`"license": "ISC"`), `README.md` (badge says MIT, footer says "[MIT](LICENSE)"), `LICENSE` file (MISSING — `ls LICENSE*` returns nothing)
**Claim under review**: README "License" section says "[MIT](LICENSE)" and the badge says `license-MIT-green`. `package.json` says `"license": "ISC"`. No `LICENSE` file exists in the repo.
**Acceptance criteria**:
- Decision required: which license? MIT (per README) or ISC (per package.json)? Both are permissive; MIT is more common for Electron apps.
- Align all three: (a) `package.json` `"license"` field, (b) README badge + footer, (c) add a `LICENSE` file at repo root matching the chosen license.
- If MIT: add standard MIT License text with copyright holder and year.
- If ISC: update README badge and footer to ISC; add ISC License text.
**Priority**: P2
**Estimated effort**: S
**Dependencies**: USER DECISION REQUIRED (which license)

### [ ] T34: Security review of all IPC handlers
**Type**: audit
**Files**: all `src/main/ipc/*.ts`, `src/main/validation/schemas.ts`, `src/main/services/sharepoint-service.ts`
**Claim under review**: Cross-cutting — verifies T1 through T14 holistically.
**Acceptance criteria**:
- For every `ipcMain.handle` registration (the full list from PM pre-audit: 50+ handlers across 9 modules), confirm: (a) input is parsed through a Zod schema (no `payload as {...}`), (b) `getCurrentUserId()` is called unless on the auth allowlist, (c) errors are wrapped via `asyncWrapError` / `wrapError` and returned as `Result<T>` (no raw throw to renderer), (d) no `eval` / `new Function` / `child_process.exec` with user input.
- Output: a per-handler row with columns: channel, schema, auth-guarded, error-wrapped, notes.
- Pay special attention to the SharePoint browser handlers flagged in T1 — confirm whether they should be auth-guarded (almost certainly yes) and open an implement task if not.
- Claim expected: MOSTLY TRUE with the SharePoint browser handler gap from T1.
**Priority**: P1
**Estimated effort**: M
**Dependencies**: T1, T15-T19 (baseline green so the review isn't muddied by broken builds)

---

## Summary of Dependencies

- **T29** (CI passes) depends on **T15, T16, T17, T18, T19** (the four P0 blockers).
- **T21** depends on **T20** (both touch the sandbox-removal story).
- **T22** (FTS5) depends on **T1** (new search IPC handler needs auth guard).
- **T27** (fuzz) depends on **T15-T19** (baseline green first).
- **T28** (coverage) depends on **T19** (test suite green before measuring).
- **T34** (security review) depends on **T1** and **T15-T19**.
- **T23** (SQLCipher), **T24** (MFA), **T33** (license) require USER DECISION before implementation.

## Spec Ambiguities Requiring User Input

1. **D1 (carried from rectification-plan.md): Data residency vs AI providers.** Spec (Open Question #7) requires Australia data residency, but `ai-adapter.ts` defaults to `api.openai.com` / `api.anthropic.com` (US). The README "Planned" list still shows "AI provider data-residency routing (Azure OpenAI AU East / AWS Bedrock ap-southeast-2)" as unfinished. This is the single largest unresolved spec-level decision. Options: (a) route via AU-resident endpoints, (b) explicitly accept offshore transit and log a deviation, (c) leave provider configurable in Settings and document user responsibility. **Need user decision before any AI-adapter rework.**

2. **D2 (new): SQLCipher (T23).** Spec "Ask First" rule requires human approval for native module additions. Replacing `better-sqlite3` with a SQLCipher variant is a significant native-build change. Is at-rest encryption required for the MVP, or does OS disk encryption (FileVault/BitLocker) suffice? **Need user decision.**

3. **D3 (new): MFA (T24).** MFA is in the README roadmap but NOT in the spec's success criteria or assumptions (spec Assumption #6 only says "No SSO Integration"). Is MFA a hard requirement for this release, or defer to v3? Adding `otplib` is a new dependency requiring "Ask First" approval. **Need user decision.**

4. **D4 (new): License (T33).** package.json says "ISC", README says "MIT", no LICENSE file exists. Which license applies? **Need user decision.**

5. **D5 (new): Default templates count (T18).** Spec says "10-15 standard templates"; README claims "50+ legal templates" and "10+ default legal templates" (contradictory). The missing `default-templates.ts` file must be created — should it contain 10-15 (spec) or 50+ (README)? **Recommend: ship the spec's 10-15 as in-repo defaults; clarify README.**

6. **D6 (new): FTS5 scope (T22).** Future-features-plan specifies FTS5 including document-content indexing (Task 3.4), which requires DOCX text extraction (`mammoth` or similar — new dependency). Is the full QG9 scope in-scope for this rectification pass, or just contract-title/content search? **Need user decision on scope.**

7. **D7 (new): SharePoint browser handler auth (T1/T34).** The 5 `SP_BROWSER_*` handlers currently skip `requireAuth`. Is this intentional (they're used pre-login for SP auth) or a bug? If a bug, they must be auth-guarded — but then the SP-login flow needs a documented exception path. **Need user decision on intended auth model.**
