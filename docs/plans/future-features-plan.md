# LegalVu v2 — Future Features Roadmap

## Overview

This plan defines the development tasks, acceptance criteria, and quality gates for five features targeted for the next major release cycle of LegalVu. These features address production readiness (code signing), user adoption (onboarding), search capability (FTS5), template usability (drag-and-drop editor), and platform expansion (mobile companion).

## Sequence

| Priority | Feature | Effort | Rationale |
|---|---|---|---|
| **P1** | Code signing for installers | S | Production-ready builds for Windows and macOS |
| **P2** | First-launch onboarding wizard | M | Adoption blocker for new users |
| **P3** | Full-text search (FTS5) | M | Finding content quickly for large contract libraries |
| **P4** | Docx template drag-and-drop editor | L | Users currently need external tools to build templates |
| **P5** | Mobile-responsive web companion | XL | Likely deferred — requires server architecture |

---

## Feature 1: Code Signing for Windows/macOS Installers

### Objective
Produce digitally signed `.exe` (Windows) and `.dmg` (macOS) installers so end users don't see "Unknown Publisher" security warnings.

### Key Decisions
- Use `electron-forge` with `@electron-forge/maker-wix` (Windows) and `@electron-forge/maker-dmg` (macOS)
- Start with **standard OV code signing certificates** — sufficient for internal/legal team deployment; upgrade to EV if SmartScreen reputation becomes a problem
- CI: GitHub Actions for automated builds on `tag` push
- `ELECTRON_DISABLE_SANDBOX` must be omitted from production builds

### Tasks

#### Task 1.1: Remove Dev Flags from Production Build
- **Description:** Strip `--no-sandbox` and `ELECTRON_DISABLE_SANDBOX` from the production build pipeline while preserving them for Docker/CI.
- **Acceptance:**
  - [ ] `npm run make` produces an executable that does not contain `--no-sandbox`
  - [ ] Development (`npm run dev`) still disables sandbox in headless environments
- **Verify:** `grep -r "no-sandbox" out/` should return nothing; `grep "no-sandbox" src/main/services/sharepoint-service.ts` is gated behind `process.env.LEGALVU_DEV`
- **Files:** `src/main/services/sharepoint-service.ts`, `forge.config.ts`
- **Dependencies:** None

#### Task 1.2: Windows Code Signing
- **Description:** Integrate a `Standard Code Signing (OV) Certificate` into GitHub Actions; configure `@electron-forge/maker-wix` to sign the built `.exe`.
- **Acceptance:**
  - [ ] Windows installer build produces a signed `.exe` with a valid digital signature
  - [ ] SmartScreen shows the publisher name, not "Unknown Publisher"
- **Verify:** Run `signtool verify /pa out/make/squirrel.windows/x64/LegalVuSetup.exe` in CI; exit code 0
- **Files:** `.github/workflows/build.yml`, `forge.config.ts`
- **Dependencies:** Task 1.1

#### Task 1.3: macOS Code Signing and Notarization
- **Description:** Configure `Apple Developer ID` signing and automatic notarization via `xcrun notarytool`.
- **Acceptance:**
  - [ ] macOS `.dmg` is signed with a valid Developer ID
  - [ ] Notarization succeeds (status `Accepted` via `xcrun notarytool submit`)
- **Verify:** Run `spctl -a -t open --context context:primary-signature -v out/make/LegalVu.dmg`; exit code 0
- **Files:** `.github/workflows/build.yml`, `forge.config.ts`, `entitlements.plist`
- **Dependencies:** Task 1.1

### Quality Gate QG7

| Criteria | Status | How Verified |
|---|---|---|
| Windows build signed and verified | ⬜ | CI artifact passes `signtool verify` |
| macOS build signed and notarized | ⬜ | CI artifact passes `spctl` and notarytool |
| `--no-sandbox` absent in production | ⬜ | Static analysis of built artifact / source code |
| Dev flags still available for Docker | ⬜ | `npm run dev` in CI container runs without error |

---

## Feature 2: First-Launch Onboarding Wizard

### Objective
Replace the current Settings-based manual configuration with a guided, 5-step wizard shown on the user's first app launch. Covers data path, AI setup, SharePoint connection, optional Lawvu import, and completion.

### Key Decisions
- Wizard state persists via a `config.json` in `app.getPath('userData')`
- SharePoint step collects site URL and library path only; the actual browser login is deferred to the SharePoint page (avoiding MFA/cookie failures inside the wizard)
- Support **OpenAI, Anthropic, and self-hosted / Azure-compatible endpoints** in the AI step (leveraging the existing configurable base URL)
- All existing settings handlers are reused; no new backend logic required for most steps
- Onboarding is skipped if `hasCompletedOnboarding === true`

