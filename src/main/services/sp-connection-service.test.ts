import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { getConnection } from '../database/connection';
import {
  saveConnection,
  getConnectionConfig,
  saveCookies,
  loadCookies,
  clearCookies,
  setLastError,
  setLastSync,
} from './sp-connection-service';
import type { Cookie } from 'playwright';

const mockCookies: Cookie[] = [
  { name: 'FedAuth', value: 'abc123', domain: '.sharepoint.com', path: '/', httpOnly: true, secure: true, sameSite: 'None', expires: -1 },
  { name: 'rtFa', value: 'xyz789', domain: '.sharepoint.com', path: '/', httpOnly: true, secure: true, sameSite: 'None', expires: -1 },
];

describe('sp-connection-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('saveConnection creates a new connection', () => {
    const conn = saveConnection('system', {
      siteUrl: 'https://tenant.sharepoint.com/sites/legal',
      libraryPath: '/sites/legal/Shared Documents',
      syncEnabled: true,
    });

    expect(conn.id).toBeTruthy();
    expect(conn.siteUrl).toBe('https://tenant.sharepoint.com/sites/legal');
    expect(conn.libraryPath).toBe('/sites/legal/Shared Documents');
    expect(conn.syncEnabled).toBe(true);
  });

  it('saveConnection updates existing connection for same user', () => {
    saveConnection('system', {
      siteUrl: 'https://old.sharepoint.com',
      libraryPath: '/old',
    });

    const updated = saveConnection('system', {
      siteUrl: 'https://new.sharepoint.com',
      libraryPath: '/new',
      syncEnabled: true,
    });

    expect(updated.siteUrl).toBe('https://new.sharepoint.com');
    expect(updated.libraryPath).toBe('/new');
    expect(updated.syncEnabled).toBe(true);

    const config = getConnectionConfig('system');
    expect(config?.siteUrl).toBe('https://new.sharepoint.com');
  });

  it('getConnectionConfig returns null for user without connection', () => {
    const config = getConnectionConfig('ghost-user');
    expect(config).toBeNull();
  });

  it('getConnectionConfig returns stored config with hasCookies=false initially', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    const config = getConnectionConfig('system');
    expect(config?.hasCookies).toBe(false);
  });

  it('saveCookies + loadCookies round-trip', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    saveCookies('system', mockCookies);

    const config = getConnectionConfig('system');
    expect(config?.hasCookies).toBe(true);

    const loaded = loadCookies('system');
    expect(loaded).not.toBeNull();
    expect(loaded!.length).toBe(2);
    expect(loaded![0].name).toBe('FedAuth');
    expect(loaded![0].value).toBe('abc123');
  });

  it('loadCookies returns null when no cookies stored', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    const loaded = loadCookies('system');
    expect(loaded).toBeNull();
  });

  it('clearCookies removes stored cookies', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    saveCookies('system', mockCookies);
    expect(getConnectionConfig('system')?.hasCookies).toBe(true);

    clearCookies('system');
    expect(getConnectionConfig('system')?.hasCookies).toBe(false);
    expect(loadCookies('system')).toBeNull();
  });

  it('setLastError stores error message', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    setLastError('system', 'Connection timeout');
    const config = getConnectionConfig('system');
    expect(config?.lastError).toBe('Connection timeout');
  });

  it('setLastError clears error with null', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    setLastError('system', 'Some error');
    setLastError('system', null);
    const config = getConnectionConfig('system');
    expect(config?.lastError).toBeUndefined();
  });

  it('setLastSync updates timestamp', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    const before = Date.now();
    setLastSync('system');
    const config = getConnectionConfig('system');
    expect(config?.lastSyncAt).toBeDefined();
    expect(config!.lastSyncAt!).toBeGreaterThanOrEqual(before);
  });

  it('cookies are encrypted in database (not plaintext)', () => {
    saveConnection('system', { siteUrl: 'https://sp.example.com', libraryPath: '/docs' });
    saveCookies('system', mockCookies);

    const db = getConnection();
    const row = db.prepare('SELECT sp_cookies_encrypted FROM sharepoint_connections WHERE user_id = ?').get('system') as { sp_cookies_encrypted: string };
    const stored = row.sp_cookies_encrypted;

    expect(stored).not.toContain('FedAuth');
    expect(stored).not.toContain('abc123');
  });
});
