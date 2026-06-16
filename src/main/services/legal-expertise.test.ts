import { describe, it, expect } from 'vitest';
import { getExpertiseForContractType, listAvailableExpertise, getAnalysisExpertise, getSummarizationExpertise } from './legal-expertise';

describe('legal-expertise', () => {
  it('listAvailableExpertise returns all cloned skills', () => {
    const skills = listAvailableExpertise();
    expect(skills.length).toBeGreaterThanOrEqual(30);
    expect(skills).toContain('confidentiality-nda');
    expect(skills).toContain('contract-analysis');
    expect(skills).toContain('executive-employment-agreement');
  });

  it('getExpertiseForContractType returns NDA expertise for "NDA"', () => {
    const expertise = getExpertiseForContractType('NDA');
    expect(expertise).not.toBeNull();
    expect(expertise!.length).toBeGreaterThan(100);
    expect(expertise!.toLowerCase()).toContain('confidential');
  });

  it('getExpertiseForContractType handles case-insensitive matching', () => {
    const lower = getExpertiseForContractType('nda');
    const upper = getExpertiseForContractType('NDA');
    const mixed = getExpertiseForContractType('Nda');
    expect(lower).not.toBeNull();
    expect(upper).not.toBeNull();
    expect(mixed).not.toBeNull();
  });

  it('getExpertiseForContractType returns employment expertise', () => {
    const expertise = getExpertiseForContractType('Employment Agreement');
    expect(expertise).not.toBeNull();
    expect(expertise!.toLowerCase()).toContain('employment');
  });

  it('getExpertiseForContractType returns consulting expertise for MSA', () => {
    const expertise = getExpertiseForContractType('MSA');
    expect(expertise).not.toBeNull();
    expect(expertise!.toLowerCase()).toContain('consult');
  });

  it('getExpertiseForContractType returns DPA expertise', () => {
    const expertise = getExpertiseForContractType('Data Processing Agreement');
    expect(expertise).not.toBeNull();
  });

  it('getExpertiseForContractType returns null for unknown type', () => {
    expect(getExpertiseForContractType('Quantum Entanglement Protocol')).toBeNull();
  });

  it('getExpertiseForContractType handles fuzzy matching', () => {
    const expertise = getExpertiseForContractType('non-disclosure agreement for employees');
    expect(expertise).not.toBeNull();
  });

  it('getAnalysisExpertise returns contract analysis framework', () => {
    const expertise = getAnalysisExpertise();
    expect(expertise.length).toBeGreaterThan(100);
    expect(expertise.toLowerCase()).toContain('risk');
  });

  it('getSummarizationExpertise returns contract summary framework', () => {
    const expertise = getSummarizationExpertise();
    expect(expertise.length).toBeGreaterThan(100);
    expect(expertise.toLowerCase()).toContain('summary');
  });
});
