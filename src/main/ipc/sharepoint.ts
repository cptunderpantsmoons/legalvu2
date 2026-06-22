import { ipcMain } from "electron";
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
} from "../services/sharepoint-service";
import * as spConnection from "../services/sp-connection-service";
import * as auditService from "../services/audit-service";
import * as schemas from "../validation/schemas";
import { IPC_CHANNELS } from "../../shared/ipc-channels";
import type { IpcDeps } from "./types";
import { getCurrentUserId, wrapError } from "./types";

/**
 * Register SharePoint browser and integration IPC handlers.
 * All handlers require authentication.
 * Accepts IpcDeps for potential future streaming use.
 */
export function registerSharePointHandlers(_deps: IpcDeps): void {
  // --- SharePoint Browser ---
  ipcMain.handle(IPC_CHANNELS.SP_BROWSER_START, async (_e, options) => {
    getCurrentUserId(); // auth guard
    const parsed = options ? schemas.SpBrowserStartSchema.parse(options) : {};
    return startBrowser(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.SP_BROWSER_STOP, async () => {
    getCurrentUserId(); // auth guard
    return stopBrowser();
  });

  ipcMain.handle(IPC_CHANNELS.SP_BROWSER_NAVIGATE, async (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = schemas.SpBrowserNavigateSchema.parse(payload);
    return navigateBrowser(parsed.url);
  });

  ipcMain.handle(IPC_CHANNELS.SP_BROWSER_SCREENSHOT, async (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = payload
      ? schemas.SpBrowserScreenshotSchema.parse(payload)
      : {};
    return screenshotBrowser(parsed.path);
  });

  ipcMain.handle(IPC_CHANNELS.SP_BROWSER_STATUS, () => {
    getCurrentUserId(); // auth guard
    return getBrowserStatus();
  });

  // --- SharePoint Integration (Phase 4.2-4.6) ---
  ipcMain.handle(IPC_CHANNELS.SP_LOGIN, async (_e, payload) => {
    const parsed = schemas.SpLoginSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = await loginToSharePoint(parsed.siteUrl);
    if (result.success && result.cookiesCaptured) {
      const cookies = await getCookies();
      spConnection.saveCookies(userId, cookies);
      auditService.log({
        userId,
        action: "sp:login",
        entityType: "sharepoint_connection",
        details: JSON.stringify({ cookies: cookies.length }),
      });
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
      spConnection.setLastError(userId, "Session expired");
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
    const result = await browseSharePointLibrary(
      parsed.siteUrl,
      parsed.libraryPath,
    );
    if (!result.success && result.error?.includes("Session expired")) {
      spConnection.setLastError(userId, result.error);
    }
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.SP_DOWNLOAD, async (_e, payload) => {
    const parsed = schemas.SpDownloadSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = await downloadSharePointFile(
      parsed.siteUrl,
      parsed.fileName,
      parsed.localDir,
    );
    if (result.success) {
      auditService.log({
        userId,
        action: "sp:download",
        entityType: "document",
        details: JSON.stringify({
          file: parsed.fileName,
          sha256: result.sha256,
        }),
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
    const result = await uploadFileToSharePoint(
      parsed.siteUrl,
      parsed.libraryPath,
      parsed.localFilePath,
    );
    if (result.success) {
      auditService.log({
        userId,
        action: "sp:upload",
        entityType: "document",
        details: JSON.stringify({ file: result.fileName }),
      });
      spConnection.setLastSync(userId);
    }
    return result;
  });
}
