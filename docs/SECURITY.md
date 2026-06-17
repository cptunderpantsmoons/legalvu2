# LegalVu v2 — Security & Data Sovereignty Guide

## Overview

LegalVu is designed for legal teams where data residency, client confidentiality, and compliance are non-negotiable. This document details the security architecture, production hardening requirements, and compliance considerations for deploying LegalVu in an enterprise environment.

---

## Security Architecture

### Threat Model (STRIDE)

| Threat | Mitigation |
|---|---|
| **Spoofing** | bcrypt password hashing (cost 12); no plaintext credentials stored |
| **Tampering** | SHA256 file hashes; immutable audit logs; SQLite file permissions |
| **Repudiation** | Every DB mutation + auth + AI call + SP sync is logged with user, timestamp, action |
| **Information Disclosure** | `safeStorage` (OS keychain) for AI keys; renderer sandbox; no cloud DB |
| **Denial of Service** | No public-facing server; local-only; max request surface = the desktop itself |
| **Elevation of Privilege** | `sandbox: true`, `nodeIntegration: false`, `contextIsolation: true` |

---

## Data Residency & Privacy

### Local-First Policy
- **All data resides locally** in an SQLite file within the user's home directory.
- **No cloud database**, no telemetry, no third-party analytics.
- **AI calls** to OpenAI/Anthropic are the **only** outbound network traffic.

### AI Data Privacy
- API calls include contract prompts; no training data or PII is intentionally transmitted.
- Using **Azure OpenAI Australia East** (if available) ensures data residency within Australian jurisdiction.
- For highest confidentiality, a self-hosted LLM endpoint can be configured by updating `AIAdapter` base URL.

### Compliance
LegalVu satisfies the following by architecture:
- ✅ **Data sovereignty** — All client data stays on local machines.
- ✅ **Right to erasure** — Deleting the SQLite file and local documents removes all data.
- ✅ **Audit trail** — Immutable logs for every CRUD operation.
- ⚠️ **GDPR** — AI calls to US providers may violate data transfer rules; mitigate with Azure OpenAI EU/AU endpoints.
- ⚠️ **Encryption in transit** — HTTPS for AI API calls is standard; verify certificate pinning if required.

---

## Authentication & Authorization

### User Model
- Local username/password system (no SSO dependency).
- bcrypt cost factor: **12** (recommended minimum for 2025–2026).
- Passwords are **never** transmitted or stored on the renderer side.

### Session Management
- Session tracking in the main process with persistence via an encrypted `session.dat` file.
- Session survives app restarts (encrypted with `safeStorage`); expires on explicit logout.
- Logout clears all session state and deletes the session file; next launch requires re-authentication.
- DevTools disabled in production builds (`mainWindow.webContents.closeDevTools()`).

### Password Security
```typescript
// Implementation (not exposed to renderer)
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 12;
const hash = await bcrypt.hash(password, SALT_ROUNDS);
```

### Limitations
- ❌ No MFA (multi-factor authentication) on local login.
- ❌ No password reset via email (requires manual admin intervention).
- ✅ Account lockout after 5 failed login attempts (15-minute lockout period).

---

## Secrets Management

### What is Protected
- AI API keys (OpenAI, Anthropic)
- SharePoint session cookies

### How
- **Storage:** Electron `safeStorage` encrypts via the OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret).
- **Fail-hard policy:** If `safeStorage.isEncryptionAvailable()` returns `false`, the crypto module **throws an error** — there is no base64 fallback. The application will not store or retrieve secrets in plaintext under any circumstance.
- **Scope:** Keys are encrypted in the main process and NEVER exposed to the renderer or logs.
- **Lifecycle:** Key is sent once from Settings → main process via IPC. Main encrypts immediately and stores. Decryption only happens for AI API calls.

### Production Verification
```bash
# Verify safeStorage availability
npx electron -e "console.log(require('electron').safeStorage.isEncryptionAvailable())"
# Should print: true
```

If `false` on Linux, install `libsecret-1-0` and `gnome-keyring`.

---

## IPC Security

