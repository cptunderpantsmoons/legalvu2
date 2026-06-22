import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb, teardownTestDb } from "../database/test-db";
import { migrate } from "../database/migrations";
import { getConnection } from "../database/connection";
import {
  queueOperation,
  getPendingQueue,
  detectSyncDiff,
  queueSyncOperations,
  processSyncQueue,
  runSyncCycle,
} from "./sync-service";
import * as spConnection from "./sp-connection-service";
import type { SpFileEntry } from "./sharepoint-service";

// Mock the SharePoint service functions so we can test the sync logic without
// a real browser/SharePoint connection.
const { browseMock, downloadMock, uploadMock, restoreCookiesMock } = vi.hoisted(
  () => ({
    browseMock: vi.fn(),
    downloadMock: vi.fn(),
    uploadMock: vi.fn(),
    restoreCookiesMock: vi.fn(),
  }),
);

vi.mock("./sharepoint-service", () => ({
  browseSharePointLibrary: browseMock,
  downloadSharePointFile: downloadMock,
  uploadFileToSharePoint: uploadMock,
  restoreCookies: restoreCookiesMock,
}));

// Mock sp-connection-service so we don't need encrypted cookies
const { loadCookiesMock, setLastSyncMock, getConnectionConfigMock } =
  vi.hoisted(() => ({
    loadCookiesMock: vi.fn(() => null),
    setLastSyncMock: vi.fn(),
    getConnectionConfigMock: vi.fn(() => null),
  }));

vi.mock("./sp-connection-service", () => ({
  loadCookies: loadCookiesMock,
  setLastSync: setLastSyncMock,
  getConnectionConfig: getConnectionConfigMock,
}));

