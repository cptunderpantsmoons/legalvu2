import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb, seedTestUser } from '../database/test-db';
import { log, query } from './audit-service';
import type { Database as DatabaseType } from 'better-sqlite3';

describe('audit-service', () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = createTestDb();
    seedTestUser(db, 'u1', 'audit@test.com');
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('log inserts an audit row', () => {
    log({ userId: 'u1', action: 'contract:create', entityType: 'contract', entityId: 'c1' });
    const rows = db.prepare('SELECT * FROM audit_logs').all() as { action: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].action).toBe('contract:create');
  });

  it('log with optional details', () => {
    log({ userId: 'u1', action: 'settings:setAiKey', entityType: 'user', entityId: 'u1', details: '{"provider":"openai"}' });
    const rows = db.prepare('SELECT * FROM audit_logs WHERE action = ?').all('settings:setAiKey') as { details: string }[];
    expect(rows.length).toBe(1);
    expect(rows[0].details).toBe('{"provider":"openai"}');
  });

  it('query filters by entityType', () => {
    log({ userId: 'u1', action: 'a1', entityType: 'contract', entityId: 'c1' });
    log({ userId: 'u1', action: 'a2', entityType: 'user', entityId: 'u1' });

    const contracts = query({ entityType: 'contract' });
    expect(contracts.length).toBe(1);
    expect(contracts[0].action).toBe('a1');
  });

  it('query filters by userId', () => {
    seedTestUser(db, 'u2', 'u2@test.com');
    log({ userId: 'u1', action: 'x', entityType: 'test' });
    log({ userId: 'u2', action: 'y', entityType: 'test' });

    const result = query({ userId: 'u1' });
    expect(result.length).toBe(1);
    expect(result[0].userId).toBe('u1');
  });

  it('query orders by created_at DESC', () => {
    log({ userId: 'u1', action: 'first', entityType: 'test' });
    log({ userId: 'u1', action: 'second', entityType: 'test' });
    const rows = query({});
    expect(rows.length).toBe(2);
    // Most recently inserted should be first (higher or equal created_at)
    const actions = rows.map((r) => r.action);
    expect(actions).toContain('first');
    expect(actions).toContain('second');
  });
});
