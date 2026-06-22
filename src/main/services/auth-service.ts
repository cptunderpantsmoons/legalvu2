import crypto from "crypto";
import path from "path";
import fs from "fs";
import { getConnection } from "../database/connection";
import { hashPassword, verifyPassword } from "../security/password";
import { encryptSecret, decryptSecret } from "../security/crypto";
import { rowToUser } from "../database/mappers";
import { log } from "./audit-service";
import { getDefaultAppPaths } from "../infra/app-paths";
import { AuthError } from "../errors";
import type { User } from "../../shared/types";

let _currentUserId: string | null = null;

// --- Session persistence ---
// The session file stores the encrypted user ID so the user stays logged in
// across app restarts. It is stored in the Electron userData directory.

const SESSION_FILENAME = "session.dat";

function resolveSessionPath(): string {
  return path.join(getDefaultAppPaths().getUserDataDir(), SESSION_FILENAME);
}

/**
 * Persist the current user's ID to an encrypted file so the session
 * survives app restarts.
 */
export function persistSession(userId: string): void {
  try {
    const sessionPath = resolveSessionPath();
    const encrypted = encryptSecret(userId);
    fs.writeFileSync(sessionPath, encrypted, "utf-8");
    console.log("[Auth] Session persisted");
  } catch (err) {
    // Don't throw — session persistence is a convenience, not critical
    console.warn("[Auth] Failed to persist session:", (err as Error).message);
  }
}

/**
 * Restore a previously persisted session by reading and decrypting the
 * session file. If the file doesn't exist or decryption fails, returns null.
 *
 * @returns The restored user ID, or null if no valid session was found.
 */
export function restoreSession(): string | null {
  try {
    const sessionPath = resolveSessionPath();
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    const encrypted = fs.readFileSync(sessionPath, "utf-8");
    const userId = decryptSecret(encrypted);

    // Validate that the user still exists in the database
    const db = getConnection();
    const row = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!row) {
      // User no longer exists — clean up stale session file
      deleteSessionFile();
      return null;
    }

    _currentUserId = userId;
    console.log("[Auth] Session restored for user:", userId);
    return userId;
  } catch (err) {
    console.warn("[Auth] Failed to restore session:", (err as Error).message);
    return null;
  }
}

/**
 * Delete the session file (called on logout).
 */
function deleteSessionFile(): void {
  try {
    const sessionPath = resolveSessionPath();
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log("[Auth] Session file deleted");
    }
  } catch (err) {
    console.warn(
      "[Auth] Failed to delete session file:",
      (err as Error).message,
    );
  }
}

// --- Login rate limiting ---
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

interface FailedAttempt {
  count: number;
  lockedUntil: number | null;
}

const failedAttempts: Map<string, FailedAttempt> = new Map();

function getFailedAttempt(email: string): FailedAttempt {
  let entry = failedAttempts.get(email);
  if (!entry) {
    entry = { count: 0, lockedUntil: null };
    failedAttempts.set(email, entry);
  }
  return entry;
}

function isAccountLocked(email: string): boolean {
  const attempt = failedAttempts.get(email);
  if (!attempt || !attempt.lockedUntil) return false;
  if (Date.now() >= attempt.lockedUntil) {
    // Lock expired — reset
    attempt.count = 0;
    attempt.lockedUntil = null;
    return false;
  }
  return true;
}

function recordFailedAttempt(email: string): void {
  const attempt = getFailedAttempt(email);
  attempt.count += 1;
  if (attempt.count >= MAX_FAILED_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email);
}

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: number;
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function register(
  email: string,
  password: string,
  fullName: string,
): SafeUser {
  const db = getConnection();

  const existing = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(email);
  if (existing) {
    throw new AuthError("Email already registered");
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const hash = hashPassword(password);

  db.prepare(
    `INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email, fullName, "legal", hash, now);

  log({
    userId: id,
    action: "auth:register",
    entityType: "user",
    entityId: id,
  });

  _currentUserId = id;
  persistSession(id);
  return toSafeUser(getCurrentUserInternal()!);
}

export function login(email: string, password: string): SafeUser {
  const db = getConnection();

  // Check rate limiting
  if (isAccountLocked(email)) {
    const attempt = failedAttempts.get(email)!;
    const remainingMs = (attempt.lockedUntil ?? 0) - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw new AuthError(
      `Account locked due to too many failed attempts. Try again in ${remainingMin} minute(s).`,
    );
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | Record<string, unknown>
    | undefined;

  if (!row) {
    recordFailedAttempt(email);
    throw new AuthError("Invalid email or password");
  }

  const hash = row.password_hash as string;
  if (!hash || !verifyPassword(password, hash)) {
    recordFailedAttempt(email);
    log({
      userId: row.id as string,
      action: "auth:login_failed",
      entityType: "user",
      entityId: row.id as string,
      details: JSON.stringify({ reason: "invalid_password" }),
    });
    throw new AuthError("Invalid email or password");
  }

  // Successful login — clear failed attempts
  clearFailedAttempts(email);

  const user = rowToUser(row);
  _currentUserId = user.id;

  // Persist session for auto-login on next startup
  persistSession(user.id);

  log({
    userId: user.id,
    action: "auth:login",
    entityType: "user",
    entityId: user.id,
  });

  return toSafeUser(user);
}

export function logout(): void {
  if (_currentUserId) {
    log({
      userId: _currentUserId,
      action: "auth:logout",
      entityType: "user",
      entityId: _currentUserId,
    });
  }
  _currentUserId = null;
  deleteSessionFile();
}

function getCurrentUserInternal(): User | null {
  if (!_currentUserId) return null;
  const db = getConnection();
  const row = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(_currentUserId) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function getCurrentUser(): SafeUser | null {
  const user = getCurrentUserInternal();
  return user ? toSafeUser(user) : null;
}

export function getCurrentUserId(): string | null {
  return _currentUserId;
}

export function requireAuth(): string {
  if (!_currentUserId) {
    throw new AuthError("Authentication required. Please log in.");
  }
  return _currentUserId;
}

export function getDecryptedApiKey(): string | null {
  const user = getCurrentUserInternal();
  if (!user || !user.aiApiKeyEncrypted) return null;
  return decryptSecret(user.aiApiKeyEncrypted);
}

export function setEncryptedApiKey(userId: string, plaintextKey: string): void {
  const db = getConnection();
  const encrypted = encryptSecret(plaintextKey);
  db.prepare("UPDATE users SET ai_api_key_encrypted = ? WHERE id = ?").run(
    encrypted,
    userId,
  );
}

export function setAiConfig(
  userId: string,
  config: { provider: string; model: string; baseUrl?: string },
): void {
  const db = getConnection();
  db.prepare(
    `INSERT INTO settings (user_id, key, value) VALUES (?, 'ai_config', ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
  ).run(userId, JSON.stringify(config));
}

export function getAiConfig(
  userId: string,
): { provider: string; model: string; baseUrl?: string } | null {
  const db = getConnection();
  const row = db
    .prepare(
      `SELECT value FROM settings WHERE user_id = ? AND key = 'ai_config'`,
    )
    .get(userId) as { value: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export function hasApiKey(): boolean {
  const user = getCurrentUserInternal();
  return Boolean(user?.aiApiKeyEncrypted);
}
