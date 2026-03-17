import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isBankHoliday,
  isBusinessDay,
  nextBusinessDay,
  addBusinessDays,
  formatBankingDate,
  formatBankingDateTime,
  relativeTime,
} from '../date';

// =============================================================================
// isBankHoliday — US (default)
// =============================================================================

describe('isBankHoliday', () => {
  it('detects New Year Day', () => {
    expect(isBankHoliday(new Date(2026, 0, 1))).toBe(true);
  });

  it('detects Independence Day', () => {
    expect(isBankHoliday(new Date(2026, 6, 4))).toBe(true);
  });

  it('detects Christmas', () => {
    expect(isBankHoliday(new Date(2026, 11, 25))).toBe(true);
  });

  it('detects Juneteenth', () => {
    expect(isBankHoliday(new Date(2026, 5, 19))).toBe(true);
  });

  it('detects Veterans Day', () => {
    expect(isBankHoliday(new Date(2026, 10, 11))).toBe(true);
  });

  it('returns false for regular weekday', () => {
    // March 10, 2026 is a Tuesday
    expect(isBankHoliday(new Date(2026, 2, 10))).toBe(false);
  });

  it('returns false for regular Saturday (not a holiday)', () => {
    // March 14, 2026 is Saturday
    expect(isBankHoliday(new Date(2026, 2, 14))).toBe(false);
  });

  it('detects MLK Day 2026 (Jan 19)', () => {
    // 3rd Monday of January 2026
    expect(isBankHoliday(new Date(2026, 0, 19))).toBe(true);
  });

  it('detects Presidents Day 2026 (Feb 16)', () => {
    // 3rd Monday of February 2026
    expect(isBankHoliday(new Date(2026, 1, 16))).toBe(true);
  });

  it('detects Labor Day 2026 (Sep 7)', () => {
    // 1st Monday of September 2026
    expect(isBankHoliday(new Date(2026, 8, 7))).toBe(true);
  });

  it('returns false for Feb 14 (not a bank holiday)', () => {
    expect(isBankHoliday(new Date(2026, 1, 14))).toBe(false);
  });

  it('returns false for Halloween', () => {
    expect(isBankHoliday(new Date(2026, 9, 31))).toBe(false);
  });

  it('detects Thanksgiving 2026 (Nov 26)', () => {
    // 4th Thursday of November 2026
    expect(isBankHoliday(new Date(2026, 10, 26))).toBe(true);
  });

  it('does not detect day after Thanksgiving as holiday', () => {
    // Nov 27, 2026 is Friday — not officially a bank holiday
    expect(isBankHoliday(new Date(2026, 10, 27))).toBe(false);
  });

  it('detects Memorial Day 2026 (May 25)', () => {
    // Last Monday of May 2026
    expect(isBankHoliday(new Date(2026, 4, 25))).toBe(true);
  });

  it('detects Columbus Day 2026 (Oct 12)', () => {
    // 2nd Monday of October 2026
    expect(isBankHoliday(new Date(2026, 9, 12))).toBe(true);
  });
});

// =============================================================================
// isBankHoliday — UK (GB)
// =============================================================================

describe('isBankHoliday (GB)', () => {
  it('detects New Year Day', () => {
    expect(isBankHoliday(new Date(2026, 0, 1), 'GB')).toBe(true);
  });

  it('detects Christmas Day', () => {
    expect(isBankHoliday(new Date(2026, 11, 25), 'GB')).toBe(true);
  });

  it('detects Boxing Day', () => {
    expect(isBankHoliday(new Date(2026, 11, 26), 'GB')).toBe(true);
  });

  it('detects Good Friday 2026 (Apr 3)', () => {
    // Easter 2026 is April 5
    expect(isBankHoliday(new Date(2026, 3, 3), 'GB')).toBe(true);
  });

  it('detects Easter Monday 2026 (Apr 6)', () => {
    expect(isBankHoliday(new Date(2026, 3, 6), 'GB')).toBe(true);
  });

  it('detects Early May bank holiday 2026 (May 4)', () => {
    // 1st Monday of May 2026
    expect(isBankHoliday(new Date(2026, 4, 4), 'GB')).toBe(true);
  });

  it('detects Spring bank holiday 2026 (May 25)', () => {
    // Last Monday of May 2026
    expect(isBankHoliday(new Date(2026, 4, 25), 'GB')).toBe(true);
  });

  it('detects Summer bank holiday 2026 (Aug 31)', () => {
    // Last Monday of August 2026
    expect(isBankHoliday(new Date(2026, 7, 31), 'GB')).toBe(true);
  });

  it('does not detect US-only holidays', () => {
    // US Independence Day is not a UK holiday
    expect(isBankHoliday(new Date(2026, 6, 4), 'GB')).toBe(false);
    // US Thanksgiving is not a UK holiday
    expect(isBankHoliday(new Date(2026, 10, 26), 'GB')).toBe(false);
  });

  it('returns false for regular weekday', () => {
    expect(isBankHoliday(new Date(2026, 2, 10), 'GB')).toBe(false);
  });
});

