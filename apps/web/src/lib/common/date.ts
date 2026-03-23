/**
 * Banking Date Utilities
 *
 * Helpers for business day calculations, cutoff times, and date formatting
 * specific to banking operations.
 *
 * Supports multiple country holiday calendars: US, GB, EU (TARGET2), BR.
 * All functions default to 'US' for backward compatibility.
 *
 * Formatting functions accept an optional `locale` parameter. When omitted,
 * they use the active i18n language for locale-appropriate date display.
 */

import i18n from "@/lib/i18n";

export type BankingCountry = "US" | "GB" | "EU" | "BR";

function resolveLocale(locale?: string): string {
  return locale ?? i18n.language ?? "en";
}

// =============================================================================
// Holiday Calendars
// =============================================================================

/**
 * Check if a date falls on a US federal bank holiday (simplified).
 */
function isUSBankHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();

  // New Year's Day
  if (month === 0 && day === 1) return true;
  // MLK Day (3rd Monday of January)
  if (month === 0 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;
  // Presidents' Day (3rd Monday of February)
  if (month === 1 && dayOfWeek === 1 && day >= 15 && day <= 21) return true;
  // Memorial Day (last Monday of May)
  if (month === 4 && dayOfWeek === 1 && day >= 25) return true;
  // Juneteenth
  if (month === 5 && day === 19) return true;
  // Independence Day
  if (month === 6 && day === 4) return true;
  // Labor Day (1st Monday of September)
  if (month === 8 && dayOfWeek === 1 && day <= 7) return true;
  // Columbus Day (2nd Monday of October)
  if (month === 9 && dayOfWeek === 1 && day >= 8 && day <= 14) return true;
  // Veterans Day
  if (month === 10 && day === 11) return true;
  // Thanksgiving (4th Thursday of November)
  if (month === 10 && dayOfWeek === 4 && day >= 22 && day <= 28) return true;
  // Christmas
  if (month === 11 && day === 25) return true;

  return false;
}

/**
 * Compute Easter Sunday using the Anonymous Gregorian algorithm.
 * Used by UK and EU holiday calendars for movable holidays.
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * UK bank holidays (England & Wales).
 * https://www.gov.uk/bank-holidays
 */
function isGBBankHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const dayOfWeek = date.getDay();
  const year = date.getFullYear();

  // New Year's Day
  if (month === 0 && day === 1) return true;
  // Easter: Good Friday and Easter Monday
  const easter = easterSunday(year);
  if (sameDay(date, addDays(easter, -2))) return true; // Good Friday
  if (sameDay(date, addDays(easter, 1))) return true; // Easter Monday
  // Early May bank holiday (1st Monday of May)
  if (month === 4 && dayOfWeek === 1 && day <= 7) return true;
  // Spring bank holiday (last Monday of May)
  if (month === 4 && dayOfWeek === 1 && day >= 25) return true;
  // Summer bank holiday (last Monday of August)
  if (month === 7 && dayOfWeek === 1 && day >= 25) return true;
  // Christmas Day
  if (month === 11 && day === 25) return true;
  // Boxing Day
  if (month === 11 && day === 26) return true;

  return false;
}

/**
 * EU TARGET2 holidays (used for SEPA settlement).
 * https://www.ecb.europa.eu/paym/target/target2/profuse/calendar/html/index.en.html
 */
function isEUTarget2Holiday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  // New Year's Day
  if (month === 0 && day === 1) return true;
  // Easter: Good Friday and Easter Monday
  const easter = easterSunday(year);
  if (sameDay(date, addDays(easter, -2))) return true; // Good Friday
  if (sameDay(date, addDays(easter, 1))) return true; // Easter Monday
  // Labour Day (May 1)
  if (month === 4 && day === 1) return true;
  // Christmas Day
  if (month === 11 && day === 25) return true;
  // December 26
  if (month === 11 && day === 26) return true;

  return false;
}

/**
 * Brazilian banking holidays (ANBIMA calendar, simplified).
 * https://www.anbima.com.br/feriados/
 */