### Tasks

#### Task 2.1: Onboarding State Machine & Data Model
- **Description:** Create a `settings-service.ts` (or extend existing) to persist onboarding completion + wizard answers. Add `config.json` schema validation with Zod.
- **Acceptance:**
  - [ ] `getSetting('hasCompletedOnboarding')` returns `false` for new users
  - [ ] `setSettings({ hasCompletedOnboarding: true, onboardingAnswers: {...} })` persists correctly
- **Verify:** `npm test -- --grep onboarding`
- **Files:** `src/main/services/settings-service.ts`, `src/main/validation/schemas.ts`
- **Dependencies:** None

#### Task 2.2: Wizard UI Shell
- **Description:** Build `OnboardingWizard.tsx` with a `StepIndicator` and `NavigationButtons` (Back, Next, Skip, Finish). Use Tailwind for transitions.
- **Acceptance:**
  - [ ] Wizard renders with 5 visible steps: Data Path → AI Key → SharePoint → Import → Done
  - [ ] "Next" is disabled when current step has validation errors
  - [ ] "Back" returns to the previous step with answers preserved
- **Verify:** Manual click-through in Electron; E2E `onboarding.spec.ts`
- **Files:** `src/renderer/components/onboarding/OnboardingWizard.tsx`, `src/renderer/components/onboarding/StepIndicator.tsx`
- **Dependencies:** Task 2.1

#### Task 2.3: Step Components (Content)
- **Description:** Build 5 step-specific components: `DataPathStep`, `AiConfigStep`, `SpSetupStep`, `ImportStep`, `CompletionStep`.
- **Acceptance:**
  - [ ] `DataPathStep` lets user pick a directory; default is `app.getPath('userData')`
  - [ ] `AiConfigStep` accepts provider/model/key; validates key format
  - [ ] `SpSetupStep` has fields for site URL and library path; optional "Test Connection" button
  - [ ] `ImportStep` shows a drag-and-drop Zone for Lawvu ZIP; runs `lawvu:import` via IPC
  - [ ] `CompletionStep` has a button to launch the main app
- **Verify:** E2E tests for each step; mock IPC handlers
- **Files:** `src/renderer/components/onboarding/steps/*.tsx`
- **Dependencies:** Task 2.2

#### Task 2.4: First-Launch Detection & Routing
- **Description:** In `App.tsx`, check `hasCompletedOnboarding`. If false, show wizard; if true, show `AppShell`. After wizard finish, set flag and reload app.
- **Acceptance:**
  - [ ] New user sees wizard on first launch
  - [ ] Returning user skips wizard and sees `AppShell`
  - [ ] Onboarded user never sees wizard again unless `config.json` is deleted
- **Verify:** Manual test with fresh `userData` directory
- **Files:** `src/renderer/App.tsx`
- **Dependencies:** Task 2.1, Task 2.3

### Quality Gate QG8

| Criteria | Status | How Verified |
|---|---|---|
| Wizard renders 5 steps end-to-end | ⬜ | E2E test navigates through all steps |
| First-launch detection works | ⬜ | Fresh DB/userData triggers wizard; existing skips it |
| AI key validated on step | ⬜ | Invalid key shows error; valid key proceeds |
| Lawvu import completes in wizard | ⬜ | Mock ZIP → import success → dashboard shows data |
| Settings override after onboarding | ⬜ | Manual change in SettingsPage persists independently |

---

## Feature 3: Full-Text Search (SQLite FTS5)

### Objective
Enable fast full-text search across contract titles, content, and document metadata using SQLite's native FTS5 extension. Replace the current simple `LIKE` queries on the contract list.

### Key Decisions
- Use `better-sqlite3` with FTS5 enabled (requires compiling against the correct SQLite flags)
- Create a single `contracts_fts` FTS5 virtual table that mirrors `contracts` content
- Keep FTS table in sync via SQLite triggers (auto-update on INSERT/UPDATE/DELETE)
- Reindex on migration or schema change

### Tasks

#### Task 3.1: FTS5 Virtual Table Setup
- **Description:** Create `contracts_fts` virtual table in `schema.sql` and migration. Add `search_contracts(query)` service function.
- **Acceptance:**
  - [ ] `CREATE VIRTUAL TABLE contracts_fts USING fts5(title, content, tokenize='porter')` executes without error
  - [ ] `search_contracts('termination clause')` returns matching contract IDs by relevance
- **Verify:** Unit test seeds 20 contracts, asserts search returns expected subset in <50ms
- **Files:** `src/main/database/schema.sql`, `src/main/database/migrations.ts`, `src/main/services/search-service.ts`
- **Dependencies:** None

