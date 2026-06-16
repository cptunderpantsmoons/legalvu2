import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { getConnection } from './connection';
import { migrate } from './migrations';

describe('Database migration', () => {
  const testDbPath = path.join(process.cwd(), 'data', 'test-database.db');

  it('applies schema and creates tables', () => {
    fs.mkdirSync(path.dirname(testDbPath), { recursive: true });
    getConnection(testDbPath);
    migrate(testDbPath);

    const db = getConnection(testDbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('users');
    expect(names).toContain('contracts');
    expect(names).toContain('documents');
    expect(names).toContain('templates');
    expect(names).toContain('sharepoint_connections');
    expect(names).toContain('audit_logs');
    expect(names).toContain('sync_queue');
  });
});
