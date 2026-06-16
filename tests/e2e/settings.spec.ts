import { test, expect } from '@playwright/test';
import { launchApp, registerAndLogin } from './helpers';

test.describe('Settings', () => {
  test('can save AI provider configuration', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'settings@example.com', 'settingspass', 'Settings User');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.locator('h2').filter({ hasText: 'AI Configuration' })).toBeVisible();

    await page.locator('select').selectOption('anthropic');
    await page.locator('input[placeholder*="gpt-4"]').fill('claude-3-5-sonnet');
    await page.getByRole('button', { name: 'Save Configuration' }).click();

    await expect(page.locator('text=Configuration saved')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });

  test('can set API key (stored encrypted, field cleared)', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'apikey@example.com', 'apikeypass', 'API Key User');

    await page.getByRole('button', { name: 'Settings' }).click();

    const keyInput = page.locator('input[type="password"]');
    await keyInput.fill('sk-test-secret-key-12345');
    await page.getByRole('button', { name: 'Store Key' }).click();

    await expect(page.locator('text=API key stored securely')).toBeVisible({ timeout: 10_000 });
    await expect(keyInput).toHaveValue('');

    await cleanup();
  });

  test('can set custom base URL', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'baseurl@example.com', 'baseurlpass', 'Base URL User');

    await page.getByRole('button', { name: 'Settings' }).click();

    await page.locator('input[placeholder*="api.openai.com"]').fill('https://custom-endpoint.example.com/v1');
    await page.getByRole('button', { name: 'Save Configuration' }).click();

    await expect(page.locator('text=Configuration saved')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });
});
