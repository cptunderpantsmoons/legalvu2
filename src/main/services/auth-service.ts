import crypto from 'crypto';
import { getConnection } from '../database/connection';
import { hashPassword, verifyPassword } from '../security/password';
import { encryptSecret, decryptSecret } from '../security/crypto';
import { rowToUser } from '../database/mappers';
import { log } from './audit-service';
import type { User } from '../../shared/types';

let _currentUserId: string | null = null;

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

export function register(email: string, password: string, fullName: string): SafeUser {
  const db = getConnection();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  const hash = hashPassword(password);

  db.prepare(
    `INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email, fullName, 'legal', hash, now);

  log({ userId: id, action: 'auth:register', entityType: 'user', entityId: id });

  _currentUserId = id;
  return toSafeUser(getCurrentUserInternal()!);
}

export function login(email: string, password: string): SafeUser {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error('Invalid email or password');
  }

  const hash = row.password_hash as string;
  if (!hash || !verifyPassword(password, hash)) {
    throw new Error('Invalid email or password');
  }

  const user = rowToUser(row);
  _currentUserId = user.id;

  log({ userId: user.id, action: 'auth:login', entityType: 'user', entityId: user.id });

  return toSafeUser(user);
}

export function logout(): void {
  if (_currentUserId) {
    log({ userId: _currentUserId, action: 'auth:logout', entityType: 'user', entityId: _currentUserId });
  }
  _currentUserId = null;
}

function getCurrentUserInternal(): User | null {
  if (!_currentUserId) return null;
  const db = getConnection();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(_currentUserId) as Record<string, unknown> | undefined;
  return row ? rowToUser(row) : null;
}

export function getCurrentUser(): SafeUser | null {
  const user = getCurrentUserInternal();
  return user ? toSafeUser(user) : null;
}

export function getCurrentUserId(): string {
  if (!_currentUserId) {
    return 'system';
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
  db.prepare('UPDATE users SET ai_api_key_encrypted = ? WHERE id = ?').run(encrypted, userId);
}

export function setAiConfig(userId: string, config: { provider: string; model: string; baseUrl?: string }): void {
  const db = getConnection();
  db.prepare(
    `INSERT INTO settings (user_id, key, value) VALUES (?, 'ai_config', ?)
     ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value`,
  ).run(userId, JSON.stringify(config));
}

export function getAiConfig(userId: string): { provider: string; model: string; baseUrl?: string } | null {
  const db = getConnection();
  const row = db.prepare(`SELECT value FROM settings WHERE user_id = ? AND key = 'ai_config'`).get(userId) as
    | { value: string }
    | undefined;
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
