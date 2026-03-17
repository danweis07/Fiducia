// TODO: Provisional integration — not yet validated in production.
/**
 * FLEX Credit Union Technology Core Banking Adapter
 *
 * Integrates with FLEX's FLEXBridge RESTful API — a modern open API platform
 * serving 270+ credit unions across the United States. FLEXBridge provides
 * real-time access to core account data and transaction processing.
 *
 * FLEXBridge uses RESTful JSON over HTTPS with API key authentication:
 *   - API key + institution credentials in HTTPS request headers
 *   - All requests authenticated via custom headers per FLEXBridge spec
 *   - Real-time data synchronization with the FLEX core
 *
 * API endpoints:
 *   - GET  /api/members/{id}/accounts — List member share/loan accounts
 *   - GET  /api/accounts/{id} — Single account details
 *   - GET  /api/accounts/{id}/transactions — Transaction history
 *   - POST /api/transfers — Create fund transfer
 *   - POST /api/atm/{account}/{txType}/modify — ATM-style transactions
 *
 * Configuration:
 *   FLEX_API_KEY — FLEXBridge API key
 *   FLEX_BASE_URL — API base URL (e.g., https://flexbridge.flexcutech.com/api)
 *   FLEX_INSTITUTION_ID — FLEX institution identifier
 *   INSTITUTION_ROUTING_NUMBER — Institution ABA routing number
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
  CoreTransactionType,
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
// FLEX API RESPONSE TYPES
// =============================================================================

interface FLEXAccount {
  accountId: string;
  accountNumber: string;
  suffix: string;
  productType: string;
  productDescription: string;
  status: string;
  currentBalance: number;
  availableBalance: number;
  interestRate: number;
  openDate: string;
  closeDate: string | null;
}

interface FLEXTransaction {
  transactionId: string;
  accountId: string;
  type: string;
  amount: number;
  description: string;
  category: string | null;
  status: string;
  merchantName: string | null;
  runningBalance: number | null;
  postDate: string;
  effectiveDate: string;
}

interface FLEXTransferResponse {
  transferId: string;
  status: string;
  processedDate: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Map FLEX product types to canonical account types.
 * FLEX uses share suffixes: S = savings/share, D = draft/checking,
 * MM = money market, CD = certificate of deposit, L = loan.
 */
function mapFLEXAccountType(productType: string, description: string): CoreAccountType {
  const pt = (productType || '').toUpperCase();
  const desc = (description || '').toLowerCase();

  if (pt === 'D' || pt === 'DRAFT' || desc.includes('checking') || desc.includes('draft')) return 'checking';
  if (pt === 'MM' || desc.includes('money market')) return 'money_market';
  if (pt === 'CD' || pt === 'CERT' || desc.includes('certificate')) return 'cd';
  return 'savings';
}

function mapFLEXAccountStatus(status: string): CoreAccountStatus {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE' || s === 'OPEN' || s === 'A') return 'active';
  if (s === 'FROZEN' || s === 'RESTRICTED' || s === 'F') return 'frozen';
  if (s === 'CLOSED' || s === 'C') return 'closed';
  if (s === 'PENDING' || s === 'P') return 'pending';
  return 'active';
}

function mapFLEXTransactionType(type: string, amount: number): CoreTransactionType {
  const t = (type || '').toLowerCase();
  if (t.includes('transfer') || t === 'xfr') return 'transfer';
  if (t.includes('deposit') || t === 'dep') return 'deposit';
  if (t.includes('withdrawal') || t === 'wdl') return 'withdrawal';
  if (t.includes('fee') || t.includes('charge') || t === 'fee') return 'fee';
  if (t.includes('interest') || t.includes('dividend') || t === 'div') return 'interest';
  if (t.includes('rdc') || t.includes('remote deposit')) return 'rdc_deposit';
  if (t.includes('bill pay') || t.includes('billpay') || t === 'bp') return 'bill_payment';
  return amount < 0 ? 'debit' : 'credit';
}

