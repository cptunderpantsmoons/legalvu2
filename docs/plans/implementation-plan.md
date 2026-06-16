# Implementation Plan: Corporate Legal Workspace (LawVu Replacement)

**Based on spec:** `/a0/usr/workdir/legal-wrkspace/docs/specs/lawvu-replacement-spec.md`  
**Approved on:** 2026-06-16  
**Target:** Desktop Electron app for Windows (primary), macOS (stretch)  
**Users:** ~6 in-house legal team members  
**Timeline Goal:** Fastest viable path via incremental vertical slices

---

## Overview

This plan breaks the LawVu replacement into **5 phases** across **~30 implementable tasks**, each with explicit acceptance criteria and verification steps. Each phase ends with a Quality Gate (checkpoint) that must pass before advancing.

Architecture: Electron + React + TypeScript, SQLite for local data, Playwright for SharePoint browser automation, OpenAI/Claude for AI contract generation.

---

## Architecture Decisions

1. **Electron Main/Renderer IPC for all cross-process calls** — needed for Playwright browser control, file system access, and AI API key security.
2. **SQLite + Local filesystem for primary storage** — meets data residency requirement without needing backend infrastructure.
3. **Playwright as the ONLY SharePoint integration mechanism** — no SharePoint API calls made by the app. Browser automation is resilient to changing UIs via config versioning.
4. **Vertical feature slicing over horizontal layer building** — Each task delivers a testable increment of end-user value. No pure "scaffold everything" tasks without a user-visible feature.
5. **Zustand stores + Preload API global** — Type-safe IPC via `window.api.*` and minimal global state.
6. **DocxTemplater with AI raw-text fallback** — Templates render structured docs; AI outputs plain text that can be injected into a base template.

## Dependency Graph

```
Phase 1: Project Bootstrap + Electron Shell
  |
  +---> Phase 2: Database, Models, Core Services
          |
          +---> Phase 3: AI Contract Drafting + Templates
          +---> Phase 4: SharePoint Browser Integration
          |           |
          |           +---> Phase 5: Bi-directional Sync + Audit
          ^           ^
          |           |
          +-----------+
                |
         Quality Gate RC
                |
         Phase 6: E2E, Polish, Installer
```

---

## Task List

### Phase 1: Foundation (Electron Shell + Dev Infrastructure)

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 1.1 | **Bootstrap Electron + Vite + TypeScript project** | Init `legal-wrkspace` repo with Electron Forge + Vite + React + TS. Dev script `npm run dev` launches window. | S | App window opens. HMR works. Main/renderer logs visible. | `npm run dev` > window visible |
| 1.2 | **Lint, Typecheck, Format tooling** | ESLint, Prettier, TypeScript strict mode. Scripts `lint`, `lint:fix`, `typecheck`. | XS | Zero lint errors in scaffold. | `npm run lint` passes |
| 1.3 | **IPC Preload API scaffold** | Typed `contextBridge` preload skeleton with channel enums. IPC handler files in `src/main/ipc/`. | S | Renderer can call `window.api.ping()` and receive response. | Manual console test in DevTools |
| 1.4 | **Zustand store scaffold** | Global stores: `useAuthStore`, `useContractStore` (empty). | XS | Stores import without errors; React components can subscribe. | Render test component |

**Quality Gate QG1: Foundation**  
- [ ] `npm run dev` launches app with blank UI  
- [ ] `npm run lint` passes  
- [ ] `npm run typecheck` passes  
- [ ] IPC ping-pong works  
- [ ] Styles/Tailwind rendering  

---

### Phase 2: Core Infrastructure (DB + Models + File System)

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 2.1 | **SQLite schema + migrations** | `schema.sql` with tables: `contracts`, `documents`, `templates`, `users`, `sharepoint_connections`, `audit_logs`, `sync_queue`. Migration runner with `up`/`down`. | M | `npm run db:migrate` creates file. Tables queryable. | Unit test: migrate -> query schema |
| 2.2 | **Database connection + encryption utils** | `connection.ts` with better-sqlite3. `crypto.ts` for encrypting sensitive fields (SP cookies, API keys). | S | Can read/write encrypted fields. | Unit test: encrypt/decrypt roundtrip |
| 2.3 | **Domain models + types** | `contract.ts`, `document.ts`, `template.ts`, `user.ts`, `sharepoint.ts`, `audit.ts` shared types. Zod schemas for IPC validation at boundary. | S | All models import. Zod parses sample objects. | `typecheck` + Zod unit tests |
| 2.4 | **IPC database handlers** | `db-handler.ts` exposing CRUD for contracts, documents, templates via IPC. | M | Renderer can create/list/get contracts. | Unit tests via mock IPC |
| 2.5 | **File system service** | `document-service.ts`: read/write docs, generate SHA256 hashes, support `.docx`/`.pdf`/`.txt`. | M | Can write test docx, read back, hash matches. | Unit test in `/tmp` |
| 2.6 | **Audit log service** | `audit-service.ts`: every DB mutation writes immutable `audit_logs` row (who, what, timestamp). | S | Any DB insert/update triggers audit row. | Unit test |

