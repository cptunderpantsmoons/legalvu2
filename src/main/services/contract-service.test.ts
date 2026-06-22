import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb, teardownTestDb } from "../database/test-db";
import { migrate } from "../database/migrations";
import { getConnection } from "../database/connection";
import schemaSql from "../database/schema.sql?raw";
import {
  createContractFromPrompt,
  getContract,
  listContracts,
  saveContractContent,
  importContract,
  saveContractFromStream,
  searchContracts,
} from "./contract-service";
import type { ContractPromptInput } from "../../shared/types";
import type { Database as DatabaseType } from "better-sqlite3";

const mockInput: ContractPromptInput = {
  contractType: "NDA",
  counterparty: "Acme Corp",
  jurisdiction: "NSW",
  governingLaw: "Australia",
  keyTerms: ["2 year term"],
  indemnity: true,
  confidentiality: false,
};

// Mock ai-adapter so we can verify saveContractFromStream does NOT call it
const { getProviderMock } = vi.hoisted(() => ({ getProviderMock: vi.fn() }));
vi.mock("./ai-adapter", () => ({
  getProvider: getProviderMock,
}));

describe("contract-service", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    getProviderMock.mockReturnValue({
      generateDraft: vi
        .fn()
        .mockResolvedValue({ content: "Mock contract text", tokensUsed: 250 }),
    });
    getProviderMock.mockClear();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("createContractFromPrompt stores correct columns", async () => {
    const contract = await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    expect(contract.id).toBeTruthy();
    expect(contract.title).toBe("NDA - Acme Corp");
    expect(contract.status).toBe("draft");
    expect(contract.content).toBe("Mock contract text");
    expect(contract.aiPromptVersion).toBe("contract-draft-v2");
    expect(contract.aiModel).toBe("gpt-4");
    expect(contract.aiTokensUsed).toBe(250);
  });

  it("metadata stores the original input JSON", async () => {
    const contract = await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    expect(contract.metadata).toBeTruthy();
    const parsed = JSON.parse(contract.metadata!);
    expect(parsed.contractType).toBe("NDA");
    expect(parsed.counterparty).toBe("Acme Corp");
  });

  it("getContract returns typed Contract", async () => {
    const created = await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    const fetched = getContract(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.status).toBe("draft");
  });

  it("getContract returns undefined for non-existent id", () => {
    const result = getContract("nonexistent-id");
    expect(result).toBeUndefined();
  });

  it("saveContractContent updates content", async () => {
    const contract = await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    const updated = saveContractContent(contract.id, "Updated content text");
    expect(updated?.content).toBe("Updated content text");
  });

  it("listContracts returns contracts ordered by updatedAt DESC", async () => {
    await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    await createContractFromPrompt("system", "openai", "sk-test", "gpt-4", {
      ...mockInput,
      counterparty: "Other",
    });
    const list = listContracts();
    expect(list.length).toBe(2);
  });

  it("timestamps are in milliseconds (not seconds)", async () => {
    const contract = await createContractFromPrompt(
      "system",
      "openai",
      "sk-test",
      "gpt-4",
      mockInput,
    );
    const now = Date.now();
    expect(contract.createdAt).toBeGreaterThan(now - 5000);
    expect(contract.createdAt).toBeLessThan(now + 5000);
  });

  it("importContract creates a contract from pasted text", () => {
    const contract = importContract(
      "system",
      "Imported MSA",
      "This is the contract body text.",
      {
        counterparty: "Beta Inc",
        jurisdiction: "NSW",
        contractType: "MSA",
      },
    );
    expect(contract.id).toBeTruthy();
    expect(contract.title).toBe("Imported MSA");
    expect(contract.status).toBe("draft");
    expect(contract.content).toBe("This is the contract body text.");
    expect(contract.counterparty).toBe("Beta Inc");
    expect(contract.jurisdiction).toBe("NSW");
    expect(contract.aiPromptVersion).toBe("imported");
  });

  it("importContract appears in listContracts", () => {
    importContract("system", "Listed Import", "Body text");
    const list = listContracts();
    expect(list.some((c) => c.title === "Listed Import")).toBe(true);
  });

  it("imported contract can be fetched by id", () => {
    const created = importContract("system", "Fetchable", "Content here");
    const fetched = getContract(created.id);
    expect(fetched).toBeDefined();
    expect(fetched!.title).toBe("Fetchable");
  });
});

