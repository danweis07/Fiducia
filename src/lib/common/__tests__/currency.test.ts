import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatCurrencyCompact,
  parseToCents,
  centsToDollars,
  formatInterestRate,
  formatSignedCurrency,
  formatCurrencyIntl,
} from '../currency';

// =============================================================================
// formatCurrency
// =============================================================================

describe('formatCurrency', () => {
  it('formats positive cents as USD', () => {
    expect(formatCurrency(125099)).toBe('$1,250.99');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats single cent', () => {
    expect(formatCurrency(1)).toBe('$0.01');
  });

  it('formats negative cents', () => {
    expect(formatCurrency(-5000)).toBe('-$50.00');
  });

  it('formats large amounts', () => {
    expect(formatCurrency(10000000)).toBe('$100,000.00');
  });

  it('formats amounts with rounding', () => {
    expect(formatCurrency(99)).toBe('$0.99');
  });

  it('formats $19.99 correctly (1999 cents)', () => {
    expect(formatCurrency(1999)).toBe('$19.99');
  });

  it('formats exactly one dollar', () => {
    expect(formatCurrency(100)).toBe('$1.00');
  });

  it('formats very large amount (1 million dollars)', () => {
    expect(formatCurrency(100000000)).toBe('$1,000,000.00');
  });

  it('formats 10 million dollars', () => {
    expect(formatCurrency(1000000000)).toBe('$10,000,000.00');
  });

  it('formats exactly $0.50', () => {
    expect(formatCurrency(50)).toBe('$0.50');
  });

  it('formats negative single cent', () => {
    expect(formatCurrency(-1)).toBe('-$0.01');
  });

  it('handles typical checking balance', () => {
    expect(formatCurrency(524300)).toBe('$5,243.00');
  });

  it('handles typical savings balance', () => {
    expect(formatCurrency(1250000)).toBe('$12,500.00');
  });

  it('formats $999.99', () => {
    expect(formatCurrency(99999)).toBe('$999.99');
  });

  it('formats $1,000.00', () => {
    expect(formatCurrency(100000)).toBe('$1,000.00');
  });
});

// =============================================================================
// formatCurrencyCompact
// =============================================================================

describe('formatCurrencyCompact', () => {
  it('formats small amounts without compact notation', () => {
    expect(formatCurrencyCompact(500)).toMatch(/\$5/);
  });

  it('formats thousands with K', () => {
    const result = formatCurrencyCompact(1250099);
    expect(result).toMatch(/\$12\.5K/);
  });

  it('formats millions with M', () => {
    const result = formatCurrencyCompact(100000000);
    expect(result).toMatch(/\$1\.?0?M/);
  });

  it('formats zero', () => {
    const result = formatCurrencyCompact(0);
    expect(result).toMatch(/\$0/);
  });

  it('formats $100K', () => {
    const result = formatCurrencyCompact(10000000);
    expect(result).toMatch(/\$100\.?0?K/);
  });

  it('formats $50', () => {
    const result = formatCurrencyCompact(5000);
    expect(result).toMatch(/\$50/);
  });

  it('formats negative compact amounts', () => {
    const result = formatCurrencyCompact(-1000000);
    expect(result).toMatch(/-\$10\.?0?K/);
  });
});

// =============================================================================
// parseToCents
// =============================================================================