**Quality Gate QG2: Core Infrastructure**  
- [ ] `npm test` passes (all unit tests)  
- [ ] Can CRUD contract via IPC from renderer  
- [ ] Audit log traces every contract mutation  
- [ ] File hashes match for roundtrip docx write/read  
- [ ] Encrypted fields are not plaintext in SQLite  

---

### Phase 3: AI Contract Drafting (The Core Value)

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 3.1 | **AI service scaffold** | `ai-service.ts` with OpenAI and Anthropic adapters. Configurable base URL, model, API key (encrypted). Streaming response support. | M | Can ping both providers with a test completion. | Unit test (mocked HTTP) + manual test with real key |
| 3.2 | **Prompt templates** | `prompts/contract-prompts.ts` — system prompt, contract type intake, jurisdiction, variables injection. Versioned. | S | Rendered prompt includes all variables correctly. | Snapshot test |
| 3.3 | **Contract intake form UI** | React wizard: select contract type (NDA, MSA, etc.) -> fill variables. | M | Form state captured. Next/back navigation works. | E2E: Playwright |
| 3.4 | **AI generation + streaming** | IPC handler `ai:generate`. Streams AI text into a rich text editor component (`TipTap` or `Lexical`). | L | Stream completes, text editable. Cancel/retry works. | Manual: real API call |
| 3.5 | **Save AI draft as contract** | Convert streamed text into `.docx` via a base template. Store in SQLite. | M | Output file opens in Word with applied styles. | Manual file inspection |
| 3.6 | **Contract lifecycle states** | Status machine: draft -> under_review -> approved -> signed -> active -> expired/terminated. UI shows status badges and next actions. | S | State transitions update DB and audit log. | Unit test |

**Quality Gate QG3: AI Drafting Works**  
- [ ] End-to-end: user fills intake form -> AI generates a contract -> saved to local DB and docx file  
- [ ] Audit log captures prompt version, model used, token count  
- [ ] Contract lifecycle UI shows correct stages and transitions  

---

### Phase 4: SharePoint Browser Integration (No API)

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 4.1 | **Playwright browser manager** | `sharepoint-service.ts` controls hidden Playwright Chromium context. Headless by default; toggle to visible for debugging. | M | Can launch, navigate to `microsoft.com`, take screenshot (sp test account). | Manual: visible SP page |
| 4.2 | **SP Login cookie capture** | Navigate to tenant.sharepoint.com. Show login UI or capture from user interaction. Extract cookies after auth. Encrypt and store. Session expiry detection. | L | After manual login, cookies available. Re-navigate proves session active. | Manual with real SP tenant |
| 4.3 | **SP folder/library browser** | Scrape SharePoint library listing with configurable DOM selectors. Display files in app UI. | L | File list matches SP library. Click triggers download placeholder. | Manual with real SP tenant |
| 4.4 | **SP file download** | Trigger file download via Playwright intercept. Save to local staging folder. Hash file. | M | File downloaded. SHA256 matches.
| 4.5 | **SP file upload** | Navigate to SP library, use SP "upload" flow via Playwright. Submit local file. Confirm success by re-scraping list. | L | File appears in SP after upload. Can verify via real SP web view. | Manual with real SP tenant |
| 4.6 | **SP settings page UI** | Configure SP URL, library path, toggle headless/manual, view sync status. | S | Settings persist in SQLite. | E2E test |

**Quality Gate QG4: SharePoint Works**  
- [ ] Authenticate to SP via browser without API keys  
- [ ] Download a file from SP to local storage  
- [ ] Upload a file from local storage back to SP  
- [ ] Session expiry detected; re-auth flow works  
- [ ] Resilient to minor SP UI changes (selectors in config)  

---

### Phase 5: Bi-directional Sync + Audit + Template Library

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 5.1 | **Sync engine service** | `sync-service.ts`: background job comparing local index with SP scrape. Queue downloads/uploads. | M | Detects missing local file -> queue download. Detects new local file -> queue upload. | Unit test with mock SP state |
| 5.2 | **Sync conflict resolution** | If file modified both sides, alert user; append version number. | S | Conflict UI triggers; new version created. | Unit test + E2E |
| 5.3 | **Template library UI** | Grid of templates. Create from scratch, upload Word doc -> AI extracts placeholders. | M | Templates list. Upload generates `{{vars}}` list. | E2E + manual Word test |
| 5.4 | **Default templates** | Ship 10 standard templates (NDA, MSA, SOW, Employment, DPA, Privacy Policy, etc.) as `.docx` with `DocxTemplater` placeholders. | L | All 10 render without error when filled with sample data. | Batch script / CI test |
| 5.5 | **Template-based contract generation** | Intake form fills `{{variables}}` into selected template, renders final docx (no AI needed for structured templates). | M | Output matches template layout; variables replaced. | Unit test |
| 5.6 | **Full audit trail UI** | `AuditLogPage.tsx`: searchable table of all AI calls, document edits, SP sync events. Immutable. | S | Filterable by event type, date range. | E2E |

