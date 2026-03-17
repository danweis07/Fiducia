import { describe, it, expect } from 'vitest';
import {
  compoundInterest,
  compoundInterestWithContributions,
  loanPayment,
  amortizationSchedule,
  savingsGoal,
  debtPayoff,
  cdMaturity,
} from '../calculators';

// =============================================================================
// compoundInterest
// =============================================================================

describe('compoundInterest', () => {
  it('calculates simple case: $10,000 at 5% for 1 year compounded annually', () => {
    expect(compoundInterest(1000000, 500, 1, 1)).toBe(1050000);
  });

  it('calculates monthly compounding', () => {
    // $10,000 at 5% for 1 year, monthly: ~$10,511.62
    const result = compoundInterest(1000000, 500, 12, 1);
    expect(result).toBeGreaterThan(1051000);
    expect(result).toBeLessThan(1052000);
  });

  it('returns principal when rate is zero', () => {
    expect(compoundInterest(1000000, 0, 12, 10)).toBe(1000000);
  });

  it('handles multi-year growth', () => {
    // $10,000 at 5% annual for 10 years ~ $16,288.95
    const result = compoundInterest(1000000, 500, 1, 10);
    expect(result).toBeGreaterThan(1628000);
    expect(result).toBeLessThan(1629000);
  });

  it('handles daily compounding', () => {
    // $10,000 at 5% daily for 1 year ~ $10,512.67
    const result = compoundInterest(1000000, 500, 365, 1);
    expect(result).toBeGreaterThan(1051200);
    expect(result).toBeLessThan(1051300);
  });

  it('handles very high rate (20%)', () => {
    const result = compoundInterest(1000000, 2000, 1, 1);
    expect(result).toBe(1200000);
  });

  it('handles very small principal ($1)', () => {
    const result = compoundInterest(100, 500, 1, 10);
    expect(result).toBeGreaterThan(162);
    expect(result).toBeLessThan(164);
  });

  it('handles zero years', () => {
    const result = compoundInterest(1000000, 500, 12, 0);
    expect(result).toBe(1000000);
  });

  it('handles zero principal', () => {
    expect(compoundInterest(0, 500, 12, 10)).toBe(0);
  });

  it('handles 1 basis point rate', () => {
    const result = compoundInterest(1000000, 1, 1, 1);
    // 0.01% of $10,000 = $1
    expect(result).toBe(1000100);
  });

  it('quarterly compounding for 5 years', () => {
    // $10,000 at 5% quarterly for 5 years ~ $12,820.37
    const result = compoundInterest(1000000, 500, 4, 5);
    expect(result).toBeGreaterThan(1282000);
    expect(result).toBeLessThan(1282100);
  });
});

// =============================================================================
// compoundInterestWithContributions
// =============================================================================

describe('compoundInterestWithContributions', () => {
  it('calculates with monthly contributions', () => {
    // $10,000 initial + $500/mo at 5% for 10 years
    const result = compoundInterestWithContributions(1000000, 50000, 500, 10);
    expect(result).toBeGreaterThan(7000000);
  });

  it('handles zero rate', () => {
    // $1,000 initial + $100/mo for 12 months = $2,200
    expect(compoundInterestWithContributions(100000, 10000, 0, 1)).toBe(220000);
  });

  it('handles zero initial deposit', () => {
    const result = compoundInterestWithContributions(0, 50000, 500, 10);
    expect(result).toBeGreaterThan(6000000);
  });

  it('handles zero contributions', () => {
    // Should be same as compoundInterest
    const withContrib = compoundInterestWithContributions(1000000, 0, 500, 5);
    const without = compoundInterest(1000000, 500, 12, 5);
    expect(Math.abs(withContrib - without)).toBeLessThan(2); // Rounding
  });

  it('handles zero rate and zero initial', () => {
    // $200/mo for 2 years = $4,800
    expect(compoundInterestWithContributions(0, 20000, 0, 2)).toBe(480000);
  });

  it('contributions grow more with interest than without', () => {
    const withInterest = compoundInterestWithContributions(0, 50000, 500, 10);
    const noInterest = compoundInterestWithContributions(0, 50000, 0, 10);
    expect(withInterest).toBeGreaterThan(noInterest);
  });

  it('handles very small contributions', () => {
    const result = compoundInterestWithContributions(0, 100, 500, 30);
    // $1/mo for 30 years at 5%
    expect(result).toBeGreaterThan(0);
  });

  it('handles 1 year with $100/mo at 0%', () => {
    expect(compoundInterestWithContributions(0, 10000, 0, 1)).toBe(120000);
  });
});

// =============================================================================
// loanPayment
// =============================================================================