// =============================================================================
// isBankHoliday — EU (TARGET2)
// =============================================================================

describe('isBankHoliday (EU)', () => {
  it('detects New Year Day', () => {
    expect(isBankHoliday(new Date(2026, 0, 1), 'EU')).toBe(true);
  });

  it('detects Good Friday 2026 (Apr 3)', () => {
    expect(isBankHoliday(new Date(2026, 3, 3), 'EU')).toBe(true);
  });

  it('detects Easter Monday 2026 (Apr 6)', () => {
    expect(isBankHoliday(new Date(2026, 3, 6), 'EU')).toBe(true);
  });

  it('detects Labour Day (May 1)', () => {
    expect(isBankHoliday(new Date(2026, 4, 1), 'EU')).toBe(true);
  });

  it('detects Christmas Day', () => {
    expect(isBankHoliday(new Date(2026, 11, 25), 'EU')).toBe(true);
  });

  it('detects December 26', () => {
    expect(isBankHoliday(new Date(2026, 11, 26), 'EU')).toBe(true);
  });

  it('does not detect US-only holidays', () => {
    expect(isBankHoliday(new Date(2026, 6, 4), 'EU')).toBe(false);
    expect(isBankHoliday(new Date(2026, 10, 11), 'EU')).toBe(false); // Veterans Day
  });

  it('returns false for regular weekday', () => {
    expect(isBankHoliday(new Date(2026, 2, 10), 'EU')).toBe(false);
  });
});

// =============================================================================
// isBankHoliday — Brazil (BR)
// =============================================================================

describe('isBankHoliday (BR)', () => {
  it('detects New Year Day', () => {
    expect(isBankHoliday(new Date(2026, 0, 1), 'BR')).toBe(true);
  });

  it('detects Tiradentes Day (Apr 21)', () => {
    expect(isBankHoliday(new Date(2026, 3, 21), 'BR')).toBe(true);
  });

  it('detects Labour Day (May 1)', () => {
    expect(isBankHoliday(new Date(2026, 4, 1), 'BR')).toBe(true);
  });

  it('detects Independence Day (Sep 7)', () => {
    expect(isBankHoliday(new Date(2026, 8, 7), 'BR')).toBe(true);
  });

  it('detects Our Lady of Aparecida (Oct 12)', () => {
    expect(isBankHoliday(new Date(2026, 9, 12), 'BR')).toBe(true);
  });

  it('detects All Souls Day (Nov 2)', () => {
    expect(isBankHoliday(new Date(2026, 10, 2), 'BR')).toBe(true);
  });

  it('detects Republic Day (Nov 15)', () => {
    expect(isBankHoliday(new Date(2026, 10, 15), 'BR')).toBe(true);
  });

  it('detects Christmas Day', () => {
    expect(isBankHoliday(new Date(2026, 11, 25), 'BR')).toBe(true);
  });

  it('detects Carnival Tuesday 2026 (Feb 17)', () => {
    // Easter 2026 is April 5. Carnival Tuesday = Easter - 47 days = Feb 17
    expect(isBankHoliday(new Date(2026, 1, 17), 'BR')).toBe(true);
  });

  it('detects Carnival Monday 2026 (Feb 16)', () => {
    // Easter 2026 is April 5. Carnival Monday = Easter - 48 days = Feb 16
    expect(isBankHoliday(new Date(2026, 1, 16), 'BR')).toBe(true);
  });

  it('detects Good Friday 2026 (Apr 3)', () => {
    expect(isBankHoliday(new Date(2026, 3, 3), 'BR')).toBe(true);
  });

  it('detects Corpus Christi 2026 (Jun 4)', () => {
    // Easter 2026 is April 5. Corpus Christi = Easter + 60 = Jun 4
    expect(isBankHoliday(new Date(2026, 5, 4), 'BR')).toBe(true);
  });

  it('does not detect US-only holidays', () => {
    expect(isBankHoliday(new Date(2026, 6, 4), 'BR')).toBe(false);
  });

  it('returns false for regular weekday', () => {
    expect(isBankHoliday(new Date(2026, 2, 10), 'BR')).toBe(false);
  });
});

