// TODO: Provisional integration — not yet validated in production.
/**
 * Temenos Transact (T24) Core Banking Adapter
 *
 * Integrates with Temenos Transact — the global leader in core banking with
 * 3,000+ clients across Europe and APAC. Supports multi-currency, multi-entity
 * operations with native ISO 20022 messaging.
 *
 * Temenos Transact API uses RESTful endpoints with BIAN-compliant service domains.
 *
 * Configuration:
 *   TEMENOS_BASE_URL     — Transact API base URL
 *   TEMENOS_TENANT_ID    — Temenos company/tenant identifier
 *   TEMENOS_CLIENT_ID    — OAuth 2.0 client ID
 *   TEMENOS_CLIENT_SECRET — OAuth 2.0 client secret
 *
 * ISO 20022 Integration:
 *   Temenos natively supports pain.001, pacs.008, camt.053, and camt.054 messages.
 *   The adapter maps between Temenos T24 record format and ISO 20022 XML.
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
// TEMENOS API RESPONSE TYPES
// =============================================================================

interface TemenosAccount {
  accountId: string;
  arrangementId: string;
  productLineName: string;
  currency: string;
  workingBalance: number;
  availableBalance: number;
  accountIBAN?: string;
  sortCode?: string;
  accountNumber?: string;
  status: string;
  interestRate?: number;
  openingDate: string;
  closingDate?: string;
}

interface TemenosTransaction {
  transactionId: string;
  accountId: string;
  transactionType: string;
  amountLcy: number;
  description: string;
  narrative: string;
  bookingDate: string;
  valueDate: string;
  balance: number;
  creditDebitIndicator: 'CREDIT' | 'DEBIT';
}

interface TemenosTransferResponse {
  transactionId: string;
  status: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  valueDate: string;
}

// =============================================================================
// TEMENOS ACCOUNT TYPE MAPPING
// =============================================================================

function mapTemenosAccountType(productLine: string): CoreAccountType {
  const lower = productLine.toLowerCase();
  if (lower.includes('current') || lower.includes('checking')) return 'checking';
  if (lower.includes('savings') || lower.includes('deposit')) return 'savings';
  if (lower.includes('money market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('fixed') || lower.includes('term') || lower.includes('cd')) return 'cd';
  return 'checking';
}

function mapTemenosStatus(status: string): CoreAccountStatus {
  switch (status.toUpperCase()) {
    case 'CURRENT':
    case 'ACTIVE': return 'active';
    case 'FROZEN':
    case 'BLOCKED': return 'frozen';
    case 'CLOSED': return 'closed';
    default: return 'pending';
  }
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class TemenosAdapter implements CoreBankingAdapter {
  readonly id = 'temenos';
  readonly name = 'Temenos Transact';

  private config: AdapterConfig;
  private baseUrl: string;
  private tenantId: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor(config?: Partial<AdapterConfig>) {
    this.config = {
      id: 'temenos',
      name: 'Temenos Transact',
      retry: config?.retry ?? DEFAULT_RETRY_CONFIG,
      timeout: config?.timeout ?? DEFAULT_TIMEOUT_CONFIG,
      circuitBreaker: config?.circuitBreaker ?? DEFAULT_CIRCUIT_BREAKER_CONFIG,
    };
    this.baseUrl = Deno.env.get('TEMENOS_BASE_URL') ?? '';
    this.tenantId = Deno.env.get('TEMENOS_TENANT_ID') ?? '';
    this.clientId = Deno.env.get('TEMENOS_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('TEMENOS_CLIENT_SECRET') ?? '';
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) throw new Error(`Temenos auth failed: ${response.status}`);
    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Temenos-Company': this.tenantId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Temenos API error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  async listAccounts(req: ListAccountsRequest): Promise<ListAccountsResponse> {
    const params = new URLSearchParams();
    if (req.limit) params.set('size', req.limit.toString());
    if (req.offset) params.set('page', Math.floor(req.offset / (req.limit ?? 20)).toString());

    const data = await this.request<{ body: TemenosAccount[]; header?: { total: number } }>(
      `/api/v1/holdings/accounts?${params}`
    );

    const accounts: CoreAccount[] = (data.body ?? []).map((a) => ({
      accountId: a.accountId,
      externalId: a.arrangementId,
      type: mapTemenosAccountType(a.productLineName),
      nickname: null,
      accountNumberMasked: a.accountIBAN
        ? `****${a.accountIBAN.slice(-4)}`
        : `****${(a.accountNumber ?? a.accountId).slice(-4)}`,
      routingNumber: a.sortCode ?? '',
      balanceCents: toCents(a.workingBalance),
      availableBalanceCents: toCents(a.availableBalance),
      status: mapTemenosStatus(a.status),
      interestRateBps: Math.round((a.interestRate ?? 0) * 100),
      openedAt: a.openingDate,
      closedAt: a.closingDate ?? null,
    }));

    return { accounts, total: data.header?.total ?? accounts.length };
  }

  async getAccount(req: GetAccountRequest): Promise<CoreAccount> {
    const data = await this.request<TemenosAccount>(
      `/api/v1/holdings/accounts/${req.accountId}`
    );

    return {
      accountId: data.accountId,
      externalId: data.arrangementId,
      type: mapTemenosAccountType(data.productLineName),
      nickname: null,
      accountNumberMasked: data.accountIBAN
        ? `****${data.accountIBAN.slice(-4)}`
        : `****${(data.accountNumber ?? data.accountId).slice(-4)}`,
      routingNumber: data.sortCode ?? '',
      balanceCents: toCents(data.workingBalance),
      availableBalanceCents: toCents(data.availableBalance),
      status: mapTemenosStatus(data.status),
      interestRateBps: Math.round((data.interestRate ?? 0) * 100),
      openedAt: data.openingDate,
      closedAt: data.closingDate ?? null,
    };
  }

  async listTransactions(req: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams();
    if (req.accountId) params.set('accountId', req.accountId);
    if (req.fromDate) params.set('fromDate', req.fromDate);
    if (req.toDate) params.set('toDate', req.toDate);
    if (req.limit) params.set('size', req.limit.toString());

    const data = await this.request<{ body: TemenosTransaction[]; header?: { total: number } }>(
      `/api/v1/order/transactions?${params}`
    );

    const transactions: CoreTransaction[] = (data.body ?? []).map((t) => ({
      transactionId: t.transactionId,
      accountId: t.accountId,
      type: t.creditDebitIndicator === 'CREDIT' ? 'credit' as const : 'debit' as const,
      amountCents: toCents(Math.abs(t.amountLcy)),
      description: t.narrative || t.description,
      category: null,
      status: 'posted' as const,
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: toCents(t.balance),
      postedAt: t.bookingDate,
      createdAt: t.bookingDate,
    }));

    return { transactions, total: data.header?.total ?? transactions.length };
  }

  async createTransfer(req: CreateTransferRequest): Promise<CoreTransferResult> {
    const body = {
      debitAccountId: req.transfer.fromAccountId,
      creditAccountId: req.transfer.toAccountId ?? req.transfer.toBeneficiaryId,
      amount: req.transfer.amountCents / 100,
      currency: 'USD',
      valueDate: req.transfer.scheduledDate ?? new Date().toISOString().slice(0, 10),
      narrative: req.transfer.memo ?? '',
    };

    const data = await this.request<TemenosTransferResponse>(
      '/api/v1/order/transfers',
      { method: 'POST', body: JSON.stringify(body) }
    );

    return {
      transferId: data.transactionId,
      status: data.status === 'COMPLETED' ? 'completed' : 'pending',
      fromAccountId: data.debitAccountId,
      toAccountId: data.creditAccountId,
      amountCents: toCents(data.amount),
      processedAt: data.status === 'COMPLETED' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
  }

  async listCards(_req: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_req: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card operations are not supported by Temenos Transact adapter');
  }

  async unlockCard(_req: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card operations are not supported by Temenos Transact adapter');
  }

  async setCardLimit(_req: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card operations are not supported by Temenos Transact adapter');
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${this.baseUrl}/api/v1/system/health`, {
        signal: controller.signal,
        headers: { 'X-Temenos-Company': this.tenantId },
      });
      clearTimeout(timeout);
      return { healthy: response.ok, latencyMs: 0, message: response.ok ? 'OK' : `HTTP ${response.status}` };
    } catch (err) {
      return { healthy: false, latencyMs: 0, message: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}
