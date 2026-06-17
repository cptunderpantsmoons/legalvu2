# LegalVu v2 — AI-Powered Legal Workspace

[![CI](https://github.com/cptunderpantsmoons/legalvu2/actions/workflows/ci.yml/badge.svg)](https://github.com/cptunderpantsmoons/legalvu2/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-vitest-brightgreen)]()
[![Lint](https://img.shields.io/badge/lint-eslint-brightgreen)]()
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
| **Document Export** | marked + adm-zip (DOCX via OOXML zip assembly) + external skill scripts | latest |
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
legalvu2/
├── src/main/               # Electron main process (Node.js)
│   ├── ipc/                # Modular IPC handler modules (auth, contracts, templates, sp, audit, analytics, sync, import, export)
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
├── .github/workflows/       # CI (GitHub Actions)
├── .husky/                  # Pre-commit hooks (husky + lint-staged)
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

### Security Hardening

The following security improvements were applied as part of the PicoForge full upgrade (2026-06-17):

- **Auth guards on all IPC handlers** — every handler is wrapped with `requireAuth` middleware; unauthenticated requests are rejected with a typed `AuthError`.
- **Crypto fails hard** — `safeStorage` is now required; the insecure base64 fallback has been removed. If the OS keychain is unavailable, the app throws rather than storing secrets in plaintext.
- **Login rate limiting** — 5 failed attempts trigger a 15-minute lockout, mitigating brute-force attacks.
- **Prompt injection defenses** — AI analysis and summarization wrap user content in delimiter-based isolation and strip control characters.
- **HTTPS enforcement** — Zod schemas reject non-HTTPS URLs for AI `baseUrl` and SharePoint endpoints.
- **CSP hardened for production** — no dev URLs, no `unsafe-inline`; `base-uri`, `form-action`, and `frame-ancestors` directives added.
- **DevTools disabled in production** — `mainWindow.webContents.closeDevTools()` prevents inspection in shipped builds.
- **Session persistence** — encrypted `session.dat` file survives app restarts; deleted on logout.
- **SQLite backup** — database is backed up on startup for corruption recovery.
- **Path validation** — SharePoint file operations validate and sanitize paths to prevent directory traversal.
- **Max length validation** — all unbounded IPC string inputs are capped to prevent oversized payloads.

**See:** `docs/SECURITY.md` for the complete security model, threat matrix, production hardening checklist, and incident response guide.

---

## Contributing

Contributions are welcome. Please follow the existing code style and ensure all tests pass.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests and lint: `npm test && npm run lint`
4. Commit with a descriptive message
5. Open a Pull Request

### Pre-commit Hooks

This project uses [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/lint-staged/lint-staged) to enforce code quality before commits:

- **ESLint** — auto-fixes linting issues on staged files
- **Prettier** — formats staged files

Hooks are installed automatically on `npm install` (via the `prepare` script). To manually set up hooks after cloning:

```bash
npm run prepare
```

### Continuous Integration

CI runs on GitHub Actions (`.github/workflows/ci.yml`) on every push and pull request to `main`/`master`:

- **Lint** — `npm run lint` (ESLint, `--max-warnings 0`)
- **Typecheck** — `npm run typecheck` (tsc `--noEmit`)
- **Tests** — `npm test -- --coverage` (Vitest with coverage reporting)
- **E2E** — `xvfb-run npx playwright test` (Playwright end-to-end tests)

Coverage reports are uploaded as build artifacts.

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
- IPC auth guards on all handlers (requireAuth pattern)
- Login rate limiting (5 attempts, 15-min lockout)
- Crypto hard-fail (no base64 fallback)
- Prompt injection defenses for AI analysis/summarization
- HTTPS enforcement for AI baseUrl and SharePoint URLs
- CSP hardened for production (base-uri, form-action, frame-ancestors)
- DevTools disabled in production
- Session persistence via encrypted session.dat
- SQLite backup mechanism
- Path validation for SharePoint operations
- Max length validation on all IPC inputs
- Monolithic index.ts extracted into 9 modular IPC handler modules
- Typed error hierarchy (AppError, ValidationError, NotFoundError, AuthError, ExternalServiceError)
- Versioned database migrations (schema_version table)
- Pagination on listContracts() and audit query()
- Sync queue: stale 'processing' recovery + max retry (5) with exponential backoff
- GitHub Actions CI (lint, typecheck, test, coverage, e2e)
- Pre-commit hooks (husky + lint-staged)
- Code signing configuration in forge.config.ts
- Dependabot + CODEOWNERS

### Planned 🚧
- [ ] Remove `--no-sandbox` from Playwright in production builds
- [ ] Remove `ELECTRON_DISABLE_SANDBOX=1` from production environment
- [ ] First-launch onboarding wizard
- [ ] Full-text search (SQLite FTS5)
- [ ] Docx template drag-and-drop editor
- [ ] OAuth2 / Entra ID integration (when admin rights available)
- [ ] Mobile-responsive web companion
- [ ] MFA / multi-factor authentication on local login
- [ ] Password reset workflow (requires SMTP or local admin tool)
- [ ] AI provider data-residency routing (Azure OpenAI AU East / AWS Bedrock ap-southeast-2)
- [ ] SQLite database encryption (SQLCipher) for at-rest protection beyond OS disk encryption
- [ ] Automated dependency vulnerability scanning in CI (npm audit gate)
- [ ] Certificate pinning for AI API calls
- [ ] Increase test coverage above 60% threshold
- [ ] Fuzz testing for IPC handlers

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
