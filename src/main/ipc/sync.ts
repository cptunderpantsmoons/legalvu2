import { ipcMain } from 'electron';
import { runSyncCycle, getPendingQueue } from '../services/sync-service';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { getCurrentUserId, asyncWrapError } from './types';

/**
 * Register sync IPC handlers.
 * All handlers require authentication.
 */
export function registerSyncHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.SYNC_RUN, async () => {
    const userId = getCurrentUserId();
    const result = await asyncWrapError(async () => runSyncCycle(userId));
    if (result.ok) return { ok: true, data: result.data };
    return { ok: false, error: result.error, data: { downloaded: 0, uploaded: 0, conflicts: [], errors: [result.error], totalProcessed: 0 } };
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_STATUS, () => {
    getCurrentUserId(); // auth guard
    return { pending: getPendingQueue().length };
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_QUEUE, () => {
    getCurrentUserId(); // auth guard
    return getPendingQueue();
  });
}