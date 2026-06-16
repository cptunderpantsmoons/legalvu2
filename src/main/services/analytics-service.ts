import { getConnection } from '../database/connection';

export interface ContractStatusCounts {
  status: string;
  count: number;
}

export interface AiUsageStats {
  model: string;
  contracts: number;
  totalTokens: number;
}

export interface SyncHealthStats {
  downloaded: number;
  uploaded: number;
  synced: number;
  unsynced: number;
  pendingQueue: number;
  failedQueue: number;
  lastSyncAt: number | null;
}

export interface AuditTimelineEntry {
  date: string;
  action: string;
  count: number;
}

export interface TemplateUsageStats {
  name: string;
  contractType: string;
  isDefault: boolean;
  usageCount: number;
}

export function getContractStatusCounts(): ContractStatusCounts[] {
  const db = getConnection();
  const rows = db.prepare(
    `SELECT status, COUNT(*) as count FROM contracts GROUP BY status ORDER BY count DESC`,
  ).all() as ContractStatusCounts[];
  return rows;
}

export function getAiUsageStats(): AiUsageStats[] {
  const db = getConnection();
  const rows = db.prepare(
    `SELECT ai_model as model, COUNT(*) as contracts, COALESCE(SUM(ai_tokens_used), 0) as totalTokens
     FROM contracts WHERE ai_model IS NOT NULL AND ai_model != ''
     GROUP BY ai_model ORDER BY contracts DESC`,
  ).all() as AiUsageStats[];
  return rows;
}

export function getSyncHealth(): SyncHealthStats {
  const db = getConnection();

  const docCounts = db.prepare(
    `SELECT
      SUM(CASE WHEN sp_sync_status = 'downloaded' THEN 1 ELSE 0 END) as downloaded,
      SUM(CASE WHEN sp_sync_status = 'uploaded' THEN 1 ELSE 0 END) as uploaded,
      SUM(CASE WHEN sp_sync_status = 'synced' THEN 1 ELSE 0 END) as synced,
      SUM(CASE WHEN sp_sync_status = 'unsynced' THEN 1 ELSE 0 END) as unsynced
    FROM documents`,
  ).get() as { downloaded: number; uploaded: number; synced: number; unsynced: number };

  const queueCounts = db.prepare(
    `SELECT
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingQueue,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedQueue
    FROM sync_queue`,
  ).get() as { pendingQueue: number; failedQueue: number };

  const lastSync = db.prepare(
    `SELECT last_sync_at FROM sharepoint_connections WHERE last_sync_at IS NOT NULL ORDER BY last_sync_at DESC LIMIT 1`,
  ).get() as { last_sync_at: number } | undefined;

  return {
    downloaded: docCounts.downloaded || 0,
    uploaded: docCounts.uploaded || 0,
    synced: docCounts.synced || 0,
    unsynced: docCounts.unsynced || 0,
    pendingQueue: queueCounts.pendingQueue || 0,
    failedQueue: queueCounts.failedQueue || 0,
    lastSyncAt: lastSync?.last_sync_at ?? null,
  };
}

export function getAuditTimeline(days = 30): AuditTimelineEntry[] {
  const db = getConnection();
  const cutoff = Date.now() - days * 86_400_000;

  const rows = db.prepare(
    `SELECT
      date(created_at / 1000, 'unixepoch', 'localtime') as date,
      action,
      COUNT(*) as count
    FROM audit_logs
    WHERE created_at >= ?
    GROUP BY date, action
    ORDER BY date ASC`,
  ).all(cutoff) as AuditTimelineEntry[];

  return rows;
}

export function getTemplateUsage(): TemplateUsageStats[] {
  const db = getConnection();
  const rows = db.prepare(
    `SELECT t.name, t.contract_type as contractType, t.is_default as isDefault,
      COUNT(c.id) as usageCount
    FROM templates t
    LEFT JOIN contracts c ON json_extract(c.metadata, '$.templateName') = t.name
    GROUP BY t.id
    ORDER BY usageCount DESC, t.name ASC`,
  ).all() as TemplateUsageStats[];

  return rows.map((r) => ({
    name: r.name,
    contractType: r.contractType || '',
    isDefault: Boolean(r.isDefault),
    usageCount: r.usageCount || 0,
  }));
}