**Quality Gate QG5: Release Candidate**  
- [ ] Bi-directional sync runs automatically for configured SP library  
- [ ] Template library contains 10+ working templates  
- [ ] Audit log shows: AI usage, document CRUD, SP sync, user auth  
- [ ] All unit tests pass  
- [ ] Manual end-to-end walkthrough completed on clean Windows 10 VM  

---

### Phase 6: Quality, Packaging, Polish

| ID | Task | Scope | Est. | Accept Criteria | Verify |
|----|------|-------|------|----------------|--------|
| 6.1 | **E2E test suite** | Playwright Electron tests for: login, intake+AI drafting, SP connect, sync, audit view. | L | All E2E tests pass in CI or local. | `npm run test:e2e` |
| 6.2 | **Error handling + logging** | Structured logger everywhere. User-friendly error toasts. Crash reporting (local only). | M | Simulate AI failure, SP timeout -> graceful error UI. | Manual |
| 6.3 | **Settings / Data residency** | Configurable data directory, AI endpoint (self-hosted option), disable auto-sync toggle. | M | Data stays in configured directory; no telemetry calls. | Inspection of network calls |
| 6.4 | **Electron Forge packaging** | Windows installer (.msi or .exe). Code signing setup (optional). | M | Installer runs on Windows 10/11. | Manual on VM |
| 6.5 | **Onboarding flow** | First-launch wizard: set data folder, configure AI key, connect SharePoint. | S | New user guided through setup in <5 minutes. | Manual |
| 6.6 | **Final documentation** | README.md (user), README-dev.md (contributor), spec link, ADRs for key decisions. | S | Docs cover install, configure, use, troubleshoot. | Human review |

**Quality Gate QG6: Ready for Production**  
- [ ] All QG1-QG5 passed  
- [ ] E2E tests green  
- [ ] Installer tested on clean Windows VM  
- [ ] No telemetry; data residency verified  
- [ ] Human sign-off received  

---

## Risks and Mitigations

| Risk | Impact | Mitigation | Task Ref |
|------|--------|------------|----------|
| Playwright SP selectors break when Microsoft updates SP UI | **HIGH** | Config-driven selector versioning; manual overridefallback; visible debug mode | 4.3, 4.4, 4.5 |
| AI providers change API schema or deprecate models | **MED** | Abstract AI adapters; version prompts separately from model selection | 3.1, 3.2 |
| Electron + Playwright native binaries cause cross-platform package bloat | **MED** | Ship Chromium with Playwright; optional download-on-first-run; macOS as stretch | 6.4 |
| Data residency violated if AI calls leave configured region | **HIGH** | Allow self-hosted/local model endpoint; Document that non-local means provider-specific residency | 6.3 |
| No SharePoint test environment available for development | **HIGH** | Early Task 4.2 requires real SP tenant; build mock SP page as fallback for CI | 4.2 |
| User lacks 2FA device for SP auth during app use | **MED** | Session cookies persist; cookie refresh without full re-auth where possible; visible browser mode for manual 2FA | 4.2 |

---

## Open Questions (Spec Carry-Over)

1. ~~SharePoint Login/IDP: Standard Microsoft account or ADFS?~~ **RESOLVED: Standard email/password login. No federation.**
2. ~~2FA: How is 2FA handled?~~ **RESOLVED: No 2FA in use.**
3. ~~AI API Keys: Per-user or shared org key?~~ **RESOLVED: Added via Settings menu. Supports per-user keys.**
4. **SP Library defaults:** Are there specific library URL patterns to preset? (Impacts 4.3 config)
5. ~~On-premise SP version: 2013/2016/2019/Subscription?~~ **RESOLVED: Use both SharePoint Online and on-premise generically; selector config handles variation.**
6. ~~Data Residency:~~ **RESOLVED: Australia — data must stay within Australian jurisdiction.**

---

## Metrics for Success

| Metric | Target | How Measured |
|--------|--------|--------------|
| End-to-end AI contract generation time | <60 seconds | Timer from intake submit to editable draft |
| SharePoint file sync latency | <5s per file | Logging in sync-service |
| App cold start | <3s | Electron `ready-to-show` event |
| Test coverage (unit) | >=80% services, >=60% handlers | Vitest coverage report |
| E2E pass rate | 100% critical paths | `npm run test:e2e` |
| Data leakage incidents | 0 | Network call audit (no unexpected outbound except AI + SP) |

---

## Transition to Phase 4: Implement

When this plan is **approved**, the first task to start is **Task 1.1** (Bootstrap Electron + Vite + TypeScript project).  
Load `incremental-implementation` and `test-driven-development` skills at that time.
