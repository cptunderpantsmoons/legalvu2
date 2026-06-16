import { getConnection } from '../database/connection';
import { rowToAuditLog } from '../database/mappers';
import type { AuditLog } from '../../shared/types';

export interface AuditEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}

export function log(entry: AuditEntry): void {
  const db = getConnection();
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
  ).run(entry.userId, entry.action, entry.entityType, entry.entityId ?? null, entry.details ?? null);
}

export function query(filter: {
  entityType?: string;
  entityId?: string;
  userId?: string;
  since?: number;
  limit?: number;
}): AuditLog[] {
  const db = getConnection();
  let sql = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (filter.entityType) {
    sql += ' AND entity_type = ?';
    params.push(filter.entityType);
  }
  if (filter.entityId) {
    sql += ' AND entity_id = ?';
    params.push(filter.entityId);
  }
  if (filter.userId) {
    sql += ' AND user_id = ?';
    params.push(filter.userId);
  }
  if (filter.since) {
    sql += ' AND created_at >= ?';
    params.push(filter.since);
  }

  sql += ' ORDER BY created_at DESC LIMIT ?';
  params.push(filter.limit ?? 100);

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map(rowToAuditLog);
}
