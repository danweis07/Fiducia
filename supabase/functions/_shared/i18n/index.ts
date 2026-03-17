/**
 * Backend i18n module for Supabase Edge Functions.
 *
 * Lightweight translation lookup (no external dependencies).
 * Loads error translations from JSON files and provides a simple `t()` function.
 *
 * Usage in handlers:
 *   import { resolveLocale, t } from '../_shared/i18n/index.ts';
 *   const locale = resolveLocale(req);
 *   const msg = t(locale, 'AUTH_REQUIRED', 'title');
 */

import type { SupportedLocale, ErrorTranslations } from './types.ts';
import enErrors from './locales/en/errors.json' with { type: 'json' };

// In-memory translation store: locale → error translations
const translations = new Map<string, ErrorTranslations>();
translations.set('en', enErrors as ErrorTranslations);

/** All locale codes we accept */
const SUPPORTED_LOCALES = new Set<string>([
  'en', 'es', 'fr', 'de', 'it', 'nl', 'pl', 'ro', 'el', 'cs', 'sv', 'hu',
  'pt', 'pt-BR',
  'zh-CN', 'zh-TW', 'ko', 'vi', 'tl',
  'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa',
  'ar',
  'ha', 'yo', 'ig', 'pcm',
]);

/**
 * Lazily load translations for a locale.
 * Returns the English fallback if the locale file doesn't exist.
 */
async function loadLocale(locale: string): Promise<ErrorTranslations> {
  if (translations.has(locale)) return translations.get(locale)!;

  try {
    const mod = await import(`./locales/${locale}/errors.json`, { with: { type: 'json' } });
    const data = (mod.default ?? mod) as ErrorTranslations;
    translations.set(locale, data);
    return data;
  } catch {
    // Locale file not yet available — cache the fallback so we don't retry
    translations.set(locale, enErrors as ErrorTranslations);
    return enErrors as ErrorTranslations;
  }
}

/**
 * Parse the Accept-Language header and return the best supported locale.
 * Falls back to 'en' if no match is found.
 */
export function resolveLocale(req: Request): SupportedLocale {
  const header = req.headers.get('Accept-Language') ?? '';

  // Parse weighted language tags: "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7"
  const entries = header
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1;
      return { tag: tag.trim(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of entries) {
    // Exact match
    if (SUPPORTED_LOCALES.has(tag)) return tag as SupportedLocale;
    // Try base language (e.g. "fr-FR" → "fr")
    const base = tag.split('-')[0];
    if (SUPPORTED_LOCALES.has(base)) return base as SupportedLocale;
  }

  return 'en';
}

/**
 * Get a translated error string.
 *
 * @param locale - The user's locale
 * @param code - The error code (e.g. 'AUTH_REQUIRED')
 * @param field - The field to retrieve ('title', 'message', or 'action')
 * @returns The translated string, or the English fallback
 */
export async function t(
  locale: SupportedLocale | string,
  code: string,
  field: 'title' | 'message' | 'action' = 'message',
): Promise<string> {
  const dict = await loadLocale(locale);
  const entry = dict[code] ?? dict['fallback'] ?? (enErrors as ErrorTranslations)[code];
  if (!entry) {
    const fallback = (enErrors as ErrorTranslations)['fallback'];
    return fallback?.[field] ?? 'An error occurred';
  }
  return entry[field] ?? entry.message ?? 'An error occurred';
}

/**
 * Synchronous version — uses only already-loaded translations.
 * Prefer the async `t()` when possible.
 */
export function tSync(
  locale: string,
  code: string,
  field: 'title' | 'message' | 'action' = 'message',
): string {
  const dict = translations.get(locale) ?? translations.get('en')!;
  const entry = dict[code] ?? dict['fallback'] ?? (enErrors as ErrorTranslations)['fallback'];
  return entry?.[field] ?? 'An error occurred';
}
