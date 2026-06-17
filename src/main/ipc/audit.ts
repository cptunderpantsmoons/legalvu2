import { ipcMain } from 'electron';
import * as auditService from '../services/audit-service';
import * as schemas from '../validation/schemas';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { getCurrentUserId } from './types';

/**
 * Register audit query IPC handler.
 * Requires authentication.
 */
export function registerAuditHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.AUDIT_QUERY, (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = payload ? schemas.AuditQuerySchema.parse(payload) : {};
    return auditService.query(parsed);
  });
}