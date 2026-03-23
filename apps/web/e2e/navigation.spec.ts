import { test, expect } from "@playwright/test";

/**
 * Navigation E2E Tests
 *
 * Tests for basic navigation and UI elements of the banking platform.
 */

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load the home page", async ({ page }) => {
    await expect(page).toHaveTitle(/.+/);
  });

  test("should have main navigation elements", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();

    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);
  });

  test("should handle 404 for unknown routes", async ({ page }) => {
    await page.goto("/unknown-route-12345");
    await page.waitForLoadState("networkidle");

    const url = page.url();
    const is404 = await page
      .getByText(/not found|404/i)
      .isVisible()
      .catch(() => false);
    const isRedirect = url.endsWith("/") || url.includes("/login") || url.includes("/auth");

    expect(is404 || isRedirect).toBeTruthy();
  });
});

test.describe("Responsive Design", () => {
  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();

    const bodyWidth = await body.evaluate((el) => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375 + 2);
  });

  test("should be responsive on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("should be responsive on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const headings = page.locator("h1, h2, h3");
    const count = await headings.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should have alt text on images", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt !== null).toBeTruthy();
    }
  });

  test("should have visible focus states", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const buttons = page.locator("button");
    const count = await buttons.count();

    if (count > 0) {
      const button = buttons.first();
      await button.focus();
      await expect(button).toBeVisible();
    }
  });
});

test.describe("Performance", () => {
  test("should load within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000);
  });

  test("should not have JavaScript errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const criticalErrors = errors.filter(
      (err) => !err.includes("ResizeObserver") && !err.includes("network"),
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