### Renderer Isolation
```typescript
// src/main/index.ts — window creation
mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    preload: path.join(__dirname, '../preload/index.js'),
  },
});
```

### Authentication Guards (requireAuth)
All IPC handlers are wrapped with a `requireAuth` middleware that verifies the caller's session before processing. Unauthenticated requests are rejected with a typed `AuthError`.

```typescript
// Pattern used across all IPC handler modules
ipcMain.handle(IPC_CHANNELS.SOME_ACTION, requireAuth(async (event, payload) => {
  const parsed = Schema.parse(payload);
  // ... handler logic
}));
```

Handlers that do not require auth (e.g., `auth:login`, `auth:register`) are explicitly excluded.

### Input Validation
- **Zod** schemas validate every IPC payload before processing.
- **Max length validation** is enforced on all unbounded string inputs (titles, descriptions, counterparty names, etc.) to prevent oversized payloads and potential DoS.
- Unknown/invalid payloads return a typed `ValidationError` with details.
- **HTTPS enforcement:** Zod schemas for AI `baseUrl` and SharePoint URLs reject non-HTTPS URLs. This prevents accidental plaintext transmission of credentials or contract data.

### Content Security Policy (CSP)
Production builds enforce a strict CSP:
- `default-src 'self'` — no remote resources
- `script-src 'self'` — no inline scripts, no dev-server URLs
- `style-src 'self' 'unsafe-inline'` is NOT used in production (styles are bundled)
- `base-uri 'self'` — prevents base tag injection
- `form-action 'self'` — prevents form submission to external origins
- `frame-ancestors 'none'` — prevents embedding
- Dev-server URLs (`http://localhost:*`) are only allowed in development mode

### DevTools
- DevTools are **disabled in production builds** via `mainWindow.webContents.closeDevTools()`.
- In development, DevTools remain available for debugging.

### Path Validation (SharePoint)
All SharePoint file operations validate paths to prevent directory traversal:
- Download/upload paths are sanitized and checked against allowed base directories.
- Path traversal sequences (`..`, absolute paths) are rejected.

### API Surface Minimization
- Only whitelisted methods are exposed via `contextBridge`:
  `ping`, `auth.register`, `auth.login`, `auth.logout`, `auth.getUser`, `contract.create`, `contract.generate`, `contract.export`, `template.list`, `template.create`, `sp.login`, `sp.download`, `sp.upload`, `audit.log`, `analytics.dashboard`, `lawvu.import`

---

## Prompt Injection Defenses

AI analysis and summarization operations include defenses against prompt injection attacks:

- **Delimiter-based isolation:** User-supplied contract content is wrapped in explicit delimiters (e.g., `<contract_content>...</contract_content>`) to separate it from system instructions.
- **System prompt primacy:** The system prompt always establishes the AI's role and explicitly instructs it to treat content within delimiters as data, not instructions.
- **Input sanitization:** Control characters are stripped from inputs before sending to the AI provider; input lengths are capped to reduce injection surface.

---

## Session Persistence

Sessions are persisted across app restarts via an encrypted `session.dat` file:

- The session file is encrypted using `safeStorage` — it cannot be read without the OS keychain.
- On app launch, the main process attempts to read and decrypt `session.dat`; if valid, the user is restored to their authenticated state.
- On logout, the session file is deleted.
- If the session file is corrupted or decryption fails, the app falls back to requiring re-authentication.

---

## SQLite Backup

A database backup mechanism runs on app startup:

