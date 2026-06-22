import crypto from "crypto";
import fs from "fs";
import { getConnection } from "../database/connection";
import { rowToDocument } from "../database/mappers";
import { log } from "./audit-service";
import { getDefaultAppPaths } from "../infra/app-paths";
import * as spConnection from "./sp-connection-service";
import {
  browseSharePointLibrary,
  downloadSharePointFile,
  uploadFileToSharePoint,
  restoreCookies,
  type SpFileEntry,
} from "./sharepoint-service";
import type { DocumentRecord } from "../../shared/types";

export interface SyncQueueItem {
  id: number;
  documentId: string | null;
  operation: "upload" | "download";
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
  attempts: number;
  fileName?: string | null;
}

export interface SyncResult {
  downloaded: number;
  uploaded: number;
  conflicts: string[];
  errors: string[];
  totalProcessed: number;
}

const MAX_ATTEMPTS = 5;

function getLocalDir(): string {
  return getDefaultAppPaths().getDocumentsDir();
}

export function getPendingQueue(): SyncQueueItem[] {
  const db = getConnection();
  const rows = db
    .prepare(
      "SELECT * FROM sync_queue WHERE status IN (?, ?) AND attempts < ? ORDER BY created_at ASC",
    )
    .all("pending", "failed", MAX_ATTEMPTS) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: r.id as number,
    documentId: (r.document_id as string) ?? null,
    operation: r.operation as "upload" | "download",
    status: r.status as SyncQueueItem["status"],
    errorMessage: (r.error_message as string) ?? undefined,
    attempts: r.attempts as number,
    fileName: (r.file_name as string) ?? null,
  }));
}

export function queueOperation(
  documentId: string | null,
  operation: "upload" | "download",
  fileName?: string,
): void {
  const db = getConnection();
  db.prepare(
    `INSERT INTO sync_queue (document_id, operation, status, file_name) VALUES (?, ?, 'pending', ?)`,
  ).run(documentId, operation, fileName ?? null);
}

function updateQueueItem(
  id: number,
  status: SyncQueueItem["status"],
  errorMessage?: string,
): void {
  const db = getConnection();
  db.prepare(
    `UPDATE sync_queue SET status = ?, error_message = ?, attempts = attempts + 1 WHERE id = ?`,
  ).run(status, errorMessage ?? null, id);
}

function markQueueCompleted(id: number): void {
  updateQueueItem(id, "completed");
}

function markQueueFailed(id: number, error: string): void {
  updateQueueItem(id, "failed", error);
}

