import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, isEncryptionAvailable, setSafeStorageForTesting } from './crypto';

describe('crypto', () => {
  it('encrypt → decrypt roundtrip returns original plaintext', () => {
    const plaintext = 'sk-test-api-key-12345';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('ciphertext differs from plaintext', () => {
    const plaintext = 'secret-key-value';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).not.toBe(plaintext);
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

  it('falls back to base64 when safeStorage unavailable', () => {
    setSafeStorageForTesting(null);
    const plaintext = 'fallback-test';
    const encrypted = encryptSecret(plaintext);
    expect(encrypted).toBe(Buffer.from(plaintext).toString('base64'));
    expect(decryptSecret(encrypted)).toBe(plaintext);
  });

  it('isEncryptionAvailable returns false without safeStorage', () => {
    setSafeStorageForTesting(null);
    expect(isEncryptionAvailable()).toBe(false);
  });
});
