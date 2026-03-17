/**
 * Mock Aggregator Adapter
 *
 * Returns realistic fake data with no network calls.
 * Used for development, testing, and tenants without aggregator subscriptions.
 * Includes sample EU bank data (Salt Edge style) and US bank data (Akoya style).
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
  AggregatorAdapter,
  SearchInstitutionsRequest,
  SearchInstitutionsResponse,
  CreateConnectionRequest,
  CreateConnectionResponse,
  ConnectionCallbackRequest,
  ConnectionCallbackResponse,
  ListConnectionsRequest,
  ListConnectionsResponse,
  RefreshConnectionRequest,
  RefreshConnectionResponse,
  RemoveConnectionRequest,
  RemoveConnectionResponse,
  ListAccountsRequest,
  ListAccountsResponse,
  ListTransactionsRequest,
  ListTransactionsResponse,
  AggregatorInstitution,
  Connection,
  AggregatedAccount,
  AggregatedTransaction,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_INSTITUTIONS: AggregatorInstitution[] = [
  {
    institutionId: 'inst-001',
    name: 'Deutsche Bank',
    logoUrl: 'https://logo.clearbit.com/deutsche-bank.de',
    countryCode: 'DE',
    providerInstitutionId: 'deutsche_bank_de',
    supportedAccountTypes: ['checking', 'savings', 'credit_card', 'investment'],
  },
  {
    institutionId: 'inst-002',
    name: 'Barclays UK',
    logoUrl: 'https://logo.clearbit.com/barclays.co.uk',
    countryCode: 'GB',
    providerInstitutionId: 'barclays_gb',
    supportedAccountTypes: ['checking', 'savings', 'credit_card', 'mortgage'],
  },
  {
    institutionId: 'inst-003',
    name: 'BNP Paribas',
    logoUrl: 'https://logo.clearbit.com/bnpparibas.com',
    countryCode: 'FR',
    providerInstitutionId: 'bnp_paribas_fr',
    supportedAccountTypes: ['checking', 'savings', 'investment'],
  },
  {
    institutionId: 'inst-004',
    name: 'Wells Fargo',
    logoUrl: 'https://logo.clearbit.com/wellsfargo.com',
    countryCode: 'US',
    providerInstitutionId: 'wells_fargo_us',
    supportedAccountTypes: ['checking', 'savings', 'credit_card', 'loan', 'mortgage'],
  },
  {
    institutionId: 'inst-005',
    name: 'Citi',
    logoUrl: 'https://logo.clearbit.com/citi.com',
    countryCode: 'US',
    providerInstitutionId: 'citi_us',
    supportedAccountTypes: ['checking', 'savings', 'credit_card', 'investment'],
  },
  {
    institutionId: 'inst-006',
    name: 'ING Bank',
    logoUrl: 'https://logo.clearbit.com/ing.com',
    countryCode: 'NL',
    providerInstitutionId: 'ing_nl',
    supportedAccountTypes: ['checking', 'savings'],
  },
];

const MOCK_CONNECTIONS: Connection[] = [
  {
    connectionId: 'conn-001',
    institutionId: 'inst-001',
    institutionName: 'Deutsche Bank',
    institutionLogo: 'https://logo.clearbit.com/deutsche-bank.de',
    countryCode: 'DE',
    status: 'active',
    consentStatus: 'active',
    consentExpiresAt: '2026-09-15T00:00:00Z',
    accountCount: 2,
    lastSyncedAt: '2026-03-15T14:30:00Z',
    createdAt: '2026-01-10T09:00:00Z',
    provider: 'salt_edge',
  },
  {
    connectionId: 'conn-002',
    institutionId: 'inst-004',
    institutionName: 'Wells Fargo',
    institutionLogo: 'https://logo.clearbit.com/wellsfargo.com',
    countryCode: 'US',
    status: 'active',
    consentStatus: 'active',
    consentExpiresAt: null,
    accountCount: 3,
    lastSyncedAt: '2026-03-16T08:15:00Z',
    createdAt: '2026-02-01T11:00:00Z',
    provider: 'akoya',
  },
];

const MOCK_ACCOUNTS: AggregatedAccount[] = [
  {
    accountId: 'agg-acct-001',
    connectionId: 'conn-001',
    institutionName: 'Deutsche Bank',
    name: 'Girokonto',
    type: 'checking',
    mask: '****4567',
    balanceCents: 345000,
    availableBalanceCents: 340000,
    currencyCode: 'EUR',
    ibanMasked: 'DE89****4567',
    lastSyncedAt: '2026-03-15T14:30:00Z',
  },
  {
    accountId: 'agg-acct-002',
    connectionId: 'conn-001',
    institutionName: 'Deutsche Bank',
    name: 'Sparkonto',
    type: 'savings',
    mask: '****8901',
    balanceCents: 1250000,
    availableBalanceCents: 1250000,
    currencyCode: 'EUR',
    ibanMasked: 'DE89****8901',
    lastSyncedAt: '2026-03-15T14:30:00Z',
  },
  {
    accountId: 'agg-acct-003',
    connectionId: 'conn-002',
    institutionName: 'Wells Fargo',
    name: 'Everyday Checking',
    type: 'checking',
    mask: '****2345',
    balanceCents: 578900,
    availableBalanceCents: 565400,
    currencyCode: 'USD',
    ibanMasked: null,
    lastSyncedAt: '2026-03-16T08:15:00Z',
  },
  {
    accountId: 'agg-acct-004',
    connectionId: 'conn-002',
    institutionName: 'Wells Fargo',
    name: 'Way2Save Savings',
    type: 'savings',
    mask: '****6789',
    balanceCents: 2350000,
    availableBalanceCents: 2350000,
    currencyCode: 'USD',
    ibanMasked: null,
    lastSyncedAt: '2026-03-16T08:15:00Z',
  },
  {
    accountId: 'agg-acct-005',
    connectionId: 'conn-002',
    institutionName: 'Wells Fargo',
    name: 'Active Cash Card',
    type: 'credit_card',
    mask: '****1234',
    balanceCents: -125000,
    availableBalanceCents: 875000,
    currencyCode: 'USD',
    ibanMasked: null,
    lastSyncedAt: '2026-03-16T08:15:00Z',
  },
];

const MOCK_TRANSACTIONS: AggregatedTransaction[] = [
  {
    transactionId: 'agg-txn-001',
    accountId: 'agg-acct-001',
    connectionId: 'conn-001',
    amountCents: -4500,
    description: 'REWE Markt Berlin',
    merchantName: 'REWE',
    category: 'Groceries',
    date: '2026-03-15',
    pending: false,
    currencyCode: 'EUR',
  },
  {
    transactionId: 'agg-txn-002',
    accountId: 'agg-acct-001',
    connectionId: 'conn-001',
    amountCents: -1299,
    description: 'SPOTIFY AB Stockholm',
    merchantName: 'Spotify',
    category: 'Subscriptions',
    date: '2026-03-14',
    pending: false,
    currencyCode: 'EUR',
  },
  {
    transactionId: 'agg-txn-003',
    accountId: 'agg-acct-001',
    connectionId: 'conn-001',
    amountCents: 350000,
    description: 'GEHALT ACME GMBH',
    merchantName: null,
    category: 'Income',
    date: '2026-03-01',
    pending: false,
    currencyCode: 'EUR',
  },
  {
    transactionId: 'agg-txn-004',
    accountId: 'agg-acct-003',
    connectionId: 'conn-002',
    amountCents: -6543,
    description: 'AMAZON.COM*AB1CD2EF3',
    merchantName: 'Amazon',
    category: 'Shopping',
    date: '2026-03-14',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'agg-txn-005',
    accountId: 'agg-acct-003',
    connectionId: 'conn-002',
    amountCents: -3200,
    description: 'WHOLE FOODS MKT #10234',
    merchantName: 'Whole Foods',
    category: 'Groceries',
    date: '2026-03-13',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'agg-txn-006',
    accountId: 'agg-acct-003',
    connectionId: 'conn-002',
    amountCents: 500000,
    description: 'DIRECT DEP ACME CORP PAYROLL',
    merchantName: null,
    category: 'Income',
    date: '2026-03-01',
    pending: false,
    currencyCode: 'USD',
  },
  {
    transactionId: 'agg-txn-007',
    accountId: 'agg-acct-005',
    connectionId: 'conn-002',
    amountCents: -15999,
    description: 'BEST BUY #1234',
    merchantName: 'Best Buy',
    category: 'Electronics',
    date: '2026-03-12',
    pending: true,
    currencyCode: 'USD',
  },
];

// =============================================================================
// MOCK ADAPTER
// =============================================================================

export class MockAggregatorAdapter implements AggregatorAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Aggregator',
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

  async searchInstitutions(request: SearchInstitutionsRequest): Promise<SearchInstitutionsResponse> {
    const query = request.query.toLowerCase();
    const filtered = MOCK_INSTITUTIONS.filter((i) =>
      i.name.toLowerCase().includes(query) ||
      i.countryCode.toLowerCase().includes(query)
    );

    const countryFiltered = request.countryCode
      ? filtered.filter((i) => i.countryCode === request.countryCode)
      : filtered;

    const limit = request.limit ?? 20;
    return {
      institutions: countryFiltered.slice(0, limit),
      totalCount: countryFiltered.length,
    };
  }

  async createConnection(_request: CreateConnectionRequest): Promise<CreateConnectionResponse> {
    const connectionId = `conn-${crypto.randomUUID().slice(0, 8)}`;
    return {
      connectionId,
      connectUrl: `https://sandbox.aggregator.example/connect/${connectionId}`,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  async handleCallback(request: ConnectionCallbackRequest): Promise<ConnectionCallbackResponse> {
    return {
      connectionId: request.connectionId,
      status: 'active',
      institutionName: 'Mock Bank',
      accountCount: 2,
    };
  }

  async listConnections(_request: ListConnectionsRequest): Promise<ListConnectionsResponse> {
    return { connections: MOCK_CONNECTIONS };
  }

  async refreshConnection(request: RefreshConnectionRequest): Promise<RefreshConnectionResponse> {
    return {
      connectionId: request.connectionId,
      status: 'active',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  async removeConnection(request: RemoveConnectionRequest): Promise<RemoveConnectionResponse> {
    return {
      connectionId: request.connectionId,
      removed: true,
    };
  }

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    const accounts = request.connectionId
      ? MOCK_ACCOUNTS.filter((a) => a.connectionId === request.connectionId)
      : MOCK_ACCOUNTS;

    return { accounts };
  }

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    let txns = MOCK_TRANSACTIONS.filter((t) => t.accountId === request.accountId);

    if (request.fromDate) {
      txns = txns.filter((t) => t.date >= request.fromDate!);
    }
    if (request.toDate) {
      txns = txns.filter((t) => t.date <= request.toDate!);
    }

    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50;
    const sliced = txns.slice(offset, offset + limit);

    return {
      transactions: sliced,
      totalCount: txns.length,
      hasMore: offset + limit < txns.length,
    };
  }
}
