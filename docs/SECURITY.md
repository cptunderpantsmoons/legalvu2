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
- In-memory session tracking in the main process only.
- Session expires on app quit (no persistent session tokens).
- Logout clears all in-memory state; next launch requires re-authentication.

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
- ❌ No account lockout after failed attempts ( mitigate via OS-level defenses).

---

## Secrets Management

### What is Protected
- AI API keys (OpenAI, Anthropic)
- SharePoint session cookies

### How
- **Storage:** Electron `safeStorage` encrypts via the OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret).
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

### Input Validation
- **Zod** schemas validate every IPC payload before processing.
- Unknown/invalid payloads return `{ error: 'Validation failed' }`.

### API Surface Minimization
- Only whitelisted methods are exposed via `contextBridge`:
  `ping`, `auth.register`, `auth.login`, `auth.logout`, `auth.getUser`, `contract.create`, `contract.generate`, `contract.export`, `template.list`, `template.create`, `sp.login`, `sp.download`, `sp.upload`, `audit.log`, `analytics.dashboard`, `lawvu.import`

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
| 2 | Verify `safeStorage.isEncryptionAvailable()` returns `true` on all target machines | ⬜ |
| 3 | Ensure OS-level full-disk encryption is active | ⬜ |
| 4 | Remove `ELECTRON_DISABLE_SANDBOX=1` from production builds | ⬜ |
| 5 | Restrict `userData` directory permissions to the user only (`chmod 700`) | ⬜ |
| 6 | Audit log: verify no PII in `details` JSON field | ⬜ |
| 7 | Verify AI provider endpoint (prefer Azure AU East or self-hosted) | ⬜ |
| 8 | Create a backup policy for SQLite + documents folder | ⬜ |
| 9 | Run `npm audit --production` and fix high/critical vulnerabilities | ⬜ |
| 10 | Sign the Electron executable (codesign) | ⬜ |
| 11 | Disable DevTools in production (`mainWindow.webContents.closeDevTools()`) | ⬜ |
| 12 | Review `.gitignore` to ensure no secrets are committed | ✅ |

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
- `src/main/security/crypto.ts` — safeStorage wrapper
- `src/main/security/password.ts` — bcrypt utilities
- `src/main/validation/schemas.ts` — Zod input schemas
- `src/main/database/schema.sql` — Database DDL
- `src/shared/ipc-channels.ts` — IPC channel definitions
