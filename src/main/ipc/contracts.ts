import { ipcMain } from "electron";
import {
  createContractFromPrompt,
  getContract,
  listContracts,
  saveContractContent,
  importContract,
  saveContractFromStream,
  searchContracts,
} from "../services/contract-service";
import { getProvider } from "../services/ai-adapter";
import {
  buildContractPrompt,
  buildAnalysisPrompt,
  buildSummarizationPrompt,
  PROMPT_VERSION,
} from "../services/prompts";
import { transitionStatus } from "../services/contract-lifecycle";
import {
  exportContractToDocx,
  exportContractToPdf,
} from "../services/document-service";
import * as authService from "../services/auth-service";
import * as auditService from "../services/audit-service";
import * as schemas from "../validation/schemas";
import { IPC_CHANNELS } from "../../shared/ipc-channels";
import type { IpcDeps } from "./types";
import {
  sendToRenderer,
  getCurrentUserId,
  wrapError,
  asyncWrapError,
} from "./types";

/**
 * Register contract, AI streaming, analysis, summarize, and import IPC handlers.
 * All handlers require authentication.
 * Needs IpcDeps for streaming (sendToRenderer + activeStreamController management).
 */
export function registerContractHandlers(deps: IpcDeps): void {
  // --- Contract Generation ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_GENERATE, async (_e, payload) => {
    const parsed = schemas.ContractGenerateSchema.parse(payload);
    const userId = getCurrentUserId();
    const apiKey = authService.getDecryptedApiKey();
    if (!apiKey)
      return {
        ok: false,
        error: "No API key configured. Set your key in Settings.",
      };

    const result = await asyncWrapError(async () => {
      const contract = await createContractFromPrompt(
        userId,
        parsed.provider,
        apiKey,
        parsed.model,
        parsed.input,
      );
      auditService.log({
        userId,
        action: "contract:create",
        entityType: "contract",
        entityId: contract.id,
        details: JSON.stringify({
          promptVersion: PROMPT_VERSION,
          model: parsed.model,
          tokensUsed: contract.aiTokensUsed ?? 0,
        }),
      });
      return { contract };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Streaming (single AI call — no double call) ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_STREAM_START, async (_e, payload) => {
    const parsed = schemas.ContractStreamStartSchema.parse(payload);
    const userId = getCurrentUserId();
    const apiKey = authService.getDecryptedApiKey();
    if (!apiKey)
      return {
        ok: false,
        error: "No API key configured. Set your key in Settings.",
      };

    try {
      const config = authService.getAiConfig(userId);
      const baseUrl = config?.baseUrl;
      const ai = getProvider(parsed.provider);
      const prompt = buildContractPrompt(parsed.input);
      deps.setActiveStreamController(new AbortController());

      // Stream the draft — this is the ONLY AI call
      const streamResult = await ai.streamDraft(
        prompt,
        apiKey,
        parsed.model,
        baseUrl,
        (chunk) => sendToRenderer(deps, IPC_CHANNELS.AI_STREAM_CHUNK, chunk),
        deps.getActiveStreamController()!.signal,
      );

      // Save the already-streamed content — NO second AI call
      const contract = saveContractFromStream(
        userId,
        parsed.provider,
        parsed.model,
        parsed.input,
        streamResult.content,
        streamResult.tokensUsed,
      );

      auditService.log({
        userId,
        action: "contract:create",
        entityType: "contract",
        entityId: contract.id,
        details: JSON.stringify({
          promptVersion: PROMPT_VERSION,
          model: parsed.model,
          tokensUsed: streamResult.tokensUsed,
          streamed: true,
        }),
      });

      sendToRenderer(deps, IPC_CHANNELS.AI_STREAM_DONE, contract);
      deps.setActiveStreamController(null);
      return { ok: true, data: { contract } };
    } catch (err) {
      const errorMsg = (err as Error).message;
      sendToRenderer(deps, IPC_CHANNELS.AI_STREAM_ERROR, errorMsg);
      deps.setActiveStreamController(null);
      return { ok: false, error: errorMsg };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CONTRACT_STREAM_CANCEL, () => {
    getCurrentUserId(); // auth guard
    const controller = deps.getActiveStreamController();
    if (controller) {
      controller.abort();
      deps.setActiveStreamController(null);
    }
  });

  // --- Contract CRUD ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_FETCH, (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = schemas.ContractFetchSchema.parse(payload);
    return getContract(parsed.id) ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.CONTRACT_LIST, (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = payload ? schemas.ContractListSchema.parse(payload) : {};
    const limit = typeof parsed.limit === "number" ? parsed.limit : 100;
    const offset = typeof parsed.offset === "number" ? parsed.offset : 0;
    return listContracts(limit, offset);
  });

  ipcMain.handle(IPC_CHANNELS.CONTRACT_SAVE, (_e, payload) => {
    const parsed = schemas.ContractSaveSchema.parse(payload);
    const userId = getCurrentUserId();
    const contract = saveContractContent(parsed.id, parsed.content);
    if (contract) {
      auditService.log({
        userId,
        action: "contract:save",
        entityType: "contract",
        entityId: parsed.id,
      });
    }
    return contract ?? null;
  });

  ipcMain.handle(IPC_CHANNELS.CONTRACT_TRANSITION, (_e, payload) => {
    const parsed = schemas.ContractTransitionSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = wrapError(() => {
      const contract = transitionStatus(parsed.id, parsed.target, userId);
      return { contract };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Export ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_EXPORT_DOCX, async (_e, payload) => {
    const parsed = schemas.ExportSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = await asyncWrapError(async () => {
      const filePath = await exportContractToDocx(parsed.contractId, userId);
      return { path: filePath };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  ipcMain.handle(IPC_CHANNELS.CONTRACT_EXPORT_PDF, async (_e, payload) => {
    const parsed = schemas.ExportSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = await asyncWrapError(async () => {
      const filePath = await exportContractToPdf(parsed.contractId, userId);
      return { path: filePath };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Import (single contract) ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_IMPORT, (_e, payload) => {
    const parsed = schemas.ImportContractSchema.parse(payload);
    const userId = getCurrentUserId();
    const result = wrapError(() => {
      const contract = importContract(userId, parsed.title, parsed.content, {
        counterparty: parsed.counterparty,
        jurisdiction: parsed.jurisdiction,
        contractType: parsed.contractType,
      });
      auditService.log({
        userId,
        action: "contract:import",
        entityType: "contract",
        entityId: contract.id,
        details: JSON.stringify({ title: parsed.title }),
      });
      return { contract };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Analysis ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_ANALYZE, async (_e, payload) => {
    const parsed = schemas.AnalyzeSchema.parse(payload);
    const userId = getCurrentUserId();
    const apiKey = authService.getDecryptedApiKey();
    if (!apiKey)
      return {
        ok: false,
        error: "No API key configured. Set your key in Settings.",
      };

    const config = authService.getAiConfig(userId);
    const baseUrl = config?.baseUrl;
    const ai = getProvider(
      (config?.provider as "openai" | "anthropic") ?? "openai",
    );
    const prompt = buildAnalysisPrompt(parsed.contractText, parsed.clientRole);

    const result = await asyncWrapError(async () => {
      const aiResult = await ai.generateDraft(
        prompt,
        apiKey,
        config?.model ?? "gpt-4",
        baseUrl,
      );
      auditService.log({
        userId,
        action: "contract:analyze",
        entityType: "contract",
        details: JSON.stringify({
          model: config?.model,
          tokens: aiResult.tokensUsed,
        }),
      });
      return { analysis: aiResult.content, tokensUsed: aiResult.tokensUsed };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Summarize ---
  ipcMain.handle(IPC_CHANNELS.CONTRACT_SUMMARIZE, async (_e, payload) => {
    const parsed = schemas.SummarizeSchema.parse(payload);
    const userId = getCurrentUserId();
    const apiKey = authService.getDecryptedApiKey();
    if (!apiKey)
      return {
        ok: false,
        error: "No API key configured. Set your key in Settings.",
      };

    const config = authService.getAiConfig(userId);
    const baseUrl = config?.baseUrl;
    const ai = getProvider(
      (config?.provider as "openai" | "anthropic") ?? "openai",
    );
    const prompt = buildSummarizationPrompt(parsed.contractText);

    const result = await asyncWrapError(async () => {
      const aiResult = await ai.generateDraft(
        prompt,
        apiKey,
        config?.model ?? "gpt-4",
        baseUrl,
      );
      auditService.log({
        userId,
        action: "contract:summarize",
        entityType: "contract",
        details: JSON.stringify({
          model: config?.model,
          tokens: aiResult.tokensUsed,
        }),
      });
      return { summary: aiResult.content, tokensUsed: aiResult.tokensUsed };
    });
    return result.ok
      ? { ok: true, data: result.data }
      : { ok: false, error: result.error };
  });

  // --- Contract Search (FTS5) ---
  // Auth-guarded: must be authenticated to search contracts.
  ipcMain.handle(IPC_CHANNELS.CONTRACT_SEARCH, (_e, payload) => {
    getCurrentUserId(); // auth guard
    const parsed = schemas.ContractSearchSchema.parse(payload);
    const hits = searchContracts(parsed.query, parsed.limit ?? 20);
    return hits;
  });
}
