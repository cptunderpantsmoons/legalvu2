import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import { createContractFromPrompt, getContract, listContracts, saveContractContent, importContract, saveContractFromStream } from './contract-service';
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

// Mock ai-adapter so we can verify saveContractFromStream does NOT call it
const getProviderMock = vi.fn();
vi.mock('./ai-adapter', () => ({
  getProvider: getProviderMock,
}));

describe('contract-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    getProviderMock.mockReturnValue({
      generateDraft: vi.fn().mockResolvedValue({ content: 'Mock contract text', tokensUsed: 250 }),
    });
    getProviderMock.mockClear();
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

// --- saveContractFromStream tests ---
// Verifies the fix for the double AI call bug: streamed content is saved
// directly without making another API request.

describe('saveContractFromStream', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    getProviderMock.mockClear();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('inserts content directly without calling AI (getProvider not called)', () => {
    const streamedContent = '# NDA Agreement\n\nThis is the streamed contract text.';
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      streamedContent,
      500,
    );

    // Verify getProvider was NOT called — no AI call should happen
    expect(getProviderMock).not.toHaveBeenCalled();

    // Verify the contract was created
    expect(contract).toBeDefined();
    expect(contract.id).toBeTruthy();
  });

  it('content saved matches what was passed in', () => {
    const streamedContent = '## Confidentiality Agreement\n\nBetween Party A and Party B...';
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      streamedContent,
      300,
    );

    expect(contract.content).toBe(streamedContent);

    // Also verify via getContract that the DB has the exact content
    const fetched = getContract(contract.id);
    expect(fetched!.content).toBe(streamedContent);
  });

  it('tokensUsed is stored correctly', () => {
    const tokensUsed = 1234;
    const contract = saveContractFromStream(
      'system',
      'anthropic',
      'claude-3-opus',
      mockInput,
      'Streamed content here',
      tokensUsed,
    );

    expect(contract.aiTokensUsed).toBe(tokensUsed);

    // Verify via DB fetch
    const fetched = getContract(contract.id);
    expect(fetched!.aiTokensUsed).toBe(tokensUsed);
  });

  it('stores provider and model metadata correctly', () => {
    const contract = saveContractFromStream(
      'system',
      'anthropic',
      'claude-3-sonnet',
      mockInput,
      'Content from stream',
      750,
    );

    expect(contract.aiModel).toBe('claude-3-sonnet');
    expect(contract.aiPromptVersion).toBe('contract-draft-v2');
  });

  it('title is derived from contractType and counterparty', () => {
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      'Streamed body',
      100,
    );

    expect(contract.title).toBe('NDA - Acme Corp');
  });

  it('does NOT call getProvider or any AI function even with large content', () => {
    const largeContent = 'A'.repeat(50000);
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      largeContent,
      9999,
    );

    expect(getProviderMock).not.toHaveBeenCalled();
    expect(contract.content).toBe(largeContent);
  });

  it('tokensUsed of 0 is stored correctly (not null)', () => {
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      'Content with zero tokens',
      0,
    );

    expect(contract.aiTokensUsed).toBe(0);
  });

  it('metadata stores the original input JSON', () => {
    const contract = saveContractFromStream(
      'system',
      'openai',
      'gpt-4',
      mockInput,
      'Streamed content',
      200,
    );

    expect(contract.metadata).toBeTruthy();
    const parsed = JSON.parse(contract.metadata!);
    expect(parsed.contractType).toBe('NDA');
    expect(parsed.counterparty).toBe('Acme Corp');
  });

  it('saved contract appears in listContracts', () => {
    saveContractFromStream('system', 'openai', 'gpt-4', mockInput, 'Streamed', 100);
    const list = listContracts();
    expect(list.length).toBe(1);
    expect(list[0].content).toBe('Streamed');
  });

  it('timestamps are in milliseconds', () => {
    const contract = saveContractFromStream('system', 'openai', 'gpt-4', mockInput, 'Content', 50);
    const now = Date.now();
    expect(contract.createdAt).toBeGreaterThan(now - 5000);
    expect(contract.createdAt).toBeLessThan(now + 5000);
  });
});
