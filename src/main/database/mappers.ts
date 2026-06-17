import type { Contract, User, AuditLog, DocumentRecord, ContractStatus, SyncStatus, Template } from '../../shared/types';
import { AppError } from '../errors';

interface DbRow {
  [key: string]: unknown;
}

export function rowToContract(row: DbRow): Contract {
  if (row.id == null) throw new AppError('rowToContract: missing required field "id"', 'VALIDATION_ERROR');
  if (row.title == null) throw new AppError('rowToContract: missing required field "title"', 'VALIDATION_ERROR');
  if (row.status == null) throw new AppError('rowToContract: missing required field "status"', 'VALIDATION_ERROR');
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
  if (row.id == null) throw new AppError('rowToUser: missing required field "id"', 'VALIDATION_ERROR');
  if (row.email == null) throw new AppError('rowToUser: missing required field "email"', 'VALIDATION_ERROR');
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

export function rowToTemplate(row: DbRow): Template {
  if (row.id == null) throw new AppError('rowToTemplate: missing required field "id"', 'VALIDATION_ERROR');
  if (row.name == null) throw new AppError('rowToTemplate: missing required field "name"', 'VALIDATION_ERROR');
  if (row.file_path == null) throw new AppError('rowToTemplate: missing required field "file_path"', 'VALIDATION_ERROR');
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    contractType: (row.contract_type as string) ?? undefined,
    variableSchema: (row.variable_schema as string) ?? undefined,
    filePath: row.file_path as string,
    isDefault: Boolean(row.is_default),
    createdBy: (row.created_by as string) ?? undefined,
    createdAt: (row.created_at as number) ?? 0,
  };
}
