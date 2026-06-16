# Spec: Corporate Legal Workspace (LawVu Replacement)

## Objective

Build a desktop legal workspace application for a corporate in-house legal team (~6 users). It replaces LawVu with core capabilities for AI-powered contract lifecycle management (CLM), legal document creation, and bi-directional file synchronization with SharePoint via embedded browser automation (no SharePoint API/admin rights required).

**Key User Story:**
As an in-house legal counsel, I want to generate legal contracts and documents using AI, manage them through their lifecycle, and have them automatically backed up to our existing SharePoint document libraries using my standard credentials, so our team can work efficiently without needing IT to configure API access.

**Success Criteria:**
- [ ] Users can draft contracts from scratch using AI with multi-step guided workflows
- [ ] Users can create and manage reusable contract templates
- [ ] Complete contract lifecycle: draft → review → approve → sign → store → renew/expire
- [ ] Users authenticate to SharePoint through an embedded browser using their normal login
- [ ] The app downloads files from SharePoint and stores them locally
- [ ] The app uploads local files (new documents, signed contracts) back to SharePoint
- [ ] All data residency requirements are met (local storage, no cloud leakage)
- [ ] Works with both SharePoint Online (M365) and on-premise SharePoint
- [ ] Users can view/download any file type visible in SharePoint (Office docs, PDFs, images, etc.)
- [ ] Full audit trail of AI-generated content and document changes

## Assumptions

1. **Desktop Application:** Single-tenant desktop app running on user workstations (Windows/macOS), not a web service.
2. **No SharePoint API Access:** Organization lacks SharePoint admin rights to register apps/using Graph API. SharePoint integration must use browser automation / embedded browser with user login.
3. **Local-First Storage:** Documents and metadata stored locally in an embedded database (SQLite). SharePoint acts as external backup, not primary store.
4. **AI via OpenAI-Compatible APIs:** Supports OpenAI API + Anthropic Claude via configurable endpoints. All API calls happen from the desktop app (or via a local proxy if keys need protection).
5. **No E-Signature Built-In:** Out-of-scope for initial build. Integration with DocuSign/Adobe Sign will be a future enhancement. For MVP, manual signature workflow or print-sign-scan.
6. **No SSO Integration:** Users log in with email/password to the app + separate SharePoint login via embedded browser.
7. **Windows Primary, macOS Secondary:** Primary target is Windows (corporate standard), macOS support is stretch goal.
8. **No Internet-Exposed Backend:** Application is fully local/offline-capable except for AI API calls and SharePoint sync.

## Tech Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | Electron + React + TypeScript | Desktop cross-platform, rich UI, mature ecosystem, extensive browser automation integration |
| Embedded Database | SQLite (via better-sqlite3) | Zero-config, local file-based, ACID, proven for desktop apps |
| SharePoint Integration | Playwright (embedded Chromium) | Can automate login, navigate SharePoint UI, download/upload files programmatically without API |
| AI Integration | LangChain.js or direct HTTP | OpenAI-compatible API + Anthropic Claude support |
| Document Generation | DocxTemplater (for structured docs) + AI text generation | Generate Word-compatible .docx from templates; AI for free-form content |
| Document PDF | PDF-lib or gotenberg (local) | Fill/sign PDFs, convert docs |
| Styling | TailwindCSS | Rapid UI development |
| State Management | Zustand | Lightweight, TypeScript-friendly |
| File Watching | Chokidar | Detect local file changes for sync back to SharePoint |
| Testing | Vitest (unit) + Playwright Test (E2E on UI) | Fast, modern, works with React |
| Build/Packaging | Electron Forge | Cross-platform packaging, auto-updater ready |

## Commands

```bash
# Development
npm run dev            # Start Electron + Vite dev server with hot reload

# Build
npm run build          # Production build of renderer + main process
npm run package        # Package for current platform (dev testing)
npm run make           # Full distributable build (installer for Windows/macOS)

# Testing
npm run test           # Run Vitest unit tests
npm run test:e2e       # Run Playwright E2E tests on packaged app
npm run test:ui        # Run tests with UI coverage reporter

# Quality
npm run lint           # ESLint + Prettier check
npm run lint:fix       # Auto-fix linting issues
typecheck              # Full TypeScript type check across main/renderer

# SharePoint Integration Tests (manual/semi-automated)
npm run test:sp        # Run Playwright scripts that test SharePoint flows (requires test account)
```

## Project Structure

