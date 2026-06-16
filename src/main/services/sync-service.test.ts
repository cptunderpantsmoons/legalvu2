import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { getConnection } from '../database/connection';
import { queueOperation, getPendingQueue } from './sync-service';

function insertTestDoc(id: string, filename: string): void {
  const db = getConnection();
  const now = Date.now();
  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sha256, sp_sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, 'unsynced', ?, ?)`,
  ).run(id, filename, `/tmp/${filename}`, `hash-${id}`, now, now);
}

describe('sync-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('queueOperation inserts a pending upload', () => {
    insertTestDoc('doc-1', 'test1.pdf');
    queueOperation('doc-1', 'upload');
    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe('upload');
    expect(queue[0].status).toBe('pending');
    expect(queue[0].documentId).toBe('doc-1');
  });

  it('queueOperation inserts a pending download with null documentId', () => {
    queueOperation(null, 'download');
    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe('download');
    expect(queue[0].documentId).toBeNull();
  });

  it('getPendingQueue returns only pending and failed items', () => {
    insertTestDoc('doc-1', 'a.pdf');
    insertTestDoc('doc-2', 'b.pdf');
    queueOperation('doc-1', 'upload');
    queueOperation('doc-2', 'upload');

    const db = getConnection();
    db.prepare('UPDATE sync_queue SET status = ? WHERE document_id = ?').run('completed', 'doc-1');

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].documentId).toBe('doc-2');
  });

  it('getPendingQueue orders by created_at ASC', () => {
    insertTestDoc('doc-a', 'a.pdf');
    insertTestDoc('doc-b', 'b.pdf');
    insertTestDoc('doc-c', 'c.pdf');
    queueOperation('doc-a', 'upload');
    queueOperation('doc-b', 'upload');
    queueOperation('doc-c', 'upload');

    const queue = getPendingQueue();
    expect(queue[0].documentId).toBe('doc-a');
    expect(queue[2].documentId).toBe('doc-c');
  });

  it('failed items are returned with error details', () => {
    insertTestDoc('doc-1', 'fail.pdf');
    queueOperation('doc-1', 'upload');

    const db = getConnection();
    db.prepare('UPDATE sync_queue SET status = ?, attempts = ?, error_message = ? WHERE document_id = ?').run(
      'failed', 1, 'Network error', 'doc-1',
    );

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe('failed');
    expect(queue[0].attempts).toBe(1);
    expect(queue[0].errorMessage).toBe('Network error');
  });

  it('completed items are excluded from pending queue', () => {
    insertTestDoc('doc-done', 'done.pdf');
    queueOperation('doc-done', 'upload');

    const db = getConnection();
    db.prepare('UPDATE sync_queue SET status = ? WHERE document_id = ?').run('completed', 'doc-done');

    expect(getPendingQueue().length).toBe(0);
  });
});
