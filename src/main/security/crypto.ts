let safeStorage: { encryptString: (s: string) => Buffer; decryptString: (b: Buffer) => string; isEncryptionAvailable: () => boolean } | null = null;

function getSafeStorage() {
  if (safeStorage) return safeStorage;
  try {
    const electron = require('electron');
    if (electron?.safeStorage) {
      safeStorage = electron.safeStorage;
      return safeStorage;
    }
  } catch {
    // Electron not available (test environment)
  }
  return null;
}

export function isEncryptionAvailable(): boolean {
  const storage = getSafeStorage();
  return storage ? storage.isEncryptionAvailable() : false;
}

export function encryptSecret(plaintext: string): string {
  const storage = getSafeStorage();
  if (storage && storage.isEncryptionAvailable()) {
    return storage.encryptString(plaintext).toString('base64');
  }
  // Fallback for test environments without OS keychain
  return Buffer.from(plaintext).toString('base64');
}

export function decryptSecret(ciphertext: string): string {
  const storage = getSafeStorage();
  if (storage && storage.isEncryptionAvailable()) {
    return storage.decryptString(Buffer.from(ciphertext, 'base64'));
  }
  // Fallback for test environments
  return Buffer.from(ciphertext, 'base64').toString('utf8');
}

export function setSafeStorageForTesting(mock: typeof safeStorage): void {
  safeStorage = mock;
}
