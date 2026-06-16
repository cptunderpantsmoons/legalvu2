import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { getConnection } from '../database/connection';
import {
  getContractStatusCounts,
  getAiUsageStats,
  getSyncHealth,
  getAuditTimeline,
  getTemplateUsage,
} from './analytics-service';
import { seedDefaultTemplates } from './template-service';

function insertContract(id: string, status: string, model: string | null, tokens: number | null): void {
  const db = getConnection();
  const now = Date.now();
  db.prepare(
    `INSERT INTO contracts (id, title, status, ai_model, ai_tokens_used, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'system', ?, ?)`,
  ).run(id, `Contract ${id}`, status, model, tokens, now, now);
}

function insertDocument(id: string, syncStatus: string): void {
  const db = getConnection();
  const now = Date.now();
  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sp_sync_status, created_at, updated_at)
     VALUES (?, ?, '/tmp/test', ?, ?, ?)`,
  ).run(id, `doc-${id}.pdf`, syncStatus, now, now);
}

function insertQueueItem(operation: string, status: string): void {
  const db = getConnection();
  db.prepare(
    `INSERT INTO sync_queue (document_id, operation, status) VALUES (NULL, ?, ?)`,
  ).run(operation, status);
}

function insertAudit(action: string, daysAgo: number): void {
  const db = getConnection();
  const ts = Date.now() - daysAgo * 86_400_000;
  db.prepare(
    `INSERT INTO audit_logs (user_id, action, entity_type, created_at) VALUES ('system', ?, 'test', ?)`,
  ).run(action, ts);
}

describe('analytics-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  describe('getContractStatusCounts', () => {
    it('returns empty array for empty database', () => {
      const counts = getContractStatusCounts();
      expect(counts).toEqual([]);
    });

    it('counts contracts grouped by status', () => {
      insertContract('c1', 'draft', null, null);
      insertContract('c2', 'draft', null, null);
      insertContract('c3', 'active', null, null);
      insertContract('c4', 'signed', null, null);

      const counts = getContractStatusCounts();
      expect(counts.length).toBe(3);

      const draft = counts.find((c) => c.status === 'draft');
      expect(draft?.count).toBe(2);

      const active = counts.find((c) => c.status === 'active');
      expect(active?.count).toBe(1);
    });

    it('orders by count descending', () => {
      insertContract('c1', 'draft', null, null);
      insertContract('c2', 'draft', null, null);
      insertContract('c3', 'draft', null, null);
      insertContract('c4', 'active', null, null);

      const counts = getContractStatusCounts();
      expect(counts[0].status).toBe('draft');
      expect(counts[0].count).toBe(3);
    });
  });

  describe('getAiUsageStats', () => {
    it('returns empty for no AI contracts', () => {
      insertContract('c1', 'draft', null, null);
      expect(getAiUsageStats()).toEqual([]);
    });

    it('groups by model with token sums', () => {
      insertContract('c1', 'draft', 'gpt-4', 1500);
      insertContract('c2', 'draft', 'gpt-4', 2500);
      insertContract('c3', 'draft', 'claude-3', 800);

      const stats = getAiUsageStats();
      expect(stats.length).toBe(2);

      const gpt4 = stats.find((s) => s.model === 'gpt-4');
      expect(gpt4?.contracts).toBe(2);
      expect(gpt4?.totalTokens).toBe(4000);

      const claude = stats.find((s) => s.model === 'claude-3');
      expect(claude?.contracts).toBe(1);
      expect(claude?.totalTokens).toBe(800);
    });

    it('excludes contracts without model', () => {
      insertContract('c1', 'draft', 'gpt-4', 1000);
      insertContract('c2', 'draft', null, null);
      insertContract('c3', 'draft', '', null);

      const stats = getAiUsageStats();
      expect(stats.length).toBe(1);
      expect(stats[0].model).toBe('gpt-4');
    });
  });

  describe('getSyncHealth', () => {
    it('returns zeros for empty database', () => {
      const health = getSyncHealth();
      expect(health.downloaded).toBe(0);
      expect(health.uploaded).toBe(0);
      expect(health.synced).toBe(0);
      expect(health.unsynced).toBe(0);
      expect(health.pendingQueue).toBe(0);
      expect(health.failedQueue).toBe(0);
      expect(health.lastSyncAt).toBeNull();
    });

    it('counts documents by sync status', () => {
      insertDocument('d1', 'downloaded');
      insertDocument('d2', 'downloaded');
      insertDocument('d3', 'uploaded');
      insertDocument('d4', 'synced');
      insertDocument('d5', 'unsynced');

      const health = getSyncHealth();
      expect(health.downloaded).toBe(2);
      expect(health.uploaded).toBe(1);
      expect(health.synced).toBe(1);
      expect(health.unsynced).toBe(1);
    });

    it('counts queue items by status', () => {
      insertQueueItem('upload', 'pending');
      insertQueueItem('download', 'pending');
      insertQueueItem('upload', 'failed');

      const health = getSyncHealth();
      expect(health.pendingQueue).toBe(2);
      expect(health.failedQueue).toBe(1);
    });

    it('returns lastSyncAt from sharepoint_connections', () => {
      const db = getConnection();
      const ts = Date.now() - 3600_000;
      db.prepare(
        `INSERT INTO sharepoint_connections (id, user_id, site_url, library_path, last_sync_at, created_at, updated_at)
         VALUES ('sp1', 'system', 'https://sp.example.com', '/docs', ?, ?, ?)`,
      ).run(ts, ts, ts);

      const health = getSyncHealth();
      expect(health.lastSyncAt).toBe(ts);
    });
  });

  describe('getAuditTimeline', () => {
    it('returns empty for no audit logs', () => {
      expect(getAuditTimeline()).toEqual([]);
    });

    it('groups by date and action', () => {
      insertAudit('contract:create', 1);
      insertAudit('contract:create', 1);
      insertAudit('auth:login', 1);
      insertAudit('contract:save', 5);

      const timeline = getAuditTimeline(30);
      expect(timeline.length).toBeGreaterThanOrEqual(2);

      const createAction = timeline.find((t) => t.action === 'contract:create');
      expect(createAction?.count).toBe(2);
    });

    it('excludes entries older than cutoff', () => {
      insertAudit('contract:create', 5);
      insertAudit('contract:create', 45);

      const timeline = getAuditTimeline(30);
      const total = timeline.reduce((sum, t) => sum + t.count, 0);
      expect(total).toBe(1);
    });
  });

  describe('getTemplateUsage', () => {
    it('returns empty for no templates', () => {
      expect(getTemplateUsage()).toEqual([]);
    });

    it('counts contracts generated from each template', () => {
      seedDefaultTemplates('system');
      const db = getConnection();

      const templates = db.prepare('SELECT name FROM templates LIMIT 2').all() as { name: string }[];
      const now = Date.now();

      for (let i = 0; i < 3; i++) {
        db.prepare(
          `INSERT INTO contracts (id, title, status, metadata, created_by, created_at, updated_at)
           VALUES (?, ?, 'draft', ?, 'system', ?, ?)`,
        ).run(`tc-${i}`, `Contract ${i}`, JSON.stringify({ templateName: templates[0].name }), now, now);
      }

      db.prepare(
        `INSERT INTO contracts (id, title, status, metadata, created_by, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, 'system', ?, ?)`,
      ).run('tc-x', 'Other', JSON.stringify({ templateName: templates[1].name }), now, now);

      const usage = getTemplateUsage();
      const topTemplate = usage.find((u) => u.name === templates[0].name);
      expect(topTemplate?.usageCount).toBe(3);

      const secondTemplate = usage.find((u) => u.name === templates[1].name);
      expect(secondTemplate?.usageCount).toBe(1);
    });

    it('shows 0 usage for templates never used', () => {
      seedDefaultTemplates('system');
      const usage = getTemplateUsage();
      const unused = usage.filter((u) => u.usageCount === 0);
      expect(unused.length).toBeGreaterThan(0);
    });

    it('marks default templates correctly', () => {
      seedDefaultTemplates('system');
      const usage = getTemplateUsage();
      expect(usage.every((u) => u.isDefault)).toBe(true);
    });
  });
});
