// TODO: Provisional integration — not yet validated in production.
/**
 * Pismo Core Banking Adapter
 *
 * Integrates with Pismo — a cloud-native banking platform essential for
 * the Brazilian/LatAm market, powering several of the world's largest
 * digital banks. Provides accounts, transactions, and transfers via
 * a modern REST API.
 *
 * Pismo Platform API: https://developers.pismo.io/
 *
 * Configuration:
 *   PISMO_BASE_URL — API base URL (e.g., https://api.pismo.io)
 *   PISMO_API_KEY — API key for authentication
 *   PISMO_ORG_ID — Organization identifier
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
  CoreAccountStatus,
  CoreTransaction,
  CoreTransferResult,
  CoreCard,
  ListAccountsRequest,
  ListAccountsResponse,
  GetAccountRequest,
  ListTransactionsRequest,
  ListTransactionsResponse,
  CreateTransferRequest,
  ListCardsRequest,
  ListCardsResponse,
  LockCardRequest,
  SetCardLimitRequest,
} from './types.ts';

// =============================================================================
// PISMO API RESPONSE TYPES
// =============================================================================

interface PismoAccount {
  account_id: number;
  status: string;
  account_type: string;
  program_id: number;
  org_id: number;
  customer_id: number;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, string>;
}

interface PismoBalance {
  account_id: number;
  available_credit_limit: number;
  total_credit_limit: number;
  available_withdrawal_limit: number;
  current_balance: number;
}

interface PismoTransaction {
  transaction_id: number;
  account_id: number;
  authorization_id?: number;
  amount: number;
  principal_amount: number;
  processing_code: string;
  transaction_type: string;
  category: string;
  status: string;
  description: string;
  merchant_name?: string;
  merchant_category_code?: string;
  created_at: string;
  settlement_date?: string;
  metadata?: Record<string, string>;
}

interface PismoTransferResponse {
  transfer_id: string;
  status: string;
  amount: number;
  from_account_id: number;
  to_account_id: number;
  created_at: string;
  processed_at?: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountId(id: number | string): string {
  const str = String(id);
  if (str.length <= 4) return `****${str}`;
  return `****${str.slice(-4)}`;
}

function mapPismoAccountType(accountType: string): CoreAccountType {
  const lower = accountType.toLowerCase();
  if (lower.includes('checking') || lower.includes('corrente') || lower.includes('current')) return 'checking';
  if (lower.includes('money_market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('cd') || lower.includes('fixed') || lower.includes('cdb') || lower.includes('term')) return 'cd';
  return 'savings';
}

function mapPismoAccountStatus(status: string): CoreAccountStatus {
  switch (status.toUpperCase()) {
    case 'NORMAL':
    case 'ACTIVE':
      return 'active';
    case 'PENDING':
    case 'CREATED':
      return 'pending';
    case 'BLOCKED':
    case 'SUSPENDED':
      return 'frozen';
    case 'CANCELLED':
    case 'CLOSED':
      return 'closed';
    default:
      return 'active';
  }
}

function mapPismoTransactionType(txnType: string, category: string): CoreTransaction['type'] {
  const lower = txnType.toLowerCase();
  const catLower = category.toLowerCase();
  if (lower.includes('transfer') || catLower.includes('transfer')) return 'transfer';
  if (lower.includes('fee') || catLower.includes('fee')) return 'fee';
  if (lower.includes('interest') || catLower.includes('interest')) return 'interest';
  if (lower.includes('deposit') || catLower.includes('deposit')) return 'deposit';
  if (lower.includes('withdrawal') || catLower.includes('withdrawal')) return 'withdrawal';
  if (lower.includes('payment') || catLower.includes('bill')) return 'bill_payment';
  return 'debit';
}

function mapPismoTransactionStatus(status: string): CoreTransaction['status'] {
  switch (status.toUpperCase()) {
    case 'SETTLED':
    case 'POSTED':
      return 'posted';
    case 'PENDING':
    case 'AUTHORIZED':
      return 'pending';
    case 'DECLINED':
    case 'DENIED':
      return 'declined';
    case 'REVERSED':
    case 'CANCELLED':
      return 'reversed';
    default:
      return 'posted';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PismoCoreBankingAdapter implements CoreBankingAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly orgId: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'pismo',
    name: 'Pismo Platform Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('PISMO_BASE_URL') ?? '';
    this.apiKey = Deno.env.get('PISMO_API_KEY') ?? '';
    this.orgId = Deno.env.get('PISMO_ORG_ID') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Pismo adapter in sandbox mode — credentials not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiKey,
        'x-org-id': this.orgId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pismo API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      await this.request('GET', '/v1/health');
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Pismo uses customer-based account lookup
    const response = await this.request<{ items: PismoAccount[] }>(
      'GET',
      `/v1/customers/${request.userId}/accounts?page_size=${limit}&page_offset=${offset}`,
    );

    const pismoAccounts = response.items ?? [];

    // Fetch balances for each account
    const accounts: CoreAccount[] = await Promise.all(
      pismoAccounts.map(async (pa) => {
        let balanceCents = 0;
        let availableCents = 0;

        try {
          const balance = await this.request<PismoBalance>(
            'GET',
            `/v1/accounts/${pa.account_id}/balances`,
          );
          balanceCents = Math.round((balance.current_balance ?? 0) * 100);
          availableCents = Math.round((balance.available_credit_limit ?? balance.current_balance ?? 0) * 100);
        } catch {
          // Balance fetch failed — return zero balances
        }

        return {
          accountId: String(pa.account_id),
          externalId: String(pa.account_id),
          type: mapPismoAccountType(pa.account_type),
          nickname: pa.custom_fields?.['nickname'] ?? pa.account_type,
          accountNumberMasked: maskAccountId(pa.account_id),
          routingNumber: this.routingNumber,
          balanceCents,
          availableBalanceCents: availableCents,
          status: mapPismoAccountStatus(pa.status),
          interestRateBps: 0,
          openedAt: pa.created_at,
          closedAt: pa.status === 'CANCELLED' ? pa.updated_at : null,
        };
      }),
    );

    return {
      accounts,
      total: accounts.length,
    };
  }

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    const pa = await this.request<PismoAccount>(
      'GET',
      `/v1/accounts/${request.accountId}`,
    );

    let balanceCents = 0;
    let availableCents = 0;

    try {
      const balance = await this.request<PismoBalance>(
        'GET',
        `/v1/accounts/${request.accountId}/balances`,
      );
      balanceCents = Math.round((balance.current_balance ?? 0) * 100);
      availableCents = Math.round((balance.available_credit_limit ?? balance.current_balance ?? 0) * 100);
    } catch {
      // Balance fetch failed — return zero balances
    }

    return {
      accountId: String(pa.account_id),
      externalId: String(pa.account_id),
      type: mapPismoAccountType(pa.account_type),
      nickname: pa.custom_fields?.['nickname'] ?? pa.account_type,
      accountNumberMasked: maskAccountId(pa.account_id),
      routingNumber: this.routingNumber,
      balanceCents,
      availableBalanceCents: availableCents,
      status: mapPismoAccountStatus(pa.status),
      interestRateBps: 0,
      openedAt: pa.created_at,
      closedAt: pa.status === 'CANCELLED' ? pa.updated_at : null,
    };
  }

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    const accountId = request.accountId;
    if (!accountId) {
      return { transactions: [], total: 0 };
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    const params = new URLSearchParams({
      page_size: String(limit),
      page_offset: String(offset),
    });

    if (request.fromDate) params.set('start_date', request.fromDate);
    if (request.toDate) params.set('end_date', request.toDate);

    const response = await this.request<{ items: PismoTransaction[] }>(
      'GET',
      `/v1/accounts/${accountId}/transactions?${params.toString()}`,
    );

    const transactions: CoreTransaction[] = (response.items ?? []).map(t => ({
      transactionId: String(t.transaction_id),
      accountId,
      type: mapPismoTransactionType(t.transaction_type, t.category),
      amountCents: Math.round(Math.abs(t.amount) * 100),
      description: t.description,
      category: t.category || null,
      status: mapPismoTransactionStatus(t.status),
      merchantName: t.merchant_name ?? null,
      merchantCategory: t.merchant_category_code ?? null,
      runningBalanceCents: null,
      postedAt: t.settlement_date ?? null,
      createdAt: t.created_at,
    }));

    return {
      transactions,
      total: transactions.length,
    };
  }

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const { transfer } = request;

    const response = await this.request<PismoTransferResponse>(
      'POST',
      '/v1/transfers',
      {
        from_account_id: parseInt(transfer.fromAccountId, 10),
        to_account_id: transfer.toAccountId ? parseInt(transfer.toAccountId, 10) : undefined,
        amount: transfer.amountCents / 100,
        description: transfer.memo ?? 'Transfer',
      },
    );

    return {
      transferId: response.transfer_id,
      status: response.status === 'COMPLETED' ? 'completed' : 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: response.processed_at ?? null,
      createdAt: response.created_at ?? new Date().toISOString(),
    };
  }

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    // Pismo has native card capabilities, but for this platform they are
    // managed through the dedicated card domain adapter.
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported via core banking adapter — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported via core banking adapter — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported via core banking adapter — use card domain adapter');
  }
}
