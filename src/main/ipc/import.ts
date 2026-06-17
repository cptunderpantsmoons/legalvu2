import { ipcMain } from 'electron';
import { listAvailableExpertise } from '../services/legal-expertise';
import { importFromZip } from '../services/lawvu-import-service';
import * as schemas from '../validation/schemas';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { getCurrentUserId } from './types';

/**
 * Register import IPC handlers.
 * - EXPERTISE_LIST: no auth required (public reference data)
 * - LAWVU_IMPORT: auth required
 */
export function registerImportHandlers(): void {
  // --- Expertise (no auth) ---
  ipcMain.handle(IPC_CHANNELS.EXPERTISE_LIST, () => {
    return listAvailableExpertise();
  });

  // --- LAWVU Import (auth required) ---
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
}