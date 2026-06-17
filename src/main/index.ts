import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import { getConnection, closeConnection, backupDatabase } from './database/connection';
import { migrate } from './database/migrations';
import * as authService from './services/auth-service';
import type { IpcDeps } from './ipc/types';
import { registerAuthHandlers } from './ipc/auth';
import { registerSettingsHandlers } from './ipc/settings';
import { registerContractHandlers } from './ipc/contracts';
import { registerSharePointHandlers } from './ipc/sharepoint';
import { registerSyncHandlers } from './ipc/sync';
import { registerTemplateHandlers } from './ipc/templates';
import { registerAnalyticsHandlers } from './ipc/analytics';
import { registerAuditHandlers } from './ipc/audit';
import { registerImportHandlers } from './ipc/import';

let mainWindow: BrowserWindow | null = null;
let activeStreamController: AbortController | null = null;

const ipcDeps: IpcDeps = {
  getMainWindow: () => mainWindow,
  getActiveStreamController: () => activeStreamController,
  setActiveStreamController: (controller: AbortController | null) => {
    activeStreamController = controller;
  },
};

console.log('[Main] Process started');

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

  // Disable DevTools in production
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools();
    });
  }

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

  // Set strict CSP — different policies for development vs production
  const isDev = process.env.NODE_ENV === 'development';
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:5173 ws://localhost:5173; base-uri 'self'; form-action 'self';"
      : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https:; base-uri 'self'; form-action 'self'; frame-ancestors 'none';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Database init
  getConnection();
  migrate();

  // Restore previous session (auto-login across restarts)
  try {
    const restoredUserId = authService.restoreSession();
    if (restoredUserId) {
      console.log('[Main] Session restored for user:', restoredUserId);
    }
  } catch (err) {
    console.warn('[Main] Session restore skipped:', (err as Error).message);
  }

  // Create a database backup on startup and schedule weekly backups
  backupDatabase().catch((err) => {
    console.warn('[Main] Initial database backup failed:', (err as Error).message);
  });

  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const backupInterval = setInterval(() => {
    backupDatabase().catch((err) => {
      console.warn('[Main] Scheduled database backup failed:', (err as Error).message);
    });
  }, ONE_WEEK_MS);

  // Ensure the interval doesn't keep the process alive after quit
  backupInterval.unref?.();

  // --- Register IPC handlers ---
  // Auth handlers (no auth required — these are the auth endpoints)
  registerAuthHandlers();

  // Authenticated handlers
  registerSettingsHandlers();
  registerContractHandlers(ipcDeps);
  registerSharePointHandlers(ipcDeps);
  registerSyncHandlers();
  registerTemplateHandlers();
  registerAnalyticsHandlers();
  registerAuditHandlers();
  registerImportHandlers();

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