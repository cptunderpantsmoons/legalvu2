/**
 * Abstracts Electron-specific path resolution so services can be tested
 * without Electron.
 */

import path from 'path';
import os from 'os';

export interface AppPaths {
  getUserDataDir(): string;
  getDocumentsDir(): string;
  getTemplatesDir(): string;
  getExportDir(): string;
  getTempDir(): string;
}

/**
 * Production implementation that delegates to `electron.app.getPath`.
 */
export class ElectronAppPaths implements AppPaths {
  getUserDataDir(): string {
    const { app } = require('electron');
    return app.getPath('userData');
  }

  getDocumentsDir(): string {
    return path.join(this.getUserDataDir(), 'documents');
  }

  getTemplatesDir(): string {
    return path.join(this.getUserDataDir(), 'templates');
  }

  getExportDir(): string {
    return path.join(this.getUserDataDir(), 'documents');
  }

  getTempDir(): string {
    return os.tmpdir();
  }
}

/**
 * Fallback implementation for test / non-Electron environments.
 * Uses a subdirectory of the OS temp directory.
 */
export class FallbackAppPaths implements AppPaths {
  private readonly baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir ?? path.join(os.tmpdir(), 'legalvu-data');
  }

  getUserDataDir(): string {
    return this.baseDir;
  }

  getDocumentsDir(): string {
    return path.join(this.baseDir, 'documents');
  }

  getTemplatesDir(): string {
    return path.join(this.baseDir, 'templates');
  }

  getExportDir(): string {
    return path.join(this.baseDir, 'documents');
  }

  getTempDir(): string {
    return os.tmpdir();
  }
}

/**
 * Default singleton — resolves to ElectronAppPaths in production, FallbackAppPaths otherwise.
 * Alias for {@link getAppPaths}.
 */
export function getDefaultAppPaths(): AppPaths {
  return getAppPaths();
}

let _instance: AppPaths | null = null;

export function getAppPaths(): AppPaths {
  if (_instance) return _instance;
  try {
    const { app } = require('electron');
    if (app?.getPath) {
      _instance = new ElectronAppPaths();
      return _instance;
    }
  } catch {
    // Electron not available
  }
  _instance = new FallbackAppPaths();
  return _instance;
}

/** Override the singleton — useful for tests. */
export function setAppPaths(paths: AppPaths): void {
  _instance = paths;
}

/** Reset the singleton to its default resolution. */
export function resetAppPaths(): void {
  _instance = null;
}