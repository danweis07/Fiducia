// TODO: Provisional integration — not yet validated in production.
/**
 * Increase Treasury Adapter
 *
 * Integrates with Increase — an API-first banking platform providing
 * FDIC-insured accounts, ACH origination, wire transfers, and check
 * deposits through partner banks.
 *
 * Increase API: https://increase.com/documentation
 *
 * Configuration:
 *   INCREASE_API_KEY — API key for authentication
 *   INCREASE_BASE_URL — Base URL (default: https://api.increase.com)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  TreasuryAdapter,
  TreasuryAccount,
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
// INCREASE API RESPONSE TYPES
// =============================================================================

interface IncreaseAccount {
  id: string;
  name: string;
  entity_id: string | null;
  balance: number;
  interest_accrued: string;
  status: string;
  currency: string;
  created_at: string;
  closed_at: string | null;
}

interface IncreaseAccountNumber {
  id: string;
  account_id: string;
  account_number: string;
  routing_number: string;
  name: string;
  status: string;
}

interface IncreaseACHTransfer {
  id: string;
  account_id: string;
  amount: number;
  statement_descriptor: string;
  status: string;
  return_: { reason: string } | null;
  effective_date: string | null;
  settlement: { settled_at: string } | null;
  created_at: string;
}

interface IncreaseWireTransfer {
  id: string;
  account_id: string;
  amount: number;
  beneficiary_name: string;
  status: string;
  submission: { submitted_at: string; input_message_accountability_data: string } | null;
  created_at: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapIncreaseAccountStatus(status: string): TreasuryAccountStatus {
  switch (status) {
    case 'open': return 'active';
    case 'closed': return 'closed';
    default: return 'pending_approval';
  }
}

function mapIncreaseACHStatus(status: string): ACHStatus {
  switch (status) {
    case 'pending_approval': return 'pending';
    case 'pending_submission': return 'pending';
    case 'submitted': return 'submitted';
    case 'acknowledged': return 'processing';
    case 'settled': return 'settled';
    case 'returned': return 'returned';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

function mapIncreaseWireStatus(status: string): WireStatus {
  switch (status) {
    case 'pending_approval': return 'pending';
    case 'pending_creating': return 'pending';
    case 'submitted': return 'submitted';
    case 'complete': return 'completed';
    case 'reversed': return 'reversed';
    case 'rejected': return 'failed';
    default: return 'pending';
  }
}

function mapIncreaseTransactionType(type: string): TreasuryTransactionType {
  if (type.startsWith('ach') && type.includes('credit')) return 'ach_credit';
  if (type.startsWith('ach') && type.includes('debit')) return 'ach_debit';
  if (type.startsWith('wire') && type.includes('credit')) return 'wire_credit';
  if (type.startsWith('wire') && type.includes('debit')) return 'wire_debit';
  if (type.includes('fee')) return 'fee';
  if (type.includes('interest')) return 'interest';
  return 'adjustment';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class IncreaseTreasuryAdapter implements TreasuryAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'increase',
    name: 'Increase Treasury',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('INCREASE_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('INCREASE_BASE_URL') ?? 'https://api.increase.com';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Increase adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Increase API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/accounts?limit=1');
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

    const limit = request.limit ?? 50;
    const response = await this.request<{ data: IncreaseAccount[] }>('GET', `/accounts?limit=${limit}`);

    const accounts: TreasuryAccount[] = await Promise.all(
      response.data.map(async (a) => {
        let accountNumberMasked = '****0000';
        let routingNumber = '021000021';
        try {
          const numbers = await this.request<{ data: IncreaseAccountNumber[] }>('GET', `/account_numbers?account_id=${a.id}&limit=1`);
          if (numbers.data.length > 0) {
            accountNumberMasked = `****${numbers.data[0].account_number.slice(-4)}`;
            routingNumber = numbers.data[0].routing_number;
          }
        } catch {
          // Use defaults if account number lookup fails
        }

        return {
          accountId: a.id,
          type: 'checking' as const,
          name: a.name,
          accountNumberMasked,
          routingNumber,
          balanceCents: a.balance,
          availableBalanceCents: a.balance,
          holdAmountCents: 0,
          status: mapIncreaseAccountStatus(a.status),
          currency: a.currency,
          createdAt: a.created_at,
          closedAt: a.closed_at,
        };
      }),
    );

    return { accounts, total: accounts.length };
  }

  async getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().getAccount(request);
    }

    const a = await this.request<IncreaseAccount>('GET', `/accounts/${request.accountId}`);
    return {
      accountId: a.id,
      type: 'checking',
      name: a.name,
      accountNumberMasked: '****0000',
      routingNumber: '021000021',
      balanceCents: a.balance,
      availableBalanceCents: a.balance,
      holdAmountCents: 0,
      status: mapIncreaseAccountStatus(a.status),
      currency: a.currency,
      createdAt: a.created_at,
      closedAt: a.closed_at,
    };
  }

  async createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createACHTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<IncreaseACHTransfer>('POST', '/ach_transfers', {
      account_id: transfer.fromAccountId,
      routing_number: transfer.toRoutingNumber,
      account_number: transfer.toAccountNumber,
      amount: transfer.direction === 'debit' ? -transfer.amountCents : transfer.amountCents,
      statement_descriptor: transfer.description.substring(0, 10),
      effective_date: transfer.effectiveDate,
    });

    return {
      transferId: response.id,
      fromAccountId: response.account_id,
      direction: transfer.direction,
      amountCents: Math.abs(response.amount),
      description: response.statement_descriptor,
      status: mapIncreaseACHStatus(response.status),
      returnReasonCode: response.return_?.reason ?? null,
      effectiveDate: response.effective_date,
      settledAt: response.settlement?.settled_at ?? null,
      createdAt: response.created_at,
    };
  }

  async createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createWireTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<IncreaseWireTransfer>('POST', '/wire_transfers', {
      account_id: transfer.fromAccountId,
      routing_number: transfer.beneficiaryRoutingNumber,
      account_number: transfer.beneficiaryAccountNumber,
      amount: transfer.amountCents,
      beneficiary_name: transfer.beneficiaryName,
      message_to_recipient: transfer.memo,
    });

    return {
      wireId: response.id,
      fromAccountId: response.account_id,
      type: transfer.type,
      amountCents: response.amount,
      beneficiaryName: response.beneficiary_name,
      status: mapIncreaseWireStatus(response.status),
      imadNumber: response.submission?.input_message_accountability_data ?? null,
      omadNumber: null,
      submittedAt: response.submission?.submitted_at ?? null,
      completedAt: null,
      createdAt: response.created_at,
    };
  }

  async createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createBookTransfer(request);
    }

    // Increase doesn't have a native book transfer endpoint — use ACH transfer between own accounts
    const { transfer } = request;
    const response = await this.request<{ id: string; created_at: string }>('POST', '/ach_transfers', {
      account_id: transfer.fromAccountId,
      destination_account_id: transfer.toAccountId,
      amount: transfer.amountCents,
      statement_descriptor: transfer.description.substring(0, 10),
    });

    return {
      transferId: response.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amountCents: transfer.amountCents,
      description: transfer.description,
      status: 'pending',
      createdAt: response.created_at,
    };
  }

  async listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listTransactions(request);
    }

    const limit = request.limit ?? 50;
    let path = `/transactions?limit=${limit}`;
    if (request.accountId) path += `&account_id=${request.accountId}`;

    const response = await this.request<{ data: Array<{ id: string; account_id: string; amount: number; description: string; route_type: string; created_at: string }> }>('GET', path);

    return {
      transactions: response.data.map(t => ({
        transactionId: t.id,
        accountId: t.account_id,
        type: mapIncreaseTransactionType(t.route_type),
        amountCents: t.amount,
        description: t.description,
        status: 'posted' as const,
        runningBalanceCents: null,
        postedAt: t.created_at,
        createdAt: t.created_at,
      })),
      total: response.data.length,
    };
  }
}
