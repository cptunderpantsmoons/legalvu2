import { ipcMain } from "electron";
import * as authService from "../services/auth-service";
import * as auditService from "../services/audit-service";
import * as schemas from "../validation/schemas";
import { IPC_CHANNELS } from "../../shared/ipc-channels";
import type { AIProvider } from "../../shared/types";
import { getCurrentUserId } from "./types";

/**
 * Register settings IPC handlers.
 * All handlers require authentication.
 */
export function registerSettingsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET_AI_KEY, (_e, payload) => {
    const parsed = schemas.SettingsSetAiKeySchema.parse(payload);
    const userId = getCurrentUserId();
    authService.setEncryptedApiKey(userId, parsed.apiKey);
    auditService.log({
      userId,
      action: "settings:setAiKey",
      entityType: "user",
      entityId: userId,
    });
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
    auditService.log({
      userId,
      action: "settings:setAiConfig",
      entityType: "user",
      entityId: userId,
    });
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
}