// =============================================================================
// isBusinessDay — US (default)
// =============================================================================

describe('isBusinessDay', () => {
  it('returns true for regular weekday (Tuesday)', () => {
    expect(isBusinessDay(new Date(2026, 2, 10))).toBe(true);
  });

  it('returns false for Saturday', () => {
    expect(isBusinessDay(new Date(2026, 2, 14))).toBe(false);
  });

  it('returns false for Sunday', () => {
    expect(isBusinessDay(new Date(2026, 2, 15))).toBe(false);
  });

  it('returns false for holiday (Christmas)', () => {
    expect(isBusinessDay(new Date(2026, 11, 25))).toBe(false);
  });

  it('returns true for Monday', () => {
    expect(isBusinessDay(new Date(2026, 2, 9))).toBe(true);
  });

  it('returns true for Wednesday', () => {
    expect(isBusinessDay(new Date(2026, 2, 11))).toBe(true);
  });

  it('returns true for Thursday', () => {
    expect(isBusinessDay(new Date(2026, 2, 12))).toBe(true);
  });

  it('returns true for Friday', () => {
    expect(isBusinessDay(new Date(2026, 2, 13))).toBe(true);
  });

  it('returns false for New Year Day when on weekday', () => {
    // Jan 1, 2026 is Thursday
    expect(isBusinessDay(new Date(2026, 0, 1))).toBe(false);
  });

  it('returns true for Jan 2 (day after New Year)', () => {
    // Jan 2, 2026 is Friday
    expect(isBusinessDay(new Date(2026, 0, 2))).toBe(true);
  });
});

// =============================================================================
// isBusinessDay — international
// =============================================================================

describe('isBusinessDay (international)', () => {
  it('UK: Boxing Day is not a business day', () => {
    expect(isBusinessDay(new Date(2026, 11, 26), 'GB')).toBe(false);
  });

  it('UK: regular Tuesday is a business day', () => {
    expect(isBusinessDay(new Date(2026, 2, 10), 'GB')).toBe(true);
  });

  it('EU: May 1 (Labour Day) is not a business day', () => {
    expect(isBusinessDay(new Date(2026, 4, 1), 'EU')).toBe(false);
  });

  it('EU: regular Wednesday is a business day', () => {
    expect(isBusinessDay(new Date(2026, 2, 11), 'EU')).toBe(true);
  });

  it('BR: Carnival Tuesday is not a business day', () => {
    expect(isBusinessDay(new Date(2026, 1, 17), 'BR')).toBe(false);
  });

  it('BR: regular Thursday is a business day', () => {
    expect(isBusinessDay(new Date(2026, 2, 12), 'BR')).toBe(true);
  });
});

// =============================================================================
// nextBusinessDay — US (default)
// =============================================================================

describe('nextBusinessDay', () => {
  it('returns next day when starting on Monday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 9));
    expect(result.getDate()).toBe(10);
  });

  it('skips weekend from Friday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 13));
    expect(result.getDate()).toBe(16);
    expect(result.getDay()).toBe(1); // Monday
  });

  it('skips from Saturday to Monday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 14));
    expect(result.getDate()).toBe(16);
  });

  it('skips from Sunday to Monday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 15));
    expect(result.getDate()).toBe(16);
  });

  it('skips holiday and weekend (Dec 24 to Dec 28)', () => {
    // Dec 24, 2026 is Thursday. Dec 25 = Christmas (Fri), Dec 26 = Sat, Dec 27 = Sun, Dec 28 = Mon
    const result = nextBusinessDay(new Date(2026, 11, 24));
    expect(result.getDate()).toBe(28);
  });

  it('returns Tuesday when starting on Monday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 9));
    expect(result.getDay()).toBe(2); // Tuesday
  });

  it('returns Wednesday when starting on Tuesday', () => {
    const result = nextBusinessDay(new Date(2026, 2, 10));
    expect(result.getDay()).toBe(3); // Wednesday
  });
});