- The SQLite database is copied to a backup file (e.g., `database.db.bak`) in the `userData` directory.
- This provides a recovery point in case of database corruption.
- The backup is atomic (SQLite's backup API or file copy with `VACUUM INTO`).

---

## Encryption

### At Rest
- **Database:** SQLite file is NOT encrypted by default. Rely on **OS-level full-disk encryption** (BitLocker, FileVault, LUKS).
- **Files:** Contract documents stored as plain DOCX/PDF. Encrypt via OS disk encryption or organizational policy.

### In Transit
- **AI API calls:** HTTPS (TLS 1.2+)
- **SharePoint browser automation:** Cookies are stored encrypted; browser uses HTTPS for SP sessions

### SafeStorage
```typescript
// Encryption flow
const encrypted = safeStorage.encryptString(rawApiKey);
// Store encrypted Blob in SQLite or OS keychain
const decrypted = safeStorage.decryptString(encryptedBlob);
```

---

## Production Hardening Checklist

Before deploying LegalVu to legal staff:

| # | Check | Status |
|---|-------|--------|
| 1 | Remove `--no-sandbox` from Playwright production builds | ⬜ |
| 2 | Verify `safeStorage.isEncryptionAvailable()` returns `true` on all target machines | ✅ (crypto fails hard if unavailable) |
| 3 | Ensure OS-level full-disk encryption is active | ⬜ |
| 4 | Remove `ELECTRON_DISABLE_SANDBOX=1` from production builds | ⬜ |
| 5 | Restrict `userData` directory permissions to the user only (`chmod 700`) | ⬜ |
| 6 | Audit log: verify no PII in `details` JSON field | ✅ |
| 7 | Verify AI provider endpoint (prefer Azure AU East or self-hosted) | ⬜ |
| 8 | Create a backup policy for SQLite + documents folder | ✅ (SQLite backup on startup) |
| 9 | Run `npm audit --production` and fix high/critical vulnerabilities | ⬜ |
| 10 | Sign the Electron executable (codesign) | ✅ (forge.config.ts configured) |
| 11 | Disable DevTools in production (`mainWindow.webContents.closeDevTools()`) | ✅ |
| 12 | Review `.gitignore` to ensure no secrets are committed | ✅ |
| 13 | Auth guards on all IPC handlers | ✅ |
| 14 | Login rate limiting (5 attempts, 15-min lockout) | ✅ |
| 15 | CSP hardened for production (no unsafe-inline, base-uri, form-action) | ✅ |
| 16 | HTTPS enforcement for AI baseUrl and SharePoint URLs | ✅ |
| 17 | Max length validation on all IPC inputs | ✅ |
| 18 | Path validation for SharePoint operations | ✅ |
| 19 | Prompt injection defenses (delimiters in analysis/summarization) | ✅ |
| 20 | Session persistence via encrypted session.dat | ✅ |

---

## Incident Response

If a user reports a security incident (e.g., data exposure, unauthorized access):

1. **Isolate:** Ask the user to close the app immediately.
2. **Inspect:** Check `audit_logs` for unauthorized actions (query: `SELECT * FROM audit_logs WHERE ...`).
3. **Preserve:** Copy the SQLite DB and document folder before any changes.
4. **Remediate:** If AI key compromised, regenerate via provider console and re-enter in Settings.
5. **Report:** Document incident in organizational security register.

---

## Penetration Testing Recommendations

Before production, perform:
- ✅ Static analysis: `npm audit --production`
- ✅ Secret scanning: `git rev-list --all --objects | grep -i password`
- ✅ IPC fuzzing: Send malformed payloads to main process handlers
- ✅ File permissions audit: Verify `userData` is not world-readable
- ⚠️ Network traffic analysis: Monitor AI API calls for PII leakage

---

## Glossary

- **IPC:** Inter-Process Communication between renderer and main processes.
- **safeStorage:** Electron built-in module for OS-level secret encryption.
- **SHA256:** Cryptographic hash function used for document integrity verification.
- **WAL:** Write-Ahead Logging (SQLite performance + concurrency mode).

---

## References
- `src/main/security/crypto.ts` — safeStorage wrapper (fails hard if unavailable)
- `src/main/security/password.ts` — bcrypt utilities
- `src/main/validation/schemas.ts` — Zod input schemas with max-length validation and HTTPS enforcement
- `src/main/database/schema.sql` — Database DDL
- `src/main/database/migrations.ts` — Versioned migration runner
- `src/main/ipc/` — Modular IPC handlers with requireAuth guards
- `src/shared/ipc-channels.ts` — IPC channel definitions
- `src/shared/types.ts` — Shared domain types and error hierarchy
