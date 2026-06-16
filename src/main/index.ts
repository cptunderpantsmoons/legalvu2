import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { getConnection } from './database/connection';
import { migrate } from './database/migrations';
import { createContractFromPrompt, getContract } from './services/contract-service';
import type { ContractPromptInput } from './services/prompts';

console.log('[Main] Process started');

ipcMain.handle('ping', () => 'pong');

ipcMain.handle('contract:generate', async (_event, payload: unknown) => {
  const { provider, apiKey, model, input } = payload as { provider: 'openai' | 'anthropic'; apiKey: string; model: string; input: ContractPromptInput };
  return createContractFromPrompt('system-user', provider, apiKey, model, input);
});

ipcMain.handle('contract:fetch', (_event, id: unknown) => {
  return getContract(id as string);
});
app.commandLine.appendSwitch('disable-gpu');

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173/';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Renderer loaded');
    mainWindow.webContents.executeJavaScript('window.electronAPI.ping()')
      .then((result: unknown) => console.log('[Main] IPC ping response:', result))
      .catch((err: Error) => console.error('[Main] IPC ping error:', err.message));
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    const levelLabel = level === 0 ? 'Verbose' : level === 1 ? 'Log' : level === 2 ? 'Warn' : 'Error';
    console.log(`[Renderer ${levelLabel}]`, message);
  });
};

app.whenReady().then(() => {
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