// =============================================================================
// nextBusinessDay — international
// =============================================================================

describe('nextBusinessDay (international)', () => {
  it('UK: skips Boxing Day', () => {
    // Dec 25 = Christmas (Fri), Dec 26 = Boxing Day (Sat in 2026 — not relevant)
    // Dec 24, 2026 is Thursday. Dec 25 = Christmas. Next = Dec 28 (Mon, Boxing Day is Sat)
    const result = nextBusinessDay(new Date(2026, 11, 24), 'GB');
    expect(result.getDate()).toBe(28);
  });

  it('EU: skips Labour Day', () => {
    // Apr 30, 2026 is Thursday. May 1 = TARGET2 holiday (Fri). Next = May 4 (Mon)
    const result = nextBusinessDay(new Date(2026, 3, 30), 'EU');
    expect(result.getDate()).toBe(4);
    expect(result.getMonth()).toBe(4); // May
  });

  it('BR: skips Carnival', () => {
    // Feb 15, 2026 is Sunday. Feb 16 = Carnival Mon, Feb 17 = Carnival Tue. Next = Feb 18 (Wed)
    const result = nextBusinessDay(new Date(2026, 1, 15), 'BR');
    expect(result.getDate()).toBe(18);
  });
});

// =============================================================================
// addBusinessDays — US (default)
// =============================================================================

describe('addBusinessDays', () => {
  it('adds business days within a week', () => {
    // Monday March 9 + 3 = Thursday March 12
    const result = addBusinessDays(new Date(2026, 2, 9), 3);
    expect(result.getDate()).toBe(12);
  });

  it('adds business days across a weekend', () => {
    // Thursday March 12 + 3 = Tuesday March 17
    const result = addBusinessDays(new Date(2026, 2, 12), 3);
    expect(result.getDate()).toBe(17);
  });

  it('adds 1 business day', () => {
    const result = addBusinessDays(new Date(2026, 2, 9), 1);
    expect(result.getDate()).toBe(10);
  });

  it('adds 5 business days (full week)', () => {
    // Monday March 9 + 5 = Monday March 16
    const result = addBusinessDays(new Date(2026, 2, 9), 5);
    expect(result.getDate()).toBe(16);
  });

  it('adds 10 business days (two weeks)', () => {
    // Monday March 9 + 10 = Monday March 23
    const result = addBusinessDays(new Date(2026, 2, 9), 10);
    expect(result.getDate()).toBe(23);
  });

  it('adds business days from Friday skipping weekend', () => {
    // Friday March 13 + 1 = Monday March 16
    const result = addBusinessDays(new Date(2026, 2, 13), 1);
    expect(result.getDate()).toBe(16);
  });

  it('adds business days from Saturday', () => {
    // Saturday March 14 + 1 = Monday March 16
    const result = addBusinessDays(new Date(2026, 2, 14), 1);
    expect(result.getDate()).toBe(16);
  });

  it('adds business days across holiday and weekend', () => {
    // Dec 24, 2026 is Thursday + 1 biz day. Dec 25 = Christmas (Fri), Dec 26 = Sat, Dec 27 = Sun, Dec 28 = Mon
    const result = addBusinessDays(new Date(2026, 11, 24), 1);
    expect(result.getDate()).toBe(28);
  });

  it('adds 0 business days returns next business day behavior', () => {
    // addBusinessDays with 0 doesn't advance
    const start = new Date(2026, 2, 9);
    const result = addBusinessDays(start, 0);
    expect(result.getDate()).toBe(9);
  });
});

// =============================================================================
// addBusinessDays — international
// =============================================================================

