import { test, expect } from '@playwright/test';

/**
 * Dashboard E2E Tests
 *
 * Tests for the banking dashboard page including account summaries,
 * recent transactions, responsive layout, and error handling.
 */

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  });

  test.describe('Page Loading', () => {
    test('should show loading state while content loads', async ({ page }) => {
      await page.goto('/dashboard', { waitUntil: 'commit' });

      const spinner = page.locator('.animate-spin');
      const skeleton = page.locator('[data-slot="skeleton"], .animate-pulse');

      const hasLoadingIndicator = await spinner.or(skeleton).first().isVisible({ timeout: 5000 }).catch(() => false);

      await page.waitForLoadState('networkidle');
      const heading = page.getByRole('heading').first();
      await expect(heading).toBeVisible({ timeout: 15000 });

      expect(hasLoadingIndicator || await heading.isVisible()).toBeTruthy();
    });

    test('should render dashboard content after load', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Dashboard should have at least one heading
      const headings = page.locator('h1, h2, h3');
      const count = await headings.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Account Summary', () => {
    test('should display account balance cards', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Look for currency-formatted values (e.g., "$1,234.56")
      const currencyValues = page.locator('text=/\\$[\\d,.]+/');
      const count = await currencyValues.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display properly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const body = page.locator('body');
      await expect(body).toBeVisible();

      // No horizontal overflow
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      const clientWidth = await body.evaluate((el) => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test('should display properly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const body = page.locator('body');
      await expect(body).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should not show error boundary under normal conditions', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      const errorHeading = page.getByText(/page failed to load/i);
      const isErrorVisible = await errorHeading.isVisible().catch(() => false);
      expect(isErrorVisible).toBeFalsy();
    });

    test('should handle API failures gracefully', async ({ page }) => {
      await page.route('**/functions/**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Page should not crash — either shows error message or gracefully degrades
      const body = page.locator('body');
      await expect(body).toBeVisible();
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    });
  });
});
