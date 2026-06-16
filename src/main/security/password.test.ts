import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hashPassword returns a hash different from plaintext', () => {
    const hash = hashPassword('testPassword123');
    expect(hash).not.toBe('testPassword123');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifyPassword returns true for correct password', () => {
    const hash = hashPassword('mySecretPass');
    expect(verifyPassword('mySecretPass', hash)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', () => {
    const hash = hashPassword('correctPassword');
    expect(verifyPassword('wrongPassword', hash)).toBe(false);
  });

  it('verifyPassword returns false for empty hash', () => {
    expect(verifyPassword('anything', '')).toBe(false);
  });

  it('same password produces different hashes (salt)', () => {
    const hash1 = hashPassword('samePass');
    const hash2 = hashPassword('samePass');
    expect(hash1).not.toBe(hash2);
    expect(verifyPassword('samePass', hash1)).toBe(true);
    expect(verifyPassword('samePass', hash2)).toBe(true);
  });
});
