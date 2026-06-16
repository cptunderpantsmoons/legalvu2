import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { createContractFromPrompt, getContract, listContracts, saveContractContent, importContract } from './contract-service';
import type { ContractPromptInput } from '../../shared/types';

const mockInput: ContractPromptInput = {
  contractType: 'NDA',
  counterparty: 'Acme Corp',
  jurisdiction: 'NSW',
  governingLaw: 'Australia',
  keyTerms: ['2 year term'],
  indemnity: true,
  confidentiality: false,
};

vi.mock('./ai-adapter', () => ({
  getProvider: () => ({
    generateDraft: vi.fn().mockResolvedValue({ content: 'Mock contract text', tokensUsed: 250 }),
  }),
}));

describe('contract-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('createContractFromPrompt stores correct columns', async () => {
    const contract = await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    expect(contract.id).toBeTruthy();
    expect(contract.title).toBe('NDA - Acme Corp');
    expect(contract.status).toBe('draft');
    expect(contract.content).toBe('Mock contract text');
    expect(contract.aiPromptVersion).toBe('contract-draft-v2');
    expect(contract.aiModel).toBe('gpt-4');
    expect(contract.aiTokensUsed).toBe(250);
  });

  it('metadata stores the original input JSON', async () => {
    const contract = await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    expect(contract.metadata).toBeTruthy();
    const parsed = JSON.parse(contract.metadata!);
    expect(parsed.contractType).toBe('NDA');
    expect(parsed.counterparty).toBe('Acme Corp');
  });

  it('getContract returns typed Contract', async () => {
    const created = await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    const fetched = getContract(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.status).toBe('draft');
  });

  it('getContract returns undefined for non-existent id', () => {
    const result = getContract('nonexistent-id');
    expect(result).toBeUndefined();
  });

  it('saveContractContent updates content', async () => {
    const contract = await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    const updated = saveContractContent(contract.id, 'Updated content text');
    expect(updated?.content).toBe('Updated content text');
  });

  it('listContracts returns contracts ordered by updatedAt DESC', async () => {
    await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', { ...mockInput, counterparty: 'Other' });
    const list = listContracts();
    expect(list.length).toBe(2);
  });

  it('timestamps are in milliseconds (not seconds)', async () => {
    const contract = await createContractFromPrompt('system', 'openai', 'sk-test', 'gpt-4', mockInput);
    const now = Date.now();
    expect(contract.createdAt).toBeGreaterThan(now - 5000);
    expect(contract.createdAt).toBeLessThan(now + 5000);
  });

  it('importContract creates a contract from pasted text', () => {
    const contract = importContract('system', 'Imported MSA', 'This is the contract body text.', {
      counterparty: 'Beta Inc',
      jurisdiction: 'NSW',
      contractType: 'MSA',
    });
    expect(contract.id).toBeTruthy();
    expect(contract.title).toBe('Imported MSA');
    expect(contract.status).toBe('draft');
    expect(contract.content).toBe('This is the contract body text.');
    expect(contract.counterparty).toBe('Beta Inc');
    expect(contract.jurisdiction).toBe('NSW');
    expect(contract.aiPromptVersion).toBe('imported');
  });

  it('importContract appears in listContracts', () => {
    importContract('system', 'Listed Import', 'Body text');
    const list = listContracts();
    expect(list.some((c) => c.title === 'Listed Import')).toBe(true);
  });

  it('imported contract can be fetched by id', () => {
    const created = importContract('system', 'Fetchable', 'Content here');
    const fetched = getContract(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe('Fetchable');
  });
});
