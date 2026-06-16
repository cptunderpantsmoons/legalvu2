# LegalVu v2 — API & IPC Reference

## Overview

LegalVu uses Electron's IPC (Inter-Process Communication) for all communication between the renderer (React UI) and the main process (Node.js backend). There are no REST endpoints or WebSockets — the architecture is strictly local-desktop. The API surface is defined in `src/shared/ipc-channels.ts` as a single source of truth.

---

## IPC Channels

### Authentication

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `auth:register` | Renderer → Main | `{ email, fullName, password }` | `{ success, user? }` | Create local account |
| `auth:login` | Renderer → Main | `{ email, password }` | `{ success, user? }` | Authenticate and set session |
| `auth:logout` | Renderer → Main | `void` | `{ success }` | Clear session |
| `auth:me` | Renderer → Main | `void` | `{ user? }` | Get current user (rehydration) |

### Contracts

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `contract:generate` | Renderer → Main | `{ input, provider, model }` | `{ contract }` | AI-generated draft contract |
| `contract:stream:start` | Renderer → Main | `{ input, provider, model }` | `void` | Start streaming AI draft |
| `ai:stream:chunk` | Main → Renderer | `{ chunk }` | `void` | SSE chunk event (push) |
| `ai:stream:done` | Main → Renderer | `{ contract }` | `void` | Streaming complete |
| `ai:stream:error` | Main → Renderer | `{ error }` | `void` | SSE error event |
| `contract:fetch` | Renderer → Main | `{ id }` | `{ contract }` | Get contract by ID |
| `contract:list` | Renderer → Main | `{ status? }` | `{ contracts[] }` | List contracts (filtered by status) |
| `contract:save` | Renderer → Main | `{ id, content }` | `{ success }` | Save draft content |
| `contract:transition` | Renderer → Main | `{ id, toStatus }` | `{ success }` | Lifecycle state transition |
| `contract:exportDocx` | Renderer → Main | `{ id }` | `{ filePath }` | Export to DOCX |
| `contract:exportPdf` | Renderer → Main | `{ id }` | `{ filePath }` | Export to PDF |
| `contract:analyze` | Renderer → Main | `{ id }` | `{ analysis }` | Run AI risk analysis |
| `contract:summarize` | Renderer → Main | `{ id }` | `{ summary }` | AI summary of contract |
| `contract:import` | Renderer → Main | `{ filePath }` | `{ contract }` | Import from DOCX/PDF |
| `expertise:list` | Renderer → Main | `void` | `{ expertise[] }` | List available legal expertise modules |

### Templates

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `template:list` | Renderer → Main | `void` | `{ templates[] }` | List all templates |
| `template:get` | Renderer → Main | `{ id }` | `{ template }` | Get template by ID |
| `template:create` | Renderer → Main | `{ name, content, description? }` | `{ template }` | Create new template |
| `template:delete` | Renderer → Main | `{ id }` | `{ success }` | Delete template |
| `template:generate` | Renderer → Main | `{ templateId, variables }` | `{ contract }` | Generate contract from template |

### SharePoint Browser Automation

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `sp:browser:start` | Renderer → Main | `{ headless? }` | `{ success, url? }` | Launch Playwright browser |
| `sp:browser:stop` | Renderer → Main | `void` | `{ success }` | Close Playwright browser |
| `sp:browser:navigate` | Renderer → Main | `{ url }` | `{ success, url }` | Navigate to URL |
| `sp:browser:screenshot` | Renderer → Main | `{ filePath? }` | `{ success, path }` | Capture screenshot |
| `sp:browser:status` | Renderer → Main | `void` | `{ running, url? }` | Get browser status |
| `sp:login` | Renderer → Main | `{ siteUrl }` | `{ success, url?, cookiesCaptured }` | Manual login + cookie capture |
| `sp:checkSession` | Renderer → Main | `{ siteUrl }` | `{ valid, url? }` | Validate session |
| `sp:getConnection` | Renderer → Main | `void` | `{ connection? }` | Get saved SP config |
| `sp:setConnection` | Renderer → Main | `{ siteUrl, libraryPath }` | `{ success }` | Save SP config |
| `sp:browse` | Renderer → Main | `{ siteUrl, libraryPath }` | `{ files[], folders[] }` | List files in library |
| `sp:download` | Renderer → Main | `{ siteUrl, fileName, localDir }` | `{ success, localPath, sha256 }` | Download file from SP |
| `sp:upload` | Renderer → Main | `{ siteUrl, libraryPath, localFilePath }` | `{ success, fileName, fileUrl }` | Upload file to SP |

### Sync Engine

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `sync:run` | Renderer → Main | `void` | `{ downloaded, uploaded, conflicts[], errors[] }` | Execute queued sync ops |
| `sync:status` | Renderer → Main | `void` | `{ queueLength, running }` | Get sync queue status |
| `sync:queue` | Renderer → Main | `void` | `{ items[] }` | List pending sync items |

