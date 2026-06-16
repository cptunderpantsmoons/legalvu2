import type { Contract, User, AuditLog, DocumentRecord, ContractStatus, SyncStatus } from '../../shared/types';

interface DbRow {
  [key: string]: unknown;
}

export function rowToContract(row: DbRow): Contract {
  return {
    id: row.id as string,
    title: row.title as string,
    status: row.status as ContractStatus,
    counterparty: (row.counterparty as string) ?? undefined,
    jurisdiction: (row.jurisdiction as string) ?? undefined,
    content: (row.content as string) ?? undefined,
    metadata: (row.metadata as string) ?? undefined,
    aiPromptVersion: (row.ai_prompt_version as string) ?? undefined,
    aiModel: (row.ai_model as string) ?? undefined,
    aiTokensUsed: (row.ai_tokens_used as number) ?? undefined,
    createdBy: row.created_by as string,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}

export function rowToUser(row: DbRow): User {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: row.full_name as string,
    role: row.role as string,
    passwordHash: row.password_hash as string,
    aiApiKeyEncrypted: (row.ai_api_key_encrypted as string) ?? undefined,
    createdAt: row.created_at as number,
  };
}

export function rowToAuditLog(row: DbRow): AuditLog {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    action: row.action as string,
    entityType: row.entity_type as string,
    entityId: (row.entity_id as string) ?? undefined,
    details: (row.details as string) ?? undefined,
    createdAt: row.created_at as number,
  };
}

export function rowToDocument(row: DbRow): DocumentRecord {
  return {
    id: row.id as string,
    filename: row.filename as string,
    localPath: row.local_path as string,
    sha256: (row.sha256 as string) ?? undefined,
    spUrl: (row.sp_url as string) ?? undefined,
    spSyncStatus: (row.sp_sync_status as SyncStatus) ?? 'unsynced',
    sizeBytes: (row.size_bytes as number) ?? undefined,
    contractId: (row.contract_id as string) ?? undefined,
    createdAt: row.created_at as number,
    updatedAt: row.updated_at as number,
  };
}