function mapFLEXTransactionStatus(status: string): 'pending' | 'posted' | 'declined' | 'reversed' {
  const s = (status || '').toLowerCase();
  if (s === 'posted' || s === 'p' || s === 'cleared') return 'posted';
  if (s === 'pending' || s === 'hold' || s === 'h') return 'pending';
  if (s === 'reversed' || s === 'void' || s === 'v') return 'reversed';
  if (s === 'declined' || s === 'denied') return 'declined';
  return 'posted';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FLEXCoreBankingAdapter implements CoreBankingAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly institutionId: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'flex',
    name: 'FLEX FLEXBridge Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('FLEX_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('FLEX_BASE_URL') ?? '';
    this.institutionId = Deno.env.get('FLEX_INSTITUTION_ID') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.apiKey || !this.baseUrl;
  }

  // ---------------------------------------------------------------------------
  // HTTP client
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('FLEX adapter in sandbox mode — credentials not configured');
    }

    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-FLEX-Institution-Id': this.institutionId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`FLEXBridge API error (${res.status}): ${errBody.slice(0, 500)}`);
    }

    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

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
      await this.request('GET', '/health');
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

  // ---------------------------------------------------------------------------
  // List accounts
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const response = await this.request<{ accounts: FLEXAccount[]; totalCount: number }>(
      'GET',
      `/members/${encodeURIComponent(request.userId)}/accounts`,
    );

    const accounts: CoreAccount[] = (response.accounts ?? []).map(fa => ({
      accountId: fa.accountId,
      externalId: `${fa.accountNumber}-${fa.suffix}`,
      type: mapFLEXAccountType(fa.productType, fa.productDescription),
      nickname: fa.productDescription || null,
      accountNumberMasked: maskAccountNumber(fa.accountNumber),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(fa.currentBalance),
      availableBalanceCents: dollarsToCents(fa.availableBalance),
      status: mapFLEXAccountStatus(fa.status),
      interestRateBps: Math.round(fa.interestRate * 100),
      openedAt: fa.openDate,
      closedAt: fa.closeDate ?? null,
    }));

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Get single account
  // ---------------------------------------------------------------------------

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    const fa = await this.request<FLEXAccount>(
      'GET',
      `/accounts/${encodeURIComponent(request.accountId)}`,
    );

    return {
      accountId: fa.accountId,
      externalId: `${fa.accountNumber}-${fa.suffix}`,
      type: mapFLEXAccountType(fa.productType, fa.productDescription),
      nickname: fa.productDescription || null,
      accountNumberMasked: maskAccountNumber(fa.accountNumber),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(fa.currentBalance),
      availableBalanceCents: dollarsToCents(fa.availableBalance),
      status: mapFLEXAccountStatus(fa.status),
      interestRateBps: Math.round(fa.interestRate * 100),
      openedAt: fa.openDate,
      closedAt: fa.closeDate ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // List transactions
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    const accountId = request.accountId;
    if (!accountId) {
      return { transactions: [], total: 0 };
    }

    // Build query params
    const params = new URLSearchParams();
    if (request.fromDate) params.set('fromDate', request.fromDate);
    if (request.toDate) params.set('toDate', request.toDate);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.offset) params.set('offset', String(request.offset));

    const qs = params.toString();
    const path = `/accounts/${encodeURIComponent(accountId)}/transactions${qs ? `?${qs}` : ''}`;

    const response = await this.request<{ transactions: FLEXTransaction[]; totalCount: number }>(
      'GET',
      path,
    );

    let transactions: CoreTransaction[] = (response.transactions ?? []).map(t => ({
      transactionId: t.transactionId,
      accountId,
      type: mapFLEXTransactionType(t.type, t.amount),
      amountCents: dollarsToCents(Math.abs(t.amount)),
      description: t.description,
      category: t.category ?? null,
      status: mapFLEXTransactionStatus(t.status),
      merchantName: t.merchantName ?? null,
      merchantCategory: null,
      runningBalanceCents: t.runningBalance != null ? dollarsToCents(t.runningBalance) : null,
      postedAt: t.postDate,
      createdAt: t.effectiveDate,
    }));

    // Apply client-side filters
    if (request.type) transactions = transactions.filter(t => t.type === request.type);
    if (request.status) transactions = transactions.filter(t => t.status === request.status);
    if (request.search) {
      const q = request.search.toLowerCase();
      transactions = transactions.filter(t => t.description.toLowerCase().includes(q));
    }

    return {
      transactions,
      total: response.totalCount ?? transactions.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Create transfer
  // ---------------------------------------------------------------------------

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const { transfer } = request;

    const response = await this.request<FLEXTransferResponse>(
      'POST',
      '/transfers',
      {
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        toBeneficiaryId: transfer.toBeneficiaryId,
        type: transfer.type,
        amount: transfer.amountCents / 100,
        memo: transfer.memo,
        scheduledDate: transfer.scheduledDate,
      },
    );

    return {
      transferId: response.transferId,
      status: response.status === 'completed' ? 'completed' : 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: response.processedDate ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — not available through FLEXBridge core
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FLEXBridge — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FLEXBridge — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FLEXBridge — use card domain adapter');
  }
}
