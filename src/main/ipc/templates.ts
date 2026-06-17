import { ipcMain } from 'electron';
import * as templateService from '../services/template-service';
import { getContract } from '../services/contract-service';
import * as schemas from '../validation/schemas';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { getCurrentUserId, wrapError } from './types';

/**
 * Register template IPC handlers.
 * All handlers require authentication.
 */
export function registerTemplateHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.TEMPLATE_LIST, () => {
    templateService.seedDefaultTemplates(getCurrentUserId());
    return templateService.listTemplates();
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_GET, (_e, payload) => {
    const parsed = schemas.TemplateIdSchema.parse(payload);
    getCurrentUserId(); // auth guard
    return templateService.getTemplate(parsed.templateId) ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_CREATE, (_e, payload) => {
    const parsed = schemas.TemplateCreateSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = wrapError(() => templateService.createCustomTemplate(userId, parsed.name, parsed.content, parsed.description, parsed.contractType));
    return result.ok ? { ok: true, data: { template: result.data } } : { ok: false, error: result.error };
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_DELETE, (_e, payload) => {
    const parsed = schemas.TemplateIdSchema.parse(payload);
    getCurrentUserId(); // auth guard
    const result = wrapError(() => templateService.deleteTemplate(parsed.templateId));
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATE_GENERATE, (_e, payload) => {
    const parsed = schemas.TemplateGenerateSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = wrapError(() => {
      const contractId = templateService.generateContractFromTemplate(userId, parsed.templateId, parsed.variables, parsed.title);
      const contract = getContract(contractId);
      return { contract };
    });
    return result.ok ? { ok: true, data: result.data } : { ok: false, error: result.error };
  });
}