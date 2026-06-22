# Orchestrator Autonomous Decisions — 2026-06-22

For PM-raised decisions D1–D7. Reasoning recorded so audit trail is complete.

## D1 — Data residency vs AI providers
**Decision:** User-configurable baseUrl already exists in Settings; default to current OpenAI/Anthropic US endpoints but add a clear warning in the UI when a non-AU baseUrl is configured. Do NOT add Azure/Bedrock routing (out of scope for this pass). Document deviation in docs/SECURITY.md.

**Why:** Spec mentions AU residency but the existing code already routes through user-configurable baseUrl. Provider routing is a roadmap item, not a rectification target. Adding Azure/Bedrock integration is multi-day work beyond rectification scope.

**How to apply:** T34 (security review) and docs/SECURITY.md should note the residency deviation. No code change to AI adapter.

## D2 — SQLCipher at-rest encryption
**Decision:** DEFER. Add to a future pass. Document in docs/SECURITY.md that OS-level disk encryption (LUKS/FileVault/BitLocker) is the current at-rest control. SQLCipher integration requires a better-sqlite3 fork and electron-rebuild changes — too risky for a rectification pass.

**Why:** better-sqlite3 doesn't support SQLCipher natively. Swapping drivers mid-rectification could break the 116 passing tests. Spec doesn't list SQLCipher as a hard requirement.

**How to apply:** T23 marked DEFERRED with reason. Roadmap item only.

## D3 — MFA on local login
**Decision:** DEFER. MFA is in README "Planned" list but NOT in spec success criteria. Requires new otplib dependency, new UI, new enrollment flow. Multi-day work beyond rectification scope.

**How to apply:** T24 marked DEFERRED. Document as roadmap only.

## D4 — License
**Decision:** MIT. Add LICENSE file with MIT text. Update package.json `license` field from "ISC" to "MIT". README already claims MIT.

**Why:** README already says MIT, the broader stack uses MIT-compatible deps. ISC vs MIT is functionally similar but consistency with README wins.

**How to apply:** T33 implements this.

## D5 — Default templates count
**Decision:** Ship 12 default templates covering the core contract types listed in the spec (NDA, MSA, Employment, DPA, plus 8 more covering common legal categories). Spec says "10+"; 12 satisfies "10+" without overreaching. Fix README contradiction (says both "10+" and "50+").

**How to apply:** T18 creates `src/main/data/default-templates.ts` exporting 12 templates.

## D6 — FTS5 scope
**Decision:** Implement FTS5 for contract title + content + counterparty fields only. Skip DOCX text extraction (mammoth) — out of scope for this pass.

**Why:** mammoth adds a dependency and parsing pipeline. Title/content search covers the 80% case. Full DOCX extraction is a roadmap item.

**How to apply:** T22 implements FTS5 on contracts table only.

## D7 — SharePoint browser handler auth
**Decision:** The 5 SP_BROWSER_* handlers (START/STOP/NAVIGATE/SCREENSHOT/STATUS) MUST require auth. Add `requireAuth` to each. If the SP-login flow needs pre-auth browser access, it should use a dedicated pre-auth channel explicitly allowlisted.

**Why:** Browser automation is powerful — screenshotting arbitrary URLs while authenticated is a data exfiltration risk. Better to require auth and explicitly allowlist exceptions than leave 5 handlers open.

**How to apply:** T1 audit will confirm the gap; new task T35 (or extend T1) will add `requireAuth` to all 5 SP_BROWSER_* handlers.

## Summary of deferrals
- T23 SQLCipher — DEFERRED
- T24 MFA — DEFERRED
- T26 Certificate pinning — DEFERRED (requires per-provider CA pinning config; complex)
- T27 Fuzz testing — DEFERRED (separate hardening pass)

## What's in scope for THIS pass
- T1–T22, T25, T28, T29–T34, plus new T35 (fix SP browser auth)
- That's ~24 tasks to complete with dev↔QA loops
