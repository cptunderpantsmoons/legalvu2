import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let _db: Database | null = null;

export function getConnection(customPath?: string): Database {
  if (!_db) {
    const dbPath = customPath || path.join(process.cwd(), 'data', 'database.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    _db = new Database(dbPath);
  }
  return _db;
}
