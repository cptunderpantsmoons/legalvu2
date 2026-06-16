import { describe, it, expect } from 'vitest';
import { buildContractPrompt, buildAnalysisPrompt, buildSummarizationPrompt, PROMPT_VERSION, sanitizeContractInput } from './prompts';

describe('prompts (v2 with expertise)', () => {
  it('PROMPT_VERSION is v2', () => {
    expect(PROMPT_VERSION).toBe('contract-draft-v2');
  });

  it('buildContractPrompt injects expertise for NDA into system prompt', () => {
    const prompt = buildContractPrompt({
      contractType: 'NDA',
      counterparty: 'Acme Corp',
      jurisdiction: 'NSW',
      governingLaw: 'Australia',
      keyTerms: ['2 year term'],
      indemnity: true,
      confidentiality: true,
    });
    expect(prompt.system).toContain('corporate legal assistant');
    expect(prompt.system).toContain('Confidentiality');
    expect(prompt.system.length).toBeGreaterThan(500);
  });

  it('buildContractPrompt falls back to base prompt for unknown type', () => {
    const prompt = buildContractPrompt({
      contractType: 'Unknown Contract Type XYZ',
      counterparty: 'X',
      jurisdiction: 'Y',
      governingLaw: 'Z',
      keyTerms: [],
      indemnity: false,
      confidentiality: false,
    });
    expect(prompt.system).toContain('corporate legal assistant');
    expect(prompt.system.length).toBeLessThan(600);
  });

  it('buildAnalysisPrompt includes analysis framework', () => {
    const prompt = buildAnalysisPrompt('Some contract text here', 'buyer');
    expect(prompt.system).toContain('contract analysis');
    expect(prompt.system).toContain('Risk');
    expect(prompt.user).toContain('Some contract text here');
    expect(prompt.user).toContain('buyer');
    expect(prompt.version).toBe('contract-analysis-v1');
  });

  it('buildSummarizationPrompt includes summary framework', () => {
    const prompt = buildSummarizationPrompt('Contract body text');
    expect(prompt.system).toContain('summary');
    expect(prompt.user).toContain('Contract body text');
    expect(prompt.version).toBe('contract-summary-v1');
  });

  it('sanitizeContractInput strips control characters', () => {
    const cleaned = sanitizeContractInput({
      contractType: 'NDA\x00\x01',
      counterparty: 'Corp',
      jurisdiction: 'NSW',
      governingLaw: 'AU',
      keyTerms: [],
      indemnity: false,
      confidentiality: false,
    });
    expect(cleaned.contractType).not.toContain('\x00');
  });
});
