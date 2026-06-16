import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { getConnection } from '../database/connection';
import { transitionStatus, isTransitionAllowed, getAllowedTransitions } from './contract-lifecycle';
import { query as queryAudit } from './audit-service';
import type { ContractStatus } from '../../shared/types';

vi.mock('./ai-adapter', () => ({
  getProvider: () => ({
    generateDraft: vi.fn().mockResolvedValue({ content: 'text', tokensUsed: 10 }),
  }),
}));

function insertTestContract(id: string, status: ContractStatus = 'draft'): void {
  const db = getConnection();
  const now = Date.now();
  db.prepare(
    `INSERT INTO contracts (id, title, status, created_by, created_at, updated_at) VALUES (?, ?, ?, 'system', ?, ?)`,
  ).run(id, `Test ${id}`, status, now, now);
}

describe('contract-lifecycle', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('getAllowedTransitions returns correct transitions for draft', () => {
    expect(getAllowedTransitions('draft')).toEqual(['under_review']);
  });

  it('getAllowedTransitions returns empty for terminal states', () => {
    expect(getAllowedTransitions('expired')).toEqual([]);
    expect(getAllowedTransitions('terminated')).toEqual([]);
  });

  it('isTransitionAllowed validates legal transitions', () => {
    expect(isTransitionAllowed('draft', 'under_review')).toBe(true);
    expect(isTransitionAllowed('draft', 'signed')).toBe(false);
    expect(isTransitionAllowed('under_review', 'approved')).toBe(true);
    expect(isTransitionAllowed('signed', 'active')).toBe(true);
    expect(isTransitionAllowed('active', 'expired')).toBe(true);
  });

  it('transitionStatus succeeds for legal transition', () => {
    insertTestContract('c-lc-1', 'draft');
    const updated = transitionStatus('c-lc-1', 'under_review', 'system');
    expect(updated.status).toBe('under_review');
  });

  it('transitionStatus throws for illegal transition', () => {
    insertTestContract('c-lc-2', 'draft');
    expect(() => transitionStatus('c-lc-2', 'signed', 'system')).toThrow('Invalid transition');
  });

  it('transitionStatus writes audit log', () => {
    insertTestContract('c-lc-3', 'draft');
    transitionStatus('c-lc-3', 'under_review', 'system');

    const audits = queryAudit({ entityType: 'contract', entityId: 'c-lc-3' });
    const transitionAudit = audits.find((a) => a.action === 'contract:transition');
    expect(transitionAudit).toBeDefined();
    const details = JSON.parse(transitionAudit!.details!);
    expect(details.from).toBe('draft');
    expect(details.to).toBe('under_review');
  });

  it('transitionStatus throws for non-existent contract', () => {
    expect(() => transitionStatus('ghost-id', 'draft', 'system')).toThrow('not found');
  });
});
