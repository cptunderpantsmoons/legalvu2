import { test, expect } from '@playwright/test';
import { launchApp, registerAndLogin, loginWith } from './helpers';

test.describe('Authentication', () => {
  test('app launches and shows login page', async () => {
    const { page, cleanup } = await launchApp();

    await expect(page.locator('h1')).toContainText('Legal Workspace');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    await cleanup();
  });

  test('register creates account and navigates to app', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'test@example.com', 'testpassword123', 'Test User');

    await expect(page.getByRole('button', { name: 'New Contract' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

    await cleanup();
  });

  test('register rejects duplicate email', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'dup@example.com', 'password123', 'First User');

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForTimeout(500);
    await page.locator('input[type="text"]').fill('Second User');
    await page.locator('input[type="email"]').fill('dup@example.com');
    await page.locator('input[type="password"]').fill('password456');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=already registered')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });

  test('login with wrong password fails', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'auth@example.com', 'correctpassword', 'Auth User');

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForTimeout(1000);

    await page.locator('input[type="email"]').fill('auth@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });

  test('login succeeds after logout', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'login@example.com', 'mypassword', 'Login Test');

    await page.getByRole('button', { name: 'Logout' }).click();
    await page.waitForTimeout(1000);

    await loginWith(page, 'login@example.com', 'mypassword');

    await expect(page.getByRole('button', { name: 'New Contract' })).toBeVisible();

    await cleanup();
  });
});