```
legal-wrkspace/
├── src/
│   ├── main/                      # Electron main process (Node.js)
│   │   ├── index.ts               # Entry point, window management
│   │   ├── ipc/                   # IPC handlers for renderer -> main calls
│   │   │   ├── ai-handler.ts      # AI API calls (OpenAI/Claude)
│   │   │   ├── database-handler.ts # SQLite queries
│   │   │   ├── document-handler.ts # File I/O, doc generation
│   │   │   ├── sharepoint-handler.ts # Playwright browser automation
│   │   │   └── system-handler.ts  # OS-level operations (dialogs, shell)
│   │   ├── services/
│   │   │   ├── ai-service.ts      # LLM orchestration, prompt templates
│   │   │   ├── contract-service.ts # Contract CRUD + lifecycle logic
│   │   │   ├── document-service.ts # Template management, docx generation
│   │   │   ├── sharepoint-service.ts # Playwright browser control
│   │   │   └── sync-service.ts    # Bi-directional file sync engine
│   │   ├── database/
│   │   │   ├── connection.ts      # SQLite setup, migrations
│   │   │   ├── schema.sql         # Full schema definition
│   │   │   └── migrations/        # Versioned migrations
│   │   ├── models/
│   │   │   ├── contract.ts        # Contract entity types
│   │   │   ├── document.ts        # Document entity types
│   │   │   ├── template.ts        # Template entity types
│   │   │   ├── user.ts            # User/Auth types
│   │   │   └── sharepoint.ts      # SharePoint sync config types
│   │   └── utils/
│   │       ├── logger.ts          # Structured logging
│   │       ├── config.ts          # Config management (encrypted store)
│   │       └── crypto.ts          # Local encryption for sensitive data
│   ├── renderer/                  # React frontend (Electron renderer process)
│   │   ├── index.tsx              # React entry
│   │   ├── App.tsx                # Root component, routing
│   │   ├── components/            # UI components
│   │   │   ├── common/            # Buttons, inputs, modals, tables
│   │   │   ├── contracts/         # Contract list, detail, editor
│   │   │   ├── documents/         # Document viewer, uploader
│   │   │   ├── ai/                # AI chat panel, prompt inputs
│   │   │   ├── sharepoint/        # Browser embed, folder picker, sync status
│   │   │   └── templates/         # Template library, template builder
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      # Overview, stats, recent items
│   │   │   ├── ContractsPage.tsx  # Full CLM interface
│   │   │   ├── TemplatesPage.tsx  # Template management
│   │   │   ├── AIDraftingPage.tsx # AI-powered document drafting
│   │   │   ├── SharePointPage.tsx # SharePoint sync config and browser view
│   │   │   ├── SettingsPage.tsx   # App settings, AI config, data residency
│   │   │   └── AuditLogPage.tsx   # Audit trail viewer
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── stores/                # Zustand state stores
│   │   └── utils/                 # Renderer-side utilities
│   ├── shared/                    # Types/constants shared across main/renderer
│   │   ├── types.ts               # Core TypeScript interfaces
│   │   ├── constants.ts           # App constants (version, limits)
│   │   └── ipc-channels.ts        # IPC channel names (type-safe)
│   └── scripts/
│       └── build-docs.ts          # Generate spec docs from code comments
├── assets/
│   ├── templates/                 # Default contract templates (docx)
│   ├── icons/                     # App icons, tray icons
│   └── onboarding/               # First-run guide content
├── tests/
│   ├── unit/                      # Vitest tests (mirror src/ structure)
│   ├── e2e/                       # Playwright electron tests
│   └── fixtures/                  # Test documents, mock data
├── docs/
│   ├── specs/                     # This spec and related specs
│   ├── plans/                     # Implementation plan
│   └── adr/                       # Architecture Decision Records
├── build/                         # Build artifacts (gitignored)
└── package.json
```

## Code Style

### Naming
- PascalCase for components, types, interfaces: `ContractCard`, `TemplateConfig`
- camelCase for variables, functions, instances: `generateContract`, `activeUser`
- kebab-case for file names: `contract-service.ts`, `ai-chat-panel.tsx`
- SCREAMING_SNAKE_CASE for constants: `MAX_FILE_SIZE_MB`, `AI_TIMEOUT_MS`

### TypeScript
```typescript
// Strict mode enabled. Always type function returns.
interface Contract {
  id: string;           // UUID v4
  title: string;
  status: ContractStatus; // Enum, never string literal inline
  createdAt: Date;
  metadata: Record<string, unknown>;
}

// Prefer explicit error returns over throwing
async function fetchContract(id: string): Promise<Result<Contract, DatabaseError>> {
  // Implementation
}
```

