import { ipcMain } from 'electron';
import * as analytics from '../services/analytics-service';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { getCurrentUserId } from './types';

/**
 * Register analytics dashboard IPC handlers.
 * All handlers require authentication.
 */
export function registerAnalyticsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.ANALYTICS_CONTRACT_STATUS, () => {
    getCurrentUserId(); // auth guard
    return analytics.getContractStatusCounts();
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_AI_USAGE, () => {
    getCurrentUserId(); // auth guard
    return analytics.getAiUsageStats();
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_SYNC_HEALTH, () => {
    getCurrentUserId(); // auth guard
    return analytics.getSyncHealth();
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_AUDIT_TIMELINE, () => {
    getCurrentUserId(); // auth guard
    return analytics.getAuditTimeline();
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_TEMPLATE_USAGE, () => {
    getCurrentUserId(); // auth guard
    return analytics.getTemplateUsage();
  });
}