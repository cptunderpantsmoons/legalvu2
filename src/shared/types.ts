export type ContractStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'signed'
  | 'active'
  | 'expired'
  | 'terminated';

export type SyncStatus = 'unsynced' | 'downloaded' | 'uploaded' | 'synced';

export interface ContractPromptInput {
  contractType: string;
  counterparty: string;
  jurisdiction: string;
  keyTerms: string[];
  indemnity: boolean;
  confidentiality: boolean;
  governingLaw: string;
}

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  counterparty?: string;
  jurisdiction?: string;
  content?: string;
  metadata?: string;
  aiPromptVersion?: string;
  aiModel?: string;
  aiTokensUsed?: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRecord {
  id: string;
  filename: string;
  localPath: string;
  sha256?: string;
  spUrl?: string;
  spSyncStatus: SyncStatus;
  sizeBytes?: number;
  contractId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  contractType?: string;
  variableSchema?: string;
  filePath: string;
  isDefault: boolean;
  createdBy?: string;
  createdAt: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  passwordHash: string;
  aiApiKeyEncrypted?: string;
  createdAt: number;
}

export interface SharePointConnection {
  id: string;
  userId: string;
  siteUrl: string;
  libraryPath: string;
  syncEnabled: boolean;
  spCookiesEncrypted?: string;
  lastError?: string;
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  createdAt: number;
}

export type AIProvider = 'openai' | 'anthropic';

export interface AiConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
}