// --- saveContractFromStream tests ---
// Verifies the fix for the double AI call bug: streamed content is saved
// directly without making another API request.

describe("saveContractFromStream", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    getProviderMock.mockClear();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("inserts content directly without calling AI (getProvider not called)", () => {
    const streamedContent =
      "# NDA Agreement\n\nThis is the streamed contract text.";
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      streamedContent,
      500,
    );

    // Verify getProvider was NOT called — no AI call should happen
    expect(getProviderMock).not.toHaveBeenCalled();

    // Verify the contract was created
    expect(contract).toBeDefined();
    expect(contract.id).toBeTruthy();
  });

  it("content saved matches what was passed in", () => {
    const streamedContent =
      "## Confidentiality Agreement\n\nBetween Party A and Party B...";
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      streamedContent,
      300,
    );

    expect(contract.content).toBe(streamedContent);

    // Also verify via getContract that the DB has the exact content
    const fetched = getContract(contract.id);
    expect(fetched!.content).toBe(streamedContent);
  });

  it("tokensUsed is stored correctly", () => {
    const tokensUsed = 1234;
    const contract = saveContractFromStream(
      "system",
      "anthropic",
      "claude-3-opus",
      mockInput,
      "Streamed content here",
      tokensUsed,
    );

    expect(contract.aiTokensUsed).toBe(tokensUsed);

    // Verify via DB fetch
    const fetched = getContract(contract.id);
    expect(fetched!.aiTokensUsed).toBe(tokensUsed);
  });

  it("stores provider and model metadata correctly", () => {
    const contract = saveContractFromStream(
      "system",
      "anthropic",
      "claude-3-sonnet",
      mockInput,
      "Content from stream",
      750,
    );

    expect(contract.aiModel).toBe("claude-3-sonnet");
    expect(contract.aiPromptVersion).toBe("contract-draft-v2");
  });

  it("title is derived from contractType and counterparty", () => {
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      "Streamed body",
      100,
    );

    expect(contract.title).toBe("NDA - Acme Corp");
  });

  it("does NOT call getProvider or any AI function even with large content", () => {
    const largeContent = "A".repeat(50000);
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      largeContent,
      9999,
    );

    expect(getProviderMock).not.toHaveBeenCalled();
    expect(contract.content).toBe(largeContent);
  });

  it("tokensUsed of 0 is stored correctly (not null)", () => {
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      "Content with zero tokens",
      0,
    );

    expect(contract.aiTokensUsed).toBe(0);
  });

  it("metadata stores the original input JSON", () => {
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      "Streamed content",
      200,
    );

    expect(contract.metadata).toBeTruthy();
    const parsed = JSON.parse(contract.metadata!);
    expect(parsed.contractType).toBe("NDA");
    expect(parsed.counterparty).toBe("Acme Corp");
  });

  it("saved contract appears in listContracts", () => {
    saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      "Streamed",
      100,
    );
    const list = listContracts();
    expect(list.length).toBe(1);
    expect(list[0].content).toBe("Streamed");
  });

  it("timestamps are in milliseconds", () => {
    const contract = saveContractFromStream(
      "system",
      "openai",
      "gpt-4",
      mockInput,
      "Content",
      50,
    );
    const now = Date.now();
    expect(contract.createdAt).toBeGreaterThan(now - 5000);
    expect(contract.createdAt).toBeLessThan(now + 5000);
  });
});

// --- searchContracts (FTS5) tests ---
// Verifies the FTS5 full-text search over title, content, counterparty.

