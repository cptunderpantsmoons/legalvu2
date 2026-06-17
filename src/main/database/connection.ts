import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: DatabaseType | null = null;

function resolveDbPath(customPath?: string): string {
  if (customPath) return customPath;
  try {
    const { app } = require('electron');
    if (app?.getPath) {
      return path.join(app.getPath('userData'), 'database.db');
    }
  } catch {
    // Electron not available
  }
  throw new Error(
    'Database path could not be resolved. Electron is not available and no customPath was provided. ' +
    'Call getConnection(customPath) in non-Electron environments.',
  );
}

export function getConnection(customPath?: string): DatabaseType {
  if (!_db) {
    const dbPath = resolveDbPath(customPath);
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.pragma('busy_timeout = 5000');
  }
  return _db;
}

export function setDatabaseForTesting(db: DatabaseType): void {
  _db = db;
}

export function closeConnection(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/**
 * Create a backup copy of the SQLite database using better-sqlite3's
 * native online backup API. This is safe to run while the database
 * is in use (WAL mode).
 *
 * The backup is written to `database.backup.db` in the same directory
 * as the primary database file.
 *
 * @returns The path to the backup file.
 */
export async function backupDatabase(): Promise<string> {
  const db = getConnection();
  const dbPath = resolveDbPath();
  const dbDir = path.dirname(dbPath);
  const backupPath = path.join(dbDir, 'database.backup.db');

  // Ensure the directory exists (it should, but be safe)
  fs.mkdirSync(dbDir, { recursive: true });

  await db.backup(backupPath);
  console.log(`[DB] Backup created at ${backupPath}`);
  return backupPath;
}