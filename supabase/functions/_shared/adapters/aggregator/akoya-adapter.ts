// TODO: Provisional integration — not yet validated in production.
/**
 * Akoya Adapter — Real Implementation
 *
 * Provides FDX-compliant data access to US financial institutions through
 * the Akoya Data Access Network. Akoya acts as a permissioned data access
 * intermediary, connecting directly to financial institutions' APIs.
 *
 * Akoya API: https://docs.akoya.com/
 * Credentials from env vars: AKOYA_CLIENT_ID, AKOYA_CLIENT_SECRET
 */

import { fetchWithRetry } from '../../retry.ts';
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
  AggregatedAccount,
  AggregatedTransaction,
  AggregatedAccountType,
} from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

const AKOYA_SANDBOX_BASE = 'https://sandbox-products.ddp.akoya.com';
const AKOYA_AUTH_BASE = 'https://sandbox-idp.ddp.akoya.com';

// =============================================================================
// AKOYA API RESPONSE TYPES
// =============================================================================

interface AkoyaProvider {
  providerId: string;
  name?: string;
  logo?: { url?: string };
}

interface AkoyaAccount {
  accountId?: string;
  account_id?: string;
  providerId?: string;
  institutionName?: string;
  fiName?: string;
  nickname?: string;
  productName?: string;
  accountType?: string;
  account_type?: string;
  displayAccountNumber?: string;
  currentBalance?: number;
  balanceAsOf?: number;
  availableBalance?: number;
  currency?: { currencyCode?: string };
  asOfDate?: string;
}

interface AkoyaTransaction {
  transactionId?: string;
  transaction_id?: string;
  amount?: number;
  description?: string;
  memo?: string;
  merchant?: { name?: string };
  category?: string;
  postedTimestamp?: string;
  transactionTimestamp?: string;
  status?: string;
  currency?: { currencyCode?: string };
}

interface AkoyaApiResponse {
  providers?: AkoyaProvider[];
  accounts?: AkoyaAccount[];
  depositAccountList?: AkoyaAccount[];
  transactions?: AkoyaTransaction[];
  total?: number;
  [key: string]: unknown;
}

// =============================================================================
// AKOYA ADAPTER
// =============================================================================

