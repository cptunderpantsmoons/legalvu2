import { describe, it, expect } from "vitest";
import {
  ContractGenerateSchema,
  ContractTransitionSchema,
  AuthRegisterSchema,
  AuthLoginSchema,
  SettingsSetAiKeySchema,
  SpBrowserNavigateSchema,
  ContractListSchema,
  ContractSearchSchema,
} from "./schemas";

describe("schemas", () => {
  describe("ContractGenerateSchema", () => {
    it("accepts valid payload", () => {
      const result = ContractGenerateSchema.safeParse({
        provider: "openai",
        model: "gpt-4",
        input: {
          contractType: "NDA",
          counterparty: "Acme Corp",
          jurisdiction: "NSW",
          governingLaw: "Australia",
          keyTerms: ["2 year term", "mutual"],
          indemnity: true,
          confidentiality: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid provider", () => {
      const result = ContractGenerateSchema.safeParse({
        provider: "google",
        model: "gpt-4",
        input: {
          contractType: "NDA",
          counterparty: "X",
          jurisdiction: "Y",
          governingLaw: "Z",
          keyTerms: [],
          indemnity: false,
          confidentiality: false,
        },
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty contractType", () => {
      const result = ContractGenerateSchema.safeParse({
        provider: "anthropic",
        model: "claude-3",
        input: {
          contractType: "",
          counterparty: "X",
          jurisdiction: "Y",
          governingLaw: "Z",
          keyTerms: [],
          indemnity: false,
          confidentiality: false,
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ContractTransitionSchema", () => {
    it("accepts valid status", () => {
      const result = ContractTransitionSchema.safeParse({
        id: "c1",
        target: "under_review",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = ContractTransitionSchema.safeParse({
        id: "c1",
        target: "invalid_status",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty id", () => {
      const result = ContractTransitionSchema.safeParse({
        id: "",
        target: "draft",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AuthRegisterSchema", () => {
    it("accepts valid registration", () => {
      const result = AuthRegisterSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = AuthRegisterSchema.safeParse({
        email: "not-an-email",
        password: "password123",
        fullName: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("rejects short password", () => {
      const result = AuthRegisterSchema.safeParse({
        email: "test@example.com",
        password: "short",
        fullName: "Test",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AuthLoginSchema", () => {
    it("accepts valid login", () => {
      const result = AuthLoginSchema.safeParse({
        email: "a@b.com",
        password: "pass",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = AuthLoginSchema.safeParse({
        email: "bad",
        password: "pass",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SettingsSetAiKeySchema", () => {
    it("accepts non-empty key", () => {
      const result = SettingsSetAiKeySchema.safeParse({ apiKey: "sk-xxx" });
      expect(result.success).toBe(true);
    });

    it("rejects empty key", () => {
      const result = SettingsSetAiKeySchema.safeParse({ apiKey: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("SpBrowserNavigateSchema", () => {
    it("accepts valid URL", () => {
      const result = SpBrowserNavigateSchema.safeParse({
        url: "https://example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid URL", () => {
      const result = SpBrowserNavigateSchema.safeParse({ url: "not-a-url" });
      expect(result.success).toBe(false);
    });

    it("rejects http:// URL (must be HTTPS)", () => {
      const result = SpBrowserNavigateSchema.safeParse({
        url: "http://example.com",
      });
      expect(result.success).toBe(false);
    });

    it("rejects ftp:// URL (must be HTTPS)", () => {
      const result = SpBrowserNavigateSchema.safeParse({
        url: "ftp://example.com",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("ContractListSchema", () => {
    it("accepts empty payload", () => {
      const result = ContractListSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts valid limit and offset", () => {
      const result = ContractListSchema.safeParse({ limit: 50, offset: 100 });
      expect(result.success).toBe(true);
    });

    it("rejects limit above 100", () => {
      const result = ContractListSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("rejects limit below 1", () => {
      const result = ContractListSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer limit", () => {
      const result = ContractListSchema.safeParse({ limit: 50.5 });
      expect(result.success).toBe(false);
    });

    it("rejects offset below 0", () => {
      const result = ContractListSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });

    it("rejects offset above 10000", () => {
      const result = ContractListSchema.safeParse({ offset: 10001 });
      expect(result.success).toBe(false);
    });
  });

  describe("ContractSearchSchema", () => {
    it("accepts valid query", () => {
      const result = ContractSearchSchema.safeParse({
        query: "NDA confidentiality",
      });
      expect(result.success).toBe(true);
    });

    it("accepts query with optional limit", () => {
      const result = ContractSearchSchema.safeParse({
        query: "test",
        limit: 50,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty query", () => {
      const result = ContractSearchSchema.safeParse({ query: "" });
      expect(result.success).toBe(false);
    });

    it("rejects query longer than 200 chars", () => {
      const result = ContractSearchSchema.safeParse({ query: "a".repeat(201) });
      expect(result.success).toBe(false);
    });

    it("accepts query of exactly 200 chars", () => {
      const result = ContractSearchSchema.safeParse({ query: "a".repeat(200) });
      expect(result.success).toBe(true);
    });

    it("rejects limit below 1", () => {
      const result = ContractSearchSchema.safeParse({
        query: "test",
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects limit above 100", () => {
      const result = ContractSearchSchema.safeParse({
        query: "test",
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer limit", () => {
      const result = ContractSearchSchema.safeParse({
        query: "test",
        limit: 50.5,
      });
      expect(result.success).toBe(false);
    });
  });
});
