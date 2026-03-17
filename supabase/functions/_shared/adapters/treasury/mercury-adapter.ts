// TODO: Provisional integration — not yet validated in production.
/**
 * Mercury Treasury Adapter
 *
 * Integrates with Mercury — a business banking platform providing checking,
 * savings, and treasury accounts with API access for ACH, wires, and
 * internal transfers.
 *
 * Mercury API: https://docs.mercury.com/reference
 *
 * Configuration:
 *   MERCURY_API_TOKEN — API token for authentication
 *   MERCURY_BASE_URL — Base URL (default: https://api.mercury.com/api/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  TreasuryAdapter,
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryAccountStatus,
  ACHTransfer,
  ACHStatus,
  WireTransfer,
  WireStatus,
  BookTransfer,
  TreasuryTransactionType,
  ListTreasuryAccountsRequest,
  ListTreasuryAccountsResponse,
  GetTreasuryAccountRequest,
  CreateACHTransferRequest,
  CreateWireTransferRequest,
  CreateBookTransferRequest,
  ListTreasuryTransactionsRequest,
  ListTreasuryTransactionsResponse,
} from './types.ts';

// =============================================================================
// MERCURY API RESPONSE TYPES
// =============================================================================

interface MercuryAccount {
  id: string;
  accountNumber: string;
  routingNumber: string;
  name: string;
  type: string;
  status: string;
  currentBalance: number;
  availableBalance: number;
  currency: string;
  createdAt: string;
}

interface MercuryTransaction {
  id: string;
  amount: number;
  bankDescription: string | null;
  counterpartyName: string | null;
  status: string;
  kind: string;
  postedAt: string | null;
  createdAt: string;
  dashboardLink: string;
  estimatedDeliveryDate: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapMercuryAccountType(type: string): TreasuryAccountType {
  switch (type) {
    case 'checking': return 'checking';
    case 'savings': return 'savings';
    case 'treasury': return 'treasury';
    default: return 'checking';
  }
}

function mapMercuryAccountStatus(status: string): TreasuryAccountStatus {
  switch (status) {
    case 'active': return 'active';
    case 'frozen': return 'frozen';
    case 'closed': return 'closed';
    case 'pending': return 'pending_approval';
    default: return 'active';
  }
}

function mapMercuryTransactionKind(kind: string): TreasuryTransactionType {
  switch (kind) {
    case 'externalTransfer': return 'ach_credit';
    case 'outgoingPayment': return 'ach_debit';
    case 'internalTransfer': return 'book_transfer';
    case 'wire': return 'wire_debit';
    case 'incomingWire': return 'wire_credit';
    case 'fee': return 'fee';
    case 'interest': return 'interest';
    default: return 'adjustment';
  }
}

function mapMercuryTransactionStatus(status: string): ACHStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'sent': return 'submitted';
    case 'complete': return 'settled';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return `****${accountNumber}`;
  return `****${accountNumber.slice(-4)}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MercuryTreasuryAdapter implements TreasuryAdapter {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'mercury',
    name: 'Mercury Treasury',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiToken = Deno.env.get('MERCURY_API_TOKEN') ?? '';
    this.baseUrl = Deno.env.get('MERCURY_BASE_URL') ?? 'https://api.mercury.com/api/v1';
    this.sandbox = !this.apiToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Mercury adapter in sandbox mode — API token not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Mercury API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/accounts');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async listAccounts(request: ListTreasuryAccountsRequest): Promise<ListTreasuryAccountsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listAccounts(request);
    }

    const response = await this.request<{ accounts: MercuryAccount[] }>('GET', '/accounts');
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    const accounts: TreasuryAccount[] = response.accounts.map(a => ({
      accountId: a.id,
      type: mapMercuryAccountType(a.type),
      name: a.name,
      accountNumberMasked: maskAccountNumber(a.accountNumber),
      routingNumber: a.routingNumber,
      balanceCents: Math.round(a.currentBalance * 100),
      availableBalanceCents: Math.round(a.availableBalance * 100),
      holdAmountCents: Math.round((a.currentBalance - a.availableBalance) * 100),
      status: mapMercuryAccountStatus(a.status),
      currency: a.currency,
      createdAt: a.createdAt,
      closedAt: null,
    }));

    return { accounts: accounts.slice(offset, offset + limit), total: accounts.length };
  }

  async getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().getAccount(request);
    }

    const a = await this.request<MercuryAccount>('GET', `/account/${request.accountId}`);
    return {
      accountId: a.id,
      type: mapMercuryAccountType(a.type),
      name: a.name,
      accountNumberMasked: maskAccountNumber(a.accountNumber),
      routingNumber: a.routingNumber,
      balanceCents: Math.round(a.currentBalance * 100),
      availableBalanceCents: Math.round(a.availableBalance * 100),
      holdAmountCents: Math.round((a.currentBalance - a.availableBalance) * 100),
      status: mapMercuryAccountStatus(a.status),
      currency: a.currency,
      createdAt: a.createdAt,
      closedAt: null,
    };
  }

  async createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createACHTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<MercuryTransaction>('POST', `/account/${transfer.fromAccountId}/transactions`, {
      recipientId: null,
      amount: transfer.amountCents / 100,
      paymentMethod: 'ach',
      externalMemo: transfer.description,
    });

    return {
      transferId: response.id,
      fromAccountId: transfer.fromAccountId,
      direction: transfer.direction,
      amountCents: Math.round(Math.abs(response.amount) * 100),
      description: response.bankDescription ?? transfer.description,
      status: mapMercuryTransactionStatus(response.status),
      returnReasonCode: null,
      effectiveDate: response.estimatedDeliveryDate,
      settledAt: null,
      createdAt: response.createdAt,
    };
  }

  async createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createWireTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<MercuryTransaction>('POST', `/account/${transfer.fromAccountId}/transactions`, {
      recipientId: null,
      amount: transfer.amountCents / 100,
      paymentMethod: 'domesticWire',
      externalMemo: transfer.memo ?? '',
    });

    const wireStatus: WireStatus = response.status === 'complete' ? 'completed'
      : response.status === 'failed' ? 'failed'
      : response.status === 'sent' ? 'submitted'
      : 'pending';

    return {
      wireId: response.id,
      fromAccountId: transfer.fromAccountId,
      type: transfer.type,
      amountCents: Math.round(Math.abs(response.amount) * 100),
      beneficiaryName: transfer.beneficiaryName,
      status: wireStatus,
      imadNumber: null,
      omadNumber: null,
      submittedAt: null,
      completedAt: null,
      createdAt: response.createdAt,
    };
  }

  async createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createBookTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<MercuryTransaction>('POST', `/account/${transfer.fromAccountId}/transactions`, {
      recipientId: null,
      amount: transfer.amountCents / 100,
      paymentMethod: 'internalTransfer',
      toAccountId: transfer.toAccountId,
      externalMemo: transfer.description,
    });

    return {
      transferId: response.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amountCents: Math.round(Math.abs(response.amount) * 100),
      description: transfer.description,
      status: response.status === 'complete' ? 'completed' : response.status === 'failed' ? 'failed' : 'pending',
      createdAt: response.createdAt,
    };
  }

  async listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listTransactions(request);
    }

    const accountId = request.accountId ?? 'default';
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/account/${accountId}/transactions?limit=${limit}&offset=${offset}`;
    if (request.fromDate) path += `&start=${request.fromDate}`;
    if (request.toDate) path += `&end=${request.toDate}`;

    const response = await this.request<{ transactions: MercuryTransaction[] }>('GET', path);

    return {
      transactions: response.transactions.map(t => ({
        transactionId: t.id,
        accountId,
        type: mapMercuryTransactionKind(t.kind),
        amountCents: Math.round(t.amount * 100),
        description: t.bankDescription ?? t.counterpartyName ?? 'Transaction',
        status: t.status === 'complete' ? 'posted' as const : t.status === 'cancelled' ? 'reversed' as const : 'pending' as const,
        runningBalanceCents: null,
        postedAt: t.postedAt,
        createdAt: t.createdAt,
      })),
      total: response.transactions.length,
    };
  }
}
