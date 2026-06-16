import AdmZip from 'adm-zip';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getConnection } from '../database/connection';
import { log } from './audit-service';
import { hashPassword } from '../security/password';
import {
  parseTabDelimited,
  mapLawvuStatus,
} from '../validation/lawvu-export-schema';
import type { ContractStatus } from '../../shared/types';

export interface ImportResult {
  ok: boolean;
  contractsImported: number;
  filesImported: number;
  usersCreated: number;
  errors: ImportError[];
  skipped: number;
  duplicates: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

const MAX_ZIP_SIZE = 500 * 1024 * 1024;
const SENTINEL_HASH = hashPassword('__lawvu_import_placeholder__');

interface ParsedExport {
  contracts: Record<string, string>[];
  fieldsByMatter: Record<string, Record<string, string>>;
  files: Map<string, Buffer>;
}

interface ZipContents {
  contractsTxt: string | null;
  matterFieldsTxt: string | null;
  files: Map<string, Buffer>;
}

export function parseZipBuffer(zipBuffer: Buffer): ZipContents {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  let contractsTxt: string | null = null;
  let matterFieldsTxt: string | null = null;
  const files = new Map<string, Buffer>();

  for (const entry of entries) {
    const name = entry.entryName.toLowerCase();
    if (name.endsWith('contracts.txt')) {
      contractsTxt = entry.getData().toString('utf8');
    } else if (name.endsWith('matterfields.txt')) {
      matterFieldsTxt = entry.getData().toString('utf8');
    } else if (name.includes('files/') && !entry.isDirectory) {
      const fileName = path.basename(entry.entryName);
      if (fileName) {
        files.set(fileName, entry.getData());
      }
    }
  }

  return { contractsTxt, matterFieldsTxt, files };
}

export function parseExport(zipContents: ZipContents): ParsedExport {
  const contracts = zipContents.contractsTxt ? parseTabDelimited(zipContents.contractsTxt) : [];
  const matterFieldRows = zipContents.matterFieldsTxt ? parseTabDelimited(zipContents.matterFieldsTxt) : [];

  const fieldsByMatter: Record<string, Record<string, string>> = {};
  for (const row of matterFieldRows) {
    const matterId = row['Matter ID'] || row['MatterID'];
    const fieldName = row['Field Name'] || row['FieldName'];
    const fieldValue = row['Field Value'] || row['FieldValue'];
    if (matterId && fieldName) {
      if (!fieldsByMatter[matterId]) fieldsByMatter[matterId] = {};
      fieldsByMatter[matterId][fieldName] = fieldValue || '';
    }
  }

  return { contracts, fieldsByMatter, files: zipContents.files };
}

function getOrCreateUser(email: string, fullName: string): { id: string; created: boolean } {
  const db = getConnection();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase()) as { id: string } | undefined;
  if (existing) return { id: existing.id, created: false };

  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, 'legal', ?, ?)`,
  ).run(id, email.toLowerCase(), fullName || email, SENTINEL_HASH, now);
  return { id, created: true };
}

function getUserDataDir(): string {
  try {
    return require('electron').app.getPath('userData');
  } catch {
    return path.join(require('os').tmpdir(), 'legalvu-data');
  }
}

function findExistingByLawvuId(lawvuId: string): string | null {
  if (!lawvuId) return null;
  const db = getConnection();
  const rows = db.prepare('SELECT id, metadata FROM contracts WHERE ai_prompt_version = ?').all('lawvu-import') as { id: string; metadata: string }[];
  for (const row of rows) {
    try {
      const meta = JSON.parse(row.metadata);
      if (meta.lawvuId === lawvuId) return row.id;
    } catch {
      // skip unparseable
    }
  }
  return null;
}

function mapRowToContract(
  row: Record<string, string>,
  userId: string,
  fieldsByMatter: Record<string, Record<string, string>>,
  errors: ImportError[],
  rowIndex: number,
): {
  id: string;
  title: string;
  status: ContractStatus;
  counterparty: string | null;
  jurisdiction: string | null;
  content: string | null;
  metadata: string;
  createdBy: string;
  lawvuId: string;
} | null {
  try {
    const title = row.Title || row['Contract Name'] || row.Name || `Imported Contract ${rowIndex}`;
    const counterparty = row.Counterparty || row['Counter Party Name'] || row['Counterparty Name'] || null;
    const jurisdiction = row.Jurisdiction || null;
    const rawStatus = row.Status || row['Contract Status'] || '';
    const status = mapLawvuStatus(rawStatus) as ContractStatus;

    const lawvuId = row.ID || row['Matter ID'] || '';
    const contractType = row['Contract Type'] || row.Type || '';
    const description = row.Description || row.Notes || '';
    const value = row.Value || '';
    const currency = row.Currency || '';

    const customFields = lawvuId && fieldsByMatter[lawvuId] ? fieldsByMatter[lawvuId] : {};

    const metadata = JSON.stringify({
      source: 'lawvu-import',
      contractType,
      description,
      value,
      currency,
      startDate: row['Start Date'] || null,
      endDate: row['End Date'] || null,
      owner: row.Owner || null,
      ownerEmail: row['Owner Email'] || null,
      lawvuId: lawvuId || null,
      division: row.Division || null,
      tags: row.Tags || null,
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    });

    return {
      id: crypto.randomUUID(),
      title,
      status,
      counterparty,
      jurisdiction,
      content: description || null,
      metadata,
      createdBy: userId,
      lawvuId,
    };
  } catch (err) {
    errors.push({ row: rowIndex, message: `Failed to map row: ${String(err)}` });
    return null;
  }
}

function linkFileToContract(
  contractId: string,
  fileName: string,
  fileBuffer: Buffer,
): void {
  const db = getConnection();
  const documentsDir = path.join(getUserDataDir(), 'documents');
  fs.mkdirSync(documentsDir, { recursive: true });

  const docId = crypto.randomUUID();
  const localPath = path.join(documentsDir, `${docId}_${fileName}`);
  fs.writeFileSync(localPath, fileBuffer);

  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
  const now = Date.now();

  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sha256, sp_sync_status, size_bytes, contract_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'unsynced', ?, ?, ?, ?)`,
  ).run(docId, fileName, localPath, sha256, fileBuffer.length, contractId, now, now);
}

