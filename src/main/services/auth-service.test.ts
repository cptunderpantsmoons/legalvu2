import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import * as authService from './auth-service';
import type { Database as DatabaseType } from 'better-sqlite3';

describe('auth-service', () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = createTestDb();
    migrate(db);
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('register creates a new user and sets current session', () => {
    const user = authService.register('new@test.com', 'password123', 'New User');
    expect(user.email).toBe('new@test.com');
    expect(user.id).toBeTruthy();

    const current = authService.getCurrentUser();
    expect(current?.id).toBe(user.id);
  });

  it('register rejects duplicate email', () => {
    authService.register('dup@test.com', 'password123', 'First');
    expect(() => authService.register('dup@test.com', 'other456', 'Second')).toThrow('already registered');
  });

  it('login succeeds with correct password', () => {
    authService.register('login@test.com', 'correctPass', 'Login User');
    authService.logout();

    const user = authService.login('login@test.com', 'correctPass');
    expect(user.email).toBe('login@test.com');
  });

  it('login fails with wrong password', () => {
    authService.register('wrong@test.com', 'rightPassword', 'User');
    authService.logout();

    expect(() => authService.login('wrong@test.com', 'wrongPassword')).toThrow('Invalid');
  });

  it('login fails for non-existent user', () => {
    expect(() => authService.login('ghost@test.com', 'pass')).toThrow('Invalid');
  });

  it('logout clears current session', () => {
    authService.register('logout@test.com', 'pass123', 'L User');
    expect(authService.getCurrentUser()).not.toBeNull();
    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });

  it('passwordHash is never returned in the user object via getCurrentUser', () => {
    authService.register('safe@test.com', 'pass123', 'Safe');
    const user = authService.getCurrentUser();
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('setEncryptedApiKey/getDecryptedApiKey round-trip', () => {
    const user = authService.register('key@test.com', 'pass123', 'Key User');
    authService.setEncryptedApiKey(user.id, 'sk-secret-key');
    const decrypted = authService.getDecryptedApiKey();
    expect(decrypted).toBe('sk-secret-key');
  });

  it('getDecryptedApiKey returns null when no key set', () => {
    authService.register('nokey@test.com', 'pass123', 'No Key');
    const result = authService.getDecryptedApiKey();
    expect(result).toBeNull();
  });

  it('setAiConfig/getAiConfig round-trip', () => {
    const user = authService.register('cfg@test.com', 'pass123', 'Cfg User');
    authService.setAiConfig(user.id, { provider: 'anthropic', model: 'claude-3-sonnet', baseUrl: 'https://custom.api.com' });
    const config = authService.getAiConfig(user.id);
    expect(config?.provider).toBe('anthropic');
    expect(config?.model).toBe('claude-3-sonnet');
    expect(config?.baseUrl).toBe('https://custom.api.com');
  });
});