### IPC Pattern
All main-renderer communication uses typed IPC channels:
```typescript
// shared/ipc-channels.ts
export const IPC_CHANNELS = {
  AI_GENERATE: 'ai:generate',
  CONTRACT_CREATE: 'contract:create',
  SHAREPOINT_SYNC: 'sharepoint:sync',
  // ...
} as const;

// renderer calls via typed wrapper
const result = await window.electronAPI.contracts.create(contractData);
```

## Testing Strategy

| Level | Framework | Location | Coverage Target |
|-------|-----------|----------|-----------------|
| Unit | Vitest | `tests/unit/**/*.test.ts` | 80% for services, 60% for handlers |
| Integration | Vitest | `tests/unit/**/*.integration.test.ts` | CRUD operations on SQLite in-memory |
| E2E | Playwright | `tests/e2e/**/*.spec.ts` | Critical user journeys |
| SharePoint E2E | Playwright scripts | `tests/e2e/sharepoint/` | Manual but repeatable SP flows |

**Mock Strategy:**
- AI service: Mock OpenAI/Claude HTTP responses using MSW (Mock Service Worker)
- SharePoint: Record/replay Playwright traffic for CI; require real SP account for full tests
- File system: Use `mock-fs` or `memfs` for isolated testing

## Boundaries

### Always Do
- [ ] Run `npm run typecheck` and `npm run lint` before any commit
- [ ] Validate all IPC inputs with Zod schemas at the main process boundary
- [ ] Log all AI API calls with token usage and latency metrics
- [ ] Encrypt AI API keys using OS keychain (electron-safe-storage)
- [ ] Write unit tests for any new service method
- [ ] Keep SQLite migrations reversible (down migration provided)
- [ ] Strip AI API keys from any logs or error traces
- [ ] Confirm file write/delete before updating database records

### Ask First (Human Approval Required)
- [ ] Adding new npm dependencies (especially native modules)
- [ ] Modifying database schema (requires migration + human review)
- [ ] Changing SharePoint automation approach (Playwright selectors break easily)
- [ ] Modifying AI prompt templates that affect legal output
- [ ] Adding telemetry or any outbound network calls beyond AI APIs
- [ ] Changing TypeScript strictness or lint rules

### Never Do
- [ ] Commit AI API keys or SharePoint test credentials to git
- [ ] Store unencrypted PII or contract content in logs
- [ ] Disable Playwright anti-bot features without documentation
- [ ] Call AI APIs synchronously without timeouts and retries
- [ ] Modify `tests/e2e/sharepoint/` tests without SP test environment
- [ ] Ship without passing E2E on a clean Windows VM

## SharePoint Integration Design (Critical)

Since the organization lacks SharePoint API admin rights, we use **Playwright-based browser automation** embedded in the Electron app.

### Architecture
```
+-----------------------------------------------------+
|  Electron App                                       |
|  +-----------------+  +----------------------+      |
|  | Main Process    |  | Renderer Process     |      |
|  | - Playwright    |  | - UI Controls        |      |
|  | - File watcher  |  | - SharePoint browser |      |
|  | - Sync engine   |  |   widget             |      |
|  |                 |  |                      |      |
|  +-----------------+  +----------------------+      |
|                                                     |
|  +-----------------+                              |
|  | Hidden Browser   |  (Playwright chromium)       |
|  | Context 1: SP     |  Login, browse, scrape       |
|  | Context 2: SP     |  Upload, download files     |
|  +-----------------+                              |
+-----------------------------------------------------+
```

### How It Works