#### Task 3.2: FTS5 Synchronization Triggers
- **Description:** Add SQLite triggers to auto-populate `contracts_fts` on contract INSERT/UPDATE/DELETE.
- **Acceptance:**
  - [ ] After inserting a contract, searching for its title returns that contract
  - [ ] After deleting a contract, searching for its title returns nothing
- **Verify:** `npm test -- --grep fts5`
- **Files:** `src/main/database/schema.sql`, `src/main/database/migrations.ts`
- **Dependencies:** Task 3.1

#### Task 3.3: Search UI Component
- **Description:** Add a global search bar to `AppShell` that queries `search:contracts` IPC channel. Results show contract title, matched snippet, and status.
- **Acceptance:**
  - [ ] Typing a search term returns results in <200ms for 500 contracts
  - [ ] Results show highlighted matching text snippets
  - [ ] Clicking a result navigates to `ContractDetailPage`
- **Verify:** E2E test searches for known contract title, asserts navigation
- **Files:** `src/renderer/components/search/GlobalSearch.tsx`, `src/shared/ipc-channels.ts` (add `SEARCH_CONTRACTS`)
- **Dependencies:** Task 3.2

#### Task 3.4: Document Content Indexing
- **Description:** Index document file contents (DOCX text) alongside contract metadata. Extract text from DOCX via `docxtemplater` or `mammoth` and store in an auxiliary `documents_fts` table.
- **Acceptance:**
  - [ ] Words inside `.docx` files are discoverable via search
  - [ ] Re-indexing after document upload succeeds without blocking UI
- **Verify:** Upload a DOCX with "confidentiality" → search for "confidentiality" → result returns parent contract
- **Files:** `src/main/services/document-service.ts` (add indexing), `src/main/services/search-service.ts`
- **Dependencies:** Task 3.1

### Quality Gate QG9

| Criteria | Status | How Verified |
|---|---|---|
| FTS5 table created and queryable | ⬜ | Unit test: seed + search returns correct results |
| Triggers auto-sync on CRUD | ⬜ | Unit test: insert/update/delete → search results correct |
| Search UI returns results <200ms | ⬜ | E2E timing assertion |
| Document text indexed | ⬜ | E2E: upload DOCX → search for known word inside |
| No regression to contract CRUD | ⬜ | Full test suite passes |

---

## Feature 4: Docx Template Drag-and-Drop Editor

### Objective
Build a visual template editor in the renderer that allows legal staff to create templates by dragging field placeholders (`{{variable}}`) and text blocks into a canvas, then export the result as a `.docx` file that works with `docxtemplater`.

### Key Decisions
- Use `@dnd-kit` or `react-dnd` for drag-and-drop
- Canvas uses a simplified Rich Text Editor (TipTap) with custom nodes for variable placeholders
- **MVP scope:** paragraphs, headings, lists, and variable placeholders only. Tables, headers, and footers are deferred to v2.x
- Generated `.docx` uses `docxtemplater` with `{ paragraph: true }` to preserve rich formatting
- Templates are saved in the existing `templates` database table

### Tasks

#### Task 4.1: Canvas Component with Drag-and-Drop
- **Description:** Create `TemplateCanvas.tsx` with a draggable palette of elements (Text Block, Variable, Heading, Signature Block). Elements snap into a flow layout on the canvas.
- **Acceptance:**
  - [ ] User can drag an element from palette to canvas
  - [ ] Elements can be reordered within the canvas
  - [ ] Deleting an element removes it from the canvas
- **Verify:** E2E drag-and-drop test
- **Files:** `src/renderer/components/templates/TemplateCanvas.tsx`, `src/renderer/components/templates/ElementPalette.tsx`
- **Dependencies:** None

#### Task 4.2: Variable Placeholder Nodes
- **Description:** Add a custom TipTap node type `VariableNode` that renders as a colored pill (`{{variable}}`). When the template is exported, these are converted to `docxtemplater` placeholders.
- **Acceptance:**
  - [ ] Variable nodes are visually distinct (colored background)
  - [ ] Editing a variable name updates the placeholder text
  - [ ] Duplicate variable names show a warning badge
- **Verify:** Unit tests for TipTap node extension
- **Files:** `src/renderer/components/templates/extensions/VariableNode.ts`, related tests
- **Dependencies:** Task 4.1

#### Task 4.3: DOCX Export from Canvas
- **Description:** Add an "Export to DOCX" button that traverses the TipTap document, converts paragraph and variable nodes to docxtemplater-compatible XML, and triggers a download via IPC.
- **Acceptance:**
  - [ ] Exported `.docx` opens in Word or LibreOffice without corruption
  - [ ] Variable placeholders are correctly inserted as `{{variable}}`
  - [ ] Formatting (bold, italic) is preserved in the export
  - [ ] `generateContractFromTemplate` can read the exported file successfully
