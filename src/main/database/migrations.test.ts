import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb, seedTestUser } from './test-db';
import { migrate } from './migrations';
import type { Database as DatabaseType } from 'better-sqlite3';

describe('migrations', () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('creates all 7 tables', () => {
    migrate(db);
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('contracts');
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('templates');
    expect(tableNames).toContain('sharepoint_connections');
    expect(tableNames).toContain('audit_logs');
    expect(tableNames).toContain('sync_queue');
    expect(tableNames.length).toBeGreaterThanOrEqual(7);
  });

  it('sync_queue table creates without syntax error', () => {
    migrate(db);
    const result = db.prepare(`SELECT COUNT(*) as count FROM sync_queue`).get() as { count: number };
    expect(result.count).toBe(0);
  });

  it('contracts table has ai_tokens_used column', () => {
    migrate(db);
    const cols = db.pragma('table_info(contracts)') as { name: string }[];
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain('ai_tokens_used');
  });

  it('seeds bootstrap user during migrate', () => {
    migrate(db);
    const user = db.prepare(`SELECT * FROM users WHERE id = 'system'`).get() as { email: string };
    expect(user.email).toBe('system@local');
  });

  it('foreign keys are enabled', () => {
    migrate(db);
    const fkEnabled = db.pragma('foreign_keys', { simple: true }) as number;
    expect(fkEnabled).toBe(1);
  });

  it('can insert contract referencing seeded user', () => {
    seedTestUser(db, 'testuser', 'test@test.com');
    const now = Date.now();
    db.prepare(
      `INSERT INTO contracts (id, title, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('c1', 'Test Contract', 'draft', 'testuser', now, now);

    const contract = db.prepare(`SELECT * FROM contracts WHERE id = 'c1'`).get() as { title: string };
    expect(contract.title).toBe('Test Contract');
  });

  it('rejects contract with non-existent user (FK enforced)', () => {
    expect(() => {
      const now = Date.now();
      db.prepare(
        `INSERT INTO contracts (id, title, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run('c2', 'Bad Contract', 'draft', 'nonexistent-user', now, now);
    }).toThrow();
  });
});