function isBRBankHoliday(date: Date): boolean {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  // New Year's Day
  if (month === 0 && day === 1) return true;
  // Carnival: Monday and Tuesday before Ash Wednesday (47 and 46 days before Easter)
  const easter = easterSunday(year);
  if (sameDay(date, addDays(easter, -48))) return true; // Carnival Monday
  if (sameDay(date, addDays(easter, -47))) return true; // Carnival Tuesday
  // Good Friday
  if (sameDay(date, addDays(easter, -2))) return true;
  // Corpus Christi
  if (sameDay(date, addDays(easter, 60))) return true;
  // Tiradentes Day (Apr 21)
  if (month === 3 && day === 21) return true;
  // Labour Day (May 1)
  if (month === 4 && day === 1) return true;
  // Independence Day (Sep 7)
  if (month === 8 && day === 7) return true;
  // Our Lady of Aparecida (Oct 12)
  if (month === 9 && day === 12) return true;
  // All Souls' Day (Nov 2)
  if (month === 10 && day === 2) return true;
  // Republic Day (Nov 15)
  if (month === 10 && day === 15) return true;
  // Christmas Day
  if (month === 11 && day === 25) return true;

  return false;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a date falls on a bank holiday for the given country.
 * Defaults to 'US' for backward compatibility.
 */
export function isBankHoliday(date: Date, country: BankingCountry = "US"): boolean {
  switch (country) {
    case "US":
      return isUSBankHoliday(date);
    case "GB":
      return isGBBankHoliday(date);
    case "EU":
      return isEUTarget2Holiday(date);
    case "BR":
      return isBRBankHoliday(date);
    default:
      return isUSBankHoliday(date);
  }
}

/**
 * Check if a date is a business day (weekday, not a bank holiday).
 */
export function isBusinessDay(date: Date, country: BankingCountry = "US"): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !isBankHoliday(date, country);
}

/**
 * Get the next business day from a given date.
 */
export function nextBusinessDay(from: Date = new Date(), country: BankingCountry = "US"): Date {
  const next = new Date(from);
  do {
    next.setDate(next.getDate() + 1);
  } while (!isBusinessDay(next, country));
  return next;
}

/**
 * Add N business days to a date.
 */
export function addBusinessDays(from: Date, days: number, country: BankingCountry = "US"): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result, country)) added++;
  }
  return result;
}

/** Default cutoff hours by country. */
const CUTOFF_DEFAULTS: Record<BankingCountry, { hour: number; timezone: string }> = {
  US: { hour: 17, timezone: "America/New_York" },
  GB: { hour: 15, timezone: "Europe/London" },
  EU: { hour: 16, timezone: "Europe/Frankfurt" },
  BR: { hour: 17, timezone: "America/Sao_Paulo" },
};

/**
 * Check if current time is past the payment cutoff.
 * Defaults to US ACH cutoff (5 PM ET). Pass a country to use
 * the standard cutoff for that jurisdiction.
 */
export function isPastCutoff(
  cutoffHour?: number,
  timezone?: string,
  country: BankingCountry = "US",
): boolean {
  const defaults = CUTOFF_DEFAULTS[country];
  const hour = cutoffHour ?? defaults.hour;
  const tz = timezone ?? defaults.timezone;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    hour12: false,
  });
  const currentHour = parseInt(formatter.format(now), 10);
  return currentHour >= hour;
}

/**
 * Format a date for banking display.
 * @example formatBankingDate("2026-03-10T14:30:00Z") => "Mar 10, 2026" (en) / "10. Mär. 2026" (de)
 */
export function formatBankingDate(dateString: string, locale?: string): string {
  return new Date(dateString).toLocaleDateString(resolveLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date with time for transaction details.
 * @example formatBankingDateTime("2026-03-10T14:30:00Z") => "Mar 10, 2026 at 2:30 PM"
 */
export function formatBankingDateTime(dateString: string, locale?: string): string {
  return new Date(dateString).toLocaleDateString(resolveLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Get relative time string using Intl.RelativeTimeFormat.
 * @example relativeTime("2026-03-09T14:30:00Z") => "yesterday" (en) / "gestern" (de)
 */
export function relativeTime(dateString: string, locale?: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: "auto" }).format(0, "day");
  }
  if (diffDays < 30) {
    return new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: "auto" }).format(
      -diffDays,
      "day",
    );
  }
  return formatBankingDate(dateString, locale);
}
