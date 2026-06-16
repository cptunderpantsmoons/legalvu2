import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDb, teardownTestDb } from '../database/test-db';
import { migrate } from '../database/migrations';
import {
  seedDefaultTemplates,
  listTemplates,
  getTemplate,
  createCustomTemplate,
  deleteTemplate,
  generateContractFromTemplate,
} from './template-service';
import { getContract } from './contract-service';

describe('template-service', () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it('seedDefaultTemplates creates 10 default templates', () => {
    seedDefaultTemplates('system');
    const templates = listTemplates();
    expect(templates.length).toBe(10);
    expect(templates.every((t) => t.isDefault)).toBe(true);
  });

  it('seedDefaultTemplates is idempotent (no duplicates on re-run)', () => {
    seedDefaultTemplates('system');
    seedDefaultTemplates('system');
    const templates = listTemplates();
    expect(templates.length).toBe(10);
  });

  it('listTemplates returns templates sorted by name', () => {
    seedDefaultTemplates('system');
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  it('getTemplate returns template with variables and content', () => {
    seedDefaultTemplates('system');
    const templates = listTemplates();
    const detail = getTemplate(templates[0].id);
    expect(detail).toBeDefined();
    expect(detail!.content).toBeTruthy();
    expect(detail!.variables.length).toBeGreaterThan(0);
  });

  it('getTemplate returns undefined for non-existent id', () => {
    expect(getTemplate('ghost-id')).toBeUndefined();
  });

  it('createCustomTemplate stores template with extracted variables', () => {
    const tmpl = createCustomTemplate('system', 'My Custom NDA', 'Agreement between {{partyA}} and {{partyB}}', 'Custom', 'NDA');
    expect(tmpl.id).toBeTruthy();
    expect(tmpl.name).toBe('My Custom NDA');
    expect(tmpl.isDefault).toBe(false);

    const detail = getTemplate(tmpl.id);
    expect(detail!.variables).toContain('partyA');
    expect(detail!.variables).toContain('partyB');
  });

  it('deleteTemplate removes custom template', () => {
    const tmpl = createCustomTemplate('system', 'To Delete', 'Content {{var}}');
    deleteTemplate(tmpl.id);
    expect(getTemplate(tmpl.id)).toBeUndefined();
  });

  it('deleteTemplate throws for default templates', () => {
    seedDefaultTemplates('system');
    const templates = listTemplates();
    expect(() => deleteTemplate(templates[0].id)).toThrow('Cannot delete a default template');
  });

  it('generateContractFromTemplate creates contract with filled content', () => {
    seedDefaultTemplates('system');
    const templates = listTemplates();
    const ndaTemplate = templates.find((t) => t.name.includes('NDA'));
    expect(ndaTemplate).toBeDefined();

    const contractId = generateContractFromTemplate(
      'system',
      ndaTemplate!.id,
      { partyA: 'Acme Corp', partyB: 'Beta Inc', date: '2025-01-15', term: '2 years', jurisdiction: 'NSW, Australia' },
      'NDA - Acme vs Beta',
    );

    const contract = getContract(contractId);
    expect(contract).toBeDefined();
    expect(contract!.title).toBe('NDA - Acme vs Beta');
    expect(contract!.content).toContain('Acme Corp');
    expect(contract!.content).toContain('Beta Inc');
    expect(contract!.content).toContain('NSW, Australia');
    expect(contract!.content).not.toContain('{{partyA}}');
  });

  it('generateContractFromTemplate throws for non-existent template', () => {
    expect(() => generateContractFromTemplate('system', 'ghost', {}, 'Title')).toThrow('not found');
  });
});
