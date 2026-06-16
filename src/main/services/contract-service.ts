import crypto from 'crypto';
import { getConnection } from '../database/connection';
import { getProvider } from './ai-adapter';
import { buildContractPrompt, PROMPT_VERSION, type ContractPromptInput } from './prompts';
import { rowToContract } from '../database/mappers';
import type { Contract } from '../../shared/types';

export async function createContractFromPrompt(
  userId: string,
  provider: 'openai' | 'anthropic',
  apiKey: string,
  model: string,
  input: ContractPromptInput,
): Promise<Contract> {
  const db = getConnection();
  const ai = getProvider(provider);
  const prompt = buildContractPrompt(input);
  const result = await ai.generateDraft(prompt, apiKey, model);

  const id = crypto.randomUUID();
  const now = Date.now();
  const title = `${input.contractType} - ${input.counterparty}`;

  db.prepare(
    `INSERT INTO contracts
      (id, title, status, counterparty, jurisdiction, content, metadata, ai_prompt_version, ai_model, ai_tokens_used, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    title,
    'draft',
    input.counterparty,
    input.jurisdiction,
    result.content,
    JSON.stringify(input),
    PROMPT_VERSION,
    model,
    result.tokensUsed ?? null,
    userId,
    now,
    now,
  );

  return getContract(id)!;
}

export function getContract(id: string): Contract | undefined {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToContract(row) : undefined;
}

export function listContracts(): Contract[] {
  const db = getConnection();
  const rows = db.prepare('SELECT * FROM contracts ORDER BY updated_at DESC').all() as Record<string, unknown>[];
  return rows.map(rowToContract);
}

export function saveContractContent(id: string, content: string): Contract | undefined {
  const db = getConnection();
  const now = Date.now();
  db.prepare('UPDATE contracts SET content = ?, updated_at = ? WHERE id = ?').run(content, now, id);
  return getContract(id);
}

export function importContract(
  userId: string,
  title: string,
  content: string,
  metadata?: { counterparty?: string; jurisdiction?: string; contractType?: string },
): Contract {
  const db = getConnection();
  const id = crypto.randomUUID();
  const now = Date.now();

  db.prepare(
    `INSERT INTO contracts
      (id, title, status, counterparty, jurisdiction, content, metadata, ai_prompt_version, created_by, created_at, updated_at)
     VALUES (?, ?, 'draft', ?, ?, ?, ?, 'imported', ?, ?, ?)`,
  ).run(
    id,
    title,
    metadata?.counterparty ?? null,
    metadata?.jurisdiction ?? null,
    content,
    JSON.stringify({ source: 'import', ...metadata }),
    userId,
    now,
    now,
  );

  return getContract(id)!;
}
