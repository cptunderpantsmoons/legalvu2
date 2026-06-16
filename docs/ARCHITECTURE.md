# LegalVu v2 — Architecture Decision Records

## System Architecture

LegalVu is an Electron desktop application with a three-tier architecture: **main process** (backend), **preload script** (security bridge), and **renderer process** (React frontend). All data resides in a local SQLite database; the application operates entirely offline except for AI API calls and SharePoint browser sessions.

### High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Electron                               │
│  ┌───────────────── main process (Node.js) ─────────────────┐  │
│  │  SQLite DB (local)   Playwright (SP)   AI adapters      │  │
│  │  IPC handlers: auth, contracts, templates, SP, audit,   │  │
│  │                analytics, sync, import, export           │  │
│  └────────────────────────── IPC ─────────────────────────┘  │
│                           ↕                                   │
│  ┌───────────────── preload script ─────────────────────────┐  │
│  │  contextBridge: exposes ONLY `electronAPI` methods      │  │
│  │  contextIsolation: true  nodeIntegration: false        │  │
│  └────────────────────────── IPC ─────────────────────────┘  │
│                           ↕                                   │
│  ┌───────────────── renderer (React + Vite) ──────────────┐  │
│  │  Components: Shell, Sidebar, Contracts, Dashboard,     │  │
│  │             Templates, Audit, Settings, SP, Auth        │  │
│  │  State: Zustand (auth-store, contract-store)             │  │
│  │  IPC calls via `window.electronAPI.*`                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### ADR-001: SQLite over PostgreSQL/MySQL
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Data residency** | SQLite is a local file; no cloud server required. All data stays on the user's machine. |
| **Zero-config** | No database server installation, no connection strings, no firewall rules. |
| **Performance** | Single-user desktop app with 1–6 users; SQLite's WAL mode provides sufficient concurrency. |
| **Backup** | The entire database is a single file; trivial to back up via OS tools (Time Machine, VSS, rsync). |
| **Trade-off** | No horizontal scaling. If the organization later needs multi-user real-time collaboration, a migration to a client-server database will be required. This is acceptable for the current 6-user in-house scope. |

### ADR-002: Playwright Browser Automation for SharePoint
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Problem** | The organization does NOT have SharePoint API admin rights. OAuth/Graph API integration is impossible. |
| **Solution** | Playwright opens a visible Chromium window. The user authenticates manually using their standard corporate credentials (2FA, SmartCard, etc.). Cookies are captured and encrypted. |
| **Resilience** | Because the user logs in interactively, the solution is immune to Microsoft login page DOM changes (unlike programmatic form-filling). |
| **Trade-off** | Requires a visible browser window (cannot run headlessly during login). File download/upload operations afterward CAN run headlessly. |
| **Security** | Cookies are stored in `safeStorage` (OS keychain). They are never persisted to disk in plaintext. |

### ADR-003: Direct AI SSE Adapters (OpenAI/Claude)
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Problem** | Need streaming AI contract generation without heavy SDK dependencies. |
| **Solution** | Custom `fetch`-based adapters that parse Server-Sent Events (SSE). `OpenAIAdapter` and `AnthropicAdapter` are thin wrappers over `fetch`. |
| **Benefit** | Zero SDK dependency, easy to swap models, no vendor lock-in, streaming works natively. |
| **Trade-off** | Manual SSE parsing requires careful error handling for connection drops and partial chunks. |

### ADR-004: Local Auth with bcrypt
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Problem** | No SSO/OAuth provider is available (no Entra ID admin rights). |
| **Solution** | In-house username/password with bcrypt (cost 12) and an in-memory session store in the main process. |
| **Security** | Passwords are never stored in the renderer. Login state is tracked in the main process and exposed via IPC only to the authenticated session. |
| **Trade-off** | No password reset via email (no SMTP). Reset requires manual admin intervention or a local seed-user workaround. |

### ADR-005: DOCX + PDF Export via docxtemplater and jsPDF
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Requirement** | Generate standard legal documents in .docx and .pdf formats. |
| **Solution** | `docxtemplater` for Word documents (with `{{variable}}` replacement) and `jsPDF` for PDF export. |
| **Benefit** | Templates are standard .docx files; legal staff can edit them offline without learning a new format. |
| **Trade-off** | Complex formatting (tables, headers, footers) requires careful template design; not all DOCX features are supported. |

### ADR-006: Vite + Electron Forge for Build
**Status:** Accepted

| Aspect | Rationale |
|---|---|
| **Renderer** | Vite provides fast HMR and tree-shaking. |
| **Main/Preload** | Vite bundles main and preload processes quickly with separate config files. |
| **Packaging** | Electron Forge handles platform-specific packaging (`npm run make`). |
| **Trade-off** | Requires additional build complexity (three Vite configs: `vite.main.config.ts`, `vite.preload.config.ts`, `vite.renderer.config.ts`). |

---

## Database Schema

### Core Tables

