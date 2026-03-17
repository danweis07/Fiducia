// TODO: Provisional integration — not yet validated in production.
/**
 * FIS Code Connect Core Banking Adapter
 *
 * Integrates with FIS Code Connect marketplace — the REST API platform
 * serving large credit unions and regional banks running FIS Horizon.
 * Uses major versioning in the URI (e.g., /v2/).
 *
 * Documentation Portal: codeconnect.fisglobal.com
 *
 * Security Requirements:
 *   - FIS enforces mutual TLS (mTLS) on all publicly available hosts.
 *     A valid client certificate from a recognized CA must be presented.
 *   - OAuth 2.0 access tokens must be cached for at least 20 minutes.
 *
 * Configuration:
 *   FIS_BASE_URL          — API gateway base URL (e.g., https://api-gw-uat.fisglobal.com)
 *   FIS_CLIENT_ID         — OAuth 2.0 client ID
 *   FIS_CLIENT_SECRET     — OAuth 2.0 client secret
 *   FIS_TOKEN_URL         — OAuth 2.0 token endpoint
 *   FIS_CLIENT_CERT       — PEM-encoded client certificate for mTLS
 *   FIS_CLIENT_KEY        — PEM-encoded client private key for mTLS
 *   FIS_INSTITUTION_ID    — FIS institution/routing identifier
 *   INSTITUTION_ROUTING_NUMBER — Routing/ABA number for the institution
 *
 * UAT Environment:
 *   Host URL: https://api-gw-uat.fisglobal.com/rest/horizon/authorization/v2
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
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
// FIS CODE CONNECT API RESPONSE TYPES
// =============================================================================

interface FISAccount {
  accountNumber: string;
  accountType: string;
  accountDescription: string;
  accountStatus: string;
  currentBalance: number;
  availableBalance: number;
  interestRate: number;
  openDate: string;
  closeDate: string | null;
  nickname: string | null;
}

interface FISAccountsResponse {
  accounts: FISAccount[];
  totalCount: number;
}

interface FISTransaction {
  transactionId: string;
  accountNumber: string;
  transactionType: string;
  transactionCode: string;
  amount: number;
  description: string;
  merchantName: string | null;
  merchantCategoryCode: string | null;
  status: string;
  runningBalance: number | null;
  postDate: string | null;
  effectiveDate: string;
}

interface FISTransactionsResponse {
  transactions: FISTransaction[];
  totalCount: number;
}

interface FISTransferResponse {
  transferId: string;
  status: string;
  fromAccount: string;
  toAccount: string | null;
  amount: number;
  processedDate: string | null;
  createdDate: string;
}

interface FISOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// =============================================================================
// OAUTH 2.0 TOKEN CACHE
// =============================================================================

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

/** Module-level token cache — persists across requests within the same edge function instance */
let tokenCache: CachedToken | null = null;

/** Minimum cache duration per FIS requirement (20 minutes in ms) */
const MIN_CACHE_DURATION_MS = 20 * 60 * 1000;

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

function mapAccountType(fisType: string): CoreAccountType {
  const lower = fisType.toLowerCase();
  if (lower.includes('checking') || lower.includes('dda') || lower.includes('demand')) return 'checking';
  if (lower.includes('money market') || lower.includes('mmda') || lower.includes('mm')) return 'money_market';
  if (lower.includes('cd') || lower.includes('certificate') || lower.includes('time')) return 'cd';
  return 'savings';
}

function mapAccountStatus(fisStatus: string): 'active' | 'frozen' | 'closed' | 'pending' {
  const lower = fisStatus.toLowerCase();
  if (lower.includes('closed') || lower.includes('inactive')) return 'closed';
  if (lower.includes('frozen') || lower.includes('restricted') || lower.includes('hold')) return 'frozen';
  if (lower.includes('pending')) return 'pending';
  return 'active';
}