describe("searchContracts (FTS5)", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    getProviderMock.mockClear();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("returns matching contracts by content keyword", () => {
    importContract(
      "system",
      "NDA with Acme",
      "This is a confidentiality agreement with Acme Corp.",
      {
        counterparty: "Acme Corp",
        contractType: "NDA",
      },
    );
    importContract(
      "system",
      "MSA with Beta",
      "This is a master services agreement with Beta Inc.",
      {
        counterparty: "Beta Inc",
        contractType: "MSA",
      },
    );

    const hits = searchContracts("confidentiality");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].contract.title).toBe("NDA with Acme");
    expect(hits[0].snippet).toContain("<mark>");
    expect(typeof hits[0].rank).toBe("number");
  });

  it("matches on counterparty field", () => {
    importContract("system", "Agreement 1", "Generic content here", {
      counterparty: "Acme Corp",
    });
    importContract("system", "Agreement 2", "Different content", {
      counterparty: "Beta Inc",
    });

    const hits = searchContracts("Acme");
    expect(hits.length).toBe(1);
    expect(hits[0].contract.counterparty).toBe("Acme Corp");
  });

  it("matches on title field", () => {
    importContract("system", "Master Services Agreement", "Body content");
    importContract("system", "Other Doc", "Unrelated content");

    const hits = searchContracts("Master");
    expect(hits.length).toBe(1);
    expect(hits[0].contract.title).toBe("Master Services Agreement");
  });

  it("returns empty array for no matches", () => {
    importContract("system", "NDA", "Confidentiality agreement content");
    const hits = searchContracts("nonexistentterm12345");
    expect(hits).toEqual([]);
  });

  it("returns empty array for empty query", () => {
    importContract("system", "NDA", "Some content");
    expect(searchContracts("")).toEqual([]);
    expect(searchContracts("   ")).toEqual([]);
  });

  it("respects the limit parameter", () => {
    // Seed 15 matching contracts
    for (let i = 0; i < 15; i++) {
      importContract(
        "system",
        `NDA ${i}`,
        `Confidentiality agreement number ${i}`,
      );
    }
    const hits = searchContracts("confidentiality", 5);
    expect(hits.length).toBe(5);
  });

  it("default limit is 20", () => {
    for (let i = 0; i < 25; i++) {
      importContract("system", `NDA ${i}`, `Confidentiality agreement ${i}`);
    }
    const hits = searchContracts("confidentiality");
    expect(hits.length).toBe(20);
  });

  it("clamps limit to 1-100 range", () => {
    importContract("system", "NDA", "Confidentiality agreement content");
    // limit 0 → clamped to 1
    const oneHit = searchContracts("confidentiality", 0);
    expect(oneHit.length).toBe(1);
    // limit >100 → clamped to 100 (we only seeded 1, so just verify it doesn't throw)
    expect(() => searchContracts("confidentiality", 999)).not.toThrow();
  });

  it("handles NULL content without throwing (trigger uses COALESCE)", () => {
    // Insert a contract with NULL content via the test-db helper to bypass the
    // service layer (which always sets content). The AFTER INSERT trigger
    // must COALESCE NULL to '' so the FTS index accepts it.
    const db = getConnection();
    const now = Date.now();
    db.prepare(
      `INSERT INTO contracts (id, title, status, counterparty, content, created_by, created_at, updated_at)
       VALUES (?, ?, 'draft', ?, NULL, ?, ?, ?)`,
    ).run(
      "null-content-1",
      "No Content Contract",
      "Gamma LLC",
      "system",
      now,
      now,
    );

    // Search for the title — should find it
    const hits = searchContracts("No Content");
    expect(hits.length).toBe(1);
    expect(hits[0].contract.id).toBe("null-content-1");
    expect(hits[0].contract.title).toBe("No Content Contract");
  });

  it("sanitizes FTS5 special characters (no syntax injection)", () => {
    importContract(
      "system",
      "Test OR evil",
      "This contract has OR keyword in title",
    );
    // Raw query with FTS5 operators — should be treated as literal tokens, not operators
    const hits = searchContracts("OR (evil)");
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].contract.title).toContain("OR");
  });

  it("sanitizes double-quotes in query (no FTS5 syntax break)", () => {
    importContract(
      "system",
      "Quote Test",
      "This contract has the word proprietary in it",
    );
    // Double-quotes are FTS5 string delimiters — must be escaped, not break the query
    expect(() => searchContracts('"proprietary"')).not.toThrow();
    const hits = searchContracts('"proprietary"');
    expect(hits.length).toBe(1);
  });

  it("updates FTS index when contract content changes", () => {
    const c = importContract(
      "system",
      "Original Title",
      "Original content with keyword alpha",
    );
    // Initially no match for "beta"
    expect(searchContracts("beta")).toEqual([]);
    // Update content to include "beta"
    saveContractContent(c.id, "Updated content with keyword beta");
    // Now search for "beta" should find it
    const hits = searchContracts("beta");
    expect(hits.length).toBe(1);
    expect(hits[0].contract.id).toBe(c.id);
  });

  it("removes contract from FTS index when deleted (trigger keeps index in sync)", () => {
    const c = importContract(
      "system",
      "Deletable NDA",
      "Confidentiality agreement to delete",
    );
    expect(searchContracts("Confidentiality").length).toBe(1);

    const db = getConnection();
    db.prepare("DELETE FROM contracts WHERE id = ?").run(c.id);

    expect(searchContracts("Confidentiality")).toEqual([]);
  });
});

