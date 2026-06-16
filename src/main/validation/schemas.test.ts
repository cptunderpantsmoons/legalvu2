import { describe, it, expect } from 'vitest';
import {
  ContractGenerateSchema,
  ContractTransitionSchema,
  AuthRegisterSchema,
  AuthLoginSchema,
  SettingsSetAiKeySchema,
  SpBrowserNavigateSchema,
} from './schemas';

describe('schemas', () => {
  describe('ContractGenerateSchema', () => {
    it('accepts valid payload', () => {
      const result = ContractGenerateSchema.safeParse({
        provider: 'openai',
        model: 'gpt-4',
        input: {
          contractType: 'NDA',
          counterparty: 'Acme Corp',
          jurisdiction: 'NSW',
          governingLaw: 'Australia',
          keyTerms: ['2 year term', 'mutual'],
          indemnity: true,
          confidentiality: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid provider', () => {
      const result = ContractGenerateSchema.safeParse({
        provider: 'google',
        model: 'gpt-4',
        input: { contractType: 'NDA', counterparty: 'X', jurisdiction: 'Y', governingLaw: 'Z', keyTerms: [], indemnity: false, confidentiality: false },
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty contractType', () => {
      const result = ContractGenerateSchema.safeParse({
        provider: 'anthropic',
        model: 'claude-3',
        input: { contractType: '', counterparty: 'X', jurisdiction: 'Y', governingLaw: 'Z', keyTerms: [], indemnity: false, confidentiality: false },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ContractTransitionSchema', () => {
    it('accepts valid status', () => {
      const result = ContractTransitionSchema.safeParse({ id: 'c1', target: 'under_review' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = ContractTransitionSchema.safeParse({ id: 'c1', target: 'invalid_status' });
      expect(result.success).toBe(false);
    });

    it('rejects empty id', () => {
      const result = ContractTransitionSchema.safeParse({ id: '', target: 'draft' });
      expect(result.success).toBe(false);
    });
  });

  describe('AuthRegisterSchema', () => {
    it('accepts valid registration', () => {
      const result = AuthRegisterSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = AuthRegisterSchema.safeParse({
        email: 'not-an-email',
        password: 'password123',
        fullName: 'Test',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = AuthRegisterSchema.safeParse({
        email: 'test@example.com',
        password: 'short',
        fullName: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AuthLoginSchema', () => {
    it('accepts valid login', () => {
      const result = AuthLoginSchema.safeParse({ email: 'a@b.com', password: 'pass' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = AuthLoginSchema.safeParse({ email: 'bad', password: 'pass' });
      expect(result.success).toBe(false);
    });
  });

  describe('SettingsSetAiKeySchema', () => {
    it('accepts non-empty key', () => {
      const result = SettingsSetAiKeySchema.safeParse({ apiKey: 'sk-xxx' });
      expect(result.success).toBe(true);
    });

    it('rejects empty key', () => {
      const result = SettingsSetAiKeySchema.safeParse({ apiKey: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('SpBrowserNavigateSchema', () => {
    it('accepts valid URL', () => {
      const result = SpBrowserNavigateSchema.safeParse({ url: 'https://example.com' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL', () => {
      const result = SpBrowserNavigateSchema.safeParse({ url: 'not-a-url' });
      expect(result.success).toBe(false);
    });
  });
});
