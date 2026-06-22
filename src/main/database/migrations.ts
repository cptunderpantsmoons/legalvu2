import { getConnection, closeConnection } from "./connection";
import type { Database as DatabaseType } from "better-sqlite3";
import schemaSql from "./schema.sql?raw";

interface Migration {
  version: number;
  name: string;
  sql: string;
  /** Optional idempotent data backfill run after the DDL (inside the same transaction). */
  backfill?: (db: DatabaseType) => void;
}

/**
 * Migration definitions.
 * Each migration is an incremental SQL script that runs in order.
 * Version 1 = initial schema (schema.sql).
 * Future versions should only contain ALTER TABLE / CREATE INDEX / etc.
 * that are NOT already in schema.sql.
 */
const migrations: Migration[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: schemaSql,
  },
  {
    version: 2,
    name: "add_contracts_fts",
    sql: `
      -- FTS5 virtual table mirroring contracts(title, content, counterparty).
      -- Self-contained (no external content=) so the index stores its own copy
      -- of the tokenized text. This is simpler and avoids the quirks of FTS5
      -- external content tables (which require 'delete' commands and don't
      -- support snippet() without a content lookup).
      -- Idempotent: CREATE ... IF NOT EXISTS so re-runs are safe.
      -- NULL content/counterparty are coerced to '' via COALESCE in the
      -- triggers and the backfill because FTS5 rejects NULL.
      CREATE VIRTUAL TABLE IF NOT EXISTS contracts_fts USING fts5(
        title,
        content,
        counterparty,
        tokenize='unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS contracts_ai AFTER INSERT ON contracts BEGIN
        INSERT INTO contracts_fts(rowid, title, content, counterparty)
        VALUES (new.rowid, new.title, COALESCE(new.content, ''), COALESCE(new.counterparty, ''));
      END;

      CREATE TRIGGER IF NOT EXISTS contracts_ad AFTER DELETE ON contracts BEGIN
        DELETE FROM contracts_fts WHERE rowid = old.rowid;
      END;

      CREATE TRIGGER IF NOT EXISTS contracts_au AFTER UPDATE ON contracts BEGIN
        DELETE FROM contracts_fts WHERE rowid = old.rowid;
        INSERT INTO contracts_fts(rowid, title, content, counterparty)
        VALUES (new.rowid, new.title, COALESCE(new.content, ''), COALESCE(new.counterparty, ''));
      END;
    `,
    backfill: backfillContractsFts,
  },
  // --- Future migrations go here ---
  // {
  //   version: 3,
  //   name: 'add_contract_tags',
  //   sql: `CREATE TABLE IF NOT EXISTS contract_tags (...);`,
  // },
];

/**
 * Backfill the contracts_fts index with any rows that exist in the contracts
 * table but are missing from the FTS index. This is safe to call repeatedly
 * because we only insert rows whose rowid is not already present in the FTS
 * index (LEFT JOIN ... WHERE fts.rowid IS NULL).
 *
 * NULL content/counterparty are coerced to '' because FTS5 rejects NULL.
 */
function backfillContractsFts(db: DatabaseType): void {
  // Use a LEFT JOIN to find contracts not yet in the FTS index.
  // This makes the backfill idempotent across partial migrations and re-runs.
  const inserted = db
    .prepare(
      `INSERT INTO contracts_fts(rowid, title, content, counterparty)
       SELECT c.rowid, c.title, COALESCE(c.content, ''), COALESCE(c.counterparty, '')
       FROM contracts c
       LEFT JOIN contracts_fts fts ON fts.rowid = c.rowid
       WHERE fts.rowid IS NULL`,
    )
    .run();
  if (inserted.changes > 0) {
    console.log(
      `[DB] Backfilled ${inserted.changes} contract(s) into contracts_fts`,
    );
  }
}

/** Create the schema_version tracking table if it doesn't exist. */
function ensureSchemaVersionTable(db: DatabaseType): void {
  db.exec(
    `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);`,
  );
}

/** Get the highest applied migration version, or 0 if none applied yet. */
function getCurrentVersion(db: DatabaseType): number {
  const row = db
    .prepare("SELECT MAX(version) AS v FROM schema_version")
    .get() as { v: number | null } | undefined;
  return row?.v ?? 0;
}

/** Record a completed migration in the schema_version table. */
function recordMigration(db: DatabaseType, version: number): void {
  db.prepare(
    "INSERT INTO schema_version (version, applied_at) VALUES (?, ?)",
  ).run(version, Date.now());
}

/**
 * Run all pending database migrations.
 *
 * This function is idempotent: it checks the current schema version from the
 * `schema_version` table and only applies migrations that haven't been run yet.
 * Each pending migration's DDL and optional backfill run inside a single
 * transaction so a partial failure rolls back cleanly. After migrations, it
 * always runs the idempotent post-migration hooks (seedBootstrapUser,
 * resetStaleProcessing).
 *
 * @param db Optional database connection. If omitted, uses the singleton.
 */
export function migrate(db?: DatabaseType): void {
  const conn = db ?? getConnection();

  ensureSchemaVersionTable(conn);
  const currentVersion = getCurrentVersion(conn);

  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) {
    console.log(
      `[DB] Already at schema version ${currentVersion}, no migrations needed`,
    );
  } else {
    for (const migration of pending) {
      console.log(
        `[DB] Applying migration v${migration.version}: ${migration.name}`,
      );
      // Wrap DDL + backfill in a transaction so partial failures roll back.
      // better-sqlite3 supports DDL inside transactions.
      conn.transaction(() => {
        conn.exec(migration.sql);
        if (migration.backfill) {
          migration.backfill(conn);
        }
        recordMigration(conn, migration.version);
      })();
      console.log(`[DB] Migration v${migration.version} applied successfully`);
    }
  }

  // Post-migration hooks — idempotent, safe to run on every startup
  seedBootstrapUser(conn);
  resetStaleProcessing(conn);

  console.log(
    `[DB] Migrations complete. Schema version: ${getCurrentVersion(conn)}`,
  );
}

/**
 * Seed the bootstrap system user if it doesn't already exist.
 * Idempotent via INSERT OR IGNORE.
 */
function seedBootstrapUser(db: DatabaseType): void {
  const now = Date.now();
  db.prepare(
    `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
  ).run("system", "system@local", "System Bootstrap", "system", "", now);
}

/**
 * Reset any sync_queue items stuck in 'processing' status back to 'pending'.
 * This handles the case where the app crashed or was killed mid-sync.
 */
function resetStaleProcessing(db: DatabaseType): void {
  const result = db
    .prepare(
      `UPDATE sync_queue SET status = 'pending' WHERE status = 'processing'`,
    )
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
