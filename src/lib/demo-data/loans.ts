/**
 * Demo data for loans, loanProducts, and loanOrigination.
 */

import {
  ActionHandler,
  CHECKING_ID,
  LOAN_AUTO_ID,
  LOAN_MORTGAGE_ID,
  DEMO_USER,
  withPagination,
  isoDate,
  futureDate,
} from './types';

// =============================================================================
// LOANS
// =============================================================================

const LOANS = [
  {
    id: LOAN_AUTO_ID,
    userId: DEMO_USER.id,
    productId: 'prod-auto-001',
    loanNumberMasked: '****3291',
    principalCents: 2800000,
    interestRateBps: 549,
    termMonths: 60,
    disbursedAt: '2024-01-15T00:00:00Z',
    outstandingBalanceCents: 2245000,
    principalPaidCents: 555000,
    interestPaidCents: 128000,
    nextPaymentDueDate: futureDate(12),
    nextPaymentAmountCents: 53482,
    paymentsRemaining: 42,
    autopayAccountId: CHECKING_ID,
    status: 'active' as const,
    daysPastDue: 0,
    firstPaymentDate: '2024-02-15T00:00:00Z',
    maturityDate: '2029-01-15T00:00:00Z',
    paidOffAt: null,
    closedAt: null,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: isoDate(0),
  },
  {
    id: LOAN_MORTGAGE_ID,
    userId: DEMO_USER.id,
    productId: 'prod-mortgage-001',
    loanNumberMasked: '****8174',
    principalCents: 35000000,
    interestRateBps: 689,
    termMonths: 360,
    disbursedAt: '2022-06-01T00:00:00Z',
    outstandingBalanceCents: 33450000,
    principalPaidCents: 1550000,
    interestPaidCents: 4200000,
    nextPaymentDueDate: futureDate(18),
    nextPaymentAmountCents: 231245,
    paymentsRemaining: 318,
    autopayAccountId: CHECKING_ID,
    status: 'active' as const,
    daysPastDue: 0,
    firstPaymentDate: '2022-07-01T00:00:00Z',
    maturityDate: '2052-06-01T00:00:00Z',
    paidOffAt: null,
    closedAt: null,
    createdAt: '2022-06-01T00:00:00Z',
    updatedAt: isoDate(0),
  },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const loanHandlers: Record<string, ActionHandler> = {
  // Loan Products
  'loanProducts.list': () => ({
    products: [
      { id: 'prod-auto-001', name: 'Auto Loan', shortName: 'Auto', description: 'New & used vehicle financing', loanType: 'auto', interestRateBps: 549, rateType: 'fixed', minTermMonths: 12, maxTermMonths: 84, minAmountCents: 500000, maxAmountCents: 10000000, originationFeeBps: 0, latePaymentFeeCents: 2500, latePaymentGraceDays: 15, isActive: true },
      { id: 'prod-mortgage-001', name: '30-Year Fixed Mortgage', shortName: 'Mortgage', description: 'Fixed rate home loan', loanType: 'mortgage', interestRateBps: 689, rateType: 'fixed', minTermMonths: 120, maxTermMonths: 360, minAmountCents: 5000000, maxAmountCents: 100000000, originationFeeBps: 100, latePaymentFeeCents: 5000, latePaymentGraceDays: 15, isActive: true },
    ],
  }),

  // Loans
  'loans.list': () => ({ loans: LOANS }),
  'loans.get': (p) => ({ loan: LOANS.find((l) => l.id === p.id) || LOANS[0] }),
  'loans.schedule': () => {
    const schedule = Array.from({ length: 5 }, (_, i) => ({
      id: `sched-${i + 1}`,
      loanId: LOAN_AUTO_ID,
      installmentNumber: i + 19,
      dueDate: futureDate(30 * (i + 1)),
      principalCents: 41000 + i * 200,
      interestCents: 12482 - i * 200,
      feeCents: 0,
      totalCents: 53482,
      paidCents: 0,
      paidAt: null,
      status: 'upcoming' as const,
    }));
    return withPagination({ schedule }, 42);
  },
  'loans.payments': () => {
    const payments = Array.from({ length: 5 }, (_, i) => ({
      id: `pmt-${i + 1}`,
      loanId: LOAN_AUTO_ID,
      amountCents: 53482,
      principalPortionCents: 38000 + i * 200,
      interestPortionCents: 15482 - i * 200,
      feePortionCents: 0,
      extraPrincipalCents: 0,
      fromAccountId: CHECKING_ID,
      paymentMethod: 'autopay' as const,
      status: 'completed' as const,
      scheduledDate: null,
      processedAt: isoDate(30 * (i + 1)),
      createdAt: isoDate(30 * (i + 1)),
    }));
    return withPagination({ payments }, 18);
  },
  'loans.makePayment': (p) => ({
    payment: {
      id: `pmt-demo-${Date.now()}`,
      loanId: p.loanId,
      amountCents: p.amountCents,
      principalPortionCents: Math.round(Number(p.amountCents) * 0.75),
      interestPortionCents: Math.round(Number(p.amountCents) * 0.25),
      feePortionCents: 0,
      extraPrincipalCents: p.extraPrincipalCents || 0,
      fromAccountId: p.fromAccountId,
      paymentMethod: 'internal',
      status: 'completed',
      scheduledDate: null,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  }),
};
