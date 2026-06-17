import { getConnection, closeConnection } from './connection';
import type { Database as DatabaseType } from 'better-sqlite3';
import schemaSql from './schema.sql?raw';

/**
 * Migration definitions.
 * Each migration is an incremental SQL script that runs in order.
 * Version 1 = initial schema (schema.sql).
 * Future versions should only contain ALTER TABLE / CREATE INDEX / etc.
 * that are NOT already in schema.sql.
 */
const migrations: { version: number; name: string; sql: string }[] = [
  {
    version: 1,
    name: 'initial_schema',
    sql: schemaSql,
  },
  // --- Future migrations go here ---
  // {
  //   version: 2,
  //   name: 'add_contract_tags',
  //   sql: `CREATE TABLE IF NOT EXISTS contract_tags (...);`,
  // },
];

/** Create the schema_version tracking table if it doesn't exist. */
function ensureSchemaVersionTable(db: DatabaseType): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);`,
  );
}

/** Get the highest applied migration version, or 0 if none applied yet. */
function getCurrentVersion(db: DatabaseType): number {
  const row = db
    .prepare('SELECT MAX(version) AS v FROM schema_version')
    .get() as { v: number | null } | undefined;
  return row?.v ?? 0;
}

/** Record a completed migration in the schema_version table. */
function recordMigration(db: DatabaseType, version: number): void {
  db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(
    version,
    Date.now(),
  );
}

/**
 * Run all pending database migrations.
 *
 * This function is idempotent: it checks the current schema version from the
 * `schema_version` table and only applies migrations that haven't been run yet.
 * After migrations, it always runs the idempotent post-migration hooks
 * (seedBootstrapUser, resetStaleProcessing).
 *
 * @param db Optional database connection. If omitted, uses the singleton.
 */
export function migrate(db?: DatabaseType): void {
  const conn = db ?? getConnection();

  ensureSchemaVersionTable(conn);
  const currentVersion = getCurrentVersion(conn);

  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) {
    console.log(`[DB] Already at schema version ${currentVersion}, no migrations needed`);
  } else {
    for (const migration of pending) {
      console.log(`[DB] Applying migration v${migration.version}: ${migration.name}`);
      conn.exec(migration.sql);
      recordMigration(conn, migration.version);
      console.log(`[DB] Migration v${migration.version} applied successfully`);
    }
  }

  // Post-migration hooks — idempotent, safe to run on every startup
  seedBootstrapUser(conn);
  resetStaleProcessing(conn);

  console.log(`[DB] Migrations complete. Schema version: ${getCurrentVersion(conn)}`);
}

/**
 * Seed the bootstrap system user if it doesn't already exist.
 * Idempotent via INSERT OR IGNORE.
 */
function seedBootstrapUser(db: DatabaseType): void {
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('system', 'system@local', 'System Bootstrap', 'system', '', now);
}

/**
 * Reset any sync_queue items stuck in 'processing' status back to 'pending'.
 * This handles the case where the app crashed or was killed mid-sync.
 */
function resetStaleProcessing(db: DatabaseType): void {
  const result = db
    .prepare(`UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'`)
    .run();

  if (result.changes > 0) {
    console.log(
      `[DB] Reset ${result.changes} stale sync_queue item(s) from 'processing' to 'pending'`,
    );
  }
}

export function shutdownDatabase(): void {
  closeConnection();
}