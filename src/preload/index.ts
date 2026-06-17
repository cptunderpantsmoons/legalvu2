import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { Contract, ContractStatus, AIProvider, ContractPromptInput, User } from '../shared/types';

/** Unified API response format used by handlers that were migrated to { ok, data, error }. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AuthResult {
  user: User | null;
  error?: string;
}

export interface AiConfigResponse {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  hasKey: boolean;
}

export interface ContractGeneratePayload {
  provider: AIProvider;
  model: string;
  input: ContractPromptInput;
}

export interface ContractStreamPayload {
  provider: AIProvider;
  model: string;
  input: ContractPromptInput;
}

/** Data shapes returned inside ApiResult for unified handlers */
export interface ContractGenerateData { contract: Contract }
export interface ContractTransitionData { contract: Contract }
export interface ContractImportData { contract: Contract }
export interface ExportData { path: string }
export interface AnalyzeData { analysis: string; tokensUsed?: number }
export interface SummarizeData { summary: string; tokensUsed?: number }
export interface SyncRunData { downloaded: number; uploaded: number; conflicts: string[]; errors: string[]; totalProcessed: number }
export interface TemplateCreateData { template: { id: string; name: string } }
export interface TemplateGenerateData { contract: { id: string; title: string } }

const api = {
  ping: () => ipcRenderer.invoke(IPC_CHANNELS.PING),

  authRegister: (payload: { email: string; password: string; fullName: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_REGISTER, payload) as Promise<AuthResult>,
  authLogin: (payload: { email: string; password: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, payload) as Promise<AuthResult>,
  authLogout: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT) as Promise<void>,
  authMe: () => ipcRenderer.invoke(IPC_CHANNELS.AUTH_ME) as Promise<User | null>,

  settingsSetAiKey: (payload: { apiKey: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_AI_KEY, payload) as Promise<{ ok: boolean; error?: string }>,
  settingsSetAiConfig: (payload: { provider: AIProvider; model: string; baseUrl?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET_AI_CONFIG, payload) as Promise<{ ok: boolean; error?: string }>,
  settingsGetAiConfig: () => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET_AI_CONFIG) as Promise<AiConfigResponse | null>,

  contractGenerate: (payload: ContractGeneratePayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_GENERATE, payload) as Promise<ApiResult<ContractGenerateData>>,
  contractStreamStart: (payload: ContractStreamPayload) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_STREAM_START, payload) as Promise<ApiResult<ContractGenerateData>>,
  contractStreamCancel: () => ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_STREAM_CANCEL) as Promise<void>,
  contractFetch: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_FETCH, { id }) as Promise<Contract | null>,
  contractList: () => ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_LIST) as Promise<Contract[]>,
  contractSave: (payload: { id: string; content: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_SAVE, payload) as Promise<Contract | null>,
  contractTransition: (payload: { id: string; target: ContractStatus }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_TRANSITION, payload) as Promise<ApiResult<ContractTransitionData>>,
  contractExportDocx: (contractId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_EXPORT_DOCX, { contractId }) as Promise<ApiResult<ExportData>>,
  contractExportPdf: (contractId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_EXPORT_PDF, { contractId }) as Promise<ApiResult<ExportData>>,

  contractAnalyze: (payload: { contractText: string; clientRole?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_ANALYZE, payload) as Promise<ApiResult<AnalyzeData>>,
  contractSummarize: (payload: { contractText: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_SUMMARIZE, payload) as Promise<ApiResult<SummarizeData>>,
  contractImport: (payload: { title: string; content: string; counterparty?: string; jurisdiction?: string; contractType?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONTRACT_IMPORT, payload) as Promise<ApiResult<ContractImportData>>,
  expertiseList: () =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPERTISE_LIST) as Promise<string[]>,

  lawvuImport: (payload: { zipBase64: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.LAWVU_IMPORT, payload) as Promise<{
      ok: boolean;
      contractsImported?: number;
      filesImported?: number;
      usersCreated?: number;
      errors?: Array<{ row: number; message: string }>;
      skipped?: number;
      duplicates?: number;
      error?: string;
    }>,

  analyticsContractStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_CONTRACT_STATUS) as Promise<Array<{ status: string; count: number }>>,
  analyticsAiUsage: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_AI_USAGE) as Promise<Array<{ model: string; contracts: number; totalTokens: number }>>,
  analyticsSyncHealth: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_SYNC_HEALTH) as Promise<{ downloaded: number; uploaded: number; synced: number; unsynced: number; pendingQueue: number; failedQueue: number; lastSyncAt: number | null }>,
  analyticsAuditTimeline: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_AUDIT_TIMELINE) as Promise<Array<{ date: string; action: string; count: number }>>,
  analyticsTemplateUsage: () =>
    ipcRenderer.invoke(IPC_CHANNELS.ANALYTICS_TEMPLATE_USAGE) as Promise<Array<{ name: string; contractType: string; isDefault: boolean; usageCount: number }>>,

  onAiStreamChunk: (cb: (chunk: string) => void) => {
    const handler = (_e: unknown, chunk: string) => cb(chunk);
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_CHUNK, handler);
    return () => ipcRenderer.off(IPC_CHANNELS.AI_STREAM_CHUNK, handler);
  },
  onAiStreamDone: (cb: (contract: Contract) => void) => {
    const handler = (_e: unknown, contract: Contract) => cb(contract);
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_DONE, handler);
    return () => ipcRenderer.off(IPC_CHANNELS.AI_STREAM_DONE, handler);
  },
  onAiStreamError: (cb: (error: string) => void) => {
    const handler = (_e: unknown, error: string) => cb(error);
    ipcRenderer.on(IPC_CHANNELS.AI_STREAM_ERROR, handler);
    return () => ipcRenderer.off(IPC_CHANNELS.AI_STREAM_ERROR, handler);
  },

  spBrowserStart: (options?: { headless?: boolean }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSER_START, options) as Promise<{ success: boolean; url?: string; error?: string }>,
  spBrowserStop: () => ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSER_STOP) as Promise<{ success: boolean }>,
  spBrowserNavigate: (url: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSER_NAVIGATE, { url }) as Promise<{ success: boolean; url?: string; error?: string }>,
  spBrowserScreenshot: (filePath?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSER_SCREENSHOT, { path: filePath }) as Promise<{ success: boolean; path?: string; error?: string }>,
  spBrowserStatus: () => ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSER_STATUS) as Promise<{ running: boolean; url?: string }>,

  spLogin: (siteUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_LOGIN, { siteUrl }) as Promise<{ success: boolean; cookiesCaptured?: number; error?: string }>,
  spCheckSession: (siteUrl: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_CHECK_SESSION, { siteUrl }) as Promise<{ valid: boolean; url?: string }>,
  spGetConnection: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_GET_CONNECTION) as Promise<{ id: string; siteUrl: string; libraryPath: string; syncEnabled: boolean; hasCookies: boolean; lastError?: string; lastSyncAt?: number } | null>,
  spSetConnection: (config: { siteUrl: string; libraryPath: string; syncEnabled?: boolean }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_SET_CONNECTION, config) as Promise<{ ok: boolean; error?: string }>,
  spBrowse: (params: { siteUrl: string; libraryPath: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_BROWSE, params) as Promise<{ success: boolean; files?: Array<{ name: string; url?: string; isFolder: boolean; size?: string; modified?: string }>; error?: string }>,
  spDownload: (params: { siteUrl: string; fileName: string; localDir: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_DOWNLOAD, params) as Promise<{ success: boolean; localPath?: string; sha256?: string; error?: string }>,
  spUpload: (params: { siteUrl: string; libraryPath: string; localFilePath: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.SP_UPLOAD, params) as Promise<{ success: boolean; fileName?: string; error?: string }>,

  syncRun: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_RUN) as Promise<ApiResult<SyncRunData>>,
  syncStatus: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_STATUS) as Promise<{ pending: number }>,
  syncQueue: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SYNC_QUEUE) as Promise<Array<{ id: number; documentId: string | null; operation: string; status: string; attempts: number }>>,

  templateList: () =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_LIST) as Promise<Array<{ id: string; name: string; description?: string; contractType?: string; isDefault: boolean }>>,
  templateGet: (templateId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GET, { templateId }) as Promise<{ id: string; name: string; variables: string[]; content: string } | null>,
  templateCreate: (payload: { name: string; content: string; description?: string; contractType?: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_CREATE, payload) as Promise<ApiResult<TemplateCreateData>>,
  templateDelete: (templateId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_DELETE, { templateId }) as Promise<{ ok: boolean; error?: string }>,
  templateGenerate: (payload: { templateId: string; variables: Record<string, string>; title: string }) =>
    ipcRenderer.invoke(IPC_CHANNELS.TEMPLATE_GENERATE, payload) as Promise<ApiResult<TemplateGenerateData>>,

  auditQuery: (filter?: { entityType?: string; entityId?: string; limit?: number }) =>
    ipcRenderer.invoke(IPC_CHANNELS.AUDIT_QUERY, filter ?? {}),
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