describe('loanPayment', () => {
  it('calculates monthly payment for standard auto loan', () => {
    // $20,000 at 5% for 60 months ~ $377.42/mo
    const result = loanPayment(2000000, 500, 60);
    expect(result).toBeGreaterThan(37700);
    expect(result).toBeLessThan(37800);
  });

  it('handles zero rate', () => {
    // $12,000 at 0% for 12 months = $1,000/mo
    expect(loanPayment(1200000, 0, 12)).toBe(100000);
  });

  it('calculates high-rate loan (20%)', () => {
    // $10,000 at 20% for 36 months ~ $371.64
    const result = loanPayment(1000000, 2000, 36);
    expect(result).toBeGreaterThan(37100);
    expect(result).toBeLessThan(37200);
  });

  it('calculates mortgage payment', () => {
    // $250,000 at 6.5% for 360 months (30yr) ~ $1,580.17
    const result = loanPayment(25000000, 650, 360);
    expect(result).toBeGreaterThan(158000);
    expect(result).toBeLessThan(158100);
  });

  it('calculates 15-year mortgage', () => {
    // $250,000 at 6% for 180 months ~ $2,109.64
    const result = loanPayment(25000000, 600, 180);
    expect(result).toBeGreaterThan(210900);
    expect(result).toBeLessThan(211000);
  });

  it('handles very short term (1 month at 0%)', () => {
    expect(loanPayment(100000, 0, 1)).toBe(100000);
  });

  it('handles small loan', () => {
    // $100 at 5% for 12 months ~ $8.56
    const result = loanPayment(10000, 500, 12);
    expect(result).toBeGreaterThan(855);
    expect(result).toBeLessThan(857);
  });

  it('handles very long term', () => {
    // $10,000 at 3% for 360 months
    const result = loanPayment(1000000, 300, 360);
    expect(result).toBeGreaterThan(4200);
    expect(result).toBeLessThan(4300);
  });
});

// =============================================================================
// amortizationSchedule
// =============================================================================

describe('amortizationSchedule', () => {
  it('returns correct number of entries', () => {
    const schedule = amortizationSchedule(1200000, 500, 12);
    expect(schedule).toHaveLength(12);
  });

  it('first entry has higher interest than last', () => {
    const schedule = amortizationSchedule(2000000, 500, 60);
    expect(schedule[0].interestCents).toBeGreaterThan(schedule[59].interestCents);
  });

  it('last entry has zero remaining balance', () => {
    const schedule = amortizationSchedule(2000000, 500, 60);
    expect(schedule[59].remainingBalanceCents).toBe(0);
  });

  it('total principal equals original loan', () => {
    const schedule = amortizationSchedule(1000000, 600, 24);
    const totalPrincipal = schedule.reduce((sum, e) => sum + e.principalCents, 0);
    expect(totalPrincipal).toBe(1000000);
  });

  it('principal portion increases over time', () => {
    const schedule = amortizationSchedule(2000000, 500, 60);
    expect(schedule[30].principalCents).toBeGreaterThan(schedule[0].principalCents);
  });

  it('interest portion decreases over time', () => {
    const schedule = amortizationSchedule(2000000, 500, 60);
    expect(schedule[0].interestCents).toBeGreaterThan(schedule[30].interestCents);
  });

  it('month numbers are sequential', () => {
    const schedule = amortizationSchedule(1000000, 500, 12);
    schedule.forEach((entry, idx) => {
      expect(entry.month).toBe(idx + 1);
    });
  });

  it('remaining balance decreases monotonically', () => {
    const schedule = amortizationSchedule(2000000, 500, 60);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].remainingBalanceCents).toBeLessThanOrEqual(schedule[i - 1].remainingBalanceCents);
    }
  });

  it('handles zero interest rate', () => {
    const schedule = amortizationSchedule(1200000, 0, 12);
    expect(schedule).toHaveLength(12);
    // Every payment is pure principal
    schedule.forEach((entry) => {
      expect(entry.interestCents).toBe(0);
    });
    expect(schedule[11].remainingBalanceCents).toBe(0);
  });

  it('total payments equal principal plus total interest', () => {
    const schedule = amortizationSchedule(1000000, 500, 24);
    const totalPayments = schedule.reduce((sum, e) => sum + e.paymentCents, 0);
    const totalInterest = schedule.reduce((sum, e) => sum + e.interestCents, 0);
    const totalPrincipal = schedule.reduce((sum, e) => sum + e.principalCents, 0);
    // Total payments should approximately equal principal + interest
    expect(Math.abs(totalPayments - (totalPrincipal + totalInterest))).toBeLessThan(2);
  });

  it('handles short term (3 months)', () => {
    const schedule = amortizationSchedule(300000, 500, 3);
    expect(schedule).toHaveLength(3);
    expect(schedule[2].remainingBalanceCents).toBe(0);
  });
});

// =============================================================================
// savingsGoal
// =============================================================================

describe('savingsGoal', () => {
  it('calculates monthly savings needed at 0%', () => {
    // $10,000 in 12 months = $833.33/mo
    expect(savingsGoal(1000000, 0, 12)).toBe(83333);
  });

  it('requires less with interest', () => {
    const withoutInterest = savingsGoal(1000000, 0, 12);
    const withInterest = savingsGoal(1000000, 500, 12);
    expect(withInterest).toBeLessThan(withoutInterest);
  });

  it('handles large goal', () => {
    // $100,000 in 60 months at 0%
    const result = savingsGoal(10000000, 0, 60);
    expect(result).toBe(166667); // ~$1,666.67/mo
  });

  it('handles short timeframe', () => {
    // $1,000 in 1 month
    expect(savingsGoal(100000, 0, 1)).toBe(100000);
  });

  it('interest significantly reduces needed savings for long terms', () => {
    const noRate = savingsGoal(10000000, 0, 120); // 10 years
    const withRate = savingsGoal(10000000, 700, 120); // 7% for 10 years
    expect(withRate).toBeLessThan(noRate * 0.7); // Should be significantly less
  });

  it('handles 2-month savings goal at 0%', () => {
    expect(savingsGoal(200000, 0, 2)).toBe(100000);
  });
});

