import crypto from 'crypto';
import { getConnection } from '../database/connection';
import { getProvider } from './ai-adapter';
import { buildContractPrompt, type ContractPromptInput } from './prompts';

export async function createContractFromPrompt(
  userId: string,
  provider: 'openai' | 'anthropic',
  apiKey: string,
  model: string,
  input: ContractPromptInput,
): Promise<string> {
  const db = getConnection();
  const ai = getProvider(provider);
  const prompt = buildContractPrompt(input);
  const draft = await ai.generateDraft(prompt, apiKey, model);
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    `INSERT INTO contracts (id, title, status, counterparty, jurisdiction, content, ai_prompt_version, ai_model, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, `${input.contractType} - ${input.counterparty}`, 'draft', input.counterparty, input.jurisdiction, draft, JSON.stringify(input), model, userId, now, now);
  return id;
}

export function getContract(id: string): Record<string, unknown> | undefined {
  const db = getConnection();
  return db.prepare('SELECT * FROM contracts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
}