- **Verify:** E2E: export → generate contract → assert content includes filled variable
- **Files:** `src/renderer/components/templates/exportDocx.ts`, `src/main/services/template-service.ts`
- **Dependencies:** Task 4.2

### Quality Gate QG10

| Criteria | Status | How Verified |
|---|---|---|
| Drag-and-drop works end-to-end | ⬜ | E2E test: drag 3 elements, reorder, delete |
| Variable nodes render correctly | ⬜ | Screenshot comparison or DOM assertion |
| DOCX export loads in Word | ⬜ | Manual check with Word/LibreOffice |
| Generated contract fills placeholders | ⬜ | E2E: export → generate → assert output includes variable value |
| No regression to existing templates | ⬜ | Full test suite passes |

---

## Feature 5: Mobile-Responsive Web Companion

### Objective
Create a lightweight, read-only web companion (Electron renderer extracted as a PWA or small web app) that allows legal staff to browse contracts, view audit logs, and receive push notifications on mobile devices.

### Key Decisions
- **Option A:** Serve the existing renderer bundle as a static site behind a simple Express server. This is fast but insecure (no auth without tokens).
- **Option B:** Build a separate React app with read-only API endpoints served by a lightweight Node.js server syncing with SQLite. More secure but requires maintaining a second app.
- **Decision:** v2.x scope is limited to a responsive desktop renderer (tablets/laptops). A separate read-only mobile companion for executive review is deferred to **v3**.

### Tasks (Deferred to v3)

#### Task 5.1: Responsive Renderer Layout
- **Description:** Make `AppShell.tsx` and all page components responsive via Tailwind (`md:`, `lg:` breakpoints). Sidebar becomes a hamburger menu on small screens.
- **Acceptance:**
  - [ ] App is usable at 768px width (iPad portrait)
  - [ ] Sidebar collapses to a bottom navigation bar on mobile
  - [ ] Contract list cards rearrange to single column on narrow screens
- **Verify:** Screenshot at 768px, 1024px, 1440px via Playwright
- **Files:** `src/renderer/components/layout/AppShell.tsx`, `src/renderer/components/contracts/ContractsListPage.tsx`
- **Dependencies:** None

#### Task 5.2: Touch Event Support
- **Description:** Add touch event handlers for drag-and-drop (templates) and pinch-to-zoom (contract detail). Ensure buttons are tap-friendly (min 44px touch target).
- **Acceptance:**
  - [ ] All interactive elements have `min-w-[44px] min-h-[44px]` or equivalent
  - [ ] Long-press on contract card opens context menu
  - [ ] Pinch gesture zooms the document preview
- **Verify:** Manual test on touch device or Playwright touch emulation
- **Files:** Various renderer components
- **Dependencies:** Task 5.1

### Quality Gate QG11

| Criteria | Status | How Verified |
|---|---|---|
| Layout usable at 768px width | ⬜ | Playwright screenshot at tablet viewport |
| Touch targets meet 44px minimum | ⬜ | CSS audit via devtools or DOM assertion |
| No horizontal scroll at 375px | ⬜ | Playwright screenshot at mobile viewport |
| Full test suite passes | ⬜ | `npm test` |

---

## Risk Matrix

| Feature | Risk | Impact | Mitigation |
|---|---|---|---|
| Code signing | Certificate procurement delay | High | Use self-signed certs for internal beta; production certs ordered early |
| Onboarding wizard | SP login flow UX confusion | High | Include a 30-second animated tutorial in the wizard |
| FTS5 | better-sqlite3 compiled without FTS5 | Medium | Verify `SELECT fts5('test')` works in CI; recompile if needed |
| Template editor | DOCX export corruption | Medium | Use round-trip test: export → generate → compare |
| Mobile companion | Scope explosion for backend | High | Scope to responsive renderer only; defer standalone web app to v3 |

---

## Open Questions — Resolved

The following decisions apply to this plan until explicitly changed:

1. **Onboarding SP login:** The wizard collects SharePoint site URL and library path, but does **not** attempt automatic login. The user completes SharePoint authentication from the dedicated SharePoint page after onboarding.
2. **FTS5 deployment:** CI builds `better-sqlite3` with FTS5 enabled and bundles the native module with the Electron app. Target Windows machines use the shipped binary; no local compile is required.
3. **Code signing certificates:** Start with a **standard OV certificate**. EV is an upgrade path if SmartScreen reputation becomes an issue.
4. **Template editor scope:** MVP includes **paragraphs, headings, lists, and variable placeholders only**. Tables, headers, and footers are deferred to v2.x.
5. **Mobile strategy:** v2.x scope is a **responsive desktop renderer** for tablets/laptops. A read-only mobile companion is deferred to v3.
