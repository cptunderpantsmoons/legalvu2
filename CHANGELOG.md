# Changelog

## [Unreleased] — 2026-06-17: Full Security & Architecture Upgrade

### Security
- Removed insecure base64 fallback in crypto.ts — safeStorage now required
- Added authentication guards on all IPC handlers (requireAuth pattern)
- Changed bootstrap user role from 'admin' to 'system'
- Added login rate limiting (5 attempts, 15-min lockout)
- Added prompt injection defenses for AI analysis/summarization
- Enforced HTTPS for AI baseUrl and all SharePoint URLs in Zod schemas
- Added max length validation on all unbounded IPC input schemas
- Hardened CSP for production (removed dev URLs, unsafe-inline; added base-uri, form-action, frame-ancestors)
- Disabled DevTools in production builds
- Added path validation for SharePoint file operations
- Added session persistence via encrypted session file

### Bug Fixes
- Fixed wrapError for async functions (was causing unhandled promise rejections)
- Fixed streaming double API call — streamed content now persisted directly
- Fixed sync conflict detection (now compares local mtime vs SP modified timestamp)
- Fixed download queue processing (targets specific files instead of re-downloading everything)
- Fixed document-service.ts exportDir variable bug

### Architecture
- Extracted monolithic index.ts (600+ lines) into 9 IPC handler modules
- Added IPC middleware pattern with unified response format
- Added typed error hierarchy (AppError, ValidationError, NotFoundError, AuthError, ExternalServiceError)
- Abstracted Electron dependency via AppPaths interface
- Moved audit logging to service layer
- Unified Template interface across modules
- Extracted SSE parsing utility from AI adapters
- Added runtime validation in database mappers
- Implemented versioned database migrations (schema_version table)
- Added SQLite backup mechanism
- Added pagination to listContracts() and audit query()
- Added stale 'processing' recovery on startup for sync queue
- Added max retry limit (5) with exponential backoff to sync queue
- Added updated_at index on contracts table

### DevOps
- Added GitHub Actions CI workflow (lint, typecheck, test, coverage, e2e)
- Enabled coverage reporting with 60% threshold
- Added pre-commit hooks (husky + lint-staged)
- Added CODEOWNERS file
- Added Dependabot config
- Added code signing configuration in forge.config.ts

### Tests
- Added IPC auth guard tests
- Added streaming single API call verification tests
- Added crypto security tests (throw on unavailable safeStorage)