/**
 * Mock External Account Adapter
 *
 * Returns realistic fake data with no network calls.
 * Used for development, testing, and tenants without a Plaid subscription.
 */

import type {
  AdapterConfig,
  AdapterHealth,
} from '../types.ts';
import {
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TIMEOUT_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from '../types.ts';
import type {
  ExternalAccountAdapter,
  LinkTokenRequest,
  LinkTokenResponse,
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetAccountsRequest,
  GetAccountsResponse,
  GetBalancesRequest,
  GetBalancesResponse,
  GetTransactionsRequest,
  GetTransactionsResponse,
  ExternalAccount,
  ExternalBalance,
  ExternalTransaction,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_ACCOUNTS: ExternalAccount[] = [
  {
    accountId: 'ext-acct-001',
    itemId: 'mock-item-001',
    institutionName: 'Chase',
    name: 'Plaid Checking',
    officialName: 'Plaid Gold Standard 0% Interest Checking',
    type: 'checking',
    subtype: 'checking',
    mask: '****0000',
    balanceCents: 11000,
    availableBalanceCents: 10000,
    currencyCode: 'USD',
    linkedAt: '2026-02-15T10:00:00Z',
  },
  {
    accountId: 'ext-acct-002',
    itemId: 'mock-item-001',
    institutionName: 'Chase',
    name: 'Plaid Saving',
    officialName: 'Plaid Silver Standard 0.1% Interest Saving',
    type: 'savings',
    subtype: 'savings',
    mask: '****1111',
    balanceCents: 32054500,
    availableBalanceCents: 32054500,
    currencyCode: 'USD',
    linkedAt: '2026-02-15T10:00:00Z',
  },
  {
    accountId: 'ext-acct-003',
    itemId: 'mock-item-002',
    institutionName: 'Bank of America',
    name: 'Plaid Credit Card',
    officialName: 'Plaid Diamond 12.5% APR Interest Credit Card',
    type: 'credit',
    subtype: 'credit card',
    mask: '****3333',
    balanceCents: 41050,
    availableBalanceCents: 195000,
    currencyCode: 'USD',
    linkedAt: '2026-03-01T14:30:00Z',
  },
];

const MOCK_TRANSACTIONS: ExternalTransaction[] = [
  {
    transactionId: 'ext-txn-001',
    accountId: 'ext-acct-001',
    amountCents: -8950,
    description: 'Uber 063015 SF**POOL**',
    merchantName: 'Uber',
    category: ['Travel', 'Ride Share'],
    date: '2026-03-08',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-002',
    accountId: 'ext-acct-001',
    amountCents: -1200,
    description: 'McDonald\'s F12345',
    merchantName: 'McDonald\'s',
    category: ['Food and Drink', 'Fast Food'],
    date: '2026-03-08',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-003',
    accountId: 'ext-acct-001',
    amountCents: -495,
    description: 'Spotify P12345',
    merchantName: 'Spotify',
    category: ['Recreation', 'Music'],
    date: '2026-03-07',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-004',
    accountId: 'ext-acct-001',
    amountCents: 50000,
    description: 'DIRECT DEP ACME CORP PAYROLL',
    merchantName: null,
    category: ['Transfer', 'Payroll'],
    date: '2026-03-06',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-005',
    accountId: 'ext-acct-002',
    amountCents: 25,
    description: 'INTEREST PAYMENT',
    merchantName: null,
    category: ['Transfer', 'Interest'],
    date: '2026-03-05',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-006',
    accountId: 'ext-acct-003',
    amountCents: -6543,
    description: 'Amazon.com*AB1CD2EF3',
    merchantName: 'Amazon',
    category: ['Shopping', 'Online'],
    date: '2026-03-09',
    pending: true,
    currencyCode: 'USD',
  },
  {
    transactionId: 'ext-txn-007',
    accountId: 'ext-acct-003',
    amountCents: -3299,
    description: 'NETFLIX.COM',
    merchantName: 'Netflix',
    category: ['Recreation', 'Streaming'],
    date: '2026-03-07',
    pending: false,
    currencyCode: 'USD',
  },
];

// =============================================================================
// MOCK ADAPTER
// =============================================================================

export class MockExternalAccountAdapter implements ExternalAccountAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock External Accounts',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async linkToken(_request: LinkTokenRequest): Promise<LinkTokenResponse> {
    return {
      linkToken: `link-sandbox-${crypto.randomUUID()}`,
      expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      requestId: `mock-req-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async exchangeToken(_request: ExchangeTokenRequest): Promise<ExchangeTokenResponse> {
    return {
      accessToken: `access-sandbox-${crypto.randomUUID()}`,
      itemId: `mock-item-${crypto.randomUUID().slice(0, 8)}`,
      requestId: `mock-req-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async getAccounts(_request: GetAccountsRequest): Promise<GetAccountsResponse> {
    return {
      accounts: MOCK_ACCOUNTS,
      requestId: `mock-req-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async getBalances(request: GetBalancesRequest): Promise<GetBalancesResponse> {
    const filtered = request.accountIds?.length
      ? MOCK_ACCOUNTS.filter((a) => request.accountIds!.includes(a.accountId))
      : MOCK_ACCOUNTS;

    const balances: ExternalBalance[] = filtered.map((a) => ({
      accountId: a.accountId,
      currentCents: a.balanceCents,
      availableCents: a.availableBalanceCents,
      limitCents: a.type === 'credit' ? 500000 : null,
      currencyCode: a.currencyCode,
      lastUpdatedAt: new Date().toISOString(),
    }));

    return {
      balances,
      requestId: `mock-req-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  async getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    // Simple cursor simulation: return all if no cursor, empty if cursor provided
    const hasData = !request.cursor;

    return {
      added: hasData ? MOCK_TRANSACTIONS : [],
      modified: [],
      removed: [],
      nextCursor: hasData ? 'mock-cursor-end' : '',
      hasMore: false,
      requestId: `mock-req-${crypto.randomUUID().slice(0, 8)}`,
    };
  }
}
