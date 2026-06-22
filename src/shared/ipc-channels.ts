export const IPC_CHANNELS = {
  PING: "ping",

  CONTRACT_GENERATE: "contract:generate",
  CONTRACT_STREAM_START: "contract:stream:start",
  CONTRACT_STREAM_CANCEL: "contract:stream:cancel",
  CONTRACT_FETCH: "contract:fetch",
  CONTRACT_LIST: "contract:list",
  CONTRACT_SAVE: "contract:save",
  CONTRACT_TRANSITION: "contract:transition",
  CONTRACT_EXPORT_DOCX: "contract:exportDocx",
  CONTRACT_EXPORT_PDF: "contract:exportPdf",
  CONTRACT_ANALYZE: "contract:analyze",
  CONTRACT_SUMMARIZE: "contract:summarize",
  CONTRACT_IMPORT: "contract:import",
  CONTRACT_SEARCH: "contract:search",
  EXPERTISE_LIST: "expertise:list",

  AI_STREAM_CHUNK: "ai:stream:chunk",
  AI_STREAM_DONE: "ai:stream:done",
  AI_STREAM_ERROR: "ai:stream:error",

  AUTH_REGISTER: "auth:register",
  AUTH_LOGIN: "auth:login",
  AUTH_LOGOUT: "auth:logout",
  AUTH_ME: "auth:me",

  SETTINGS_SET_AI_KEY: "settings:setAiKey",
  SETTINGS_SET_AI_CONFIG: "settings:setAiConfig",
  SETTINGS_GET_AI_CONFIG: "settings:getAiConfig",

  SP_BROWSER_START: "sp:browser:start",
  SP_BROWSER_STOP: "sp:browser:stop",
  SP_BROWSER_NAVIGATE: "sp:browser:navigate",
  SP_BROWSER_SCREENSHOT: "sp:browser:screenshot",
  SP_BROWSER_STATUS: "sp:browser:status",

  SP_LOGIN: "sp:login",
  SP_CHECK_SESSION: "sp:checkSession",
  SP_GET_CONNECTION: "sp:getConnection",
  SP_SET_CONNECTION: "sp:setConnection",
  SP_BROWSE: "sp:browse",
  SP_DOWNLOAD: "sp:download",
  SP_UPLOAD: "sp:upload",

  SYNC_RUN: "sync:run",
  SYNC_STATUS: "sync:status",
  SYNC_QUEUE: "sync:queue",

  TEMPLATE_LIST: "template:list",
  TEMPLATE_GET: "template:get",
  TEMPLATE_CREATE: "template:create",
  TEMPLATE_DELETE: "template:delete",
  TEMPLATE_GENERATE: "template:generate",

  AUDIT_QUERY: "audit:query",

  LAWVU_IMPORT: "lawvu:import",
  LAWVU_IMPORT_STATUS: "lawvu:import:status",

  ANALYTICS_CONTRACT_STATUS: "analytics:contractStatus",
  ANALYTICS_AI_USAGE: "analytics:aiUsage",
  ANALYTICS_SYNC_HEALTH: "analytics:syncHealth",
  ANALYTICS_AUDIT_TIMELINE: "analytics:auditTimeline",
  ANALYTICS_TEMPLATE_USAGE: "analytics:templateUsage",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
