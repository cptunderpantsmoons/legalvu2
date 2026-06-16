import { getConnection, closeConnection } from './connection';
import type { Database as DatabaseType } from 'better-sqlite3';
import schemaSql from './schema.sql?raw';

export function migrate(db?: DatabaseType): void {
  const conn = db ?? getConnection();
  conn.exec(schemaSql);

  seedBootstrapUser(conn);

  console.log('[DB] Migrations applied');
}

function seedBootstrapUser(db: DatabaseType): void {
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('system', 'system@local', 'System Bootstrap', 'admin', '', now);
}

export function shutdownDatabase(): void {
  closeConnection();
}
