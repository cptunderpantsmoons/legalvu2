import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile, exec } from 'child_process';
import { promisify } from 'util';
import { marked } from 'marked';
import { getConnection } from '../database/connection';
import { getContract } from './contract-service';
import { log } from './audit-service';

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);

const DOCX_SKILL_DIR = '/a0/skills/minimax-docx/scripts/dotnet';
const PDF_SKILL_DIR = '/a0/skills/minimax-pdf';

interface ContentBlock {
  type: string;
  text?: string;
  headers?: string[];
  rows?: string[][];
}

export function parseMarkdownToContentJson(md: string): ContentBlock[] {
  const tokens = marked.lexer(md);
  const blocks: ContentBlock[] = [];

  for (const token of tokens) {
    switch (token.type) {
      case 'heading': {
        const level = Math.min((token as { depth: number }).depth, 3);
        blocks.push({ type: `h${level}`, text: (token as { text: string }).text });
        break;
      }
      case 'paragraph': {
        blocks.push({ type: 'body', text: (token as { text: string }).text });
        break;
      }
      case 'list': {
        const listToken = token as { ordered: boolean; items: { tokens: unknown[] }[] };
        const blockType = listToken.ordered ? 'numbered' : 'bullet';
        for (const item of listToken.items) {
          const text = extractText(item.tokens);
          if (text) blocks.push({ type: blockType, text });
        }
        break;
      }
      case 'code': {
        blocks.push({ type: 'code', text: (token as { text: string }).text });
        break;
      }
      case 'hr': {
        blocks.push({ type: 'divider' });
        break;
      }
      case 'space':
        break;
      default:
        break;
    }
  }

  return blocks;
}

function extractText(tokens: unknown[] | undefined): string {
  if (!tokens) return '';
  return tokens
    .map((t) => {
      const token = t as { type: string; text?: string; raw?: string; tokens?: unknown[] };
      if (token.text) return token.text;
      if (token.raw) return token.raw;
      if (token.tokens) return extractText(token.tokens);
      return '';
    })
    .join('')
    .trim();
}

function computeSha256(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function insertDocumentRecord(
  contractId: string,
  filename: string,
  localPath: string,
  sizeBytes: number,
  userId: string,
): void {
  const db = getConnection();
  const id = crypto.randomUUID();
  const now = Date.now();
  const sha256 = computeSha256(localPath);

  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sha256, sp_sync_status, size_bytes, contract_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'unsynced', ?, ?, ?, ?)`,
  ).run(id, filename, localPath, sha256, sizeBytes, contractId, now, now);

  log({
    userId,
    action: 'document:export',
    entityType: 'contract',
    entityId: contractId,
    details: JSON.stringify({ format: filename.endsWith('.pdf') ? 'pdf' : 'docx', filename, sha256 }),
  });
}

export async function exportContractToDocx(contractId: string, userId: string): Promise<string> {
  const contract = getContract(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  if (!contract.content) throw new Error('Contract has no content to export');

  const blocks = parseMarkdownToContentJson(contract.content);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legalvu-export-'));
  const contentJsonPath = path.join(tempDir, 'content.json');
  fs.writeFileSync(contentJsonPath, JSON.stringify(blocks));

  const userDataPath = (() => {
    try {
      return require('electron').app.getPath('userData');
    } catch {
      return path.join(require('os').tmpdir(), 'legalvu-data');
    }
  })();
  const exportDir = path.join(userDataPath, 'documents');
  fs.mkdirSync(exportDir, { recursive: true });
  const outputPath = path.join(exportDir, `${contractId}.docx`);

  try {
    await execFileAsync(
      'dotnet',
      [
        'run',
        '--project',
        path.join(DOCX_SKILL_DIR, 'MiniMaxAIDocx.Cli'),
        '--',
        'create',
        '--type',
        'report',
        '--title',
        contract.title,
        '--output',
        outputPath,
        '--content-json',
        contentJsonPath,
      ],
      { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const stats = fs.statSync(outputPath);
  insertDocumentRecord(contractId, `${contractId}.docx`, outputPath, stats.size, userId);

  return outputPath;
}

export async function exportContractToPdf(contractId: string, userId: string): Promise<string> {
  const contract = getContract(contractId);
  if (!contract) throw new Error(`Contract not found: ${contractId}`);
  if (!contract.content) throw new Error('Contract has no content to export');

  const blocks = parseMarkdownToContentJson(contract.content);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legalvu-pdf-'));
  const contentJsonPath = path.join(tempDir, 'content.json');
  fs.writeFileSync(contentJsonPath, JSON.stringify(blocks));

  const userDataPath = (() => {
    try {
      return require('electron').app.getPath('userData');
    } catch {
      return path.join(require('os').tmpdir(), 'legalvu-data');
    }
  })();
  const exportDir = path.join(userDataPath, 'documents');
  fs.mkdirSync(exportDir, { recursive: true });
  const outputPath = path.join(exportDir, `${contractId}.pdf`);

  try {
    await execAsync(
      `bash scripts/make.sh run --type report --title "${contract.title.replace(/"/g, '\\"')}" --content-json ${contentJsonPath} --out ${outputPath}`,
      { cwd: PDF_SKILL_DIR, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  const stats = fs.statSync(outputPath);
  insertDocumentRecord(contractId, `${contractId}.pdf`, outputPath, stats.size, userId);

  return outputPath;
}