function insertTestDoc(id: string, filename: string): void {
  const db = getConnection();
  const now = Date.now();
  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sha256, sp_sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, 'unsynced', ?, ?)`,
  ).run(id, filename, `/tmp/${filename}`, `hash-${id}`, now, now);
}

describe("sync-service", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("queueOperation inserts a pending upload", () => {
    insertTestDoc("doc-1", "test1.pdf");
    queueOperation("doc-1", "upload");
    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe("upload");
    expect(queue[0].status).toBe("pending");
    expect(queue[0].documentId).toBe("doc-1");
  });

  it("queueOperation inserts a pending download with null documentId", () => {
    queueOperation(null, "download");
    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe("download");
    expect(queue[0].documentId).toBeNull();
  });

  it("getPendingQueue returns only pending and failed items", () => {
    insertTestDoc("doc-1", "a.pdf");
    insertTestDoc("doc-2", "b.pdf");
    queueOperation("doc-1", "upload");
    queueOperation("doc-2", "upload");

    const db = getConnection();
    db.prepare("UPDATE sync_queue SET status = ? WHERE document_id = ?").run(
      "completed",
      "doc-1",
    );

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].documentId).toBe("doc-2");
  });

  it("getPendingQueue orders by created_at ASC", () => {
    insertTestDoc("doc-a", "a.pdf");
    insertTestDoc("doc-b", "b.pdf");
    insertTestDoc("doc-c", "c.pdf");
    queueOperation("doc-a", "upload");
    queueOperation("doc-b", "upload");
    queueOperation("doc-c", "upload");

    const queue = getPendingQueue();
    expect(queue[0].documentId).toBe("doc-a");
    expect(queue[2].documentId).toBe("doc-c");
  });

  it("failed items are returned with error details", () => {
    insertTestDoc("doc-1", "fail.pdf");
    queueOperation("doc-1", "upload");

    const db = getConnection();
    db.prepare(
      "UPDATE sync_queue SET status = ?, attempts = ?, error_message = ? WHERE document_id = ?",
    ).run("failed", 1, "Network error", "doc-1");

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].status).toBe("failed");
    expect(queue[0].attempts).toBe(1);
    expect(queue[0].errorMessage).toBe("Network error");
  });

  it("completed items are excluded from pending queue", () => {
    insertTestDoc("doc-done", "done.pdf");
    queueOperation("doc-done", "upload");

    const db = getConnection();
    db.prepare("UPDATE sync_queue SET status = ? WHERE document_id = ?").run(
      "completed",
      "doc-done",
    );

    expect(getPendingQueue().length).toBe(0);
  });
});

// --- detectSyncDiff tests ---

describe("detectSyncDiff", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    browseMock.mockReset();
    downloadMock.mockReset();
    uploadMock.mockReset();
    restoreCookiesMock.mockReset();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("throws when browse fails", async () => {
    browseMock.mockResolvedValue({ success: false, error: "Network error" });
    await expect(
      detectSyncDiff("system", "https://sp.example.com", "/docs"),
    ).rejects.toThrow("Network error");
  });

  it("throws when browse returns no files", async () => {
    browseMock.mockResolvedValue({ success: false, error: "No files" });
    await expect(
      detectSyncDiff("system", "https://sp.example.com", "/docs"),
    ).rejects.toThrow("No files");
  });

  it("returns all SP files as toDownload when no local docs exist", async () => {
    const spFiles: SpFileEntry[] = [
      { name: "file1.pdf", isFolder: false },
      { name: "file2.pdf", isFolder: false },
    ];
    browseMock.mockResolvedValue({ success: true, files: spFiles });

    const result = await detectSyncDiff(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.toDownload.length).toBe(2);
    expect(result.toUpload.length).toBe(0);
    expect(result.conflicts).toEqual([]);
  });

  it("filters out folders from SP files", async () => {
    const spFiles: SpFileEntry[] = [
      { name: "file1.pdf", isFolder: false },
      { name: "subfolder", isFolder: true },
    ];
    browseMock.mockResolvedValue({ success: true, files: spFiles });

    const result = await detectSyncDiff(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.toDownload.length).toBe(1);
    expect(result.toDownload[0].name).toBe("file1.pdf");
  });

  it("returns unsynced local docs as toUpload", async () => {
    insertTestDoc("doc-1", "local-only.pdf");
    browseMock.mockResolvedValue({ success: true, files: [] });

    const result = await detectSyncDiff(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.toUpload.length).toBe(1);
    expect(result.toUpload[0].filename).toBe("local-only.pdf");
  });
});

// --- queueSyncOperations tests ---

describe("queueSyncOperations", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    browseMock.mockReset();
    downloadMock.mockReset();
    uploadMock.mockReset();
    restoreCookiesMock.mockReset();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("queues downloads for SP files not present locally", async () => {
    const spFiles: SpFileEntry[] = [
      { name: "new1.pdf", isFolder: false },
      { name: "new2.pdf", isFolder: false },
    ];
    browseMock.mockResolvedValue({ success: true, files: spFiles });

    const result = await queueSyncOperations(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.queued).toBe(2);
    expect(result.conflicts).toEqual([]);

    const queue = getPendingQueue();
    expect(queue.length).toBe(2);
    expect(queue.every((q) => q.operation === "download")).toBe(true);
  });

  it("queues uploads for unsynced local docs", async () => {
    insertTestDoc("doc-1", "unsynced.pdf");
    browseMock.mockResolvedValue({ success: true, files: [] });

    const result = await queueSyncOperations(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.queued).toBe(1);

    const queue = getPendingQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].operation).toBe("upload");
    expect(queue[0].documentId).toBe("doc-1");
  });

  it("does not re-queue uploads already pending", async () => {
    insertTestDoc("doc-1", "unsynced.pdf");
    queueOperation("doc-1", "upload"); // already queued
    browseMock.mockResolvedValue({ success: true, files: [] });

    await queueSyncOperations("system", "https://sp.example.com", "/docs");
    const queue = getPendingQueue();
    expect(queue.length).toBe(1); // still just 1, not 2
  });
});

// --- processSyncQueue tests ---

describe("processSyncQueue", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    browseMock.mockReset();
    downloadMock.mockReset();
    uploadMock.mockReset();
    restoreCookiesMock.mockReset();
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("processes a download queue item successfully", async () => {
    // Queue a download with a file name
    queueOperation(null, "download", "remote-file.pdf");

    // Mock the download to succeed
    const fs = await import("fs");
    const tmpFile = "/tmp/test-sync-download-" + Date.now() + ".pdf";
    fs.writeFileSync(tmpFile, "test content");
    downloadMock.mockResolvedValue({
      success: true,
      localPath: tmpFile,
      sha256: "abc123",
    });

    const result = await processSyncQueue(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.downloaded).toBe(1);
    expect(result.errors).toEqual([]);
    expect(result.totalProcessed).toBe(1);

    // Verify the document was inserted
    const db = getConnection();
    const doc = db
      .prepare("SELECT * FROM documents WHERE filename = ?")
      .get("remote-file.pdf") as { sp_sync_status: string } | undefined;
    expect(doc).toBeDefined();
    expect(doc!.sp_sync_status).toBe("downloaded");

    // Cleanup
    fs.unlinkSync(tmpFile);
  });

  it("marks a failed download with error", async () => {
    queueOperation(null, "download", "bad-file.pdf");
    downloadMock.mockResolvedValue({
      success: false,
      error: "404 Not Found",
    });

    const result = await processSyncQueue(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.downloaded).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("Download failed");

    const db = getConnection();
    const queueItem = db
      .prepare("SELECT * FROM sync_queue WHERE file_name = ?")
      .get("bad-file.pdf") as {
      status: string;
      error_message: string;
      attempts: number;
    };
    expect(queueItem.status).toBe("failed");
    expect(queueItem.error_message).toContain("404");
    // attempts is incremented twice: once when set to 'processing', once when set to 'failed'
    expect(queueItem.attempts).toBe(2);
  });

  it("processes an upload queue item successfully", async () => {
    insertTestDoc("doc-1", "upload-me.pdf");
    queueOperation("doc-1", "upload");

    // Create the actual local file so the upload path can stat it
    const fs = await import("fs");
    fs.writeFileSync("/tmp/upload-me.pdf", "test content");

    uploadMock.mockResolvedValue({ success: true, fileName: "upload-me.pdf" });

    const result = await processSyncQueue(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.uploaded).toBe(1);
    expect(result.errors).toEqual([]);

    const db = getConnection();
    const doc = db
      .prepare("SELECT sp_sync_status FROM documents WHERE id = ?")
      .get("doc-1") as { sp_sync_status: string };
    expect(doc.sp_sync_status).toBe("uploaded");

    fs.unlinkSync("/tmp/upload-me.pdf");
  });

  it("marks upload failed when local file does not exist", async () => {
    insertTestDoc("doc-1", "missing-file.pdf");
    queueOperation("doc-1", "upload");

    const result = await processSyncQueue(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.uploaded).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("file not found");

    const db = getConnection();
    const queueItem = db
      .prepare("SELECT * FROM sync_queue WHERE document_id = ?")
      .get("doc-1") as { status: string; error_message: string };
    expect(queueItem.status).toBe("failed");
  });

  it("returns empty result when queue is empty", async () => {
    const result = await processSyncQueue(
      "system",
      "https://sp.example.com",
      "/docs",
    );
    expect(result.downloaded).toBe(0);
    expect(result.uploaded).toBe(0);
    expect(result.totalProcessed).toBe(0);
    expect(result.errors).toEqual([]);
  });
});

// --- runSyncCycle tests ---

describe("runSyncCycle", () => {
  beforeEach(() => {
    createTestDb();
    migrate();
    browseMock.mockReset();
    downloadMock.mockReset();
    uploadMock.mockReset();
    restoreCookiesMock.mockReset();
    // Reset the sp-connection-service mock to return null (no connection)
    vi.mocked(spConnection.getConnectionConfig).mockReturnValue(null);
  });

  afterEach(() => {
    teardownTestDb();
  });

  it("returns error result when no SharePoint connection is configured", async () => {
    const result = await runSyncCycle("system");
    expect(result.downloaded).toBe(0);
    expect(result.uploaded).toBe(0);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("No SharePoint connection configured");
  });

  it("runs full cycle when connection is configured", async () => {
    vi.mocked(spConnection.getConnectionConfig).mockReturnValue({
      id: "conn-1",
      siteUrl: "https://sp.example.com",
      libraryPath: "/docs",
      syncEnabled: true,
      hasCookies: false,
    });
    browseMock.mockResolvedValue({ success: true, files: [] });

    const result = await runSyncCycle("system");
    expect(result.errors).toEqual([]);
    expect(result.downloaded).toBe(0);
    expect(result.uploaded).toBe(0);
  });
});
