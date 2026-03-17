// TODO: Provisional integration — not yet validated in production.
/**
 * Plaid Adapter — Real Implementation
 *
 * Calls Plaid sandbox API endpoints for external account aggregation.
 * Uses the shared retry utility for transient failure handling.
 *
 * Plaid sandbox base URL: https://sandbox.plaid.com
 * Credentials from env vars: PLAID_CLIENT_ID, PLAID_SECRET
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
  ExternalAccountAdapter,
  LinkTokenRequest,
  LinkTokenResponse,
  ExchangeTokenRequest,
  ExchangeTokenResponse,
  GetAccountsRequest,
  GetAccountsResponse,
  GetBalancesRequest,
  GetBalancesResponse,
  GetTransactionsRequest,
  GetTransactionsResponse,
  ExternalAccount,
  ExternalBalance,
  ExternalTransaction,
} from './types.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

const PLAID_SANDBOX_BASE = 'https://sandbox.plaid.com';

// =============================================================================
// PLAID API RESPONSE TYPES
// =============================================================================

interface PlaidAccountBalances {
  current?: number;
  available?: number;
  limit?: number;
  iso_currency_code?: string;
}

interface PlaidAccount {
  account_id: string;
  name: string;
  official_name?: string;
  type: string;
  subtype?: string;
  mask?: string;
  balances?: PlaidAccountBalances;
}

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount?: number;
  name?: string;
  original_description?: string;
  merchant_name?: string;
  category?: string[];
  date?: string;
  authorized_date?: string;
  pending?: boolean;
  iso_currency_code?: string;
}

interface PlaidRemovedTransaction {
  transaction_id?: string;
}

interface PlaidApiResponse {
  link_token?: string;
  expiration?: string;
  request_id?: string;
  access_token?: string;
  item_id?: string;
  item?: { item_id?: string; institution_id?: string };
  accounts?: PlaidAccount[];
  added?: PlaidTransaction[];
  modified?: PlaidTransaction[];
  removed?: (PlaidRemovedTransaction | string)[];
  next_cursor?: string;
  has_more?: boolean;
  [key: string]: unknown;
}

// =============================================================================
// PLAID ADAPTER
// =============================================================================

export class PlaidAdapter implements ExternalAccountAdapter {
  readonly config: AdapterConfig = {
    id: 'plaid',
    name: 'Plaid',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private clientId: string;
  private secret: string;

  constructor(clientId: string, secret: string) {
    this.clientId = clientId;
    this.secret = secret;
  }

  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${PLAID_SANDBOX_BASE}/institutions/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: this.clientId,
          secret: this.secret,
          count: 1,
          offset: 0,
          country_codes: ['US'],
        }),
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
  // Link Token
  // ---------------------------------------------------------------------------

  async linkToken(request: LinkTokenRequest): Promise<LinkTokenResponse> {
    const body = {
      client_id: this.clientId,
      secret: this.secret,
      client_name: request.clientName,
      user: { client_user_id: request.userId },
      products: request.products ?? ['transactions'],
      country_codes: request.countryCodes ?? ['US'],
      language: request.language ?? 'en',
      ...(request.redirectUri ? { redirect_uri: request.redirectUri } : {}),
    };

    const response = await this.post('/link/token/create', body);

    return {
      linkToken: response.link_token,
      expiration: response.expiration,
      requestId: response.request_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Exchange Token
  // ---------------------------------------------------------------------------

  async exchangeToken(request: ExchangeTokenRequest): Promise<ExchangeTokenResponse> {
    const body = {
      client_id: this.clientId,
      secret: this.secret,
      public_token: request.publicToken,
    };

    const response = await this.post('/item/public_token/exchange', body);

    return {
      accessToken: response.access_token,
      itemId: response.item_id,
      requestId: response.request_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Accounts
  // ---------------------------------------------------------------------------

  async getAccounts(request: GetAccountsRequest): Promise<GetAccountsResponse> {
    const body = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: request.accessToken,
    };

    const response = await this.post('/accounts/get', body);

    const accounts: ExternalAccount[] = (response.accounts ?? []).map(
      (a: PlaidAccount) => ({
        accountId: a.account_id,
        itemId: response.item?.item_id ?? '',
        institutionName: response.item?.institution_id ?? 'Unknown',
        name: a.name,
        officialName: a.official_name ?? null,
        type: mapAccountType(a.type),
        subtype: a.subtype ?? null,
        mask: a.mask ? `****${a.mask}` : '****0000',
        balanceCents: dollarsToCents(a.balances?.current ?? 0),
        availableBalanceCents: a.balances?.available != null
          ? dollarsToCents(a.balances.available)
          : null,
        currencyCode: a.balances?.iso_currency_code ?? 'USD',
        linkedAt: new Date().toISOString(),
      }),
    );

    return {
      accounts,
      requestId: response.request_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Balances
  // ---------------------------------------------------------------------------

  async getBalances(request: GetBalancesRequest): Promise<GetBalancesResponse> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: request.accessToken,
    };

    if (request.accountIds?.length) {
      body.options = { account_ids: request.accountIds };
    }

    const response = await this.post('/accounts/balance/get', body);

    const balances: ExternalBalance[] = (response.accounts ?? []).map(
      (a: PlaidAccount) => ({
        accountId: a.account_id,
        currentCents: dollarsToCents(a.balances?.current ?? 0),
        availableCents: a.balances?.available != null
          ? dollarsToCents(a.balances.available)
          : null,
        limitCents: a.balances?.limit != null
          ? dollarsToCents(a.balances.limit)
          : null,
        currencyCode: a.balances?.iso_currency_code ?? 'USD',
        lastUpdatedAt: new Date().toISOString(),
      }),
    );

    return {
      balances,
      requestId: response.request_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Get Transactions (sync)
  // ---------------------------------------------------------------------------

  async getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse> {
    const body: Record<string, unknown> = {
      client_id: this.clientId,
      secret: this.secret,
      access_token: request.accessToken,
    };

    if (request.cursor) {
      body.cursor = request.cursor;
    }
    if (request.count) {
      body.count = request.count;
    }

    const response = await this.post('/transactions/sync', body);

    const mapTxn = (t: PlaidTransaction): ExternalTransaction => ({
      transactionId: t.transaction_id,
      accountId: t.account_id,
      amountCents: dollarsToCents(t.amount ?? 0),
      description: t.name ?? t.original_description ?? '',
      merchantName: t.merchant_name ?? null,
      category: t.category ?? [],
      date: t.date ?? t.authorized_date ?? '',
      pending: t.pending ?? false,
      currencyCode: t.iso_currency_code ?? 'USD',
    });

    return {
      added: (response.added ?? []).map(mapTxn),
      modified: (response.modified ?? []).map(mapTxn),
      removed: (response.removed ?? []).map(
        (r: PlaidRemovedTransaction | string) => typeof r === 'string' ? r : r.transaction_id ?? '',
      ),
      nextCursor: response.next_cursor ?? '',
      hasMore: response.has_more ?? false,
      requestId: response.request_id,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Helpers
  // ---------------------------------------------------------------------------

  private async post(path: string, body: Record<string, unknown>): Promise<PlaidApiResponse> {
    const url = `${PLAID_SANDBOX_BASE}${path}`;

    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      {
        maxRetries: this.config.retry.maxRetries,
        initialDelayMs: this.config.retry.initialDelayMs,
        maxDelayMs: this.config.retry.maxDelayMs,
        context: `plaid:${path}`,
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Plaid API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/** Convert floating-point dollars to integer cents */
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** Map Plaid account type string to our enum */
function mapAccountType(
  plaidType: string,
): 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other' {
  switch (plaidType) {
    case 'depository':
      return 'checking';
    case 'credit':
      return 'credit';
    case 'loan':
      return 'loan';
    case 'investment':
      return 'investment';
    default:
      return 'other';
  }
}
