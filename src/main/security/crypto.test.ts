import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, isEncryptionAvailable, setSafeStorageForTesting } from './crypto';

describe('crypto', () => {
  it('encrypt → decrypt roundtrip returns original plaintext', () => {
    const prefix = 'ENC:';
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from(prefix + s),
      decryptString: (b: Buffer) => b.toString('utf8').slice(prefix.length),
    });

    const plaintext = 'sk-test-api-key-12345';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);

    setSafeStorageForTesting(null);
  });

  it('ciphertext differs from plaintext', () => {
    const prefix = 'ENC:';
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from(prefix + s),
      decryptString: (b: Buffer) => b.toString('utf8').slice(prefix.length),
    });

    const plaintext = 'secret-key-value';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);

    setSafeStorageForTesting(null);
  });

  it('works with mocked safeStorage', () => {
    const prefix = 'ENC:';
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from(prefix + s),
      decryptString: (b: Buffer) => b.toString('utf8').slice(prefix.length),
    });

    const plaintext = 'my-api-key';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
    expect(encrypted).not.toBe(plaintext);

    setSafeStorageForTesting(null);
  });

  it('throws when safeStorage unavailable (no base64 fallback)', () => {
    setSafeStorageForTesting(null);
    expect(() => encryptSecret('fallback-test')).toThrow('OS encryption (safeStorage) is not available');
    expect(() => decryptSecret('dGVzdA==')).toThrow('OS encryption (safeStorage) is not available');
  });

  it('isEncryptionAvailable returns false without safeStorage', () => {
    setSafeStorageForTesting(null);
    expect(isEncryptionAvailable()).toBe(false);
  });

  it('isEncryptionAvailable returns true with mocked safeStorage', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from(s),
      decryptString: (b: Buffer) => b.toString('utf8'),
    });
    expect(isEncryptionAvailable()).toBe(true);
    setSafeStorageForTesting(null);
  });

  it('encryptSecret throws when safeStorage exists but isEncryptionAvailable() returns false', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => false,
      encryptString: (s: string) => Buffer.from(s),
      decryptString: (b: Buffer) => b.toString('utf8'),
    });
    expect(() => encryptSecret('test-key')).toThrow('OS encryption (safeStorage) is not available');
    setSafeStorageForTesting(null);
  });

  it('decryptSecret throws when safeStorage exists but isEncryptionAvailable() returns false', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => false,
      encryptString: (s: string) => Buffer.from(s),
      decryptString: (b: Buffer) => b.toString('utf8'),
    });
    expect(() => decryptSecret('dGVzdA==')).toThrow('OS encryption (safeStorage) is not available');
    setSafeStorageForTesting(null);
  });

  it('encryptSecret returns base64-encoded string', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from('encrypted:' + s),
      decryptString: (b: Buffer) => b.toString('utf8').replace('encrypted:', ''),
    });
    const encrypted = encryptSecret('my-secret');
    // Should be valid base64
    const decoded = Buffer.from(encrypted, 'base64').toString('utf8');
    expect(decoded).toBe('encrypted:my-secret');
    setSafeStorageForTesting(null);
  });

  it('roundtrip works with empty string', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from('ENC:' + s),
      decryptString: (b: Buffer) => b.toString('utf8').slice(4),
    });
    const encrypted = encryptSecret('');
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe('');
    setSafeStorageForTesting(null);
  });

  it('roundtrip works with unicode characters', () => {
    setSafeStorageForTesting({
      isEncryptionAvailable: () => true,
      encryptString: (s: string) => Buffer.from('ENC:' + s),
      decryptString: (b: Buffer) => b.toString('utf8').slice(4),
    });
    const plaintext = 'sk-日本語-ключ-🔑';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
    setSafeStorageForTesting(null);
  });

  it('decryptSecret throws with invalid base64 input when safeStorage unavailable', () => {
    setSafeStorageForTesting(null);
    expect(() => decryptSecret('not-valid-base64!!!')).toThrow('OS encryption (safeStorage) is not available');
  });
});
