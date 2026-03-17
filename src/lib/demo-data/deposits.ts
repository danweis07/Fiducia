/**
 * Demo data for rdc, statements, checks, and directDeposit.
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  DEMO_USER,
  withPagination,
  isoDate,
  futureDate,
} from './types';
import { TRANSACTIONS } from './accounts';

// =============================================================================
// STATEMENTS
// =============================================================================

function generateStatements() {
  const statements = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i - 1);
    const periodStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    const periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
    const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    statements.push({
      id: `stmt-${String(i + 1).padStart(3, '0')}`,
      accountId: CHECKING_ID,
      tenantId: TENANT_ID,
      periodLabel: label,
      periodStart,
      periodEnd,
      format: 'hybrid' as const,
      openingBalanceCents: 1100000 + i * 50000,
      closingBalanceCents: 1100000 + (i - 1) * 50000,
      totalCreditsCents: 700000,
      totalDebitsCents: 750000,
      transactionCount: 25 + i * 3,
      downloadUrl: null,
      generatedAt: periodEnd,
    });
  }
  return statements;
}

// =============================================================================
// RDC DEPOSITS
// =============================================================================

const RDC_DEPOSITS = [
  {
    id: 'rdc-001',
    accountId: CHECKING_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    amountCents: 125000,
    frontImageUrl: null,
    backImageUrl: null,
    status: 'cleared' as const,
    checkNumber: '1042',
    rejectionReason: null,
    clearedAt: isoDate(5),
    createdAt: isoDate(7),
  },
  {
    id: 'rdc-002',
    accountId: CHECKING_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    amountCents: 75000,
    frontImageUrl: null,
    backImageUrl: null,
    status: 'accepted' as const,
    checkNumber: '2087',
    rejectionReason: null,
    clearedAt: null,
    createdAt: isoDate(2),
  },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const depositHandlers: Record<string, ActionHandler> = {
  // RDC
  'rdc.deposit': (p) => ({
    deposit: {
      id: `rdc-demo-${Date.now()}`,
      accountId: p.accountId,
      tenantId: TENANT_ID,
      userId: DEMO_USER.id,
      amountCents: p.amountCents,
      frontImageUrl: null,
      backImageUrl: null,
      status: 'pending',
      checkNumber: p.checkNumber || null,
      rejectionReason: null,
      clearedAt: null,
      createdAt: new Date().toISOString(),
    },
  }),
  'rdc.status': (p) => ({
    deposit: RDC_DEPOSITS.find((d) => d.id === p.id) || { ...RDC_DEPOSITS[0], id: p.id, status: 'accepted' },
  }),
  'rdc.history': () => ({ deposits: RDC_DEPOSITS }),

  // Statements
  'statements.list': () => {
    const stmts = generateStatements();
    return withPagination({ statements: stmts }, stmts.length);
  },
  'statements.get': (p) => {
    const stmts = generateStatements();
    const stmt = stmts.find((s) => s.id === p.id) || stmts[0];
    return {
      statement: {
        ...stmt,
        transactions: TRANSACTIONS.slice(0, 5),
        interestEarnedCents: 1587,
        feesChargedCents: 0,
        averageDailyBalanceCents: 1150000,
        daysInPeriod: 30,
      },
    };
  },
  'statements.config': () => ({
    config: {
      supportedFormats: ['pdf', 'data', 'hybrid'],
      defaultFormat: 'hybrid',
      retentionMonths: 24,
      deliveryMethods: ['portal', 'email'],
      cycleDayOfMonth: 1,
      includeImages: true,
      eStatementsEnabled: true,
    },
  }),
  'statements.download': () => ({
    downloadUrl: '#demo-download',
    expiresAt: futureDate(1),
  }),
};