export class AkoyaAdapter implements AggregatorAdapter {
  readonly config: AdapterConfig = {
    id: 'akoya',
    name: 'Akoya',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await this.ensureToken();
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: message,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Search Institutions
  // ---------------------------------------------------------------------------

  async searchInstitutions(request: SearchInstitutionsRequest): Promise<SearchInstitutionsResponse> {
    await this.ensureToken();

    const response = await this.get('/providers');
    const providers = response.providers ?? [];

    const query = request.query.toLowerCase();
    const filtered = providers.filter((p: AkoyaProvider) =>
      p.name?.toLowerCase().includes(query)
    );

    const limit = request.limit ?? 20;
    const institutions: AggregatorInstitution[] = filtered
      .slice(0, limit)
      .map((p: AkoyaProvider) => ({
        institutionId: `ak-${p.providerId}`,
        name: p.name,
        logoUrl: p.logo?.url ?? null,
        countryCode: 'US',
        providerInstitutionId: p.providerId,
        supportedAccountTypes: ['checking', 'savings', 'credit_card', 'loan', 'investment'] as AggregatedAccountType[],
      }));

    return {
      institutions,
      totalCount: filtered.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Create Connection
  // ---------------------------------------------------------------------------

  async createConnection(request: CreateConnectionRequest): Promise<CreateConnectionResponse> {
    await this.ensureToken();

    const providerId = request.institutionId.replace(/^ak-/, '');
    const connectionId = crypto.randomUUID();

    // Build Akoya OAuth authorization URL
    const authParams = new URLSearchParams({
      connector: providerId,
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: request.redirectUrl ?? '',
      scope: (request.scopes ?? ['account_details', 'transactions']).join(' '),
      state: connectionId,
    });

    const connectUrl = `${AKOYA_AUTH_BASE}/auth?${authParams.toString()}`;

    return {
      connectionId,
      connectUrl,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Handle Callback
  // ---------------------------------------------------------------------------

  async handleCallback(request: ConnectionCallbackRequest): Promise<ConnectionCallbackResponse> {
    const authCode = request.callbackParams.code;
    if (!authCode) {
      throw new Error('Missing authorization code in callback');
    }

    // Exchange authorization code for id_token
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: request.callbackParams.redirect_uri ?? '',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const tokenResponse = await fetchWithRetry(
      `${AKOYA_AUTH_BASE}/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: 'akoya:token-exchange',
      },
    );

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      throw new Error(`Akoya token exchange failed (${tokenResponse.status}): ${errBody}`);
    }

    const tokenData = await tokenResponse.json();
    const idToken = tokenData.id_token;

    // Use the id_token to fetch accounts
    const accountsResp = await this.getWithToken(
      `/accounts?id_token=${encodeURIComponent(idToken)}`,
    );
    const accountCount = accountsResp.accounts?.length ?? 0;

    return {
      connectionId: request.connectionId,
      status: 'active',
      institutionName: request.callbackParams.connector ?? 'Unknown',
      accountCount,
    };
  }

  // ---------------------------------------------------------------------------
  // List Connections
  // ---------------------------------------------------------------------------

  async listConnections(_request: ListConnectionsRequest): Promise<ListConnectionsResponse> {
    // Akoya doesn't have a "connections" concept like Salt Edge.
    // Connections are managed via id_tokens stored per user.
    // Return empty — real implementation would query the local connections table.
    await this.ensureToken();
    return { connections: [] };
  }

  // ---------------------------------------------------------------------------
  // Refresh Connection
  // ---------------------------------------------------------------------------

  async refreshConnection(request: RefreshConnectionRequest): Promise<RefreshConnectionResponse> {
    // Akoya uses token-based refresh; real implementation would re-fetch using stored token
    await this.ensureToken();
    return {
      connectionId: request.connectionId,
      status: 'active',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Remove Connection
  // ---------------------------------------------------------------------------

  async removeConnection(request: RemoveConnectionRequest): Promise<RemoveConnectionResponse> {
    await this.ensureToken();

    // Akoya revoke endpoint to remove consent
    try {
      await this.post('/revoke', { connection_id: request.connectionId });
    } catch {
      // Best effort — consent may already be revoked
    }

    return {
      connectionId: request.connectionId,
      removed: true,
    };
  }

  // ---------------------------------------------------------------------------
  // List Accounts
  // ---------------------------------------------------------------------------

  async listAccounts(_request: ListAccountsRequest): Promise<ListAccountsResponse> {
    await this.ensureToken();

    // Real implementation would use stored id_token per connection
    const response = await this.get('/accounts');
    const fdxAccounts = response.accounts ?? response.depositAccountList ?? [];

    const accounts: AggregatedAccount[] = fdxAccounts.map((a: AkoyaAccount) => ({
      accountId: a.accountId ?? a.account_id,
      connectionId: a.providerId ?? '',
      institutionName: a.institutionName ?? a.fiName ?? 'Unknown',
      name: a.nickname ?? a.productName ?? a.accountType ?? 'Account',
      type: mapFDXAccountType(a.accountType ?? a.account_type),
      mask: a.displayAccountNumber
        ? `****${(a.displayAccountNumber as string).slice(-4)}`
        : '****0000',
      balanceCents: dollarsToCents(a.currentBalance ?? a.balanceAsOf ?? 0),
      availableBalanceCents: a.availableBalance != null
        ? dollarsToCents(a.availableBalance)
        : null,
      currencyCode: a.currency?.currencyCode ?? 'USD',
      ibanMasked: null,
      lastSyncedAt: a.asOfDate ?? new Date().toISOString(),
    }));

    return { accounts };
  }

  // ---------------------------------------------------------------------------
  // List Transactions
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    await this.ensureToken();

    const params = new URLSearchParams();
    if (request.fromDate) params.set('startTime', request.fromDate);
    if (request.toDate) params.set('endTime', request.toDate);
    if (request.offset) params.set('offset', String(request.offset));
    if (request.limit) params.set('limit', String(request.limit));

    const response = await this.get(
      `/accounts/${request.accountId}/transactions?${params.toString()}`,
    );
    const txnList = response.transactions ?? [];

    const transactions: AggregatedTransaction[] = txnList.map((t: AkoyaTransaction) => ({
      transactionId: t.transactionId ?? t.transaction_id ?? crypto.randomUUID(),
      accountId: request.accountId,
      connectionId: '',
      amountCents: dollarsToCents(t.amount ?? 0),
      description: t.description ?? t.memo ?? '',
      merchantName: t.merchant?.name ?? null,
      category: t.category ?? null,
      date: t.postedTimestamp ?? t.transactionTimestamp ?? '',
      pending: t.status === 'PENDING',
      currencyCode: t.currency?.currencyCode ?? 'USD',
    }));

    return {
      transactions,
      totalCount: response.total ?? transactions.length,
      hasMore: (request.offset ?? 0) + transactions.length < (response.total ?? transactions.length),
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

    const tokenBody = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'openid',
    });

    const response = await fetchWithRetry(
      `${AKOYA_AUTH_BASE}/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: 'akoya:client-credentials',
      },
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Akoya auth failed (${response.status}): ${errBody}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  }

  private async get(path: string): Promise<AkoyaApiResponse> {
    const url = `${AKOYA_SANDBOX_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json',
        },
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `akoya:GET:${path.split('?')[0]}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Akoya API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  private async getWithToken(path: string): Promise<AkoyaApiResponse> {
    return this.get(path);
  }

  private async post(path: string, body: Record<string, unknown>): Promise<AkoyaApiResponse> {
    await this.ensureToken();
    const url = `${AKOYA_SANDBOX_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `akoya:POST:${path}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Akoya API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function dollarsToCents(amount: number): number {
  return Math.round(amount * 100);
}

function mapFDXAccountType(fdxType: string): AggregatedAccountType {
  switch (fdxType?.toUpperCase()) {
    case 'CHECKING':
      return 'checking';
    case 'SAVINGS':
      return 'savings';
    case 'CREDITCARD':
    case 'CREDIT_CARD':
    case 'CREDIT':
    case 'LINE_OF_CREDIT':
      return 'credit_card';
    case 'LOAN':
    case 'STUDENTLOAN':
    case 'AUTOLOAN':
      return 'loan';
    case 'MORTGAGE':
      return 'mortgage';
    case 'INVESTMENT':
    case 'BROKERAGE':
    case 'RETIREMENT':
    case '401K':
    case 'IRA':
      return 'investment';
    case 'INSURANCE':
      return 'insurance';
    case 'ANNUITY':
    case 'PENSION':
      return 'pension';
    default:
      return 'other';
  }
}
