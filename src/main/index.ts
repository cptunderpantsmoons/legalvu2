import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { getConnection, closeConnection } from './database/connection';
import { migrate } from './database/migrations';
import { createContractFromPrompt, getContract, listContracts, saveContractContent, importContract } from './services/contract-service';
import { getProvider } from './services/ai-adapter';
import { buildContractPrompt, buildAnalysisPrompt, buildSummarizationPrompt, PROMPT_VERSION } from './services/prompts';
import { listAvailableExpertise } from './services/legal-expertise';
import { importFromZip } from './services/lawvu-import-service';
import * as analytics from './services/analytics-service';
import { transitionStatus } from './services/contract-lifecycle';
import { exportContractToDocx, exportContractToPdf } from './services/document-service';
import {
  startBrowser,
  stopBrowser,
  navigateBrowser,
  screenshotBrowser,
  getBrowserStatus,
  loginToSharePoint,
  checkSession,
  browseSharePointLibrary,
  downloadSharePointFile,
  uploadFileToSharePoint,
  getCookies,
  restoreCookies,
} from './services/sharepoint-service';
import * as spConnection from './services/sp-connection-service';
import { runSyncCycle, getPendingQueue } from './services/sync-service';
import * as templateService from './services/template-service';
import * as authService from './services/auth-service';
import * as auditService from './services/audit-service';
import * as schemas from './validation/schemas';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { AIProvider } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let activeStreamController: AbortController | null = null;

function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function getCurrentUserId(): string {
  return authService.getCurrentUserId();
}

function wrapError<T>(fn: () => T): { ok: true; data: T } | { ok: false; error: string } {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

console.log('[Main] Process started');

ipcMain.handle(IPC_CHANNELS.PING, () => 'pong');

// --- Auth ---
ipcMain.handle(IPC_CHANNELS.AUTH_REGISTER, (_e, payload) => {
  const parsed = schemas.AuthRegisterSchema.parse(payload);
  const result = wrapError(() => authService.register(parsed.email, parsed.password, parsed.fullName));
  return result.ok ? { user: result.data } : { user: null, error: result.error };
});

ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, (_e, payload) => {
  const parsed = schemas.AuthLoginSchema.parse(payload);
  const result = wrapError(() => authService.login(parsed.email, parsed.password));
  return result.ok ? { user: result.data } : { user: null, error: result.error };
});

ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
  authService.logout();
});

ipcMain.handle(IPC_CHANNELS.AUTH_ME, () => {
  return authService.getCurrentUser();
});

// --- Settings ---
ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AI_KEY, (_e, payload) => {
  const parsed = schemas.SettingsSetAiKeySchema.parse(payload);
  const userId = getCurrentUserId();
  authService.setEncryptedApiKey(userId, parsed.apiKey);
  auditService.log({ userId, action: 'settings:setAiKey', entityType: 'user', entityId: userId });
  return { ok: true };
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AI_CONFIG, (_e, payload) => {
  const parsed = schemas.SettingsSetAiConfigSchema.parse(payload);
  const userId = getCurrentUserId();
  authService.setAiConfig(userId, {
    provider: parsed.provider,
    model: parsed.model,
    baseUrl: parsed.baseUrl || undefined,
  });
  auditService.log({ userId, action: 'settings:setAiConfig', entityType: 'user', entityId: userId });
  return { ok: true };
});

ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_AI_CONFIG, () => {
  const userId = getCurrentUserId();
  const config = authService.getAiConfig(userId);
  if (!config) return null;
  return {
    provider: config.provider as AIProvider,
    model: config.model,
    baseUrl: config.baseUrl,
    hasKey: authService.hasApiKey(),
  };
});

