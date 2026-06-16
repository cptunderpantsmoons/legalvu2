import { getConnection } from './connection';
import fs from 'fs';
import path from 'path';

export function migrate(customPath?: string): void {
  const db = getConnection(customPath);
  const schemaPath = path.join(process.cwd(), 'src/main/database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  console.log('[DB] Migrations applied');
}
