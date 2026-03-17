// TODO: Provisional integration — not yet validated in production.
/**
 * Salt Edge Adapter — Real Implementation
 *
 * Provides access to 2,500+ EU banks through Salt Edge's Account Information
 * API without needing a separate PSD2 license.
 *
 * Salt Edge API v5: https://docs.saltedge.com/account_information/v5/
 * Credentials from env vars: SALT_EDGE_APP_ID, SALT_EDGE_SECRET
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
  Connection,
  AggregatedAccount,
  AggregatedTransaction,
  AggregatedAccountType,
} from './types.ts';

// =============================================================================
// SALT EDGE API RESPONSE TYPES
// =============================================================================

interface SaltEdgeProvider {
  code: string;
  name?: string;
  logo_url?: string;
  country_code?: string;
  supported_account_types?: string[];
}

interface SaltEdgeConnection {
  id: string;
  provider_code: string;
  provider_name?: string;
  country_code?: string;
  status: string;
  last_consent_id?: string;
  updated_at?: string;
  created_at?: string;
}

interface SaltEdgeAccount {
  id: string;
  connection_id: string;
  name: string;
  nature: string;
  balance?: number;
  currency_code?: string;
  updated_at?: string;
  extra?: {
    provider_name?: string;
    iban?: string;
    sort_code?: string;
    available_amount?: number;
  };
}

interface SaltEdgeTransaction {
  id: string;
  account_id: string;
  amount?: number;
  description?: string;
  category?: string;
  made_on?: string;
  created_at?: string;
  status?: string;
  currency_code?: string;
  extra?: {
    connection_id?: string;
    merchant_name?: string;
  };
}

interface SaltEdgeSession {
  id?: string;
  connect_url?: string;
  expires_at?: string;
}

interface SaltEdgeApiResponse<T = unknown> {
  data: T;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SALT_EDGE_BASE = 'https://www.saltedge.com/api/v5';

// =============================================================================
// SALT EDGE ADAPTER
// =============================================================================

export class SaltEdgeAdapter implements AggregatorAdapter {
  readonly config: AdapterConfig = {
    id: 'salt_edge',
    name: 'Salt Edge',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private appId: string;
  private secret: string;

  constructor(appId: string, secret: string) {
    this.appId = appId;
    this.secret = secret;
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${SALT_EDGE_BASE}/countries`, {
        method: 'GET',
        headers: this.headers(),
      });

      return {
        adapterId: this.config.id,
        healthy: response.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
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
    const params = new URLSearchParams({
      ...(request.countryCode ? { country_code: request.countryCode } : {}),
    });

    const response: SaltEdgeApiResponse<SaltEdgeProvider[]> = await this.get(`/providers?${params.toString()}`);
    const providers = response.data ?? [];

    // Filter by query string on provider name
    const query = request.query.toLowerCase();
    const filtered = providers.filter((p: SaltEdgeProvider) =>
      p.name?.toLowerCase().includes(query)
    );

    const limit = request.limit ?? 20;
    const institutions: AggregatorInstitution[] = filtered
      .slice(0, limit)
      .map((p: SaltEdgeProvider) => ({
        institutionId: `se-${p.code}`,
        name: p.name,
        logoUrl: p.logo_url ?? null,
        countryCode: p.country_code ?? '',
        providerInstitutionId: p.code,
        supportedAccountTypes: mapSaltEdgeAccountModes(p.supported_account_types ?? []),
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
    const body = {
      data: {
        customer_id: `${request.tenantId}:${request.userId}`,
        provider_code: request.institutionId.replace(/^se-/, ''),
        return_to: request.redirectUrl ?? '',
        consent: {
          scopes: request.scopes ?? ['account_details', 'transactions_details'],
        },
      },
    };

    const response: SaltEdgeApiResponse<SaltEdgeSession> = await this.post('/connect_sessions/create', body);
    const session = response.data;

    return {
      connectionId: session.id ?? session.connect_url?.split('/')?.pop() ?? crypto.randomUUID(),
      connectUrl: session.connect_url,
      expiresAt: session.expires_at ?? new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Handle Callback
  // ---------------------------------------------------------------------------

  async handleCallback(request: ConnectionCallbackRequest): Promise<ConnectionCallbackResponse> {
    // Salt Edge sends the connection_id in the callback params
    const seConnectionId = request.callbackParams.connection_id ?? request.connectionId;

    const response = await this.get(`/connections/${seConnectionId}`) as SaltEdgeApiResponse<SaltEdgeConnection>;
    const conn = response.data;

    // Fetch accounts to get the count
    const accountsResp = await this.get(`/accounts?connection_id=${seConnectionId}`) as SaltEdgeApiResponse<SaltEdgeAccount[]>;
    const accountCount = accountsResp.data?.length ?? 0;

    return {
      connectionId: request.connectionId,
      status: mapSaltEdgeStatus(conn.status),
      institutionName: conn.provider_name ?? 'Unknown',
      accountCount,
    };
  }

  // ---------------------------------------------------------------------------
  // List Connections
  // ---------------------------------------------------------------------------

  async listConnections(request: ListConnectionsRequest): Promise<ListConnectionsResponse> {
    const customerId = `${request.tenantId}:${request.userId}`;
    const response = await this.get(`/connections?customer_id=${encodeURIComponent(customerId)}`) as SaltEdgeApiResponse<SaltEdgeConnection[]>;

    const connections: Connection[] = ((response as SaltEdgeApiResponse<SaltEdgeConnection[]>).data ?? []).map((c: SaltEdgeConnection) => ({
      connectionId: c.id,
      institutionId: `se-${c.provider_code}`,
      institutionName: c.provider_name ?? c.provider_code,
      institutionLogo: null,
      countryCode: c.country_code ?? '',
      status: mapSaltEdgeStatus(c.status),
      consentStatus: mapSaltEdgeConsentStatus(c.last_consent_id ? 'active' : 'pending'),
      consentExpiresAt: null,
      accountCount: 0,
      lastSyncedAt: c.updated_at ?? null,
      createdAt: c.created_at ?? new Date().toISOString(),
      provider: 'salt_edge' as const,
    }));

    return { connections };
  }

  // ---------------------------------------------------------------------------
  // Refresh Connection
  // ---------------------------------------------------------------------------

  async refreshConnection(request: RefreshConnectionRequest): Promise<RefreshConnectionResponse> {
    const body = { data: { connection_id: request.connectionId } };
    await this.post('/connections/refresh', body);

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
    await this.delete(`/connections/${request.connectionId}`);

    return {
      connectionId: request.connectionId,
      removed: true,
    };
  }

  // ---------------------------------------------------------------------------
  // List Accounts
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    const params = request.connectionId
      ? `?connection_id=${request.connectionId}`
      : '';

    const response = await this.get(`/accounts${params}`) as SaltEdgeApiResponse<SaltEdgeAccount[]>;

    const accounts: AggregatedAccount[] = ((response as SaltEdgeApiResponse<SaltEdgeAccount[]>).data ?? []).map((a: SaltEdgeAccount) => ({
      accountId: a.id,
      connectionId: a.connection_id,
      institutionName: a.extra?.provider_name ?? 'Unknown',
      name: a.name,
      type: mapSaltEdgeAccountType(a.nature),
      mask: a.extra?.iban
        ? `****${(a.extra.iban as string).slice(-4)}`
        : a.extra?.sort_code
          ? `****${(a.extra.sort_code as string).slice(-4)}`
          : '****0000',
      balanceCents: dollarsToCents(a.balance ?? 0),
      availableBalanceCents: a.extra?.available_amount != null
        ? dollarsToCents(a.extra.available_amount)
        : null,
      currencyCode: a.currency_code ?? 'EUR',
      ibanMasked: a.extra?.iban
        ? maskIBAN(a.extra.iban)
        : null,
      lastSyncedAt: a.updated_at ?? new Date().toISOString(),
    }));

    return { accounts };
  }

  // ---------------------------------------------------------------------------
  // List Transactions
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const params = new URLSearchParams({
      account_id: request.accountId,
      ...(request.fromDate ? { from_date: request.fromDate } : {}),
      ...(request.toDate ? { to_date: request.toDate } : {}),
    });

    const response: SaltEdgeApiResponse<SaltEdgeTransaction[]> = await this.get(`/transactions?${params.toString()}`);
    const allTxns = response.data ?? [];

    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50;
    const sliced = allTxns.slice(offset, offset + limit);

    const transactions: AggregatedTransaction[] = sliced.map((t: SaltEdgeTransaction) => ({
      transactionId: t.id,
      accountId: t.account_id,
      connectionId: t.extra?.connection_id ?? '',
      amountCents: dollarsToCents(t.amount ?? 0),
      description: t.description ?? '',
      merchantName: t.extra?.merchant_name ?? null,
      category: t.category ?? null,
      date: t.made_on ?? t.created_at ?? '',
      pending: t.status === 'pending',
      currencyCode: t.currency_code ?? 'EUR',
    }));

    return {
      transactions,
      totalCount: allTxns.length,
      hasMore: offset + limit < allTxns.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'App-id': this.appId,
      'Secret': this.secret,
    };
  }

  private async get(path: string): Promise<SaltEdgeApiResponse<unknown>> {
    const url = `${SALT_EDGE_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'GET',
        headers: this.headers(),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `salt_edge:GET:${path.split('?')[0]}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Salt Edge API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  private async post(path: string, body: Record<string, unknown>): Promise<SaltEdgeApiResponse<unknown>> {
    const url = `${SALT_EDGE_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `salt_edge:POST:${path}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Salt Edge API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  private async delete(path: string): Promise<SaltEdgeApiResponse<unknown>> {
    const url = `${SALT_EDGE_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'DELETE',
        headers: this.headers(),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `salt_edge:DELETE:${path}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Salt Edge API error (${response.status}): ${errorBody}`);
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

function maskIBAN(iban: string): string {
  if (iban.length <= 8) return `****${iban.slice(-4)}`;
  return `${iban.slice(0, 4)}****${iban.slice(-4)}`;
}

function mapSaltEdgeStatus(status: string): 'active' | 'inactive' | 'reconnect_required' | 'error' {
  switch (status) {
    case 'active':
      return 'active';
    case 'inactive':
    case 'disabled':
      return 'inactive';
    case 'reconnect':
      return 'reconnect_required';
    default:
      return 'error';
  }
}

function mapSaltEdgeConsentStatus(status: string): 'active' | 'expired' | 'revoked' | 'pending' {
  switch (status) {
    case 'active':
      return 'active';
    case 'expired':
      return 'expired';
    case 'revoked':
      return 'revoked';
    default:
      return 'pending';
  }
}

function mapSaltEdgeAccountType(nature: string): AggregatedAccountType {
  switch (nature) {
    case 'account':
    case 'checking':
      return 'checking';
    case 'savings':
      return 'savings';
    case 'credit_card':
    case 'card':
      return 'credit_card';
    case 'loan':
      return 'loan';
    case 'mortgage':
      return 'mortgage';
    case 'investment':
    case 'bonus':
      return 'investment';
    case 'insurance':
      return 'insurance';
    default:
      return 'other';
  }
}

function mapSaltEdgeAccountModes(types: string[]): AggregatedAccountType[] {
  const mapped = types.map(mapSaltEdgeAccountType);
  return [...new Set(mapped)];
}
