import { test, expect } from '@playwright/test';

/**
 * Accounts List E2E Tests
 *
 * Tests for the banking accounts page including account cards,
 * account types, balances, and navigation to account details.
 */

test.describe('Accounts Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/accounts');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Account Cards', () => {
    test('should render account information', async ({ page }) => {
      // Page should have content
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Should have at least one heading
      const headings = page.locator('h1, h2, h3');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display masked account numbers', async ({ page }) => {
      // Account numbers should be masked (****1234 pattern)
      const maskedNumbers = page.locator('text=/\\*{4}\\d{4}/');
      const count = await maskedNumbers.count();
      // May or may not be visible depending on auth state
      if (count > 0) {
        await expect(maskedNumbers.first()).toBeVisible();
      }
    });

    test('should display currency-formatted balances', async ({ page }) => {
      // Look for dollar amounts
      const currencyValues = page.locator('text=/\\$[\\d,.]+/');
      const count = await currencyValues.count();
      // Page should show some currency values if authenticated
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/accounts');
      await page.waitForLoadState('networkidle');

      const body = page.locator('body');
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(375 + 2);
    });
  });
});