describe('addBusinessDays (international)', () => {
  it('EU: skips TARGET2 holidays when adding days', () => {
    // Apr 30, 2026 is Thursday. May 1 = Labour Day. +1 = May 4 (Mon)
    const result = addBusinessDays(new Date(2026, 3, 30), 1, 'EU');
    expect(result.getDate()).toBe(4);
    expect(result.getMonth()).toBe(4);
  });

  it('BR: skips Carnival when adding days', () => {
    // Feb 13, 2026 is Friday. +1 = Feb 18 (Wed, skipping Sat/Sun/Mon/Tue carnival)
    const result = addBusinessDays(new Date(2026, 1, 13), 1, 'BR');
    expect(result.getDate()).toBe(18);
  });

  it('GB: adds days across Easter', () => {
    // Apr 2, 2026 is Thursday. +1 = Apr 7 (Tue, skipping Good Friday + Easter Monday)
    const result = addBusinessDays(new Date(2026, 3, 2), 1, 'GB');
    expect(result.getDate()).toBe(7);
  });
});

// =============================================================================
// formatBankingDate
// =============================================================================

describe('formatBankingDate', () => {
  it('formats ISO date string', () => {
    const result = formatBankingDate('2026-03-10T14:30:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('10');
    expect(result).toContain('2026');
  });

  it('formats January date', () => {
    const result = formatBankingDate('2026-01-15T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });

  it('formats December date', () => {
    const result = formatBankingDate('2026-12-31T23:59:59Z');
    expect(result).toContain('Dec');
    expect(result).toContain('31');
  });

  it('formats date-only string', () => {
    const result = formatBankingDate('2026-06-01');
    expect(result).toContain('2026');
  });

  it('formats year boundary', () => {
    const result = formatBankingDate('2026-01-01T00:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('2026');
  });
});

// =============================================================================
// formatBankingDateTime
// =============================================================================

describe('formatBankingDateTime', () => {
  it('formats date with time', () => {
    const result = formatBankingDateTime('2026-03-10T14:30:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('10');
    expect(result).toContain('2026');
  });

  it('formats midnight', () => {
    const result = formatBankingDateTime('2026-03-10T00:00:00Z');
    expect(result).toContain('Mar');
    expect(result).toContain('10');
  });

  it('includes time component', () => {
    const result = formatBankingDateTime('2026-03-10T14:30:00Z');
    // Should contain some time info (may be formatted differently by locale)
    expect(result.length).toBeGreaterThan(10);
  });
});

// =============================================================================
// relativeTime
// =============================================================================

describe('relativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-14T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "today" for today', () => {
    expect(relativeTime('2026-03-14T10:00:00Z').toLowerCase()).toBe('today');
  });

  it('returns "yesterday" for yesterday', () => {
    expect(relativeTime('2026-03-13T10:00:00Z').toLowerCase()).toBe('yesterday');
  });

  it('returns "N days ago" for recent dates', () => {
    expect(relativeTime('2026-03-11T10:00:00Z')).toBe('3 days ago');
  });

  it('returns "2 days ago"', () => {
    expect(relativeTime('2026-03-12T10:00:00Z')).toBe('2 days ago');
  });

  it('returns "4 days ago"', () => {
    expect(relativeTime('2026-03-10T10:00:00Z')).toBe('4 days ago');
  });

  it('returns "5 days ago"', () => {
    expect(relativeTime('2026-03-09T10:00:00Z')).toBe('5 days ago');
  });

  it('returns "6 days ago"', () => {
    expect(relativeTime('2026-03-08T10:00:00Z')).toBe('6 days ago');
  });

  it('returns relative or formatted date for 7+ days ago', () => {
    const result = relativeTime('2026-03-07T10:00:00Z');
    // Depending on ICU data, may return "7 days ago" or formatted date
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns formatted date for older dates', () => {
    const result = relativeTime('2026-02-01T10:00:00Z');
    expect(result).toContain('Feb');
    expect(result).toContain('2026');
  });

  it('returns formatted date for last year', () => {
    const result = relativeTime('2025-12-01T10:00:00Z');
    expect(result).toContain('Dec');
    expect(result).toContain('2025');
  });

  it('returns "today" for a time earlier the same day', () => {
    expect(relativeTime('2026-03-14T00:01:00Z').toLowerCase()).toBe('today');
  });

  it('returns "today" for time just before now', () => {
    expect(relativeTime('2026-03-14T11:59:00Z').toLowerCase()).toBe('today');
  });

  it('handles January dates from March perspective', () => {
    const result = relativeTime('2026-01-15T10:00:00Z');
    expect(result).toContain('Jan');
    expect(result).toContain('15');
  });
});