function mapTransactionType(tx: FISTransaction): CoreTransactionType {
  const lower = tx.transactionType.toLowerCase();
  const descLower = tx.description.toLowerCase();

  if (lower.includes('transfer') || descLower.includes('transfer')) return 'transfer';
  if (lower.includes('deposit') || descLower.includes('deposit')) return 'deposit';
  if (lower.includes('withdrawal') || descLower.includes('withdrawal')) return 'withdrawal';
  if (lower.includes('fee') || descLower.includes('fee') || descLower.includes('charge')) return 'fee';
  if (lower.includes('interest') || descLower.includes('interest') || descLower.includes('dividend')) return 'interest';
  if (descLower.includes('rdc') || descLower.includes('remote deposit')) return 'rdc_deposit';
  if (descLower.includes('bill pay') || descLower.includes('billpay')) return 'bill_payment';

  // Fall back to debit/credit based on amount sign
  return tx.amount < 0 ? 'debit' : 'credit';
}

function mapTransactionStatus(fisStatus: string): 'pending' | 'posted' | 'declined' | 'reversed' {
  const lower = fisStatus.toLowerCase();
  if (lower.includes('posted') || lower.includes('settled') || lower.includes('completed')) return 'posted';
  if (lower.includes('declined') || lower.includes('rejected')) return 'declined';
  if (lower.includes('reversed') || lower.includes('returned')) return 'reversed';
  return 'pending';
}