| Table | Purpose | Key Constraints |
|---|---|---|
| `users` | Local auth accounts | `email` UNIQUE, `password_hash` NOT NULL |
| `contracts` | Contract metadata + AI content | `status` CHECK, FK: `created_by` → `users.id` |
| `documents` | File attachments + SP sync metadata | `sha256` UNIQUE, FK: `contract_id` → `contracts.id` |
| `templates` | Template library | `name` UNIQUE |
| `sharepoint_connections` | SP config + cookie cache | `user_id` UNIQUE (one per user) |
| `audit_logs` | Immutable event log | `user_id` FK, `timestamp` indexed |
| `sync_queue` | Background SP sync jobs | `status` CHECK |

### Indexes
- `contracts(status, updated_at DESC)` for quick status filtering
- `documents(sha256)` for integrity checking
- `audit_logs(user_id, created_at DESC)` for per-user audit views
- `sync_queue(status, created_at ASC)` for job scheduling

---

## Service Layer Overview

| Service | Responsibility | IPC Channels |
|---------|---------------|--------------|
| `auth-service.ts` | Register, login, logout, session, password hashing, AI key encryption | `AUTH_REGISTER`, `AUTH_LOGIN`, `AUTH_LOGOUT`, `AUTH_GET_USER` |
| `contract-service.ts` | CRUD, lifecycle transitions, AI generation, export | `CONTRACT_CREATE`, `CONTRACT_GENERATE`, `CONTRACT_EXPORT_DOCX`, `CONTRACT_EXPORT_PDF` |
| `template-service.ts` | Template CRUD, variable extraction, fill | `TEMPLATE_LIST`, `TEMPLATE_GET`, `TEMPLATE_CREATE`, `TEMPLATE_DELETE`, `TEMPLATE_GENERATE` |
| `document-service.ts` | File attachment, SHA256, SP sync status | Implicit via contract handlers |
| `sharepoint-service.ts` | Playwright browser manager, SP login, browse, download, upload | `SP_BROWSER_START`, `SP_BROWSER_STOP`, `SP_LOGIN`, `SP_BROWSE`, `SP_DOWNLOAD`, `SP_UPLOAD` |
| `sp-connection-service.ts` | Cookie storage, connection configuration | `SP_CHECK_SESSION` |
| `sync-service.ts` | Diff detection, queue management, sync execution | `SYNC_RUN`, `SYNC_STATUS`, `SYNC_QUEUE` |
| `audit-service.ts` | Write-only audit log | Internal only (called by other services) |
| `analytics-service.ts` | SQL aggregations for dashboard | `ANALYTICS_*` (implied via IPC handlers) |
| `ai-adapter.ts` | Streaming AI contract generation | Internal only (called by contract-service) |
| `lawvu-import-service.ts` | Lawvu `.zip` bulk import | `LAWVU_IMPORT`, `LAWVU_IMPORT_STATUS` |

---

## Renderer State Management

| Store | Technology | Scope |
|---|---|---|
| `auth-store` | Zustand | Current user, login state |
| `contract-store` | Zustand | Draft content, AI stream buffer, contract list cache |

Components communicate via IPC (no shared state across renderer/main boundaries except through IPC). Zustand stores are local to the renderer process.

---

## Security Architecture

See `SECURITY.md` for the full security model. Key highlights:
- `sandbox: true`, `nodeIntegration: false`, `contextIsolation: true`
- All IPC inputs validated with Zod schemas
- AI API keys encrypted via `safeStorage` (OS keychain)
- Playwright browser runs with `--no-sandbox` ONLY in dev/Docker; production builds must remove it
- SQLite file permissions restricted to the OS user

---

## Performance Characteristics

| Metric | Target | How Achieved |
|---|---|---|
| App startup | <3.0s | Vite HMR in dev; prebuilt bundles in production |
| Contract list load | <200ms | Indexed `contracts` query with `status` + `updated_at` |
| AI generation | <60s | Streaming; tokens displayed in real time |
| SP file download | <5s per file | Headless Playwright after cookie cache |
| Full sync cycle | <30s | Streaming queue processing with batched DB writes |
| Dashboard render | <500ms | Cached SQL aggregates (no external API calls) |
| Export (DOCX/PDF) | <3s | Local docxtemplater; no network dependency |

---

## Migration Path (Future)

If the organization later gains SharePoint API access or decides to move to a client-server database:

1. **SP API Migration:** Replace `sharepoint-service.ts` with a Microsoft Graph API client. The SP connection service and cookie manager can be deprecated; the sync engine remains.
2. **Database Migration:** Switch from SQLite to PostgreSQL by updating `connection.ts` and `migrations.ts`. The service layer uses raw SQL, so only connection and transaction helpers need changes.
3. **SSO Integration:** Add an OAuth2 handler (e.g., Azure AD) alongside bcrypt if Entra ID becomes available.

---

## Files

- `src/main/index.ts` — IPC handler registration + window management
- `src/main/services/` — Domain services
- `src/main/database/schema.sql` — Full DDL
- `src/main/database/migrations.ts` — Migration runner
- `src/shared/ipc-channels.ts` — IPC constants
- `src/shared/types.ts` — Shared domain types
