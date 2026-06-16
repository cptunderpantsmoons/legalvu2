import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { setDatabaseForTesting, closeConnection } from './connection';
import schemaSql from './schema.sql?raw';

export function createTestDb(): DatabaseType {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(schemaSql);
  setDatabaseForTesting(db);
  return db;
}

export function teardownTestDb(): void {
  closeConnection();
}

export function seedTestUser(db: DatabaseType, id = 'system', email = 'system@local'): void {
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)`,
  ).run(id, email, 'System User', 'admin', '$2a$12$placeholderhashfor.testingonly_placeholderhashfor.test');
}