// --- Contracts ---
ipcMain.handle(IPC_CHANNELS.CONTRACT_GENERATE, async (_e, payload) => {
  const parsed = schemas.ContractGenerateSchema.parse(payload);
  const userId = getCurrentUserId();
  const apiKey = authService.getDecryptedApiKey();
  if (!apiKey) return { error: 'No API key configured. Set your key in Settings.' };

  const result = wrapError(async () => {
    const contract = await createContractFromPrompt(userId, parsed.provider, apiKey, parsed.model, parsed.input);
    auditService.log({
      userId,
      action: 'contract:create',
      entityType: 'contract',
      entityId: contract.id,
      details: JSON.stringify({
        promptVersion: PROMPT_VERSION,
        model: parsed.model,
        tokensUsed: contract.aiTokensUsed ?? 0,
      }),
    });
    return { contract };
  });
  if (result.ok) return await result.data;
  return { error: result.error };
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_STREAM_START, async (_e, payload) => {
  const parsed = schemas.ContractStreamStartSchema.parse(payload);
  const userId = getCurrentUserId();
  const apiKey = authService.getDecryptedApiKey();
  if (!apiKey) return { error: 'No API key configured. Set your key in Settings.' };

  try {
    const config = authService.getAiConfig(userId);
    const baseUrl = config?.baseUrl;
    const ai = getProvider(parsed.provider);
    const prompt = buildContractPrompt(parsed.input);
    activeStreamController = new AbortController();

    const result = await ai.streamDraft(
      prompt,
      apiKey,
      parsed.model,
      baseUrl,
      (chunk) => sendToRenderer(IPC_CHANNELS.AI_STREAM_CHUNK, chunk),
      activeStreamController.signal,
    );

    const contract = await createContractFromPrompt(userId, parsed.provider, apiKey, parsed.model, parsed.input);

    auditService.log({
      userId,
      action: 'contract:create',
      entityType: 'contract',
      entityId: contract.id,
      details: JSON.stringify({
        promptVersion: PROMPT_VERSION,
        model: parsed.model,
        tokensUsed: result.tokensUsed,
        streamed: true,
      }),
    });

    sendToRenderer(IPC_CHANNELS.AI_STREAM_DONE, contract);
    activeStreamController = null;
    return { contract };
  } catch (err) {
    const errorMsg = (err as Error).message;
    sendToRenderer(IPC_CHANNELS.AI_STREAM_ERROR, errorMsg);
    activeStreamController = null;
    return { error: errorMsg };
  }
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_STREAM_CANCEL, () => {
  if (activeStreamController) {
    activeStreamController.abort();
    activeStreamController = null;
  }
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_FETCH, (_e, payload) => {
  const parsed = schemas.ContractFetchSchema.parse(payload);
  return getContract(parsed.id) ?? null;
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_LIST, () => {
  return listContracts();
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_SAVE, (_e, payload) => {
  const parsed = schemas.ContractSaveSchema.parse(payload);
  const userId = getCurrentUserId();
  const contract = saveContractContent(parsed.id, parsed.content);
  if (contract) {
    auditService.log({
      userId,
      action: 'contract:save',
      entityType: 'contract',
      entityId: parsed.id,
    });
  }
  return contract ?? null;
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_TRANSITION, (_e, payload) => {
  const parsed = schemas.ContractTransitionSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = wrapError(() => {
    const contract = transitionStatus(parsed.id, parsed.target, userId);
    return { contract };
  });
  return result.ok ? result.data : { error: result.error };
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_EXPORT_DOCX, async (_e, payload) => {
  const parsed = schemas.ExportSchema.parse(payload);
  const userId = getCurrentUserId();
  try {
    const filePath = await exportContractToDocx(parsed.contractId, userId);
    return { path: filePath };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_EXPORT_PDF, async (_e, payload) => {
  const parsed = schemas.ExportSchema.parse(payload);
  const userId = getCurrentUserId();
  try {
    const filePath = await exportContractToPdf(parsed.contractId, userId);
    return { path: filePath };
  } catch (err) {
    return { error: (err as Error).message };
  }
});

// --- SharePoint Browser ---
ipcMain.handle(IPC_CHANNELS.SP_BROWSER_START, async (_e, options) => {
  const parsed = options ? schemas.SpBrowserStartSchema.parse(options) : {};
  return startBrowser(parsed);
});

ipcMain.handle(IPC_CHANNELS.SP_BROWSER_STOP, async () => stopBrowser());

ipcMain.handle(IPC_CHANNELS.SP_BROWSER_NAVIGATE, async (_e, payload) => {
  const parsed = schemas.SpBrowserNavigateSchema.parse(payload);
  return navigateBrowser(parsed.url);
});

ipcMain.handle(IPC_CHANNELS.SP_BROWSER_SCREENSHOT, async (_e, payload) => {
  const parsed = payload ? schemas.SpBrowserScreenshotSchema.parse(payload) : {};
  return screenshotBrowser(parsed.path);
});

ipcMain.handle(IPC_CHANNELS.SP_BROWSER_STATUS, () => getBrowserStatus());

// --- SharePoint Integration (Phase 4.2-4.6) ---

ipcMain.handle(IPC_CHANNELS.SP_LOGIN, async (_e, payload) => {
  const parsed = schemas.SpLoginSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = await loginToSharePoint(parsed.siteUrl);
  if (result.success && result.cookiesCaptured) {
    const cookies = await getCookies();
    spConnection.saveCookies(userId, cookies);
    auditService.log({ userId, action: 'sp:login', entityType: 'sharepoint_connection', details: JSON.stringify({ cookies: cookies.length }) });
  }
  return result;
});

ipcMain.handle(IPC_CHANNELS.SP_CHECK_SESSION, async (_e, payload) => {
  const parsed = schemas.SpLoginSchema.parse(payload);
  const userId = getCurrentUserId();
  const stored = spConnection.loadCookies(userId);
  if (stored) {
    await restoreCookies(stored);
  }
  const result = await checkSession(parsed.siteUrl);
  if (!result.valid) {
    spConnection.setLastError(userId, 'Session expired');
  } else {
    spConnection.setLastError(userId, null);
  }
  return result;
});

ipcMain.handle(IPC_CHANNELS.SP_GET_CONNECTION, () => {
  const userId = getCurrentUserId();
  return spConnection.getConnectionConfig(userId);
});

ipcMain.handle(IPC_CHANNELS.SP_SET_CONNECTION, (_e, payload) => {
  const parsed = schemas.SpSetConnectionSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = wrapError(() => spConnection.saveConnection(userId, parsed));
  return result.ok ? { ok: true } : { ok: false, error: result.error };
});

ipcMain.handle(IPC_CHANNELS.SP_BROWSE, async (_e, payload) => {
  const parsed = schemas.SpBrowseSchema.parse(payload);
  const userId = getCurrentUserId();
  const stored = spConnection.loadCookies(userId);
  if (stored) {
    await restoreCookies(stored);
  }
  const result = await browseSharePointLibrary(parsed.siteUrl, parsed.libraryPath);
  if (!result.success && result.error?.includes('Session expired')) {
    spConnection.setLastError(userId, result.error);
  }
  return result;
});

ipcMain.handle(IPC_CHANNELS.SP_DOWNLOAD, async (_e, payload) => {
  const parsed = schemas.SpDownloadSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = await downloadSharePointFile(parsed.siteUrl, parsed.fileName, parsed.localDir);
  if (result.success) {
    auditService.log({
      userId,
      action: 'sp:download',
      entityType: 'document',
      details: JSON.stringify({ file: parsed.fileName, sha256: result.sha256 }),
    });
  }
  return result;
});

ipcMain.handle(IPC_CHANNELS.SP_UPLOAD, async (_e, payload) => {
  const parsed = schemas.SpUploadSchema.parse(payload);
  const userId = getCurrentUserId();
  const stored = spConnection.loadCookies(userId);
  if (stored) {
    await restoreCookies(stored);
  }
  const result = await uploadFileToSharePoint(parsed.siteUrl, parsed.libraryPath, parsed.localFilePath);
  if (result.success) {
    auditService.log({
      userId,
      action: 'sp:upload',
      entityType: 'document',
      details: JSON.stringify({ file: result.fileName }),
    });
    spConnection.setLastSync(userId);
  }
  return result;
});

// --- Phase 5: Sync + Templates + Audit + Analysis ---

ipcMain.handle(IPC_CHANNELS.EXPERTISE_LIST, () => {
  return listAvailableExpertise();
});

ipcMain.handle(IPC_CHANNELS.LAWVU_IMPORT, (_e, payload) => {
  const parsed = schemas.LawvuImportSchema.parse(payload);
  const userId = getCurrentUserId();
  try {
    const zipBuffer = Buffer.from(parsed.zipBase64, 'base64');
    const result = importFromZip(zipBuffer, userId);
    return result;
  } catch (err) {
    return { ok: false, error: String(err), contractsImported: 0, filesImported: 0, usersCreated: 0, errors: [{ row: 0, message: String(err) }], skipped: 0, duplicates: 0 };
  }
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_IMPORT, (_e, payload) => {
  const parsed = schemas.ImportContractSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = wrapError(() => {
    const contract = importContract(userId, parsed.title, parsed.content, {
      counterparty: parsed.counterparty,
      jurisdiction: parsed.jurisdiction,
      contractType: parsed.contractType,
    });
    auditService.log({
      userId,
      action: 'contract:import',
      entityType: 'contract',
      entityId: contract.id,
      details: JSON.stringify({ title: parsed.title }),
    });
    return { contract };
  });
  return result.ok ? result.data : { error: result.error };
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_ANALYZE, async (_e, payload) => {
  const parsed = schemas.AnalyzeSchema.parse(payload);
  const userId = getCurrentUserId();
  const apiKey = authService.getDecryptedApiKey();
  if (!apiKey) return { error: 'No API key configured. Set your key in Settings.' };

  const config = authService.getAiConfig(userId);
  const baseUrl = config?.baseUrl;
  const ai = getProvider((config?.provider as 'openai' | 'anthropic') ?? 'openai');
  const prompt = buildAnalysisPrompt(parsed.contractText, parsed.clientRole);

  try {
    const result = await ai.generateDraft(prompt, apiKey, config?.model ?? 'gpt-4', baseUrl);
    auditService.log({
      userId,
      action: 'contract:analyze',
      entityType: 'contract',
      details: JSON.stringify({ model: config?.model, tokens: result.tokensUsed }),
    });
    return { analysis: result.content, tokensUsed: result.tokensUsed };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle(IPC_CHANNELS.CONTRACT_SUMMARIZE, async (_e, payload) => {
  const parsed = schemas.SummarizeSchema.parse(payload);
  const userId = getCurrentUserId();
  const apiKey = authService.getDecryptedApiKey();
  if (!apiKey) return { error: 'No API key configured. Set your key in Settings.' };

  const config = authService.getAiConfig(userId);
  const baseUrl = config?.baseUrl;
  const ai = getProvider((config?.provider as 'openai' | 'anthropic') ?? 'openai');
  const prompt = buildSummarizationPrompt(parsed.contractText);

  try {
    const result = await ai.generateDraft(prompt, apiKey, config?.model ?? 'gpt-4', baseUrl);
    auditService.log({
      userId,
      action: 'contract:summarize',
      entityType: 'contract',
      details: JSON.stringify({ model: config?.model, tokens: result.tokensUsed }),
    });
    return { summary: result.content, tokensUsed: result.tokensUsed };
  } catch (err) {
    return { error: String(err) };
  }
});

ipcMain.handle(IPC_CHANNELS.SYNC_RUN, async () => {
  const userId = getCurrentUserId();
  const result = wrapError(async () => runSyncCycle(userId));
  if (result.ok) return await result.data;
  return { downloaded: 0, uploaded: 0, conflicts: [], errors: [result.error], totalProcessed: 0 };
});

ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, () => {
  return { pending: getPendingQueue().length };
});

ipcMain.handle(IPC_CHANNELS.SYNC_QUEUE, () => {
  return getPendingQueue();
});

ipcMain.handle(IPC_CHANNELS.TEMPLATE_LIST, () => {
  templateService.seedDefaultTemplates(getCurrentUserId());
  return templateService.listTemplates();
});

ipcMain.handle(IPC_CHANNELS.TEMPLATE_GET, (_e, payload) => {
  const parsed = schemas.TemplateIdSchema.parse(payload);
  return templateService.getTemplate(parsed.templateId) ?? null;
});

ipcMain.handle(IPC_CHANNELS.TEMPLATE_CREATE, (_e, payload) => {
  const parsed = schemas.TemplateCreateSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = wrapError(() => templateService.createCustomTemplate(userId, parsed.name, parsed.content, parsed.description, parsed.contractType));
  return result.ok ? { template: result.data } : { error: result.error };
});

ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, (_e, payload) => {
  const parsed = schemas.TemplateIdSchema.parse(payload);
  const result = wrapError(() => templateService.deleteTemplate(parsed.templateId));
  return result.ok ? { ok: true } : { ok: false, error: result.error };
});

ipcMain.handle(IPC_CHANNELS.TEMPLATE_GENERATE, (_e, payload) => {
  const parsed = schemas.TemplateGenerateSchema.parse(payload);
  const userId = getCurrentUserId();
  const result = wrapError(() => templateService.generateContractFromTemplate(userId, parsed.templateId, parsed.variables, parsed.title));
  if (result.ok) {
    const contract = getContract(result.data);
    return { contract };
  }
  return { error: result.error };
});

ipcMain.handle(IPC_CHANNELS.AUDIT_QUERY, (_e, payload) => {
  const parsed = payload ? schemas.AuditQuerySchema.parse(payload) : {};
  return auditService.query(parsed);
});

// --- Analytics Dashboard ---

ipcMain.handle(IPC_CHANNELS.ANALYTICS_CONTRACT_STATUS, () => analytics.getContractStatusCounts());
ipcMain.handle(IPC_CHANNELS.ANALYTICS_AI_USAGE, () => analytics.getAiUsageStats());
ipcMain.handle(IPC_CHANNELS.ANALYTICS_SYNC_HEALTH, () => analytics.getSyncHealth());
ipcMain.handle(IPC_CHANNELS.ANALYTICS_AUDIT_TIMELINE, () => analytics.getAuditTimeline());
ipcMain.handle(IPC_CHANNELS.ANALYTICS_TEMPLATE_USAGE, () => analytics.getTemplateUsage());

// --- Security & Window Setup ---
app.commandLine.appendSwitch('disable-gpu');

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // Block navigation to external origins
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = ['http://localhost:5173', 'file://'];
    if (!allowedOrigins.some((origin) => url.startsWith(origin))) {
      event.preventDefault();
    }
  });

  // Block new windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Renderer loaded');
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const levelLabel = level === 0 ? 'Verbose' : level === 1 ? 'Log' : level === 2 ? 'Warn' : 'Error';
    console.log(`[Renderer ${levelLabel}]`, message);
  });
};

app.whenReady().then(() => {
  // Test isolation: use a custom userData directory when LEGALVU_TEST_USERDATA is set
  if (process.env.LEGALVU_TEST_USERDATA) {
    app.setPath('userData', process.env.LEGALVU_TEST_USERDATA);
  }

  // Set strict CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:5173 ws://localhost:5173;",
        ],
      },
    });
  });

  getConnection();
  migrate();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  closeConnection();
});