### Audit & Analytics

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `audit:query` | Renderer → Main | `{ entityType?, action?, limit?, offset? }` | `{ logs[] }` | Query audit log |
| `analytics:contractStatus` | Renderer → Main | `void` | `{ labels[], data[] }` | Contract status counts |
| `analytics:aiUsage` | Renderer → Main | `void` | `{ models[], tokens[], counts[] }` | AI usage metrics |
| `analytics:syncHealth` | Renderer → Main | `void` | `{ downloaded, uploaded, pending, conflict }` | SP sync health |
| `analytics:auditTimeline` | Renderer → Main | `{ days? }` | `{ dates[], counts[] }` | Audit events by date |
| `analytics:templateUsage` | Renderer → Main | `void` | `{ templates[], counts[] }` | Template usage counts |

### Lawvu Import

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `lawvu:import` | Renderer → Main | `{ zipBuffer }` | `{ contractsImported, filesImported, usersCreated, errors[], skipped }` | Import from Lawvu `.zip` |
| `lawvu:import:status` | Renderer → Main | `void` | `{ lastImport?, error? }` | Get last import status |

### Settings

| Channel | Direction | Input | Output | Description |
|---|---|---|---|---|
| `settings:setAiKey` | Renderer → Main | `{ apiKey }` | `{ success }` | Encrypt and store AI key (one-time transit) |
| `settings:setAiConfig` | Renderer → Main | `{ provider, model }` | `{ success }` | Set AI provider + model |
| `settings:getAiConfig` | Renderer → Main | `void` | `{ provider?, model?, apiKey? }` | Get current AI config |

---

## Shared Types

Key domain types are defined in `src/shared/types.ts`:

```typescript
export type ContractStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'signed'
  | 'active'
  | 'expired'
  | 'terminated';

export interface Contract {
  id: string;
  title: string;
  status: ContractStatus;
  counterparty: string | null;
  jurisdiction: string | null;
  content: string | null;
  metadata: string; // JSON
  aiPromptVersion: string;
  aiModel: string | null;
  aiTokensUsed: number;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

export interface Document {
  id: string;
  filename: string;
  localPath: string;
  sha256: string;
  spUrl: string | null;
  spSyncStatus: 'unsynced' | 'downloaded' | 'uploaded' | 'conflict';
  contractId: string | null;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'legal' | 'admin';
  createdAt: number;
}

export interface AuditLog {
  id: number;
  userId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string; // JSON
  timestamp: number;
}
```

---

## IPC Usage Patterns

### Renderer → Main (invoke)

```typescript
// Renderer sideonst contract = await window.electronAPI.contractGenerate({
  input: 'SaaS agreement for a marketing platform',
  provider: 'openai',
  model: 'gpt-4',
});
```

### Main → Renderer (push via preload)

```typescript
// Main side
mainWindow.webContents.send(IPC_CHANNELS.AI_STREAM_CHUNK, { chunk });
```

### No Backend Server

There is no REST, no WebSocket, no remote API. All communication is local IPC within the Electron process boundary.

---

## Extending the API

To add a new IPC channel:

1. Add channel constant to `src/shared/ipc-channels.ts`
2. Register handler in `src/main/index.ts`
3. Expose method in `src/preload/index.ts` (via `contextBridge`)
4. Augment `src/renderer/types/global.d.ts`
5. Add Zod schema in `src/main/validation/schemas.ts`
6. Add test in relevant service test file

**Example:**

```typescript
// 1. Add channel
export const IPC_CHANNELS = {
  // ...
  MY_NEW_FEATURE: 'my:new:feature',
} as const;

// 2. Register handler
ipcMain.handle(IPC_CHANNELS.MY_NEW_FEATURE, async (_e, payload) => {
  const parsed = MyNewSchema.parse(payload);
  return myService.doSomething(parsed);
});

// 3. Expose to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // ...
  myNewFeature: (payload) => ipcRenderer.invoke(IPC_CHANNELS.MY_NEW_FEATURE, payload),
});

// 4. TypeScript augmentation
declare global {
  interface Window {
    electronAPI: {
      // ...
      myNewFeature: (payload: MyNewInput) => Promise<MyNewOutput>;
    };
  }
}
```

---

## Zod Validation

All IPC inputs are validated with Zod schemas before processing. Schemas live in `src/main/validation/schemas.ts`.

| Schema | Used By | Fields |
|---|---|---|
| `AuthRegisterSchema` | `auth:register` | `email`, `fullName`, `password` |
| `AuthLoginSchema` | `auth:login` | `email`, `password` |
| `ContractGenerateSchema` | `contract:generate` | `input`, `provider`, `model` |
| `ContractExportSchema` | `contract:exportDocx/pdf` | `id` |
| `SpConfigSchema` | `sp:setConnection` | `siteUrl`, `libraryPath` |
| `TemplateCreateSchema` | `template:create` | `name`, `content`, `description?` |
| `LawvuImportSchema` | `lawvu:import` | `zipBuffer` (Buffer) |

Invalid payloads return `{ error: 'Validation failed' }` with HTTP-like status codes in `details`.

---

## References

- `src/shared/ipc-channels.ts` — Full channel definitions
- `src/shared/types.ts` — Domain types
- `src/main/index.ts` — Handler registration
- `src/preload/index.ts` — Renderer-facing API surface
- `src/renderer/types/global.d.ts` — TypeScript augmentation for `window.electronAPI`