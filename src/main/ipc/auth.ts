import { ipcMain } from 'electron';
import * as authService from '../services/auth-service';
import * as schemas from '../validation/schemas';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { wrapError } from './types';

/**
 * Register auth-related IPC handlers.
 * These handlers do NOT require authentication (they are the auth endpoints themselves).
 */
export function registerAuthHandlers(): void {
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
}