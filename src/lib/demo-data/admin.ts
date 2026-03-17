/**
 * Demo data for admin functions (users, accounts, audit, integrations, branding, CDP).
 */

import {
  ActionHandler,
  TENANT_ID,
  CHECKING_ID,
  SAVINGS_ID,
  CD_ID,
  DEMO_USER,
  withPagination,
  isoDate,
} from './types';

// =============================================================================
// ADMIN DATA
// =============================================================================

const ADMIN_USERS = [
  { id: 'u-001', firstName: 'Demo', lastName: 'User', email: 'demo@example.com', kycStatus: 'approved' as const, accountCount: 3, lastLogin: isoDate(0), status: 'active' as const, createdAt: '2023-01-15T00:00:00Z' },
  { id: 'u-002', firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', kycStatus: 'approved' as const, accountCount: 2, lastLogin: isoDate(1), status: 'active' as const, createdAt: '2023-03-10T00:00:00Z' },
  { id: 'u-003', firstName: 'Bob', lastName: 'Williams', email: 'bob@example.com', kycStatus: 'in_review' as const, accountCount: 1, lastLogin: null, status: 'active' as const, createdAt: '2024-11-20T00:00:00Z' },
];

const ADMIN_ACCOUNTS = [
  { id: CHECKING_ID, customerName: 'Demo User', type: 'checking' as const, balanceCents: 1254783, status: 'active' as const, openedAt: '2023-01-15T00:00:00Z', accountNumberMasked: '****4521' },
  { id: SAVINGS_ID, customerName: 'Demo User', type: 'savings' as const, balanceCents: 4520100, status: 'active' as const, openedAt: '2023-03-01T00:00:00Z', accountNumberMasked: '****7832' },
  { id: CD_ID, customerName: 'Demo User', type: 'cd' as const, balanceCents: 2500000, status: 'active' as const, openedAt: '2024-06-01T00:00:00Z', accountNumberMasked: '****9156' },
  { id: 'acct-alice-001', customerName: 'Alice Johnson', type: 'checking' as const, balanceCents: 875000, status: 'active' as const, openedAt: '2023-03-10T00:00:00Z', accountNumberMasked: '****2341' },
  { id: 'acct-alice-002', customerName: 'Alice Johnson', type: 'savings' as const, balanceCents: 2100000, status: 'active' as const, openedAt: '2023-04-01T00:00:00Z', accountNumberMasked: '****5567' },
];

const ADMIN_AUDIT = [
  { id: 'audit-001', timestamp: isoDate(0), user: 'demo@example.com', action: 'user.login' as const, entityType: 'user', entityId: 'u-001', ipAddress: '192.168.1.100', details: 'Successful login from Chrome/macOS' },
  { id: 'audit-002', timestamp: isoDate(0), user: 'demo@example.com', action: 'transfer.create' as const, entityType: 'transfer', entityId: 'xfer-001', ipAddress: '192.168.1.100', details: 'Internal transfer $500.00 Checking → Savings' },
  { id: 'audit-003', timestamp: isoDate(1), user: 'alice@example.com', action: 'user.login' as const, entityType: 'user', entityId: 'u-002', ipAddress: '10.0.0.42', details: 'Successful login from Safari/iOS' },
  { id: 'audit-004', timestamp: isoDate(2), user: 'demo@example.com', action: 'bill.pay' as const, entityType: 'bill', entityId: 'bill-003', ipAddress: '192.168.1.100', details: 'Bill payment $145.00 to State Farm Insurance' },
  { id: 'audit-005', timestamp: isoDate(3), user: 'demo@example.com', action: 'rdc.submit' as const, entityType: 'rdc', entityId: 'rdc-002', ipAddress: '192.168.1.100', details: 'Check deposit $750.00' },
];

const ADMIN_INTEGRATIONS = [
  { id: 'int-001', domain: 'core_banking' as const, domainLabel: 'Core Banking', provider: 'Mock Adapter', isConnected: true, health: 'healthy' as const, lastSyncAt: isoDate(0), webhookUrl: null, apiKeyMasked: '****abcd' },
  { id: 'int-002', domain: 'rdc' as const, domainLabel: 'Remote Deposit', provider: 'Mitek', isConnected: true, health: 'healthy' as const, lastSyncAt: isoDate(0), webhookUrl: null, apiKeyMasked: '****efgh' },
  { id: 'int-003', domain: 'bill_pay' as const, domainLabel: 'Bill Pay', provider: 'Mock Adapter', isConnected: true, health: 'healthy' as const, lastSyncAt: isoDate(1), webhookUrl: null, apiKeyMasked: '****ijkl' },
  { id: 'int-004', domain: 'card' as const, domainLabel: 'Card Controls', provider: 'Mock Adapter', isConnected: true, health: 'healthy' as const, lastSyncAt: isoDate(0), webhookUrl: null, apiKeyMasked: '****mnop' },
  { id: 'int-005', domain: 'kyc' as const, domainLabel: 'KYC Verification', provider: 'Alloy', isConnected: true, health: 'degraded' as const, lastSyncAt: isoDate(2), webhookUrl: null, apiKeyMasked: '****qrst' },
];

// =============================================================================
// HANDLERS
// =============================================================================

export const adminHandlers: Record<string, ActionHandler> = {
  // Admin — User Management
  'admin.users.list': () => withPagination({ users: ADMIN_USERS }, ADMIN_USERS.length),

  // Admin — Account Overview
  'admin.accounts.list': () => withPagination({ accounts: ADMIN_ACCOUNTS }, ADMIN_ACCOUNTS.length),
  'admin.accounts.aggregates': () => ({
    aggregates: {
      totalCheckingCents: 2129783,
      totalSavingsCents: 6620100,
      totalCDCents: 2500000,
      totalMoneyMarketCents: 0,
      totalAccounts: 5,
    },
  }),

  // Admin — Integrations
  'admin.integrations.list': () => ({ integrations: ADMIN_INTEGRATIONS }),

  // Admin — Audit Log
  'admin.audit.log': () => withPagination({ entries: ADMIN_AUDIT }, ADMIN_AUDIT.length),

  // Audit (non-admin)
  'audit.log': () => withPagination({
    entries: [
      { id: 'alog-001', tenantId: TENANT_ID, userId: DEMO_USER.id, action: 'user.login', entityType: 'user', entityId: DEMO_USER.id, metadata: {}, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0', createdAt: isoDate(0) },
      { id: 'alog-002', tenantId: TENANT_ID, userId: DEMO_USER.id, action: 'transfer.create', entityType: 'transfer', entityId: 'xfer-001', metadata: { amountCents: 50000 }, ipAddress: '192.168.1.100', userAgent: 'Mozilla/5.0', createdAt: isoDate(1) },
    ],
  }, 2),
};
