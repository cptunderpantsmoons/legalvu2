import { test, expect } from '@playwright/test';
import { launchApp, registerAndLogin } from './helpers';

test.describe('Contracts', () => {
  test('contracts list shows empty state', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'contracts@example.com', 'contractspass', 'Contracts User');

    await expect(page.locator('text=No contracts yet')).toBeVisible({ timeout: 10_000 });

    await cleanup();
  });

  test('intake form has all required fields', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'intake@example.com', 'intakepass', 'Intake User');

    await page.getByRole('button', { name: 'New Contract' }).click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Contract Type')).toBeVisible();
    await expect(page.locator('text=Counterparty')).toBeVisible();
    await expect(page.locator('text=Jurisdiction')).toBeVisible();
    await expect(page.locator('text=Governing Law')).toBeVisible();
    await expect(page.locator('text=Key Terms')).toBeVisible();
    await expect(page.locator('text=Include indemnity clause')).toBeVisible();
    await expect(page.locator('text=Include confidentiality clause')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Contract' })).toBeVisible();

    await cleanup();
  });

  test('intake form supports adding and removing key terms', async () => {
    const { page, cleanup } = await launchApp();

    await registerAndLogin(page, 'terms@example.com', 'termspass', 'Terms User');

    await page.getByRole('button', { name: 'New Contract' }).click();
    await page.waitForTimeout(500);

    const termInputs = page.locator('input[placeholder*="Term"]');
    await expect(termInputs).toHaveCount(1);

    await page.getByText('+ Add term').click();
    await expect(termInputs).toHaveCount(2);

    await termInputs.nth(0).fill('2 year term');
    await termInputs.nth(1).fill('Mutual termination');

    await page.locator('button:has-text("Remove")').first().click();
    await expect(termInputs).toHaveCount(1);

    await cleanup();
  });
});
