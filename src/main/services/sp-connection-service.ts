import crypto from 'crypto';
import { getConnection } from '../database/connection';
import { encryptSecret, decryptSecret } from '../security/crypto';
import { log } from './audit-service';
import type { Cookie } from 'playwright';

export interface SpConnection {
  id: string;
  siteUrl: string;
  libraryPath: string;
  syncEnabled: boolean;
  lastError?: string;
  lastSyncAt?: number;
}

export interface StoredSpConnection extends SpConnection {
  hasCookies: boolean;
}

export function saveConnection(userId: string, config: { siteUrl: string; libraryPath: string; syncEnabled?: boolean }): SpConnection {
  const db = getConnection();
  const existing = db.prepare('SELECT id FROM sharepoint_connections WHERE user_id = ?').get(userId) as { id: string } | undefined;

  const id = existing?.id ?? crypto.randomUUID();
  const now = Date.now();

  if (existing) {
    db.prepare(
      `UPDATE sharepoint_connections SET site_url = ?, library_path = ?, sync_enabled = ?, updated_at = ? WHERE id = ?`,
    ).run(config.siteUrl, config.libraryPath, config.syncEnabled ? 1 : 0, now, id);
  } else {
    db.prepare(
      `INSERT INTO sharepoint_connections (id, user_id, site_url, library_path, sync_enabled, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, config.siteUrl, config.libraryPath, config.syncEnabled ? 1 : 0, now, now);
  }

  log({ userId, action: 'sp:saveConnection', entityType: 'sharepoint_connection', entityId: id });

  return {
    id,
    siteUrl: config.siteUrl,
    libraryPath: config.libraryPath,
    syncEnabled: config.syncEnabled ?? false,
  };
}

export function getConnectionConfig(userId: string): StoredSpConnection | null {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM sharepoint_connections WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    id: row.id as string,
    siteUrl: row.site_url as string,
    libraryPath: row.library_path as string,
    syncEnabled: Boolean(row.sync_enabled),
    lastError: (row.last_error as string) ?? undefined,
    lastSyncAt: (row.last_sync_at as number) ?? undefined,
    hasCookies: Boolean(row.sp_cookies_encrypted),
  };
}

export function saveCookies(userId: string, cookies: Cookie[]): void {
  const db = getConnection();
  const encrypted = encryptSecret(JSON.stringify(cookies));
  const now = Date.now();
  db.prepare(
    `UPDATE sharepoint_connections SET sp_cookies_encrypted = ?, updated_at = ? WHERE user_id = ?`,
  ).run(encrypted, now, userId);
  log({ userId, action: 'sp:saveCookies', entityType: 'sharepoint_connection', details: JSON.stringify({ count: cookies.length }) });
}

export function loadCookies(userId: string): Cookie[] | null {
  const db = getConnection();
  const row = db.prepare('SELECT sp_cookies_encrypted FROM sharepoint_connections WHERE user_id = ?').get(userId) as { sp_cookies_encrypted: string } | undefined;
  if (!row?.sp_cookies_encrypted) return null;
  try {
    return JSON.parse(decryptSecret(row.sp_cookies_encrypted)) as Cookie[];
  } catch {
    return null;
  }
}

export function clearCookies(userId: string): void {
  const db = getConnection();
  db.prepare('UPDATE sharepoint_connections SET sp_cookies_encrypted = NULL, updated_at = ? WHERE user_id = ?').run(Date.now(), userId);
}

export function setLastError(userId: string, error: string | null): void {
  const db = getConnection();
  db.prepare('UPDATE sharepoint_connections SET last_error = ?, updated_at = ? WHERE user_id = ?').run(error, Date.now(), userId);
}

export function setLastSync(userId: string): void {
  const db = getConnection();
  db.prepare('UPDATE sharepoint_connections SET last_sync_at = ?, updated_at = ? WHERE user_id = ?').run(Date.now(), Date.now(), userId);
}
