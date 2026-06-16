import { test, expect } from '@playwright/test';
import { launchApp, registerAndLogin } from './helpers';

test.describe('Navigation', () => {
  test('sidebar navigation switches between views', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'nav@example.com', 'navpassword', 'Nav User');

    await expect(page.locator('h1').last()).toContainText('Contracts');

    await page.getByRole('button', { name: 'New Contract' }).click();
    await expect(page.locator('h1').last()).toContainText('New Contract');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('text=AI Configuration')).toBeVisible();

    await page.getByRole('button', { name: 'SharePoint' }).click();
    await expect(page.locator('h1').last()).toContainText('SharePoint');

    await page.getByRole('button', { name: 'Contracts' }).click();
    await expect(page.locator('h1').last()).toContainText('Contracts');

    await cleanup();
  });

  test('logout returns to login page', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'logout@example.com', 'logoutpassword', 'Logout User');

    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });
});
