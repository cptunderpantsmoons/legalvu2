import crypto from 'crypto';
import { getConnection } from '../database/connection';
import { getProvider } from './ai-adapter';
import { buildContractPrompt, PROMPT_VERSION, type ContractPromptInput } from './prompts';
import { rowToContract } from '../database/mappers';
import { log } from './audit-service';
import { NotFoundError, ExternalServiceError } from '../errors';
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

  const contract = db.transaction(() => {
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

    const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) throw new Error('Failed to insert contract');
    return rowToContract(row);
  })();

  log({
    userId,
    action: 'contract:create',
    entityType: 'contract',
    entityId: contract.id,
    details: JSON.stringify({
      promptVersion: PROMPT_VERSION,
      model,
      tokensUsed: contract.aiTokensUsed ?? 0,
    }),
  });

  return contract;
}

/**
 * Save a contract using already-streamed content — does NOT make another AI call.
 * Use this after streaming to avoid the double API call bug.
 */
export function saveContractFromStream(
  userId: string,
  provider: 'openai' | 'anthropic',
  model: string,
  input: ContractPromptInput,
  content: string,
  tokensUsed: number,
): Contract {
  const db = getConnection();
  const id = crypto.randomUUID();
  const now = Date.now();
  const title = `${input.contractType} - ${input.counterparty}`;

  const contract = db.transaction(() => {
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
      content,
      JSON.stringify(input),
      PROMPT_VERSION,
      model,
      tokensUsed ?? null,
      userId,
      now,
      now,
    );

    const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) throw new Error('Failed to insert contract from stream');
    return rowToContract(row);
  })();

  log({
    userId,
    action: 'contract:create',
    entityType: 'contract',
    entityId: contract.id,
    details: JSON.stringify({
      promptVersion: PROMPT_VERSION,
      model,
      tokensUsed,
      streamed: true,
    }),
  });

  return contract;
}

export function getContract(id: string): Contract | undefined {
  const db = getConnection();
  const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToContract(row) : undefined;
}

export function listContracts(limit: number = 100, offset: number = 0): Contract[] {
  const db = getConnection();
  const rows = db.prepare('SELECT * FROM contracts ORDER BY updated_at DESC LIMIT ? OFFSET ?').all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToContract);
}

export function saveContractContent(id: string, content: string): Contract | undefined {
  const db = getConnection();
  const now = Date.now();
  db.prepare('UPDATE contracts SET content = ?, updated_at = ? WHERE id = ?').run(content, now, id);
  const contract = getContract(id);
  if (contract) {
    log({
      userId: contract.createdBy,
      action: 'contract:save',
      entityType: 'contract',
      entityId: id,
    });
  }
  return contract;
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

  const contract = db.transaction(() => {
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

    const row = db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) throw new NotFoundError('Failed to import contract');
    return rowToContract(row);
  })();

  log({
    userId,
    action: 'contract:import',
    entityType: 'contract',
    entityId: contract.id,
    details: JSON.stringify({ title }),
  });

  return contract;
}