describe('parseToCents', () => {
  it('parses dollar string to cents', () => {
    expect(parseToCents('1,250.99')).toBe(125099);
  });

  it('parses string with dollar sign', () => {
    expect(parseToCents('$50.00')).toBe(5000);
  });

  it('parses plain number string', () => {
    expect(parseToCents('100')).toBe(10000);
  });

  it('returns 0 for empty string', () => {
    expect(parseToCents('')).toBe(0);
  });

  it('returns 0 for non-numeric', () => {
    expect(parseToCents('abc')).toBe(0);
  });

  it('handles negative values', () => {
    expect(parseToCents('-25.50')).toBe(-2550);
  });

  it('rounds fractional cents', () => {
    expect(parseToCents('10.999')).toBe(1100);
  });

  it('parses whole dollar amount', () => {
    expect(parseToCents('42')).toBe(4200);
  });

  it('parses with leading zeros', () => {
    expect(parseToCents('0.99')).toBe(99);
  });

  it('parses $0.01', () => {
    expect(parseToCents('0.01')).toBe(1);
  });

  it('parses large amount', () => {
    expect(parseToCents('100000.00')).toBe(10000000);
  });

  it('handles multiple commas', () => {
    expect(parseToCents('1,000,000.00')).toBe(100000000);
  });

  it('handles whitespace-only string', () => {
    expect(parseToCents('   ')).toBe(0);
  });

  it('parses $19.99 correctly (floating point precision)', () => {
    expect(parseToCents('19.99')).toBe(1999);
  });

  it('parses $0.10 correctly', () => {
    expect(parseToCents('0.10')).toBe(10);
  });

  it('handles string with spaces and dollar signs', () => {
    expect(parseToCents(' $ 25.00 ')).toBe(2500);
  });

  it('parses single digit cents', () => {
    expect(parseToCents('1.5')).toBe(150);
  });

  it('handles negative with dollar sign', () => {
    expect(parseToCents('-$100.00')).toBe(-10000);
  });
});

// =============================================================================
// centsToDollars
// =============================================================================

describe('centsToDollars', () => {
  it('converts cents to dollars', () => {
    expect(centsToDollars(125099)).toBe(1250.99);
  });

  it('converts zero', () => {
    expect(centsToDollars(0)).toBe(0);
  });

  it('converts negative', () => {
    expect(centsToDollars(-5000)).toBe(-50);
  });

  it('converts single cent', () => {
    expect(centsToDollars(1)).toBe(0.01);
  });

  it('converts large amount', () => {
    expect(centsToDollars(10000000)).toBe(100000);
  });

  it('converts 50 cents', () => {
    expect(centsToDollars(50)).toBe(0.5);
  });

  it('converts 99 cents', () => {
    expect(centsToDollars(99)).toBe(0.99);
  });

  it('converts exact dollar amounts', () => {
    expect(centsToDollars(100)).toBe(1);
    expect(centsToDollars(500)).toBe(5);
    expect(centsToDollars(10000)).toBe(100);
  });
});

// =============================================================================
// formatInterestRate
// =============================================================================

describe('formatInterestRate', () => {
  it('formats basis points as percentage', () => {
    expect(formatInterestRate(425)).toBe('4.25%');
  });

  it('formats zero', () => {
    expect(formatInterestRate(0)).toBe('0.00%');
  });

  it('formats small rate (10 bps = 0.10%)', () => {
    expect(formatInterestRate(10)).toBe('0.10%');
  });

  it('formats large rate (2500 bps = 25%)', () => {
    expect(formatInterestRate(2500)).toBe('25.00%');
  });

  it('formats 1 basis point', () => {
    expect(formatInterestRate(1)).toBe('0.01%');
  });

  it('formats typical savings rate (50 bps = 0.50%)', () => {
    expect(formatInterestRate(50)).toBe('0.50%');
  });

  it('formats typical mortgage rate (625 bps = 6.25%)', () => {
    expect(formatInterestRate(625)).toBe('6.25%');
  });

  it('formats 100 bps = 1.00%', () => {
    expect(formatInterestRate(100)).toBe('1.00%');
  });

  it('formats high interest rate (3000 bps = 30%)', () => {
    expect(formatInterestRate(3000)).toBe('30.00%');
  });

  it('formats typical auto loan rate (549 bps = 5.49%)', () => {
    expect(formatInterestRate(549)).toBe('5.49%');
  });
});

// =============================================================================
// formatSignedCurrency
// =============================================================================

