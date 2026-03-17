// TODO: Provisional integration — not yet validated in production.
/**
 * Column Treasury Adapter
 *
 * Integrates with Column — a developer-first bank and banking infrastructure
 * provider offering direct bank accounts, ACH origination, wire transfers,
 * and real-time ledger operations.
 *
 * Column API: https://column.com/docs
 *
 * Configuration:
 *   COLUMN_API_KEY — API key for authentication
 *   COLUMN_BASE_URL — Base URL (default: https://api.column.com)
 *   COLUMN_ENVIRONMENT — 'sandbox' or 'production'
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
// COLUMN API RESPONSE TYPES
// =============================================================================

interface ColumnBankAccount {
  id: string;
  description: string;
  account_number_last_four: string;
  routing_number: string;
  balance: number;
  available_balance: number;
  hold_balance: number;
  type: string;
  status: string;
  currency: string;
  created_at: string;
}

interface ColumnACHTransfer {
  id: string;
  amount: number;
  type: string;
  status: string;
  description: string;
  return_code: string | null;
  effective_date: string | null;
  settled_at: string | null;
  created_at: string;
  bank_account_id: string;
}

interface ColumnWireTransfer {
  id: string;
  amount: number;
  status: string;
  beneficiary_name: string;
  imad: string | null;
  omad: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string;
  bank_account_id: string;
  type: string;
}

interface ColumnBookTransfer {
  id: string;
  amount: number;
  description: string;
  status: string;
  sender_bank_account_id: string;
  receiver_bank_account_id: string;
  created_at: string;
}

interface ColumnTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  status: string;
  running_balance: number | null;
  effective_date: string | null;
  created_at: string;
  bank_account_id: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapColumnAccountType(type: string): TreasuryAccountType {
  switch (type) {
    case 'checking': return 'checking';
    case 'savings': return 'savings';
    case 'reserve': return 'reserve';
    default: return 'treasury';
  }
}

function mapColumnAccountStatus(status: string): TreasuryAccountStatus {
  switch (status) {
    case 'active': return 'active';
    case 'frozen': return 'frozen';
    case 'closed': return 'closed';
    default: return 'pending_approval';
  }
}

function mapColumnACHStatus(status: string): ACHStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'submitted': return 'submitted';
    case 'processing': return 'processing';
    case 'settled': return 'settled';
    case 'returned': return 'returned';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapColumnWireStatus(status: string): WireStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'submitted': return 'submitted';
    case 'completed': return 'completed';
    case 'reversed': return 'reversed';
    case 'failed': return 'failed';
    default: return 'pending';
  }
}

function mapColumnTransactionType(type: string): TreasuryTransactionType {
  switch (type) {
    case 'ach_credit': return 'ach_credit';
    case 'ach_debit': return 'ach_debit';
    case 'wire_credit': return 'wire_credit';
    case 'wire_debit': return 'wire_debit';
    case 'book_transfer': return 'book_transfer';
    case 'fee': return 'fee';
    case 'interest': return 'interest';
    default: return 'adjustment';
  }
}

function maskAccountNumber(lastFour: string): string {
  return `****${lastFour}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ColumnTreasuryAdapter implements TreasuryAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'column',
    name: 'Column Treasury',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('COLUMN_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('COLUMN_BASE_URL') ?? 'https://api.column.com';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Column adapter in sandbox mode — API key not configured');
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
      throw new Error(`Column API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/bank-accounts?limit=1');
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
    const offset = request.offset ?? 0;
    const response = await this.request<{ bank_accounts: ColumnBankAccount[]; total: number }>(
      'GET', `/bank-accounts?limit=${limit}&offset=${offset}`,
    );

    return {
      accounts: response.bank_accounts.map(a => ({
        accountId: a.id,
        type: mapColumnAccountType(a.type),
        name: a.description,
        accountNumberMasked: maskAccountNumber(a.account_number_last_four),
        routingNumber: a.routing_number,
        balanceCents: a.balance,
        availableBalanceCents: a.available_balance,
        holdAmountCents: a.hold_balance,
        status: mapColumnAccountStatus(a.status),
        currency: a.currency,
        createdAt: a.created_at,
        closedAt: null,
      })),
      total: response.total,
    };
  }

  async getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().getAccount(request);
    }

    const a = await this.request<ColumnBankAccount>('GET', `/bank-accounts/${request.accountId}`);
    return {
      accountId: a.id,
      type: mapColumnAccountType(a.type),
      name: a.description,
      accountNumberMasked: maskAccountNumber(a.account_number_last_four),
      routingNumber: a.routing_number,
      balanceCents: a.balance,
      availableBalanceCents: a.available_balance,
      holdAmountCents: a.hold_balance,
      status: mapColumnAccountStatus(a.status),
      currency: a.currency,
      createdAt: a.created_at,
      closedAt: null,
    };
  }

  async createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createACHTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<ColumnACHTransfer>('POST', '/transfers/ach', {
      bank_account_id: transfer.fromAccountId,
      counterparty_routing_number: transfer.toRoutingNumber,
      counterparty_account_number: transfer.toAccountNumber,
      type: transfer.direction,
      amount: transfer.amountCents,
      description: transfer.description,
      effective_date: transfer.effectiveDate,
    });

    return {
      transferId: response.id,
      fromAccountId: response.bank_account_id,
      direction: transfer.direction,
      amountCents: response.amount,
      description: response.description,
      status: mapColumnACHStatus(response.status),
      returnReasonCode: response.return_code,
      effectiveDate: response.effective_date,
      settledAt: response.settled_at,
      createdAt: response.created_at,
    };
  }

  async createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createWireTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<ColumnWireTransfer>('POST', '/transfers/wire', {
      bank_account_id: transfer.fromAccountId,
      beneficiary_name: transfer.beneficiaryName,
      beneficiary_routing_number: transfer.beneficiaryRoutingNumber,
      beneficiary_account_number: transfer.beneficiaryAccountNumber,
      amount: transfer.amountCents,
      memo: transfer.memo,
    });

    return {
      wireId: response.id,
      fromAccountId: response.bank_account_id,
      type: transfer.type,
      amountCents: response.amount,
      beneficiaryName: response.beneficiary_name,
      status: mapColumnWireStatus(response.status),
      imadNumber: response.imad,
      omadNumber: response.omad,
      submittedAt: response.submitted_at,
      completedAt: response.completed_at,
      createdAt: response.created_at,
    };
  }

  async createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createBookTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<ColumnBookTransfer>('POST', '/transfers/book', {
      sender_bank_account_id: transfer.fromAccountId,
      receiver_bank_account_id: transfer.toAccountId,
      amount: transfer.amountCents,
      description: transfer.description,
    });

    return {
      transferId: response.id,
      fromAccountId: response.sender_bank_account_id,
      toAccountId: response.receiver_bank_account_id,
      amountCents: response.amount,
      description: response.description,
      status: response.status === 'completed' ? 'completed' : response.status === 'failed' ? 'failed' : 'pending',
      createdAt: response.created_at,
    };
  }

  async listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listTransactions(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/transactions?limit=${limit}&offset=${offset}`;
    if (request.accountId) path += `&bank_account_id=${request.accountId}`;
    if (request.fromDate) path += `&from_date=${request.fromDate}`;
    if (request.toDate) path += `&to_date=${request.toDate}`;

    const response = await this.request<{ transactions: ColumnTransaction[]; total: number }>('GET', path);

    return {
      transactions: response.transactions.map(t => ({
        transactionId: t.id,
        accountId: t.bank_account_id,
        type: mapColumnTransactionType(t.type),
        amountCents: t.amount,
        description: t.description,
        status: t.status === 'posted' ? 'posted' as const : t.status === 'reversed' ? 'reversed' as const : 'pending' as const,
        runningBalanceCents: t.running_balance,
        postedAt: t.effective_date,
        createdAt: t.created_at,
      })),
      total: response.total,
    };
  }
}
