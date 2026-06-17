import { chromium, type BrowserContext, type Page, type Cookie } from 'playwright';
import path from 'path';
import fs from 'fs';
import { getSelectors, isLoginUrl, type SharePointSelectors } from './sp-selectors';
import { getDefaultAppPaths } from '../infra/app-paths';

let browserContext: BrowserContext | null = null;
let activePage: Page | null = null;

function getUserDataDir(): string {
  return getDefaultAppPaths().getUserDataDir();
}

function getProfileDir(): string {
  const profileDir = path.join(getUserDataDir(), 'playwright-profile');
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true });
  }
  return profileDir;
}

const RATE_LIMIT_MS = 1500;
async function rateLimit(): Promise<void> {
  await new Promise((r) => setTimeout(r, RATE_LIMIT_MS));
}

export interface BrowserResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function startBrowser(options: { headless?: boolean } = {}): Promise<BrowserResult> {
  if (browserContext) {
    return { success: true, url: activePage?.url() };
  }
  try {
    const profileDir = getProfileDir();
    browserContext = await chromium.launchPersistentContext(profileDir, {
      headless: options.headless ?? true,
      args: process.env.LEGALVU_INSECURE_SP === '1'
        ? ['--no-sandbox', '--disable-setuid-sandbox']
        : [],
    });
    const pages = browserContext.pages();
    activePage = pages.length > 0 ? pages[0] : await browserContext.newPage();
    return { success: true, url: activePage.url() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function stopBrowser(): Promise<{ success: boolean }> {
  if (browserContext) {
    await browserContext.close();
    browserContext = null;
    activePage = null;
  }
  return { success: true };
}

export async function navigateBrowser(url: string): Promise<BrowserResult> {
  if (!activePage) return { success: false, error: 'Browser not started' };
  try {
    await activePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    return { success: true, url: activePage.url() };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function screenshotBrowser(filePath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  if (!activePage) return { success: false, error: 'Browser not started' };
  const userDataDir = getUserDataDir();
  const screenshotPath = filePath || path.join(userDataDir, 'screenshot.png');

  // Validate that screenshot path is within userData directory
  if (filePath) {
    const resolvedPath = path.resolve(filePath);
    const resolvedUserData = path.resolve(userDataDir);
    if (!resolvedPath.startsWith(resolvedUserData + path.sep) && resolvedPath !== resolvedUserData) {
      return { success: false, error: 'Screenshot path must be within the application userData directory' };
    }
  }

  try {
    await activePage.screenshot({ path: screenshotPath });
    return { success: true, path: screenshotPath };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export function getBrowserStatus(): { running: boolean; url?: string } {
  return { running: !!browserContext, url: activePage?.url() };
}

// --- Phase 4.2: Login cookie capture ---

export interface LoginResult extends BrowserResult {
  cookiesCaptured?: number;
}

export async function loginToSharePoint(siteUrl: string): Promise<LoginResult> {
  const selectors = getSelectors();
  const result = await startBrowser({ headless: false });
  if (!result.success) return { success: false, error: result.error };

  if (!activePage) return { success: false, error: 'No active page' };

  try {
    await activePage.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await rateLimit();

    if (isLoginUrl(activePage.url(), selectors)) {
      console.log('[SP] Login page detected — waiting for user to authenticate...');
      await activePage.waitForURL((url) => !isLoginUrl(url.toString(), selectors), { timeout: 300_000 });
      await rateLimit();
    }

    if (!activePage.url().includes(new URL(siteUrl).hostname)) {
      return { success: false, error: 'Authentication failed — did not return to SharePoint site' };
    }

    const cookies = await activePage.context().cookies();
    console.log(`[SP] Login successful, captured ${cookies.length} cookies`);
    return { success: true, url: activePage.url(), cookiesCaptured: cookies.length };
  } catch (err) {
    return { success: false, error: `Login failed: ${String(err)}` };
  }
}

export async function getCookies(): Promise<Cookie[]> {
  if (!browserContext) return [];
  return browserContext.cookies();
}

export async function restoreCookies(cookies: Cookie[]): Promise<void> {
  if (!browserContext) return;
  await browserContext.addCookies(cookies);
}

export async function checkSession(siteUrl: string): Promise<{ valid: boolean; url?: string }> {
  if (!activePage) return { valid: false };
  const selectors = getSelectors();
  try {
    await activePage.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await rateLimit();
    const isLogin = isLoginUrl(activePage.url(), selectors);
    return { valid: !isLogin, url: activePage.url() };
  } catch {
    return { valid: false };
  }
}

// --- Phase 4.3: Library browser ---

export interface SpFileEntry {
  name: string;
  url?: string;
  isFolder: boolean;
  size?: string;
  modified?: string;
}

export interface BrowseResult extends BrowserResult {
  files?: SpFileEntry[];
  currentPath?: string;
}

export async function browseSharePointLibrary(siteUrl: string, libraryPath: string, selectorsOverride?: Partial<SharePointSelectors>): Promise<BrowseResult> {
  if (!activePage) return { success: false, error: 'Browser not started' };
  const selectors = getSelectors(selectorsOverride);

  const libraryUrl = libraryPath.startsWith('http')
    ? libraryPath
    : `${siteUrl.replace(/\/$/, '')}/${libraryPath.replace(/^\//, '')}`;

  try {
    await activePage.goto(libraryUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await rateLimit();

    if (isLoginUrl(activePage.url(), selectors)) {
      return { success: false, error: 'Session expired — please log in again', url: activePage.url() };
    }

    await activePage.waitForSelector(selectors.fileItem, { timeout: 10_000 });

    const items = await activePage.evaluate((sels) => {
      const rows = document.querySelectorAll(sels.fileItem);
      const results: Array<{ name: string; url?: string; isFolder: boolean; size?: string; modified?: string }> = [];

      rows.forEach((row) => {
        const nameEl = row.querySelector(sels.fileName) as HTMLElement | null;
        const linkEl = row.querySelector(sels.fileLink) as HTMLAnchorElement | null;
        const sizeEl = row.querySelector(sels.fileSize) as HTMLElement | null;
        const modifiedEl = row.querySelector(sels.fileModified) as HTMLElement | null;
        const folderEl = row.querySelector(sels.folderName) as HTMLElement | null;

        const name = (nameEl?.textContent || folderEl?.textContent || '').trim();
        if (!name) return;

        results.push({
          name,
          url: linkEl?.href || undefined,
          isFolder: !!folderEl,
          size: sizeEl?.textContent?.trim() || undefined,
          modified: modifiedEl?.textContent?.trim() || undefined,
        });
      });

      return results;
    }, selectors);

    return {
      success: true,
      url: activePage.url(),
      currentPath: libraryUrl,
      files: items.filter((f) => f.name),
    };
  } catch (err) {
    return { success: false, error: `Browse failed: ${String(err)}` };
  }
}

// --- Phase 4.4: File download ---

export interface DownloadResult extends BrowserResult {
  localPath?: string;
  sha256?: string;
}

export async function downloadSharePointFile(
  siteUrl: string,
  fileName: string,
  localDir: string,
): Promise<DownloadResult> {
  if (!activePage) return { success: false, error: 'Browser not started' };
  const crypto = require('crypto');

  // Validate that localDir is within userData or temp directory
  const userDataDir = getUserDataDir();
  const tempDir = getDefaultAppPaths().getTempDir();
  const resolvedLocalDir = path.resolve(localDir);
  const resolvedUserData = path.resolve(userDataDir);
  const resolvedTemp = path.resolve(tempDir);
  const isWithinUserData = resolvedLocalDir.startsWith(resolvedUserData + path.sep) || resolvedLocalDir === resolvedUserData;
  const isWithinTemp = resolvedLocalDir.startsWith(resolvedTemp + path.sep) || resolvedLocalDir === resolvedTemp;
  if (!isWithinUserData && !isWithinTemp) {
    return { success: false, error: 'Download directory must be within the application userData or system temp directory' };
  }

  try {
    fs.mkdirSync(localDir, { recursive: true });
    const localPath = path.join(localDir, fileName);

    const downloadPromise = activePage.waitForEvent('download', { timeout: 30_000 });

    const linkHref = await activePage.evaluate((name) => {
      const links = document.querySelectorAll('a');
      for (const link of links) {
        if (link.textContent?.includes(name)) return (link as HTMLAnchorElement).href;
      }
      return null;
    }, fileName);

    if (linkHref) {
      await activePage.goto(linkHref, { waitUntil: 'commit' }).catch(() => {});
    } else {
      await activePage.click(`text=${fileName}`).catch(() => {});
    }

    const download = await downloadPromise;
    await download.saveAs(localPath);
    await rateLimit();

    const fileBuffer = fs.readFileSync(localPath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    return { success: true, localPath, sha256 };
  } catch (err) {
    return { success: false, error: `Download failed: ${String(err)}` };
  }
}

// --- Phase 4.5: File upload ---

export interface UploadResult extends BrowserResult {
  fileName?: string;
}

export async function uploadFileToSharePoint(
  siteUrl: string,
  libraryPath: string,
  localFilePath: string,
  selectorsOverride?: Partial<SharePointSelectors>,
): Promise<UploadResult> {
  if (!activePage) return { success: false, error: 'Browser not started' };
  const selectors = getSelectors(selectorsOverride);
  const libraryUrl = libraryPath.startsWith('http')
    ? libraryPath
    : `${siteUrl.replace(/\/$/, '')}/${libraryPath.replace(/^\//, '')}`;

  try {
    await activePage.goto(libraryUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await rateLimit();

    if (isLoginUrl(activePage.url(), selectors)) {
      return { success: false, error: 'Session expired — please log in again' };
    }

    await activePage.waitForSelector(selectors.uploadButton, { timeout: 10_000 });
    await activePage.click(selectors.uploadButton);
    await rateLimit();

    const fileChooserPromise = activePage.waitForEvent('filechooser', { timeout: 10_000 });
    await activePage.click(selectors.uploadInput).catch(() => {});
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(localFilePath);

    try {
      await activePage.waitForSelector(selectors.uploadConfirm, { timeout: 15_000 }).catch(() => {});
      await activePage.click(selectors.uploadConfirm).catch(() => {});
    } catch {
      // Some SP versions auto-upload
    }

    await activePage.waitForLoadState('networkidle', { timeout: 30_000 });
    await rateLimit();

    const fileName = path.basename(localFilePath);
    const uploaded = await activePage.evaluate(
      ({ name, sel }) => {
        const items = document.querySelectorAll(sel.fileItem);
        for (const item of items) {
          if (item.textContent?.includes(name)) return true;
        }
        return false;
      },
      { name: fileName, sel: selectors },
    );

    if (!uploaded) {
      return { success: false, error: 'Upload may have failed — file not visible in library after upload' };
    }

    return { success: true, url: activePage.url(), fileName };
  } catch (err) {
    return { success: false, error: `Upload failed: ${String(err)}` };
  }
}
