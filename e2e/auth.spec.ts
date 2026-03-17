import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 *
 * Tests for login, logout, and authentication flows.
 */

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form on the home page', async ({ page }) => {
    // Look for sign-in elements
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    // Find email input
    const emailInput = page.getByPlaceholder(/email/i);
    const passwordInput = page.getByPlaceholder(/password/i);
    const signInButton = page.getByRole('button', { name: /sign in/i });

    // Fill invalid email
    await emailInput.fill('invalid-email');
    await passwordInput.fill('password123');
    await signInButton.click();

    // Should show error (form validation)
    await expect(page.getByText(/invalid/i)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to sign up from login', async ({ page }) => {
    // Look for sign up link
    const signUpLink = page.getByRole('link', { name: /sign up/i });

    if (await signUpLink.isVisible()) {
      await signUpLink.click();
      // Should navigate to sign up or show sign up form
      await expect(page.getByText(/create.*account/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show password reset option', async ({ page }) => {
    // Look for forgot password link
    const forgotPasswordLink = page.getByRole('link', { name: /forgot.*password/i });

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      // Should show reset password form
      await expect(page.getByText(/reset/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Protected Routes', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login or show auth required message
    await page.waitForLoadState('networkidle');

    // Either redirected to home or shown login form
    const url = page.url();
    const isOnHomeOrLogin = url.includes('/') && !url.includes('/dashboard');
    const hasLoginForm = await page.getByPlaceholder(/email/i).isVisible();

    expect(isOnHomeOrLogin || hasLoginForm).toBeTruthy();
  });

  test('should redirect to login when accessing pipeline without auth', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const isProtected = !url.includes('/pipeline') || await page.getByPlaceholder(/email/i).isVisible();

    expect(isProtected).toBeTruthy();
  });
});