describe('formatSignedCurrency', () => {
  it('formats positive with + prefix', () => {
    expect(formatSignedCurrency(5000)).toBe('+$50.00');
  });

  it('formats negative with - prefix', () => {
    expect(formatSignedCurrency(-5000)).toBe('-$50.00');
  });

  it('formats zero with + prefix', () => {
    expect(formatSignedCurrency(0)).toBe('+$0.00');
  });

  it('formats positive single cent', () => {
    expect(formatSignedCurrency(1)).toBe('+$0.01');
  });

  it('formats negative single cent', () => {
    expect(formatSignedCurrency(-1)).toBe('-$0.01');
  });

  it('formats large positive amount', () => {
    expect(formatSignedCurrency(300000)).toBe('+$3,000.00');
  });

  it('formats large negative amount', () => {
    expect(formatSignedCurrency(-8500)).toBe('-$85.00');
  });

  it('formats typical deposit', () => {
    expect(formatSignedCurrency(250000)).toBe('+$2,500.00');
  });

  it('formats typical debit', () => {
    expect(formatSignedCurrency(-450)).toBe('-$4.50');
  });
});

// =============================================================================
// formatCurrencyIntl
// =============================================================================

describe('formatCurrencyIntl', () => {
  it('formats EUR amounts', () => {
    const result = formatCurrencyIntl(125099, 'EUR', 'en');
    expect(result).toContain('1,250.99');
  });

  it('formats GBP amounts', () => {
    const result = formatCurrencyIntl(850000, 'GBP', 'en');
    expect(result).toContain('8,500.00');
  });

  it('formats USD amounts', () => {
    const result = formatCurrencyIntl(1000, 'USD', 'en');
    expect(result).toContain('10.00');
  });

  it('falls back gracefully for invalid currency code', () => {
    const result = formatCurrencyIntl(1000, 'INVALID', 'en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    // The fallback format is "CURRENCYCODE dollars.cents"
    expect(result).toContain('INVALID');
  });

  it('formats zero in any currency', () => {
    const result = formatCurrencyIntl(0, 'EUR', 'en');
    expect(result).toContain('0.00');
  });

  it('always shows 2 decimal places', () => {
    const result = formatCurrencyIntl(1000, 'USD', 'en');
    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it('formats negative amounts', () => {
    const result = formatCurrencyIntl(-5000, 'GBP', 'en');
    expect(result).toContain('50.00');
  });
});

// =============================================================================
// INTEGER CENTS INVARIANTS
// =============================================================================

describe('integer cents invariant', () => {
  it('parseToCents always returns an integer', () => {
    const testInputs = ['1.01', '99.99', '0.10', '1000.50', '0.01', '0.001'];
    for (const input of testInputs) {
      const result = parseToCents(input);
      expect(Number.isInteger(result)).toBe(true);
    }
  });

  it('avoids the classic 0.1 + 0.2 floating point problem when using cents', () => {
    const ten = parseToCents('0.10');
    const twenty = parseToCents('0.20');
    expect(ten + twenty).toBe(30);
    expect(Number.isInteger(ten + twenty)).toBe(true);
  });

  it('round-trip: parseToCents -> centsToDollars -> parseToCents is stable', () => {
    const original = 12599; // $125.99
    const dollars = centsToDollars(original);
    const backToCents = parseToCents(dollars.toString());
    expect(backToCents).toBe(original);
  });

  it('round-trip works for edge-case amounts', () => {
    const cases = [0, 1, 99, 100, 999, 1000, 99999999];
    for (const cents of cases) {
      const dollars = centsToDollars(cents);
      const backToCents = parseToCents(dollars.toString());
      expect(backToCents).toBe(cents);
    }
  });

  it('monetary addition in cents avoids floating point errors', () => {
    // $19.99 + $0.01 = $20.00 = 2000 cents
    const a = parseToCents('19.99');
    const b = parseToCents('0.01');
    expect(a + b).toBe(2000);
  });

  it('very large cent values remain integers', () => {
    const result = parseToCents('999,999,999.99');
    expect(Number.isInteger(result)).toBe(true);
    expect(result).toBe(99999999999);
  });
});
