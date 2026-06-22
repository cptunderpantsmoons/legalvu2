import { beforeAll, afterEach } from "vitest";
import { setSafeStorageForTesting } from "../main/security/crypto";

const mockSafeStorage = {
  isEncryptionAvailable: () => true,
  encryptString: (s: string) => Buffer.from("ENC:" + s),
  decryptString: (b: Buffer) => b.toString("utf8").slice(4),
};

beforeAll(() => {
  if (process.env.VITEST_USE_REAL_SAFE_STORAGE !== "1") {
    setSafeStorageForTesting(mockSafeStorage);
  }
});

afterEach(() => {
  if (process.env.VITEST_USE_REAL_SAFE_STORAGE !== "1") {
    setSafeStorageForTesting(mockSafeStorage);
  }
});
