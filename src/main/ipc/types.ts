import type { BrowserWindow } from 'electron';
import * as authService from '../services/auth-service';

export interface IpcDeps {
  getMainWindow: () => BrowserWindow | null;
  getActiveStreamController: () => AbortController | null;
  setActiveStreamController: (controller: AbortController | null) => void;
}

export function sendToRenderer(deps: IpcDeps, channel: string, ...args: unknown[]): void {
  const win = deps.getMainWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, ...args);
  }
}

// --- Unified response types (Task 9) ---

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(error: string): Result<never> {
  return { ok: false, error };
}

/** Synchronous error wrapper — for handlers that call sync functions */
export function wrapError<T>(fn: () => T): Result<T> {
  try {
    return ok(fn());
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** Async error wrapper — for handlers that call async functions.
 *  The sync wrapError is broken for async because it returns a Promise<T>
 *  as T, so the .ok check always passes and errors become unhandled rejections.
 */
export async function asyncWrapError<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    return fail((err as Error).message);
  }
}

/** Auth guard — throws if not authenticated */
export function getCurrentUserId(): string {
  return authService.requireAuth();
}