import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb, teardownTestDb } from "../database/test-db";
import { migrate } from "../database/migrations";
import { importContract } from "./contract-service";
import {
  parseMarkdownToContentJson,
  exportContractToDocx,
  exportContractToPdf,
} from "./document-service";

describe("document-service", () => {
  describe("parseMarkdownToContentJson", () => {
    it("parses headings", () => {
      const md = "# Title\n## Section\n### Subsection";
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.find((b) => b.type === "h1")?.text).toBe("Title");
      expect(blocks.find((b) => b.type === "h2")?.text).toBe("Section");
      expect(blocks.find((b) => b.type === "h3")?.text).toBe("Subsection");
    });

    it("parses paragraphs as body blocks", () => {
      const md = "This is a paragraph.";
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.length).toBe(1);
      expect(blocks[0].type).toBe("body");
      expect(blocks[0].text).toContain("This is a paragraph");
    });

    it("parses unordered lists as bullet blocks", () => {
      const md = "- First item\n- Second item\n- Third item";
      const blocks = parseMarkdownToContentJson(md);
      const bullets = blocks.filter((b) => b.type === "bullet");
      expect(bullets.length).toBe(3);
      expect(bullets[0].text).toContain("First item");
    });

    it("parses ordered lists as numbered blocks", () => {
      const md = "1. First\n2. Second\n3. Third";
      const blocks = parseMarkdownToContentJson(md);
      const numbered = blocks.filter((b) => b.type === "numbered");
      expect(numbered.length).toBe(3);
    });

    it("parses horizontal rules as dividers", () => {
      const md = "Before\n\n---\n\nAfter";
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === "divider")).toBe(true);
    });

    it("parses code blocks", () => {
      const md = "```\nconst x = 1;\n```";
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === "code")).toBe(true);
    });

    it("handles mixed content correctly", () => {
      const md = `# Contract Title

This is the intro paragraph.

## Terms

- Term one
- Term two

1. Numbered item`;
      const blocks = parseMarkdownToContentJson(md);
      expect(blocks.some((b) => b.type === "h1")).toBe(true);
      expect(blocks.some((b) => b.type === "h2")).toBe(true);
      expect(blocks.some((b) => b.type === "body")).toBe(true);
      expect(blocks.filter((b) => b.type === "bullet").length).toBe(2);
      expect(blocks.filter((b) => b.type === "numbered").length).toBe(1);
    });

    it("handles empty markdown", () => {
      const blocks = parseMarkdownToContentJson("");
      expect(blocks.length).toBe(0);
    });
  });

  describe("exportContractToDocx", () => {
    beforeEach(() => {
      createTestDb();
      migrate();
    });

    afterEach(() => {
      teardownTestDb();
    });

    it("throws when contract not found", async () => {
      await expect(
        exportContractToDocx("nonexistent-id", "system"),
      ).rejects.toThrow("Contract not found");
    });

    it("throws when contract has no content", async () => {
      // Insert a contract with NULL content via direct DB access
      const { getConnection } = await import("../database/connection");
      const db = getConnection();
      const now = Date.now();
      db.prepare(
        `INSERT INTO contracts (id, title, status, content, created_by, created_at, updated_at)
         VALUES (?, ?, 'draft', NULL, 'system', ?, ?)`,
      ).run("no-content-1", "No Content", now, now);

      await expect(
        exportContractToDocx("no-content-1", "system"),
      ).rejects.toThrow("no content to export");
    });
  });

  describe("exportContractToPdf", () => {
    beforeEach(() => {
      createTestDb();
      migrate();
    });

    afterEach(() => {
      teardownTestDb();
    });

    it("throws when contract not found", async () => {
      await expect(
        exportContractToPdf("nonexistent-id", "system"),
      ).rejects.toThrow("Contract not found");
    });

    it("throws when contract has no content", async () => {
      const { getConnection } = await import("../database/connection");
      const db = getConnection();
      const now = Date.now();
      db.prepare(
        `INSERT INTO contracts (id, title, status, content, created_by, created_at, updated_at)
         VALUES (?, ?, 'draft', NULL, 'system', ?, ?)`,
      ).run("no-content-2", "No Content", now, now);

      await expect(
        exportContractToPdf("no-content-2", "system"),
      ).rejects.toThrow("no content to export");
    });
  });

  describe("export with valid contract (error path — external tools unavailable)", () => {
    beforeEach(() => {
      createTestDb();
      migrate();
    });

    afterEach(() => {
      teardownTestDb();
    });

    it("exportContractToDocx fails gracefully when dotnet is not installed", async () => {
      const contract = importContract(
        "system",
        "Test NDA",
        "# NDA\n\nThis is a test contract.",
      );
      // The export will fail because dotnet/bash skill scripts are not available
      // in the test environment. We verify it throws (doesn't hang or return garbage).
      await expect(
        exportContractToDocx(contract.id, "system"),
      ).rejects.toThrow();
    });
  });
});