/**
 * Convert dollar amount to integer cents.
 * FIS Code Connect returns monetary values as dollar floats.
 */
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FISCoreBankingAdapter implements CoreBankingAdapter {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenUrl: string;
  private readonly clientCert: string;
  private readonly clientKey: string;
  private readonly institutionId: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'fis',
    name: 'FIS Code Connect Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('FIS_BASE_URL') ?? '';
    this.clientId = Deno.env.get('FIS_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('FIS_CLIENT_SECRET') ?? '';
    this.tokenUrl = Deno.env.get('FIS_TOKEN_URL') ?? '';
    this.clientCert = Deno.env.get('FIS_CLIENT_CERT') ?? '';
    this.clientKey = Deno.env.get('FIS_CLIENT_KEY') ?? '';
    this.institutionId = Deno.env.get('FIS_INSTITUTION_ID') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.clientId || !this.clientSecret;
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 token management
  // ---------------------------------------------------------------------------

  /**
   * Obtain an OAuth 2.0 access token, using the cached value when available.
   * FIS requires tokens be cached for at least 20 minutes.
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 60s safety margin)
    if (tokenCache && tokenCache.expiresAt > now + 60_000) {
      return tokenCache.accessToken;
    }

    const tokenEndpoint = this.tokenUrl || `${this.baseUrl}/oauth2/token`;

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    };

    // Attach mTLS client certificate if available
    if (this.clientCert && this.clientKey) {
      // Deno supports TLS client certs via Deno.createHttpClient
      const httpClient = Deno.createHttpClient({
        certChain: this.clientCert,
        privateKey: this.clientKey,
      });
      (fetchOptions as Record<string, unknown>).client = httpClient;
    }

    const res = await fetch(tokenEndpoint, fetchOptions);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`FIS OAuth token request failed (${res.status}): ${errBody}`);
    }

    const tokenData: FISOAuthTokenResponse = await res.json();

    // Cache with at least 20 minutes or the server-specified expiry
    const cacheDurationMs = Math.max(
      tokenData.expires_in * 1000,
      MIN_CACHE_DURATION_MS,
    );

    tokenCache = {
      accessToken: tokenData.access_token,
      expiresAt: now + cacheDurationMs,
    };

    return tokenCache.accessToken;
  }

  // ---------------------------------------------------------------------------
  // HTTP client with mTLS + OAuth bearer token
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    if (this.sandbox) {
      throw new Error('FIS adapter in sandbox mode — credentials not configured');
    }

    const accessToken = await this.getAccessToken();
    const url = `${this.baseUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-FIS-Institution-Id': this.institutionId,
      ...options?.headers,
    };

    const fetchOptions: RequestInit = {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    };

    // Attach mTLS client certificate if available
    if (this.clientCert && this.clientKey) {
      const httpClient = Deno.createHttpClient({
        certChain: this.clientCert,
        privateKey: this.clientKey,
      });
      (fetchOptions as Record<string, unknown>).client = httpClient;
    }

    const res = await fetch(url, fetchOptions);

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`FIS Code Connect API error (${res.status}): ${errBody}`);
    }

    if (res.status === 204) return undefined as T;

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
      // Verify connectivity by requesting a fresh OAuth token
      await this.getAccessToken();
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

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    const response = await this.request<FISAccountsResponse>(
      'GET',
      `/rest/horizon/accounts/v2/customers/${request.userId}/accounts?limit=${limit}&offset=${offset}`,
    );

    const accounts: CoreAccount[] = (response.accounts ?? []).map(a => ({
      accountId: a.accountNumber,
      externalId: a.accountNumber,
      type: mapAccountType(a.accountType),
      nickname: a.nickname || a.accountDescription || null,
      accountNumberMasked: maskAccountNumber(a.accountNumber),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(a.currentBalance),
      availableBalanceCents: dollarsToCents(a.availableBalance),
      status: mapAccountStatus(a.accountStatus),
      interestRateBps: Math.round(a.interestRate * 10000),
      openedAt: a.openDate || new Date().toISOString(),
      closedAt: a.closeDate || null,
    }));

    return {
      accounts,
      total: response.totalCount ?? accounts.length,
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

    const response = await this.request<FISAccount>(
      'GET',
      `/rest/horizon/accounts/v2/accounts/${request.accountId}`,
    );

    return {
      accountId: response.accountNumber,
      externalId: response.accountNumber,
      type: mapAccountType(response.accountType),
      nickname: response.nickname || response.accountDescription || null,
      accountNumberMasked: maskAccountNumber(response.accountNumber),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(response.currentBalance),
      availableBalanceCents: dollarsToCents(response.availableBalance),
      status: mapAccountStatus(response.accountStatus),
      interestRateBps: Math.round(response.interestRate * 10000),
      openedAt: response.openDate || new Date().toISOString(),
      closedAt: response.closeDate || null,
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

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Build query parameters
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    if (request.fromDate) params.set('fromDate', request.fromDate);
    if (request.toDate) params.set('toDate', request.toDate);

    const response = await this.request<FISTransactionsResponse>(
      'GET',
      `/rest/horizon/transactions/v2/accounts/${accountId}/transactions?${params.toString()}`,
    );

    let transactions: CoreTransaction[] = (response.transactions ?? []).map(t => ({
      transactionId: t.transactionId,
      accountId,
      type: mapTransactionType(t),
      amountCents: dollarsToCents(Math.abs(t.amount)),
      description: t.description || 'Transaction',
      category: null,
      status: mapTransactionStatus(t.status),
      merchantName: t.merchantName || null,
      merchantCategory: t.merchantCategoryCode || null,
      runningBalanceCents: t.runningBalance != null ? dollarsToCents(t.runningBalance) : null,
      postedAt: t.postDate || null,
      createdAt: t.effectiveDate || new Date().toISOString(),
    }));

    // Apply client-side filters not handled by API params
    if (request.type) {
      transactions = transactions.filter(t => t.type === request.type);
    }
    if (request.status) {
      transactions = transactions.filter(t => t.status === request.status);
    }
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(searchLower) ||
        (t.merchantName && t.merchantName.toLowerCase().includes(searchLower))
      );
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

    const response = await this.request<FISTransferResponse>(
      'POST',
      '/rest/horizon/transfers/v2/transfers',
      {
        body: {
          fromAccountNumber: transfer.fromAccountId,
          toAccountNumber: transfer.toAccountId ?? undefined,
          toBeneficiaryId: transfer.toBeneficiaryId ?? undefined,
          transferType: transfer.type,
          amount: transfer.amountCents / 100, // FIS expects dollars
          memo: transfer.memo ?? undefined,
          scheduledDate: transfer.scheduledDate ?? undefined,
          institutionId: this.institutionId,
        },
      },
    );

    return {
      transferId: response.transferId,
      status: response.status === 'completed' ? 'completed'
        : response.status === 'failed' ? 'failed'
          : response.status === 'processing' ? 'processing'
            : 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: response.processedDate || null,
      createdAt: response.createdDate || new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — FIS card operations use a separate card domain adapter
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FIS core banking adapter — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FIS core banking adapter — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by FIS core banking adapter — use card domain adapter');
  }
}
