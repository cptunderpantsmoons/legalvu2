import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function launchApp(): Promise<{ app: ElectronApplication; page: Page; cleanup: () => Promise<void> }> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'legalvu-e2e-'));

  const app = await electron.launch({
    args: [path.join(process.cwd(), '.vite', 'build', 'index.js'), '--no-sandbox'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      LEGALVU_TEST_USERDATA: userDataDir,
    },
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1000);

  const cleanup = async () => {
    try {
      await app.close();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  return { app, page, cleanup };
}

export async function registerAndLogin(page: Page, email: string, password: string, fullName: string): Promise<void> {
  await page.getByRole('button', { name: 'Register' }).click();
  await page.waitForTimeout(500);

  await page.locator('input[type="text"]').fill(fullName);
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();

  await page.getByRole('button', { name: 'New Contract' }).waitFor({ state: 'visible', timeout: 20_000 });
}

export async function loginWith(page: Page, email: string, password: string): Promise<void> {
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.getByRole('button', { name: 'New Contract' }).waitFor({ state: 'visible', timeout: 20_000 });
}