function getLocalDocuments(): DocumentRecord[] {
  const db = getConnection();
  const rows = db
    .prepare("SELECT * FROM documents ORDER BY updated_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToDocument);
}

function getLocalDocumentByName(filename: string): DocumentRecord | undefined {
  const db = getConnection();
  const row = db
    .prepare("SELECT * FROM documents WHERE filename = ?")
    .get(filename) as Record<string, unknown> | undefined;
  return row ? rowToDocument(row) : undefined;
}

function insertDownloadedDocument(
  filename: string,
  localPath: string,
  sha256: string,
  spUrl: string,
): void {
  const db = getConnection();
  const id = crypto.randomUUID();
  const now = Date.now();
  const stats = fs.statSync(localPath);
  db.prepare(
    `INSERT INTO documents (id, filename, local_path, sha256, sp_url, sp_sync_status, size_bytes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'downloaded', ?, ?, ?)`,
  ).run(id, filename, localPath, sha256, spUrl, stats.size, now, now);
}

function updateDocumentSyncStatus(
  docId: string,
  status: string,
  spUrl?: string,
): void {
  const db = getConnection();
  db.prepare(
    "UPDATE documents SET sp_sync_status = ?, sp_url = ?, updated_at = ? WHERE id = ?",
  ).run(status, spUrl ?? null, Date.now(), docId);
}

/**
 * Parse a SharePoint modified timestamp string into epoch milliseconds.
 * SharePoint displays dates in various locale-dependent formats; we try
 * Date.parse and fall back to NaN so the comparison is skipped.
 */
function parseSpModified(modified?: string): number {
  if (!modified) return NaN;
  const ts = Date.parse(modified);
  return isNaN(ts) ? NaN : ts;
}

export async function detectSyncDiff(
  userId: string,
  siteUrl: string,
  libraryPath: string,
): Promise<{
  toDownload: SpFileEntry[];
  toUpload: DocumentRecord[];
  conflicts: string[];
}> {
  const stored = spConnection.loadCookies(userId);
  if (stored) await restoreCookies(stored);

  const browseResult = await browseSharePointLibrary(siteUrl, libraryPath);
  if (!browseResult.success || !browseResult.files) {
    throw new Error(
      browseResult.error || "Failed to browse SharePoint library",
    );
  }

  const spFiles = browseResult.files.filter((f) => !f.isFolder);
  const localDocs = getLocalDocuments();
  const localSynced = localDocs.filter((d) => d.spSyncStatus !== "unsynced");

  const spFileNames = new Set(spFiles.map((f) => f.name));
  const localSyncedNames = new Set(localSynced.map((d) => d.filename));

  const toDownload = spFiles.filter((f) => !localSyncedNames.has(f.name));
  const toUpload = localDocs.filter(
    (d) => d.spSyncStatus === "unsynced" || !spFileNames.has(d.filename),
  );
  const conflicts: string[] = [];

  const now = Date.now();
  const TWENTY_FOUR_HOURS = 86_400_000;

  for (const spFile of spFiles) {
    const local = localSynced.find((d) => d.filename === spFile.name);
    if (!local) continue;

    // Get local file mtime
    let localMtime: number;
    try {
      localMtime = fs.statSync(local.localPath).mtimeMs;
    } catch {
      continue;
    }

    // Get SharePoint modified timestamp
    const spModified = parseSpModified(spFile.modified);

    // Only flag as conflict if BOTH were modified recently (within 24h)
    const localModifiedRecently = now - localMtime < TWENTY_FOUR_HOURS;
    const spModifiedRecently =
      !isNaN(spModified) && now - spModified < TWENTY_FOUR_HOURS;

    if (localModifiedRecently && spModifiedRecently) {
      // Timestamps differ significantly (more than 60 seconds apart)
      if (Math.abs(localMtime - spModified) > 60_000) {
        conflicts.push(spFile.name);
      }
    }
  }

  return { toDownload, toUpload, conflicts };
}

export async function queueSyncOperations(
  userId: string,
  siteUrl: string,
  libraryPath: string,
): Promise<{ queued: number; conflicts: string[] }> {
  const { toDownload, toUpload, conflicts } = await detectSyncDiff(
    userId,
    siteUrl,
    libraryPath,
  );

  const db = getConnection();

  for (const file of toDownload) {
    const existing = getLocalDocumentByName(file.name);
    if (!existing) {
      // Store the file name so processSyncQueue can download the specific file
      db.prepare(
        `INSERT INTO sync_queue (document_id, operation, status, file_name) VALUES (NULL, 'download', 'pending', ?)`,
      ).run(file.name);
    }
  }

  for (const doc of toUpload) {
    const alreadyQueued = db
      .prepare(
        `SELECT id FROM sync_queue WHERE document_id = ? AND status IN ('pending', 'processing')`,
      )
      .get(doc.id);
    if (!alreadyQueued) {
      queueOperation(doc.id, "upload");
    }
  }

  for (const conflict of conflicts) {
    log({
      userId,
      action: "sync:conflict",
      entityType: "document",
      details: JSON.stringify({ file: conflict }),
    });
  }

  return { queued: toDownload.length + toUpload.length, conflicts };
}

export async function processSyncQueue(
  userId: string,
  siteUrl: string,
  libraryPath: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    downloaded: 0,
    uploaded: 0,
    conflicts: [],
    errors: [],
    totalProcessed: 0,
  };
  const queue = getPendingQueue();
  const localDir = getLocalDir();
  fs.mkdirSync(localDir, { recursive: true });

  const stored = spConnection.loadCookies(userId);
  if (stored) await restoreCookies(stored);

  for (const item of queue) {
    // Exponential backoff for retried (failed) items
    if (item.status === "failed" && item.attempts > 0) {
      const backoffMs = 1000 * Math.pow(2, item.attempts);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }

    updateQueueItem(item.id, "processing");
    try {
      if (item.operation === "download") {
        if (item.fileName) {
          // Download the specific file tracked in the queue item
          const dlResult = await downloadSharePointFile(
            siteUrl,
            item.fileName,
            localDir,
          );
          if (dlResult.success && dlResult.localPath && dlResult.sha256) {
            insertDownloadedDocument(
              item.fileName,
              dlResult.localPath,
              dlResult.sha256,
              siteUrl,
            );
            result.downloaded++;
          } else {
            markQueueFailed(item.id, dlResult.error || "Download failed");
            result.errors.push(`Download failed: ${item.fileName}`);
            continue;
          }
        } else {
          // Fallback: no file_name stored — browse and download all missing files
          const browseResult = await browseSharePointLibrary(
            siteUrl,
            libraryPath,
          );
          if (!browseResult.success) {
            markQueueFailed(item.id, browseResult.error || "Browse failed");
            result.errors.push(`Browse failed: ${browseResult.error}`);
            continue;
          }

          const spFiles = (browseResult.files || []).filter((f) => !f.isFolder);
          for (const file of spFiles) {
            if (getLocalDocumentByName(file.name)) continue;
            const dlResult = await downloadSharePointFile(
              siteUrl,
              file.name,
              localDir,
            );
            if (dlResult.success && dlResult.localPath && dlResult.sha256) {
              insertDownloadedDocument(
                file.name,
                dlResult.localPath,
                dlResult.sha256,
                file.url || siteUrl,
              );
              result.downloaded++;
            } else {
              result.errors.push(`Download failed: ${file.name}`);
            }
          }
        }
        markQueueCompleted(item.id);
      } else if (item.operation === "upload" && item.documentId) {
        const db = getConnection();
        const docRow = db
          .prepare("SELECT * FROM documents WHERE id = ?")
          .get(item.documentId) as Record<string, unknown> | undefined;
        if (!docRow || !fs.existsSync(docRow.local_path as string)) {
          markQueueFailed(item.id, "Local file not found");
          result.errors.push(
            `Upload failed: file not found for ${item.documentId}`,
          );
          continue;
        }

        const upResult = await uploadFileToSharePoint(
          siteUrl,
          libraryPath,
          docRow.local_path as string,
        );
        if (upResult.success) {
          updateDocumentSyncStatus(item.documentId, "uploaded", siteUrl);
          markQueueCompleted(item.id);
          result.uploaded++;
        } else {
          markQueueFailed(item.id, upResult.error || "Upload failed");
          result.errors.push(`Upload failed: ${upResult.error}`);
        }
      }
      result.totalProcessed++;
    } catch (err) {
      markQueueFailed(item.id, String(err));
      result.errors.push(String(err));
    }
  }

  if (result.downloaded + result.uploaded > 0) {
    spConnection.setLastSync(userId);
    log({
      userId,
      action: "sync:completed",
      entityType: "sharepoint_connection",
      details: JSON.stringify({
        downloaded: result.downloaded,
        uploaded: result.uploaded,
        errors: result.errors.length,
      }),
    });
  }

  return result;
}

export async function runSyncCycle(userId: string): Promise<SyncResult> {
  const conn = spConnection.getConnectionConfig(userId);
  if (!conn) {
    return {
      downloaded: 0,
      uploaded: 0,
      conflicts: [],
      errors: ["No SharePoint connection configured"],
      totalProcessed: 0,
    };
  }

  const { conflicts } = await queueSyncOperations(
    userId,
    conn.siteUrl,
    conn.libraryPath,
  );
  const result = await processSyncQueue(userId, conn.siteUrl, conn.libraryPath);
  result.conflicts = conflicts;
  return result;
}
