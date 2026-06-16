import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from './test-db';
import { rowToContract, rowToUser, rowToAuditLog } from './mappers';
import type { Database as DatabaseType } from 'better-sqlite3';

describe('mappers', () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('rowToContract maps all fields correctly with snake_case → camelCase', () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ).run('u1', 'test@test.com', 'Test', 'legal', 'hash');
    db.prepare(
      `INSERT INTO contracts (id, title, status, counterparty, jurisdiction, content, metadata, ai_prompt_version, ai_model, ai_tokens_used, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      'c1', 'NDA - Acme', 'draft', 'Acme Corp', 'NSW, Australia',
      'Contract text', '{"key":"val"}', 'contract-draft-v1', 'gpt-4', 1500,
      'u1', now, now,
    );

    const row = db.prepare(`SELECT * FROM contracts WHERE id = 'c1'`).get() as Record<string, unknown>;
    const contract = rowToContract(row);

    expect(contract.id).toBe('c1');
    expect(contract.title).toBe('NDA - Acme');
    expect(contract.status).toBe('draft');
    expect(contract.counterparty).toBe('Acme Corp');
    expect(contract.jurisdiction).toBe('NSW, Australia');
    expect(contract.content).toBe('Contract text');
    expect(contract.metadata).toBe('{"key":"val"}');
    expect(contract.aiPromptVersion).toBe('contract-draft-v1');
    expect(contract.aiModel).toBe('gpt-4');
    expect(contract.aiTokensUsed).toBe(1500);
    expect(contract.createdBy).toBe('u1');
    expect(contract.createdAt).toBe(now);
    expect(contract.updatedAt).toBe(now);
  });

  it('rowToContract handles null optional fields', () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ).run('u2', 't2@test.com', 'T2', 'legal', 'hash');
    db.prepare(
      `INSERT INTO contracts (id, title, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('c2', 'Minimal', 'draft', 'u2', now, now);

    const row = db.prepare(`SELECT * FROM contracts WHERE id = 'c2'`).get() as Record<string, unknown>;
    const contract = rowToContract(row);

    expect(contract.counterparty).toBeUndefined();
    expect(contract.content).toBeUndefined();
    expect(contract.aiTokensUsed).toBeUndefined();
  });

  it('rowToUser maps all fields correctly', () => {
    const now = Date.now();
    db.prepare(
      `INSERT INTO users (id, email, full_name, role, password_hash, ai_api_key_encrypted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run('u3', 'user@test.com', 'John Doe', 'admin', 'hashedpw', 'encrypted-key', now);

    const row = db.prepare(`SELECT * FROM users WHERE id = 'u3'`).get() as Record<string, unknown>;
    const user = rowToUser(row);

    expect(user.id).toBe('u3');
    expect(user.email).toBe('user@test.com');
    expect(user.fullName).toBe('John Doe');
    expect(user.role).toBe('admin');
    expect(user.passwordHash).toBe('hashedpw');
    expect(user.aiApiKeyEncrypted).toBe('encrypted-key');
  });

  it('rowToAuditLog maps all fields correctly', () => {
    db.prepare(
      `INSERT INTO users (id, email, full_name, role, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ).run('u4', 'a@test.com', 'A', 'legal', 'h');
    db.prepare(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
    ).run('u4', 'contract:create', 'contract', 'c1', '{"model":"gpt-4"}');

    const row = db.prepare(`SELECT * FROM audit_logs WHERE entity_id = 'c1'`).get() as Record<string, unknown>;
    const audit = rowToAuditLog(row);

    expect(audit.userId).toBe('u4');
    expect(audit.action).toBe('contract:create');
    expect(audit.entityType).toBe('contract');
    expect(audit.entityId).toBe('c1');
    expect(audit.details).toBe('{"model":"gpt-4"}');
  });
});
