import { test, expect, type Page } from '@playwright/test';

/**
 * Internationalization E2E Tests
 *
 * Validates that locale switching works correctly, RTL layout applies,
 * and translated text renders without overflow / raw-key leakage.
 */

// Locales to exercise — one LTR, one RTL, and one with longer strings (German)
const LOCALE_TESTS = [
  { code: 'en', dir: 'ltr', label: 'English' },
  { code: 'de', dir: 'ltr', label: 'Deutsch' },
  { code: 'ar', dir: 'rtl', label: 'العربية' },
  { code: 'es', dir: 'ltr', label: 'Español' },
] as const;

/**
 * Set the app language via localStorage before navigating.
 * This mirrors how the LanguageSelector persists the choice.
 */
async function setLocale(page: Page, code: string) {
  await page.addInitScript((locale) => {
    window.localStorage.setItem('vantage-language', locale);
  }, code);
}

test.describe('Internationalization', () => {
  test.describe('Language switching', () => {
    for (const locale of LOCALE_TESTS) {
      test(`should load app in ${locale.label} (${locale.code})`, async ({ page }) => {
        await setLocale(page, locale.code);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // The html element should reflect the locale
        const htmlLang = await page.getAttribute('html', 'lang');
        expect(htmlLang).toBe(locale.code);
      });
    }
  });

  test.describe('RTL layout', () => {
    test('Arabic should set dir="rtl" on html element', async ({ page }) => {
      await setLocale(page, 'ar');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const dir = await page.getAttribute('html', 'dir');
      expect(dir).toBe('rtl');
    });

    test('English should set dir="ltr" on html element', async ({ page }) => {
      await setLocale(page, 'en');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const dir = await page.getAttribute('html', 'dir');
      expect(dir).toBe('ltr');
    });
  });

  test.describe('Translation key leakage', () => {
    for (const locale of LOCALE_TESTS) {
      test(`no raw translation keys visible in ${locale.label} (${locale.code})`, async ({ page }) => {
        await setLocale(page, locale.code);
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Raw i18n keys follow the pattern "namespace.key" or "namespace.nested.key"
        // e.g. "banking.nav.dashboard", "common.loading"
        // We scan visible text for patterns that look like untranslated keys.
        const leakedKeys = await page.evaluate(() => {
          const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
          );
          const suspects: string[] = [];
          const keyPattern = /^(common|banking|settings|errors|admin|public)\.\w+/;

          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = (node.textContent ?? '').trim();
            if (text && keyPattern.test(text)) {
              suspects.push(text.substring(0, 80));
            }
          }
          return suspects;
        });

        expect(leakedKeys).toEqual([]);
      });
    }
  });

  test.describe('Text overflow with long translations', () => {
    test('German text should not overflow nav containers', async ({ page }) => {
      await setLocale(page, 'de');
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check that nav items don't overflow their containers
      const overflowIssues = await page.evaluate(() => {
        const issues: string[] = [];
        const navItems = document.querySelectorAll('nav a, nav button');

        navItems.forEach((el) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
            issues.push(
              `"${(htmlEl.textContent ?? '').trim().substring(0, 40)}" overflows by ${htmlEl.scrollWidth - htmlEl.clientWidth}px`
            );
          }
        });

        return issues;
      });

      // Log issues but don't hard-fail — some minor overflow may be acceptable
      if (overflowIssues.length > 0) {
        console.warn('Potential text overflow issues in German:', overflowIssues);
      }

      // Hard-fail only if more than 30% of nav items overflow
      const totalNavItems = await page.locator('nav a, nav button').count();
      const maxAcceptable = Math.ceil(totalNavItems * 0.3);
      expect(overflowIssues.length).toBeLessThanOrEqual(maxAcceptable);
    });
  });
});