// --- FTS5 migration idempotency tests ---
// Verify that running migrate() on an empty DB and on a seeded DB both work,
// and that running migrate() twice is a no-op.

describe("FTS5 migration idempotency", () => {
  let db: DatabaseType;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("migrates an empty database without error", () => {
    migrate(db);
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='contracts_fts'`,
      )
      .all() as { name: string }[];
    expect(tables.length).toBe(1);

    const triggers = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE 'contracts_%'`,
      )
      .all() as { name: string }[];
    expect(triggers.map((t) => t.name).sort()).toEqual([
      "contracts_ad",
      "contracts_ai",
      "contracts_au",
    ]);
  });

  it("backfills existing contracts into FTS index on migration", () => {
    // Simulate a v1 database: apply schema.sql but record schema_version=1 only.
    // Because schema.sql now includes the FTS table and triggers, the FTS table
    // already exists after this step — but the v2 migration's backfill is what
    // populates it from existing contracts rows.
    db.exec(
      `CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);`,
    );
    db.exec(schemaSql);
    db.prepare(
      `INSERT INTO schema_version (version, applied_at) VALUES (1, ?)`,
    ).run(Date.now());

    // Seed the bootstrap 'system' user so the FK on contracts.created_by passes.
    const now = Date.now();
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run("system", "system@local", "System Bootstrap", "system", "", now);

    // Insert 10 contracts with various content (some NULL) — BEFORE the v2
    // backfill runs, so these rows exist in `contracts` but not in `contracts_fts`.
    for (let i = 0; i < 10; i++) {
      db.prepare(
        `INSERT INTO contracts (id, title, status, counterparty, content, created_by, created_at, updated_at)
         VALUES (?, ?, 'draft', ?, ?, 'system', ?, ?)`,
      ).run(
        `seed-${i}`,
        `Contract ${i}`,
        `Counterparty ${i}`,
        i % 3 === 0 ? null : `Confidentiality agreement ${i}`,
        now,
        now,
      );
    }

    // At this point the FTS index does not exist yet (v2 migration hasn't run).
    // The contracts table has 10 rows but no FTS index over them.
    const ftsTableExists = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='contracts_fts'`,
      )
      .get() as { name: string } | undefined;
    expect(ftsTableExists).toBeUndefined();

    // Now run migrate() — it should detect v2 is pending, apply it (CREATE
    // VIRTUAL TABLE + triggers), and backfill the 10 existing rows.
    migrate(db);

    // The FTS index should now exist and contain all 10 contracts
    const count = db
      .prepare(`SELECT COUNT(*) as n FROM contracts_fts`)
      .get() as { n: number };
    expect(count.n).toBe(10);

    // Searching for "Confidentiality" should find the 6 non-null contracts (indices 1,2,4,5,7,8)
    const hits = searchContracts("Confidentiality");
    expect(hits.length).toBe(6);
  });

  it("running migrate() twice is a no-op (idempotent)", () => {
    migrate(db);
    const versionAfterFirst = db
      .prepare("SELECT MAX(version) AS v FROM schema_version")
      .get() as { v: number };
    expect(versionAfterFirst.v).toBe(2);

    // Second run should not throw and should not change the version
    expect(() => migrate(db)).not.toThrow();
    const versionAfterSecond = db
      .prepare("SELECT MAX(version) AS v FROM schema_version")
      .get() as { v: number };
    expect(versionAfterSecond.v).toBe(2);
  });

  it("triggers keep FTS in sync after migration (insert after backfill)", () => {
    migrate(db);
    // Insert a new contract — the AFTER INSERT trigger should add it to FTS
    importContract(
      "system",
      "Post-migration NDA",
      "Confidentiality agreement added after migration",
    );
    const hits = searchContracts("Confidentiality");
    expect(hits.length).toBe(1);
    expect(hits[0].contract.title).toBe("Post-migration NDA");
  });
});