// =============================================================================
// debtPayoff
// =============================================================================

describe('debtPayoff', () => {
  it('calculates payoff for 0% case', () => {
    // $5,000 at 0% paying $500/mo = 10 months
    const result = debtPayoff(500000, 0, 50000);
    expect(result.months).toBe(10);
    expect(result.totalInterestCents).toBe(0);
  });

  it('calculates with interest', () => {
    // $5,000 at 18% paying $200/mo
    const result = debtPayoff(500000, 1800, 20000);
    expect(result.months).toBeGreaterThan(28);
    expect(result.months).toBeLessThan(35);
    expect(result.totalInterestCents).toBeGreaterThan(0);
  });

  it('returns Infinity when payment too low', () => {
    // $10,000 at 20% paying $10/mo — can't cover interest
    const result = debtPayoff(1000000, 2000, 1000);
    expect(result.months).toBe(Infinity);
  });

  it('handles exact payoff amount', () => {
    // $100 at 0% paying $100/mo = 1 month
    const result = debtPayoff(10000, 0, 10000);
    expect(result.months).toBe(1);
  });

  it('handles paying more than balance at 0%', () => {
    // $50 at 0% paying $100/mo = 1 month
    const result = debtPayoff(5000, 0, 10000);
    expect(result.months).toBe(1);
  });

  it('accumulates interest over time', () => {
    // $10,000 at 18% paying $300/mo
    const result = debtPayoff(1000000, 1800, 30000);
    expect(result.totalInterestCents).toBeGreaterThan(0);
    // Total interest should be substantial
    expect(result.totalInterestCents).toBeGreaterThan(100000);
  });

  it('low rate pays off faster than high rate', () => {
    const low = debtPayoff(500000, 600, 20000);
    const high = debtPayoff(500000, 1800, 20000);
    expect(low.months).toBeLessThan(high.months);
    expect(low.totalInterestCents).toBeLessThan(high.totalInterestCents);
  });

  it('higher payment pays off faster', () => {
    const small = debtPayoff(500000, 1200, 15000);
    const large = debtPayoff(500000, 1200, 30000);
    expect(large.months).toBeLessThan(small.months);
  });
});

// =============================================================================
// cdMaturity
// =============================================================================

describe('cdMaturity', () => {
  it('calculates CD maturity value (12 month, 5%)', () => {
    const result = cdMaturity(1000000, 500, 12);
    // Daily compounding: slightly more than simple $500 interest
    expect(result.interestEarnedCents).toBeGreaterThan(51000);
    expect(result.maturityValueCents).toBeGreaterThan(1051000);
  });

  it('returns principal for zero rate', () => {
    const result = cdMaturity(1000000, 0, 12);
    expect(result.maturityValueCents).toBe(1000000);
    expect(result.interestEarnedCents).toBe(0);
  });

  it('grows more for longer terms', () => {
    const short = cdMaturity(1000000, 500, 6);
    const long = cdMaturity(1000000, 500, 24);
    expect(long.interestEarnedCents).toBeGreaterThan(short.interestEarnedCents);
  });

  it('higher rate earns more interest', () => {
    const low = cdMaturity(1000000, 300, 12);
    const high = cdMaturity(1000000, 500, 12);
    expect(high.interestEarnedCents).toBeGreaterThan(low.interestEarnedCents);
  });

  it('maturity value equals principal plus interest', () => {
    const result = cdMaturity(1000000, 425, 18);
    expect(result.maturityValueCents).toBe(1000000 + result.interestEarnedCents);
  });

  it('handles 6-month CD', () => {
    const result = cdMaturity(500000, 500, 6);
    // ~$12.50 interest on $5,000 for 6 months at 5%
    expect(result.interestEarnedCents).toBeGreaterThan(12400);
    expect(result.interestEarnedCents).toBeLessThan(12700);
  });

  it('handles 60-month CD (5 years)', () => {
    const result = cdMaturity(1000000, 500, 60);
    // $10,000 at 5% daily for 5 years ~ $12,840
    expect(result.maturityValueCents).toBeGreaterThan(1283000);
    expect(result.maturityValueCents).toBeLessThan(1285000);
  });

  it('handles very small principal', () => {
    const result = cdMaturity(100, 500, 12);
    // $1 at 5% for 1 year
    expect(result.interestEarnedCents).toBeGreaterThanOrEqual(5);
  });

  it('handles large principal ($1M)', () => {
    const result = cdMaturity(100000000, 450, 12);
    // $1M at 4.5% for 1 year
    expect(result.interestEarnedCents).toBeGreaterThan(4600000);
  });
});
