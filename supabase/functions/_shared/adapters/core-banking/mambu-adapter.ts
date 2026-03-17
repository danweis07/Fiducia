// TODO: Provisional integration — not yet validated in production.
/**
 * Mambu Core Banking Adapter
 *
 * Integrates with Mambu — a cloud-native, composable banking platform widely
 * used by neobanks and fintechs in Brazil, Europe, and globally. Provides
 * deposit accounts, transactions, and fund transfers via REST API v2.
 *
 * Mambu API: https://api.mambu.com/
 *
 * Configuration:
 *   MAMBU_BASE_URL — Tenant API URL (e.g., https://yourorg.mambu.com/api)
 *   MAMBU_API_KEY — API key for authentication
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
// MAMBU API RESPONSE TYPES
// =============================================================================

interface MambuDepositAccount {
  id: string;
  encodedKey: string;
  name: string;
  accountHolderKey: string;
  accountHolderType: string;
  accountState: string;
  accountType: string;
  currencyCode: string;
  balances: {
    totalBalance: number;
    availableBalance: number;
    holdBalance: number;
  };
  interestSettings?: {
    interestRate: number;
  };
  accruedAmounts?: {
    interestAccrued: number;
  };
  creationDate: string;
  closedDate?: string;
  lastModifiedDate: string;
}

interface MambuTransaction {
  id: string;
  encodedKey: string;
  type: string;
  amount: number;
  currencyCode: string;
  accountBalances: {
    totalBalance: number;
  };
  bookingDate: string;
  creationDate: string;
  valueDate: string;
  notes?: string;
  transactionDetails?: {
    transactionChannelKey?: string;
    transactionChannelId?: string;
  };
  transferDetails?: {
    linkedDepositTransactionKey?: string;
    linkedLoanTransactionKey?: string;
  };
  adjustmentTransactionKey?: string;
}

interface MambuTransferResponse {
  encodedKey: string;
  id: string;
  amount: number;
  linkedTransaction?: {
    encodedKey: string;
    linkedDepositTransactionKey?: string;
  };
  creationDate: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(id: string): string {
  if (id.length <= 4) return `****${id}`;
  return `****${id.slice(-4)}`;
}

function mapMambuAccountType(accountType: string): CoreAccountType {
  const lower = accountType.toLowerCase();
  if (lower.includes('current') || lower.includes('checking')) return 'checking';
  if (lower.includes('money_market') || lower.includes('money market')) return 'money_market';
  if (lower.includes('fixed') || lower.includes('cd') || lower.includes('term')) return 'cd';
  return 'savings';
}

function mapMambuAccountStatus(state: string): CoreAccountStatus {
  switch (state.toUpperCase()) {
    case 'ACTIVE':
    case 'ACTIVE_IN_ARREARS':
      return 'active';
    case 'APPROVED':
    case 'PENDING_APPROVAL':
      return 'pending';
    case 'CLOSED':
    case 'CLOSED_WRITTEN_OFF':
    case 'CLOSED_REJECTED':
      return 'closed';
    case 'LOCKED':
    case 'DORMANT':
      return 'frozen';
    default:
      return 'active';
  }
}

function mapMambuTransactionType(type: string): CoreTransaction['type'] {
  const lower = type.toLowerCase();
  if (lower.includes('withdrawal') || lower.includes('debit')) return 'debit';
  if (lower.includes('deposit') || lower === 'deposit') return 'deposit';
  if (lower.includes('transfer')) return 'transfer';
  if (lower.includes('fee')) return 'fee';
  if (lower.includes('interest')) return 'interest';
  return 'credit';
}

function mapMambuTransactionStatus(type: string): CoreTransaction['status'] {
  const lower = type.toLowerCase();
  if (lower.includes('reversed') || lower.includes('adjustment')) return 'reversed';
  return 'posted';
}

function mapMambuAccount(ma: MambuDepositAccount, routingNumber: string): CoreAccount {
  return {
    accountId: ma.id,
    externalId: ma.encodedKey,
    type: mapMambuAccountType(ma.accountType),
    nickname: ma.name,
    accountNumberMasked: maskAccountNumber(ma.id),
    routingNumber,
    balanceCents: Math.round((ma.balances.totalBalance ?? 0) * 100),
    availableBalanceCents: Math.round((ma.balances.availableBalance ?? 0) * 100),
    status: mapMambuAccountStatus(ma.accountState),
    interestRateBps: Math.round((ma.interestSettings?.interestRate ?? 0) * 100),
    openedAt: ma.creationDate,
    closedAt: ma.closedDate ?? null,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MambuCoreBankingAdapter implements CoreBankingAdapter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'mambu',
    name: 'Mambu Composable Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('MAMBU_BASE_URL') ?? '';
    this.apiKey = Deno.env.get('MAMBU_API_KEY') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Mambu adapter in sandbox mode — credentials not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'apiKey': this.apiKey,
        'Accept': 'application/vnd.mambu.v2+json',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Mambu API error (${res.status}): ${errBody}`);
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
      await this.request('GET', '/organization');
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

    // Mambu v2 uses search endpoint for deposit accounts
    const response = await this.request<MambuDepositAccount[]>(
      'POST',
      '/deposits:search',
      {
        filterCriteria: [
          {
            field: 'accountHolderKey',
            operator: 'EQUALS',
            value: request.userId,
          },
        ],
        sortingCriteria: {
          field: 'creationDate',
          order: 'DESC',
        },
      },
    );

    const accounts = (response ?? []).map(a => mapMambuAccount(a, this.routingNumber));

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    const ma = await this.request<MambuDepositAccount>(
      'GET',
      `/deposits/${request.accountId}?detailsLevel=FULL`,
    );

    return mapMambuAccount(ma, this.routingNumber);
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
      limit: String(limit),
      offset: String(offset),
      paginationDetails: 'ON',
    });

    if (request.fromDate) params.set('from', request.fromDate);
    if (request.toDate) params.set('to', request.toDate);

    const response = await this.request<MambuTransaction[]>(
      'GET',
      `/deposits/${accountId}/transactions?${params.toString()}`,
    );

    const transactions: CoreTransaction[] = (response ?? []).map(t => ({
      transactionId: t.id,
      accountId,
      type: mapMambuTransactionType(t.type),
      amountCents: Math.round(t.amount * 100),
      description: t.notes ?? t.type,
      category: null,
      status: mapMambuTransactionStatus(t.type),
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: t.accountBalances?.totalBalance != null
        ? Math.round(t.accountBalances.totalBalance * 100)
        : null,
      postedAt: t.bookingDate,
      createdAt: t.creationDate,
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

    // Mambu uses deposit account transfer endpoint
    const response = await this.request<MambuTransferResponse>(
      'POST',
      `/deposits/${transfer.fromAccountId}/transfer-transactions`,
      {
        amount: transfer.amountCents / 100,
        transferDetails: {
          linkedAccountKey: transfer.toAccountId,
          linkedAccountType: 'DEPOSIT',
        },
        notes: transfer.memo ?? 'Transfer',
      },
    );

    return {
      transferId: response.id ?? response.encodedKey,
      status: 'completed',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: new Date().toISOString(),
      createdAt: response.creationDate ?? new Date().toISOString(),
    };
  }

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    // Mambu does not natively manage cards — use a separate card adapter.
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Mambu — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Mambu — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Mambu — use card domain adapter');
  }
}
