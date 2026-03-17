/**
 * Demo data for accounts, transactions, transfers, and beneficiaries.
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  SAVINGS_ID,
  CD_ID,
  BENEFICIARY_1_ID,
  BENEFICIARY_2_ID,
  DEMO_USER,
  withPagination,
  isoDate,
} from './types';

// =============================================================================
// ACCOUNTS
// =============================================================================

const ACCOUNTS = [
  {
    id: CHECKING_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    type: 'checking' as const,
    nickname: 'Primary Checking',
    accountNumberMasked: '****4521',
    routingNumber: '021000021',
    balanceCents: 1254783,
    availableBalanceCents: 1254783,
    status: 'active' as const,
    interestRateBps: 25,
    openedAt: '2023-01-15T00:00:00Z',
    closedAt: null,
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: isoDate(0),
  },
  {
    id: SAVINGS_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    type: 'savings' as const,
    nickname: 'Emergency Fund',
    accountNumberMasked: '****7832',
    routingNumber: '021000021',
    balanceCents: 4520100,
    availableBalanceCents: 4520100,
    status: 'active' as const,
    interestRateBps: 425,
    openedAt: '2023-03-01T00:00:00Z',
    closedAt: null,
    createdAt: '2023-03-01T00:00:00Z',
    updatedAt: isoDate(0),
  },
  {
    id: CD_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    type: 'cd' as const,
    nickname: '12-Month CD',
    accountNumberMasked: '****9156',
    routingNumber: '021000021',
    balanceCents: 2500000,
    availableBalanceCents: 0,
    status: 'active' as const,
    interestRateBps: 500,
    openedAt: '2024-06-01T00:00:00Z',
    closedAt: null,
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: isoDate(0),
  },
];

// =============================================================================
// TRANSACTIONS
// =============================================================================

const TRANSACTIONS = [
  { id: 'txn-001', accountId: CHECKING_ID, type: 'debit', amountCents: -4299, description: 'Whole Foods Market', category: 'groceries', status: 'posted', merchantName: 'Whole Foods', merchantCategory: 'Grocery', runningBalanceCents: 1254783, postedAt: isoDate(0), createdAt: isoDate(0) },
  { id: 'txn-002', accountId: CHECKING_ID, type: 'debit', amountCents: -1550, description: 'Starbucks Coffee', category: 'dining', status: 'posted', merchantName: 'Starbucks', merchantCategory: 'Coffee Shop', runningBalanceCents: 1259082, postedAt: isoDate(1), createdAt: isoDate(1) },
  { id: 'txn-003', accountId: CHECKING_ID, type: 'credit', amountCents: 350000, description: 'Payroll - Acme Corp', category: 'income', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 1260632, postedAt: isoDate(1), createdAt: isoDate(1) },
  { id: 'txn-004', accountId: CHECKING_ID, type: 'debit', amountCents: -8500, description: 'Netflix Subscription', category: 'entertainment', status: 'posted', merchantName: 'Netflix', merchantCategory: 'Streaming', runningBalanceCents: 910632, postedAt: isoDate(2), createdAt: isoDate(2) },
  { id: 'txn-005', accountId: CHECKING_ID, type: 'debit', amountCents: -125000, description: 'Mortgage Payment', category: 'housing', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 919132, postedAt: isoDate(3), createdAt: isoDate(3) },
  { id: 'txn-006', accountId: CHECKING_ID, type: 'debit', amountCents: -3475, description: 'Shell Gas Station', category: 'transportation', status: 'posted', merchantName: 'Shell', merchantCategory: 'Gas Station', runningBalanceCents: 1044132, postedAt: isoDate(4), createdAt: isoDate(4) },
  { id: 'txn-007', accountId: CHECKING_ID, type: 'debit', amountCents: -6200, description: 'Amazon.com', category: 'shopping', status: 'posted', merchantName: 'Amazon', merchantCategory: 'Online Retail', runningBalanceCents: 1047607, postedAt: isoDate(5), createdAt: isoDate(5) },
  { id: 'txn-008', accountId: CHECKING_ID, type: 'transfer', amountCents: -50000, description: 'Transfer to Savings', category: 'transfer', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 1053807, postedAt: isoDate(6), createdAt: isoDate(6) },
  { id: 'txn-009', accountId: SAVINGS_ID, type: 'transfer', amountCents: 50000, description: 'Transfer from Checking', category: 'transfer', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 4520100, postedAt: isoDate(6), createdAt: isoDate(6) },
  { id: 'txn-010', accountId: CHECKING_ID, type: 'debit', amountCents: -2999, description: 'CVS Pharmacy', category: 'healthcare', status: 'posted', merchantName: 'CVS', merchantCategory: 'Pharmacy', runningBalanceCents: 1103807, postedAt: isoDate(7), createdAt: isoDate(7) },
  { id: 'txn-011', accountId: SAVINGS_ID, type: 'interest', amountCents: 1587, description: 'Monthly Interest', category: 'income', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 4470100, postedAt: isoDate(7), createdAt: isoDate(7) },
  { id: 'txn-012', accountId: CHECKING_ID, type: 'debit', amountCents: -15000, description: 'Electric Company', category: 'utilities', status: 'posted', merchantName: 'Con Edison', merchantCategory: 'Utility', runningBalanceCents: 1106806, postedAt: isoDate(8), createdAt: isoDate(8) },
  { id: 'txn-013', accountId: CHECKING_ID, type: 'debit', amountCents: -7800, description: 'Target', category: 'shopping', status: 'posted', merchantName: 'Target', merchantCategory: 'Department Store', runningBalanceCents: 1121806, postedAt: isoDate(10), createdAt: isoDate(10) },
  { id: 'txn-014', accountId: CHECKING_ID, type: 'credit', amountCents: 350000, description: 'Payroll - Acme Corp', category: 'income', status: 'posted', merchantName: null, merchantCategory: null, runningBalanceCents: 1129606, postedAt: isoDate(14), createdAt: isoDate(14) },
  { id: 'txn-015', accountId: CHECKING_ID, type: 'debit', amountCents: -4500, description: 'Uber Ride', category: 'transportation', status: 'pending', merchantName: 'Uber', merchantCategory: 'Rideshare', runningBalanceCents: 779606, postedAt: null, createdAt: isoDate(0) },
];

// =============================================================================
// BENEFICIARIES
// =============================================================================

const BENEFICIARIES = [
  {
    id: BENEFICIARY_1_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    name: 'Jane Smith',
    nickname: 'Jane',
    accountNumberMasked: '****6789',
    routingNumber: '021000089',
    bankName: 'Chase Bank',
    type: 'external' as const,
    isVerified: true,
    createdAt: isoDate(60),
  },
  {
    id: BENEFICIARY_2_ID,
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    name: 'Robert Johnson',
    nickname: 'Bob',
    accountNumberMasked: '****3456',
    routingNumber: '026009593',
    bankName: 'Bank of America',
    type: 'external' as const,
    isVerified: true,
    createdAt: isoDate(30),
  },
];

// =============================================================================
// TRANSFERS
// =============================================================================

const TRANSFERS = [
  {
    id: 'xfer-001',
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    fromAccountId: CHECKING_ID,
    toAccountId: SAVINGS_ID,
    toBeneficiaryId: null,
    type: 'internal' as const,
    amountCents: 50000,
    memo: 'Monthly savings',
    status: 'completed' as const,
    scheduledDate: null,
    recurringRule: null,
    processedAt: isoDate(6),
    createdAt: isoDate(6),
  },
  {
    id: 'xfer-002',
    tenantId: TENANT_ID,
    userId: DEMO_USER.id,
    fromAccountId: CHECKING_ID,
    toAccountId: null,
    toBeneficiaryId: BENEFICIARY_1_ID,
    type: 'external' as const,
    amountCents: 25000,
    memo: 'Rent share',
    status: 'completed' as const,
    scheduledDate: null,
    recurringRule: null,
    processedAt: isoDate(10),
    createdAt: isoDate(10),
  },
];

// =============================================================================
// EXPORTED TRANSACTIONS (for use by other domain files)
// =============================================================================

export { ACCOUNTS, TRANSACTIONS };

// =============================================================================
// HANDLERS
// =============================================================================

export const accountHandlers: Record<string, ActionHandler> = {
  // Accounts
  'accounts.list': () => ({ accounts: ACCOUNTS }),
  'accounts.get': (p) => ({ account: ACCOUNTS.find((a) => a.id === p.id) || ACCOUNTS[0] }),
  'accounts.summary': () => ({
    totalBalanceCents: ACCOUNTS.reduce((s, a) => s + a.balanceCents, 0),
    totalAvailableCents: ACCOUNTS.reduce((s, a) => s + a.availableBalanceCents, 0),
    accountCount: ACCOUNTS.length,
    accounts: ACCOUNTS,
  }),

  // Transactions
  'transactions.list': (p) => {
    let txns = TRANSACTIONS;
    if (p.accountId) txns = txns.filter((t) => t.accountId === p.accountId);
    return withPagination({ transactions: txns }, txns.length);
  },
  'transactions.get': (p) => ({ transaction: TRANSACTIONS.find((t) => t.id === p.id) || TRANSACTIONS[0] }),
  'transactions.search': (p) => {
    const q = String(p.query || '').toLowerCase();
    const filtered = TRANSACTIONS.filter((t) => t.description.toLowerCase().includes(q) || (t.merchantName && t.merchantName.toLowerCase().includes(q)));
    return { transactions: filtered };
  },

  // Transfers
  'transfers.create': (p) => ({
    transfer: {
      id: `xfer-demo-${Date.now()}`,
      tenantId: TENANT_ID,
      userId: DEMO_USER.id,
      fromAccountId: p.fromAccountId,
      toAccountId: p.toAccountId || null,
      toBeneficiaryId: p.toBeneficiaryId || null,
      type: p.type || 'internal',
      amountCents: p.amountCents,
      memo: p.memo || null,
      status: 'completed',
      scheduledDate: null,
      recurringRule: null,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  }),
  'transfers.schedule': (p) => ({
    transfer: {
      id: `xfer-demo-${Date.now()}`,
      tenantId: TENANT_ID,
      userId: DEMO_USER.id,
      fromAccountId: p.fromAccountId,
      toAccountId: p.toAccountId || null,
      toBeneficiaryId: p.toBeneficiaryId || null,
      type: p.type || 'internal',
      amountCents: p.amountCents,
      memo: p.memo || null,
      status: 'pending',
      scheduledDate: p.scheduledDate,
      recurringRule: p.recurringRule || null,
      processedAt: null,
      createdAt: new Date().toISOString(),
    },
  }),
  'transfers.cancel': () => ({ success: true }),
  'transfers.list': () => withPagination({ transfers: TRANSFERS }, TRANSFERS.length),

  // Beneficiaries
  'beneficiaries.list': () => ({ beneficiaries: BENEFICIARIES }),
  'beneficiaries.create': (p) => ({
    beneficiary: {
      id: `bene-demo-${Date.now()}`,
      tenantId: TENANT_ID,
      userId: DEMO_USER.id,
      name: p.name,
      nickname: p.nickname || null,
      accountNumberMasked: `****${String(p.accountNumber || '0000').slice(-4)}`,
      routingNumber: p.routingNumber || null,
      bankName: p.bankName || null,
      type: p.type || 'external',
      isVerified: false,
      createdAt: new Date().toISOString(),
    },
  }),
  'beneficiaries.delete': () => ({ success: true }),
};
