import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import AdmZip from 'adm-zip';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { getConnection } from '../database/connection';
import { parseTabDelimited, mapLawvuStatus, parseDateToMs } from '../validation/lawvu-export-schema';
import { importFromZip, parseZipBuffer } from './lawvu-import-service';
import { verifyPassword } from '../security/password';

const SAMPLE_CONTRACTS_TXT = [
  'Title\tStatus\tCounterparty\tJurisdiction\tContract Type\tValue\tOwner Email\tStart Date\tEnd Date\tID',
  'MSA - Acme Corp\tActive\tAcme Corporation\tNSW, Australia\tMSA\t50000\towner@example.com\t2024-01-15\t2025-01-14\tLV-001',
  'NDA - Beta Inc\tDraft\tBeta Inc\tVictoria\tNDA\t\tlegal@example.com\t\t\tLV-002',
  'SaaS Agreement\tSigned\tGamma Pty\tQLD\tSaaS\t12000\tadmin@example.com\t2024-06-01\t2025-06-01\tLV-003',
].join('\n');

const SAMPLE_MATTERFIELDS_TXT = [
  'Matter ID\tField Name\tField Value',
  'LV-001\tRenewal Type\tAuto-renew',
  'LV-001\tPriority\tHigh',
  'LV-002\tConfidential\tYes',
].join('\n');

function createMockZip(): Buffer {
  const zip = new AdmZip();
  zip.addFile('Contracts.txt', Buffer.from(SAMPLE_CONTRACTS_TXT, 'utf8'));
  zip.addFile('MatterFields.txt', Buffer.from(SAMPLE_MATTERFIELDS_TXT, 'utf8'));
  zip.addFile('Files/LV-001_MSA.docx', Buffer.from('mock docx content for MSA'));
  zip.addFile('Files/LV-003_SaaS.pdf', Buffer.from('mock pdf content for SaaS'));
  return zip.toBuffer();
}