function tryLinkFile(
  row: Record<string, string>,
  contractId: string,
  files: Map<string, Buffer>,
  errors: ImportError[],
  rowIndex: number,
): boolean {
  const lawvuId = (row.ID || row['Matter ID'] || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const titleLower = (row.Title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  let linked = false;

  for (const [fileName, buffer] of files) {
    const fileLower = fileName.toLowerCase().replace(/[^a-z0-9]/g, '');

    const idMatch = lawvuId && fileLower.startsWith(lawvuId);
    const titleMatch = titleLower.length >= 5 && fileLower.startsWith(titleLower);

    if (idMatch || titleMatch) {
      try {
        linkFileToContract(contractId, fileName, buffer);
        linked = true;
      } catch (err) {
        errors.push({ row: rowIndex, message: `Failed to link file ${fileName}: ${String(err)}` });
      }
      break;
    }
  }

  return linked;
}

export function importFromZip(zipBuffer: Buffer, userId: string): ImportResult {
  const result: ImportResult = {
    ok: true,
    contractsImported: 0,
    filesImported: 0,
    usersCreated: 0,
    errors: [],
    skipped: 0,
    duplicates: 0,
  };

  if (zipBuffer.length > MAX_ZIP_SIZE) {
    result.ok = false;
    result.errors.push({ row: 0, message: `Zip file exceeds maximum size of ${MAX_ZIP_SIZE / 1024 / 1024}MB` });
    return result;
  }

  let parsed: ParsedExport;
  try {
    const zipContents = parseZipBuffer(zipBuffer);
    if (!zipContents.contractsTxt) {
      result.ok = false;
      result.errors.push({ row: 0, message: 'Contracts.txt not found in zip' });
      return result;
    }
    parsed = parseExport(zipContents);
  } catch (err) {
    result.ok = false;
    result.errors.push({ row: 0, message: `Failed to parse zip: ${String(err)}` });
    return result;
  }

  if (parsed.contracts.length === 0) {
    result.ok = false;
    result.errors.push({ row: 0, message: 'No contract rows found in Contracts.txt' });
    return result;
  }

  const db = getConnection();
  const FAILURE_THRESHOLD = Math.ceil(parsed.contracts.length * 0.5);

  const transaction = db.transaction((rows: Record<string, string>[]) => {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2;

      if (result.errors.length >= FAILURE_THRESHOLD) {
        result.errors.push({ row: rowIndex, message: 'Aborted: failure threshold (50%) reached' });
        break;
      }

      const lawvuId = row.ID || row['Matter ID'] || '';

      if (lawvuId) {
        const existing = findExistingByLawvuId(lawvuId);
        if (existing) {
          result.duplicates++;
          continue;
        }
      }

      const ownerEmail = row['Owner Email'] || row.Owner || '';
      let contractUserId = userId;
      if (ownerEmail && ownerEmail.includes('@')) {
        const ownerName = row.Owner || ownerEmail.split('@')[0];
        try {
          const userResult = getOrCreateUser(ownerEmail, ownerName);
          contractUserId = userResult.id;
          if (userResult.created) result.usersCreated++;
        } catch {
          contractUserId = userId;
        }
      }

      const mapped = mapRowToContract(row, contractUserId, parsed.fieldsByMatter, result.errors, rowIndex);
      if (!mapped) {
        result.skipped++;
        continue;
      }

      const now = Date.now();
      try {
        db.prepare(
          `INSERT INTO contracts (id, title, status, counterparty, jurisdiction, content, metadata, ai_prompt_version, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'lawvu-import', ?, ?, ?)`,
        ).run(
          mapped.id, mapped.title, mapped.status,
          mapped.counterparty, mapped.jurisdiction,
          mapped.content, mapped.metadata,
          mapped.createdBy, now, now,
        );

        result.contractsImported++;
      } catch (err) {
        result.errors.push({ row: rowIndex, message: `DB insert failed: ${String(err)}` });
        result.skipped++;
        continue;
      }

      if (parsed.files.size > 0) {
        const linked = tryLinkFile(row, mapped.id, parsed.files, result.errors, rowIndex);
        if (linked) result.filesImported++;
      }
    }
  });

  try {
    transaction(parsed.contracts);
  } catch (err) {
    result.ok = false;
    result.errors.push({ row: 0, message: `Transaction failed: ${String(err)}` });
  }

  log({
    userId,
    action: 'lawvu:import',
    entityType: 'contract',
    details: JSON.stringify({
      contracts: result.contractsImported,
      files: result.filesImported,
      users: result.usersCreated,
      duplicates: result.duplicates,
      errors: result.errors.length,
      skipped: result.skipped,
    }),
  });

  return result;
}
