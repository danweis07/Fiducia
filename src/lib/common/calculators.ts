/**
 * Financial Calculator Utilities
 * All monetary values in integer cents. Rates in basis points (1 bps = 0.01%).
 */

/** Compound interest: returns future value in cents */
export function compoundInterest(
  principalCents: number,
  rateBps: number,
  compoundsPerYear: number,
  years: number,
): number {
  // A = P(1 + r/n)^(nt)
  // rateBps / 10000 = decimal rate
  const r = rateBps / 10000;
  const result = principalCents * Math.pow(1 + r / compoundsPerYear, compoundsPerYear * years);
  return Math.round(result);
}

/** Compound interest with monthly contributions: returns future value in cents */
export function compoundInterestWithContributions(
  principalCents: number,
  monthlyContributionCents: number,
  rateBps: number,
  years: number,
): number {
  // FV = P(1+r/12)^(12t) + PMT * [((1+r/12)^(12t) - 1) / (r/12)]
  const r = rateBps / 10000;
  const monthlyRate = r / 12;
  const months = years * 12;
  if (monthlyRate === 0) {
    return principalCents + monthlyContributionCents * months;
  }
  const compoundFactor = Math.pow(1 + monthlyRate, months);
  const principalFV = principalCents * compoundFactor;
  const contributionFV = monthlyContributionCents * ((compoundFactor - 1) / monthlyRate);
  return Math.round(principalFV + contributionFV);
}

/** Monthly loan payment in cents */
export function loanPayment(
  principalCents: number,
  rateBps: number,
  termMonths: number,
): number {
  const r = rateBps / 10000 / 12;
  if (r === 0) return Math.round(principalCents / termMonths);
  const payment = principalCents * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1);
  return Math.round(payment);
}

/** Amortization schedule entry */
export interface AmortizationEntry {
  month: number;
  paymentCents: number;
  principalCents: number;
  interestCents: number;
  remainingBalanceCents: number;
}

/** Full amortization schedule */
export function amortizationSchedule(
  principalCents: number,
  rateBps: number,
  termMonths: number,
): AmortizationEntry[] {
  const monthlyPayment = loanPayment(principalCents, rateBps, termMonths);
  const monthlyRate = rateBps / 10000 / 12;
  const schedule: AmortizationEntry[] = [];
  let balance = principalCents;

  for (let month = 1; month <= termMonths; month++) {
    const interest = Math.round(balance * monthlyRate);
    const principal = month === termMonths ? balance : monthlyPayment - interest;
    balance = Math.max(0, balance - principal);
    schedule.push({
      month,
      paymentCents: month === termMonths ? principal + interest : monthlyPayment,
      principalCents: principal,
      interestCents: interest,
      remainingBalanceCents: balance,
    });
  }
  return schedule;
}

/** Monthly savings needed to reach a goal */
export function savingsGoal(
  goalCents: number,
  rateBps: number,
  months: number,
): number {
  const r = rateBps / 10000 / 12;
  if (r === 0) return Math.round(goalCents / months);
  // PMT = FV * r / ((1+r)^n - 1)
  const payment = goalCents * r / (Math.pow(1 + r, months) - 1);
  return Math.round(payment);
}

/** Debt payoff calculator: returns { months, totalInterestCents } */
export function debtPayoff(
  balanceCents: number,
  rateBps: number,
  monthlyPaymentCents: number,
): { months: number; totalInterestCents: number } {
  const monthlyRate = rateBps / 10000 / 12;
  if (monthlyRate === 0) {
    const months = Math.ceil(balanceCents / monthlyPaymentCents);
    return { months, totalInterestCents: 0 };
  }
  // Check if payment covers interest
  const minPayment = Math.ceil(balanceCents * monthlyRate);
  if (monthlyPaymentCents <= minPayment) {
    return { months: Infinity, totalInterestCents: Infinity };
  }

  let balance = balanceCents;
  let totalInterest = 0;
  let months = 0;
  const maxMonths = 1200; // 100 year cap

  while (balance > 0 && months < maxMonths) {
    const interest = Math.round(balance * monthlyRate);
    totalInterest += interest;
    const principal = Math.min(balance, monthlyPaymentCents - interest);
    balance -= principal;
    months++;
  }

  return { months, totalInterestCents: totalInterest };
}

/** CD maturity value in cents */
export function cdMaturity(
  principalCents: number,
  rateBps: number,
  termMonths: number,
): { maturityValueCents: number; interestEarnedCents: number } {
  // CDs typically compound daily (365)
  const years = termMonths / 12;
  const maturityValue = compoundInterest(principalCents, rateBps, 365, years);
  return {
    maturityValueCents: maturityValue,
    interestEarnedCents: maturityValue - principalCents,
  };
}