1. **Auth:** User opens SharePoint settings page. App launches hidden Playwright browser window navigating to tenant.sharepoint.com. User enters username/password/2FA through the real SharePoint login page (visual element shown in app's SharePoint tab, or user uses normal browser and copies session). Playwright captures session cookies after successful login.
2. **Browse:** Playwright navigates to configured SharePoint document library URLs. Scrapes file list using DOM selectors (robust fallback: MS Graph no, but HTML structure is predictable).
3. **Download:** For each file to sync, Playwright triggers download via anchor click interception (`page.on('download', ...)`), saves to local staging folder.
4. **Upload:** To write back, Playwright navigates to target library, fills the "Upload" form, selects local file, submits, and confirms upload success by checking the file appears in library listing.
5. **Sync Engine:** Background sync service compares local SQLite index with SharePoint listing. Downloads new/changed files. Uploads local files marked as "pending upload."

### Resilience (Critical for SharePoint's anti-bot / changing UI)
- **Selector versioning:** Abstract SharePoint DOM selectors into a versioned config. When SP changes UI, update config without code changes.
- **Cookie refresh:** Detect session expiry. Automatically re-navigate to login page if cookies expire, re-prompt user.
- **Rate limiting:** Add polite delays between operations (1-2s). Never parallelize SP actions aggressively.
- **Headless toggle:** Allow user to switch to visible browser mode for debugging/troubleshooting.
- **Manual override:** User can manually trigger download/upload of specific files if automation fails.

### Data Residency Consideration
- AI API calls go to configured endpoints (could be self-hosted, Azure OpenAI in region, etc.).
- No contract content is logged to external services.
- All document content stays local (SQLite + filesystem) unless explicitly synced to SharePoint.

## AI Implementation Design

### Multi-Step Contract Drafting
1. **Intake Form:** User selects contract type (NDA, MSA, Employment, etc.) and fills structured form (counterparty, jurisdiction, key terms).
2. **AI Generation Request:** App sends structured prompt to LLM (Claude 3.5 Sonnet / GPT-4) with system prompt: "You are a corporate legal assistant... Generate a professional contract in legal English."
3. **Streaming Response:** AI text streamed back into a rich text editor in the app.
4. **Section-by-Section Review:** User can cherry-pick AI suggestions, edit inline, or request "re-draft section X with [change]."
5. **Save to DB:** Final content saved as docx via DocxTemplater + custom formatting. Raw text stored in SQLite for future edits.

### Prompt Architecture
```typescript
interface ContractPrompt {
  systemPrompt: string;      // "You are a legal assistant..."
  contractType: string;      // "Employee NDA"
  jurisdiction: string;      // "Delaware / US"
  variables: Record<string, string>; // { counterpartyName: "Foo Inc", termMonths: "12" }
  previousDraft?: string;    // For iterative refinement
  instruction?: string;      // "Make the indemnification clause mutual"
}
```

### Template Library
- **Default Templates:** Ship with 10-15 standard templates (NDA, MSA, SOW, Employment, SaaS Agreement, Privacy Policy, etc.)
- **Template Builder:** AI-assisted. User uploads existing Word doc -> AI extracts placeholders -> creates editable template.
- **Template Variables:** All templates use `{{variable_name}}` placeholders compatible with DocxTemplater.

## Database Schema (SQLite)

Core tables:
- `contracts` - All contracts with lifecycle status, AI generation metadata, audit log refs
- `documents` - All files (local path, SHA256, SharePoint URL if synced, version history)
- `templates` - Template definitions with docx blob and variable schema
- `users` - Local user accounts for the app (password hashed with bcrypt)
- `sharepoint_connections` - SP site URL, library paths, cookies (encrypted), sync config
- `audit_logs` - Immutable log of all actions (who, what, when, AI prompt/version used)
- `sync_queue` - Pending upload/download operations for resilience

See `src/main/database/schema.sql` for full DDL.

## Success Criteria (Reframed)

- [ ] Alpha: User can log in to the app, open embedded SharePoint browser, authenticate, and download a file to local storage
- [ ] Alpha: User can create a contract via AI, edit it, and save it locally
- [ ] Beta: Bi-directional sync works for Word and PDF files
- [ ] Beta: Template library contains 10+ working templates
- [ ] RC: Complete contract lifecycle workflow functional end-to-end
- [ ] RC: Audit log captures all AI prompts, document edits, and sync events
- [ ] GA: Passes E2E tests on Windows 10/11 clean VM
- [ ] GA: Data residency verified (all local storage, no external leakage)

## Open Questions

1. **SharePoint Login Method:** Does the user's org use standard Microsoft login, or ADFS/custom IDP? This affects Playwright auth flow.
2. **2FA Handling:** How should the app handle Microsoft Authenticator push/SMS 2FA during SP login? (Show browser window for manual approval?)
3. **AI API Keys:** Who holds/pays for AI API keys? App stores encrypted keys locally per user, or shared org key?
4. **DocuSign/Adobe Sign:** Is signature integration needed for MVP, or truly post-MVP?
5. **SharePoint Library Structure:** Do you have specific SP libraries/folder naming conventions the app should default to?
6. **On-Premise SP Version:** For on-premise SharePoint, what version? (2013, 2016, 2019, Subscription Edition?)
7. **Data Residency Location:** What jurisdiction's data residency rules apply? (e.g., must stay in-country, in EU, etc.)
