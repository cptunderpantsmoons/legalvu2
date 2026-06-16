# LegalVu v2 — AI-Powered Legal Workspace

[![Tests](https://img.shields.io/badge/tests-180%2F180-brightgreen)]()
[![Lint](https://img.shields.io/badge/lint-passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

> A desktop application built with **Electron + React** that provides an **AI-driven contract lifecycle management (CLM)** system, **SharePoint browser automation**, template-driven contract generation, and a **local-first audit trail** — designed for in-house legal teams that need data sovereignty without cloud dependencies.

---

## Table of Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Security](#security)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

| Module | Status | Description |
|--------|--------|-------------|
| **AI Contract Drafting** | ✅ | Streaming contract generation via OpenAI / Anthropic with rich text editing (TipTap), prompt versioning, and markdown-to-DOCX export. |
| **Document Management** | ✅ | Local SQLite storage with SHA256 integrity, audit logging, and a full contract lifecycle state machine. |
| **Template Library** | ✅ | 10+ default legal templates (NDA, MSA, Employment, DPA, etc.) with variable injection and custom template upload. |
| **SharePoint Integration** | ✅ | Playwright-based browser automation for login, file browse, download, and upload — no SharePoint API required. |
| **Bi-directional Sync** | ✅ | Detects sync diffs between local DB and SharePoint library, queues downloads/uploads, handles conflicts. |
| **Audit Trail** | ✅ | Immutable audit log of every CRUD operation, AI call, SP sync, auth event, and user action — with searchable UI. |
| **Analytics Dashboard** | ✅ | Chart.js-powered dashboard with contract status distribution, AI usage metrics, SP sync health, and audit activity. |
| **Lawvu Bulk Import** | ✅ | Import contracts and files from Lawvu's native `.zip` bulk export (tab-delimited metadata + file binaries). |
| **Local Auth** | ✅ | bcrypt password hashing (cost 12), in-memory session tracking, no cloud identity dependency. |

---

## Screenshots

> **Note:** Screenshots are generated during CI. Placeholders below represent the main views:

| Dashboard | Contracts | AI Drafting | Templates |
|---|---|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Contracts](docs/screenshots/contracts.png) | ![AI Draft](docs/screenshots/ai-draft.png) | ![Templates](docs/screenshots/templates.png) |

*(Run `npx playwright test --update-snapshots` to generate real screenshots.)*

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Framework** | Electron + Electron Forge | v34 |
| **Frontend** | React + TypeScript + Tailwind CSS | React 18 |
| **Rich Text** | TipTap (ProseMirror) | latest |
| **Charts** | Chart.js + react-chartjs-2 | latest |
| **Build** | Vite (separate configs for main, preload, renderer) | v6 |
| **Database** | SQLite via better-sqlite3 | v12 |
| **AI Integration** | OpenAI / Anthropic fetch-based adapters with SSE streaming | — |
| **Document Export** | docxtemplater + jsPDF (DOCX + PDF) | latest |
| **SharePoint Automation** | Playwright | latest |
| **Testing** | Vitest (unit) + Playwright (e2e) | v4 |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Electron                               │
│  ┌───────────────── main process (Node.js) ─────────────────┐  │
│  │  SQLite DB (local)   Playwright (SP)   AI adapters      │  │
│  │  IPC handlers: auth, contracts, templates, SP, audit   │  │
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
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

All data stays local. AI calls are the only outbound traffic.

**See:** `docs/ARCHITECTURE.md` for detailed ADRs, database schema, and performance targets.

---

## Quick Start

### Prerequisites
- Node.js v22+
- npm or yarn
- Python 3 (for native modules like better-sqlite3)

### Installation
```bash
git clone https://github.com/cptunderpantsmoons/legalvu2.git
cd legalvu_v2
npm install
```

### Development
```bash
# Start the Electron dev server (Vite HMR + auto-reload)
ELECTRON_DISABLE_SANDBOX=1 npm run dev
```

### Testing
```bash
# Unit tests (Vitest, better-sqlite3 with :memory:)
npm test

# End-to-end tests (Playwright)
npx playwright test
```

### Production Build
```bash
# Package for current platform
npm run make

# Output: /out/make/[platform]/
```

---

## Project Structure

```
/a0/usr/projects/legalvu_v2/
├── src/main/               # Electron main process (Node.js)
│   ├── services/           # Domain services (auth, contract, SP, sync, etc.)
│   ├── database/           # Connection, migrations, mappers, schema.sql
│   ├── validation/         # Zod schemas for IPC input validation
│   ├── security/           # safeStorage wrapper, bcrypt hashing
│   └── models/             # TypeScript type definitions
├── src/preload/            # Context bridge exposing electronAPI
├── src/renderer/           # React SPA
│   ├── components/         # Dashboard, contracts, templates, settings, auth, layout
│   ├── stores/              # Zustand stores (auth, contract)
│   ├── hooks/               # useAuth, useAiStream
│   └── types/               # global.d.ts augmenting window.electronAPI
├── src/shared/              # IPC channels enum + shared domain types
├── tests/e2e/               # Playwright end-to-end tests
├── docs/
│   ├── API.md               # IPC channel reference
│   ├── SECURITY.md          # Security & data sovereignty guide
│   ├── ARCHITECTURE.md      # Architecture decision records
│   ├── specs/               # Requirements specifications
│   └── plans/               # Implementation and rectification plans
└── vitest.config.ts         # Unit test configuration
```

---

## API Reference

LegalVu uses Electron's IPC for all communication. No REST, no WebSocket, no remote backend.

**See:** `docs/API.md` for the full IPC channel reference, shared types, and extension guide.

---

## Security

- **Data stays local.** SQLite file in user home; no cloud database or telemetry.
- **Secrets encrypted** via Electron `safeStorage` (OS keychain).
- **Renderer sandboxed** with `contextIsolation: true`, `nodeIntegration: false`.
- **bcrypt** password hashing (cost 12).
- **Zod** input validation on all IPC channels.
- **Full audit trail** for every operation.

**See:** `docs/SECURITY.md` for the complete security model, threat matrix, production hardening checklist, and incident response guide.

---

## Contributing

Contributions are welcome. Please follow the existing code style and ensure all tests pass.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests and lint: `npm test && npm run lint`
4. Commit with a descriptive message
5. Open a Pull Request

**Before submitting:**
- [ ] All tests pass (`npm test`)
- [ ] Lint is clean (`npm run lint`)
- [ ] TypeScript typechecks (`npm run typecheck`)
- [ ] No `process.cwd()` used for DB paths (use `app.getPath('userData')`)
- [ ] No `--no-sandbox` in production code

---

## Roadmap

### Completed ✅
- Contract AI drafting with streaming
- Template library with 50+ legal templates
- SharePoint browser automation (upload, download, sync)
- Analytics dashboard
- Lawvu bulk importer
- Audit trail with full-search UI
- Local auth with bcrypt

### Planned 🚧
- [ ] First-launch onboarding wizard
- [ ] Full-text search (SQLite FTS5)
- [ ] Docx template drag-and-drop editor
- [ ] OAuth2 / Entra ID integration (when admin rights available)
- [ ] Mobile-responsive web companion
- [ ] Code signing for Windows/macOS installers

---

## License

[MIT](LICENSE)

---

## Support

For issues, refer to `docs/plans/rectification-plan.md` for known bugs and their resolution status.

For questions about the architecture or API, see:
- `docs/ARCHITECTURE.md`
- `docs/API.md`
- `docs/SECURITY.md`
