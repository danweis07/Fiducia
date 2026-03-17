/**
 * Currency Utilities
 *
 * All monetary values are stored as integer cents to avoid floating-point issues.
 * These helpers convert between cents and display formats.
 *
 * All formatting functions accept an optional `locale` parameter. When omitted,
 * they use the active i18n language so numbers are formatted according to the
 * user's language preference (e.g. 1.250,99 € in German).
 *
 * The default currency is tenant-aware: call `setDefaultCurrency()` when the
 * tenant context loads to switch from 'USD' to the tenant's native currency.
 */

import i18n from '@/lib/i18n';

// =============================================================================
// DEFAULT CURRENCY (tenant-aware)
// =============================================================================

let _defaultCurrency = 'USD';

/**
 * Set the default currency for formatting functions.
 * Called by TenantContext when the tenant loads.
 */
export function setDefaultCurrency(code: string) {
  _defaultCurrency = code;
}

/**
 * Get the current default currency code.
 */
export function getDefaultCurrency(): string {
  return _defaultCurrency;
}

// =============================================================================
// LOCALE RESOLUTION
// =============================================================================

function resolveLocale(locale?: string): string {
  return locale ?? i18n.language ?? 'en';
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format cents as a currency string using the user's locale.
 * Uses the tenant's default currency unless explicitly overridden.
 * @example formatCurrency(125099) => "$1,250.99" (en-US) / "1.250,99 €" (de-EUR)
 */
export function formatCurrency(cents: number, locale?: string, currency?: string): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency: currency ?? _defaultCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format cents as a compact currency string for large amounts.
 * @example formatCurrencyCompact(1250099) => "$12.5K"
 */
export function formatCurrencyCompact(cents: number, locale?: string, currency?: string): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat(resolveLocale(locale), {
    style: 'currency',
    currency: currency ?? _defaultCurrency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(dollars);
}

/**
 * Parse a dollar string to cents.
 * Handles both dot-decimal (1,250.99) and comma-decimal (1.250,99) formats.
 * @example parseToCents("1,250.99") => 125099
 * @example parseToCents("1.250,99") => 125099
 */
export function parseToCents(dollarString: string): number {
  let cleaned = dollarString.replace(/[^0-9.,-]/g, '');

  // Detect comma-decimal format (e.g. "1.250,99" or "250,99")
  if (/,\d{2}$/.test(cleaned) && cleaned.indexOf('.') < cleaned.lastIndexOf(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    cleaned = cleaned.replace(/,/g, '');
  }

  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return 0;
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars (for form inputs).
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Format basis points as a percentage.
 * @example formatInterestRate(425) => "4.25%"
 */
export function formatInterestRate(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Format a signed cent amount with +/- prefix.
 * @example formatSignedCurrency(5000) => "+$50.00"
 * @example formatSignedCurrency(-5000) => "-$50.00"
 */
export function formatSignedCurrency(cents: number, locale?: string, currency?: string): string {
  const prefix = cents >= 0 ? '+' : '';
  return `${prefix}${formatCurrency(cents, locale, currency)}`;
}

/**
 * Format cents in any ISO 4217 currency.
 * @example formatCurrencyIntl(125099, 'EUR') => "€1,250.99"
 * @example formatCurrencyIntl(850000, 'GBP') => "£8,500.00"
 * @example formatCurrencyIntl(3500000, 'BRL') => "R$35,000.00"
 */
export function formatCurrencyIntl(cents: number, currencyCode: string, locale?: string): string {
  const dollars = cents / 100;
  try {
    return new Intl.NumberFormat(resolveLocale(locale), {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(dollars);
  } catch {
    return `${currencyCode} ${dollars.toFixed(2)}`;
  }
}