describe('lawvu-import-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  describe('parseTabDelimited', () => {
    it('parses tab-delimited content with headers', () => {
      const rows = parseTabDelimited('A\tB\tC\n1\t2\t3\n4\t5\t6');
      expect(rows.length).toBe(2);
      expect(rows[0].A).toBe('1');
      expect(rows[0].B).toBe('2');
      expect(rows[1].C).toBe('6');
    });

    it('handles empty content', () => {
      expect(parseTabDelimited('')).toEqual([]);
    });

    it('handles single row (header only)', () => {
      expect(parseTabDelimited('A\tB')).toEqual([]);
    });

    it('trims whitespace from values', () => {
      const rows = parseTabDelimited('A\tB\n  hello  \t  world  ');
      expect(rows[0].A).toBe('hello');
      expect(rows[0].B).toBe('world');
    });
  });

  describe('mapLawvuStatus', () => {
    it('maps known statuses', () => {
      expect(mapLawvuStatus('Active')).toBe('active');
      expect(mapLawvuStatus('Draft')).toBe('draft');
      expect(mapLawvuStatus('Signed')).toBe('signed');
      expect(mapLawvuStatus('Executed')).toBe('signed');
      expect(mapLawvuStatus('Expired')).toBe('expired');
      expect(mapLawvuStatus('Terminated')).toBe('terminated');
    });

    it('maps negotiation/review statuses', () => {
      expect(mapLawvuStatus('In Negotiation')).toBe('under_review');
      expect(mapLawvuStatus('Under Review')).toBe('under_review');
      expect(mapLawvuStatus('Pending')).toBe('under_review');
    });

    it('defaults to draft for unknown', () => {
      expect(mapLawvuStatus('Something Weird')).toBe('draft');
      expect(mapLawvuStatus(undefined)).toBe('draft');
      expect(mapLawvuStatus('')).toBe('draft');
    });
  });

  describe('parseDateToMs', () => {
    it('parses ISO date strings', () => {
      const ms = parseDateToMs('2024-01-15');
      expect(ms).not.toBeNull();
      expect(ms!).toBeGreaterThan(0);
    });

    it('parses date-time strings', () => {
      const ms = parseDateToMs('2024-06-01T10:30:00');
      expect(ms).not.toBeNull();
    });

    it('returns null for invalid dates', () => {
      expect(parseDateToMs('not-a-date')).toBeNull();
      expect(parseDateToMs('')).toBeNull();
      expect(parseDateToMs(undefined)).toBeNull();
    });
  });

  describe('parseZipBuffer', () => {
    it('extracts Contracts.txt, MatterFields.txt, and files from zip', () => {
      const zipBuffer = createMockZip();
      const contents = parseZipBuffer(zipBuffer);

      expect(contents.contractsTxt).not.toBeNull();
      expect(contents.contractsTxt).toContain('MSA - Acme Corp');
      expect(contents.matterFieldsTxt).not.toBeNull();
      expect(contents.matterFieldsTxt).toContain('Renewal Type');
      expect(contents.files.size).toBe(2);
      expect(contents.files.has('LV-001_MSA.docx')).toBe(true);
      expect(contents.files.has('LV-003_SaaS.pdf')).toBe(true);
    });

    it('returns null contractsTxt when not in zip', () => {
      const zip = new AdmZip();
      zip.addFile('random.txt', Buffer.from('nope'));
      const contents = parseZipBuffer(zip.toBuffer());
      expect(contents.contractsTxt).toBeNull();
    });
  });

  describe('importFromZip', () => {
    it('imports contracts from a mock zip', () => {
      const zipBuffer = createMockZip();
      const result = importFromZip(zipBuffer, 'system');

      expect(result.ok).toBe(true);
      expect(result.contractsImported).toBe(3);
      expect(result.errors.length).toBe(0);
    });

    it('creates users from Owner Email', () => {
      const zipBuffer = createMockZip();
      const result = importFromZip(zipBuffer, 'system');

      expect(result.usersCreated).toBeGreaterThan(0);

      const db = getConnection();
      const users = db.prepare('SELECT email FROM users WHERE email != ?').all('system@local') as { email: string }[];
      const emails = users.map((u) => u.email);
      expect(emails).toContain('owner@example.com');
      expect(emails).toContain('legal@example.com');
      expect(emails).toContain('admin@example.com');
    });

    it('placeholder users have non-empty password hashes that reject login', () => {
      const zipBuffer = createMockZip();
      importFromZip(zipBuffer, 'system');

      const db = getConnection();
      const user = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('owner@example.com') as { password_hash: string };
      expect(user.password_hash).not.toBe('');
      expect(user.password_hash.length).toBeGreaterThan(20);
      expect(verifyPassword('anything', user.password_hash)).toBe(false);
      expect(verifyPassword('__lawvu_import_placeholder__', user.password_hash)).toBe(true);
    });

    it('contracts appear in database with correct statuses', () => {
      const zipBuffer = createMockZip();
      importFromZip(zipBuffer, 'system');

      const db = getConnection();
      const contracts = db.prepare('SELECT title, status FROM contracts ORDER BY title').all() as { title: string; status: string }[];

      expect(contracts.length).toBe(3);
      const msa = contracts.find((c) => c.title.includes('Acme'));
      expect(msa?.status).toBe('active');

      const nda = contracts.find((c) => c.title.includes('Beta'));
      expect(nda?.status).toBe('draft');

      const saas = contracts.find((c) => c.title.includes('SaaS'));
      expect(saas?.status).toBe('signed');
    });

    it('stores metadata with source: lawvu-import and customFields', () => {
      const zipBuffer = createMockZip();
      importFromZip(zipBuffer, 'system');

      const db = getConnection();
      const contract = db.prepare('SELECT metadata FROM contracts WHERE title LIKE ?').get('%Acme%') as { metadata: string };

      const meta = JSON.parse(contract.metadata);
      expect(meta.source).toBe('lawvu-import');
      expect(meta.lawvuId).toBe('LV-001');
      expect(meta.customFields).toBeDefined();
      expect(meta.customFields['Renewal Type']).toBe('Auto-renew');
      expect(meta.customFields.Priority).toBe('High');
    });

    it('writes audit log entry', () => {
      const zipBuffer = createMockZip();
      importFromZip(zipBuffer, 'system');

      const db = getConnection();
      const audit = db.prepare('SELECT action FROM audit_logs WHERE action = ?').get('lawvu:import') as { action: string } | undefined;
      expect(audit).toBeDefined();
      expect(audit!.action).toBe('lawvu:import');
    });

    it('links files to contracts by ID prefix match', () => {
      const zipBuffer = createMockZip();
      const result = importFromZip(zipBuffer, 'system');

      expect(result.filesImported).toBeGreaterThan(0);

      const db = getConnection();
      const docs = db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number };
      expect(docs.count).toBeGreaterThan(0);
    });

    it('documents have SHA256 hashes', () => {
      const zipBuffer = createMockZip();
      importFromZip(zipBuffer, 'system');

      const db = getConnection();
      const docs = db.prepare('SELECT sha256 FROM documents').all() as { sha256: string }[];
      for (const doc of docs) {
        expect(doc.sha256).toBeTruthy();
        expect(doc.sha256.length).toBe(64);
      }
    });

    it('returns error when Contracts.txt missing from zip', () => {
      const zip = new AdmZip();
      zip.addFile('random.txt', Buffer.from('no contracts here'));
      const result = importFromZip(zip.toBuffer(), 'system');

      expect(result.ok).toBe(false);
      expect(result.contractsImported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('Contracts.txt');
    });

    it('returns error for empty zip', () => {
      const zip = new AdmZip();
      const result = importFromZip(zip.toBuffer(), 'system');

      expect(result.ok).toBe(false);
      expect(result.contractsImported).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('does not throw on malformed row — continues to next row', () => {
      const malformedTxt = [
        'Title\tStatus\tID',
        'Good Contract 1\tActive\tLV-100',
        '\t\t',
        'Good Contract 2\tDraft\tLV-101',
      ].join('\n');

      const zip = new AdmZip();
      zip.addFile('Contracts.txt', Buffer.from(malformedTxt, 'utf8'));
      const result = importFromZip(zip.toBuffer(), 'system');

      expect(result.ok).toBe(true);
      expect(result.contractsImported).toBeGreaterThanOrEqual(2);
      expect(result.errors.length).toBe(0);
    });

    it('idempotency: re-importing same zip skips duplicates', () => {
      const zipBuffer = createMockZip();
      const first = importFromZip(zipBuffer, 'system');
      expect(first.contractsImported).toBe(3);
      expect(first.duplicates).toBe(0);

      const second = importFromZip(zipBuffer, 'system');
      expect(second.contractsImported).toBe(0);
      expect(second.duplicates).toBe(3);

      const db = getConnection();
      const count = db.prepare('SELECT COUNT(*) as c FROM contracts').get() as { c: number };
      expect(count.c).toBe(3);
    });

    it('file linking requires ID prefix match, not unconditional single-file link', () => {
      const contractsTxt = [
        'Title\tStatus\tID',
        'Alpha Agreement\tActive\tLV-AAA',
      ].join('\n');

      const zip = new AdmZip();
      zip.addFile('Contracts.txt', Buffer.from(contractsTxt, 'utf8'));
      zip.addFile('Files/unrelated_file.docx', Buffer.from('unrelated content'));
      const result = importFromZip(zip.toBuffer(), 'system');

      expect(result.contractsImported).toBe(1);
      expect(result.filesImported).toBe(0);
    });
  });
});
