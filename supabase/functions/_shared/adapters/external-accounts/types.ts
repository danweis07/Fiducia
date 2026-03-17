/**
 * External Account Adapter Interface
 *
 * Defines the contract for Plaid-like external account aggregation services.
 * All monetary values are integer cents.
 * Account numbers are always masked in responses (last 4 only).
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface LinkTokenRequest {
  userId: string;
  clientName: string;
  products?: string[];
  countryCodes?: string[];
  language?: string;
  redirectUri?: string;
}

export interface LinkTokenResponse {
  linkToken: string;
  expiration: string;
  requestId: string;
}

export interface ExchangeTokenRequest {
  publicToken: string;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  itemId: string;
  requestId: string;
}

export interface ExternalAccount {
  accountId: string;
  itemId: string;
  institutionName: string;
  name: string;
  officialName: string | null;
  type: 'checking' | 'savings' | 'credit' | 'loan' | 'investment' | 'other';
  subtype: string | null;
  /** Always masked — last 4 digits only (e.g., "****7890") */
  mask: string;
  balanceCents: number;
  availableBalanceCents: number | null;
  currencyCode: string;
  linkedAt: string;
}

export interface ExternalBalance {
  accountId: string;
  currentCents: number;
  availableCents: number | null;
  limitCents: number | null;
  currencyCode: string;
  lastUpdatedAt: string;
}

export interface ExternalTransaction {
  transactionId: string;
  accountId: string;
  amountCents: number;
  description: string;
  merchantName: string | null;
  category: string[];
  date: string;
  pending: boolean;
  currencyCode: string;
}

export interface GetAccountsRequest {
  accessToken: string;
}

export interface GetAccountsResponse {
  accounts: ExternalAccount[];
  requestId: string;
}

export interface GetBalancesRequest {
  accessToken: string;
  accountIds?: string[];
}

export interface GetBalancesResponse {
  balances: ExternalBalance[];
  requestId: string;
}

export interface GetTransactionsRequest {
  accessToken: string;
  cursor?: string;
  count?: number;
}

export interface GetTransactionsResponse {
  added: ExternalTransaction[];
  modified: ExternalTransaction[];
  removed: string[];
  nextCursor: string;
  hasMore: boolean;
  requestId: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface ExternalAccountAdapter extends BaseAdapter {
  /** Create a Link token for initializing the client-side Link flow */
  linkToken(request: LinkTokenRequest): Promise<LinkTokenResponse>;

  /** Exchange a public token (from Link) for a persistent access token */
  exchangeToken(request: ExchangeTokenRequest): Promise<ExchangeTokenResponse>;

  /** Retrieve accounts associated with an access token */
  getAccounts(request: GetAccountsRequest): Promise<GetAccountsResponse>;

  /** Retrieve real-time balances for linked accounts */
  getBalances(request: GetBalancesRequest): Promise<GetBalancesResponse>;

  /** Incrementally sync transactions using cursor-based pagination */
  getTransactions(request: GetTransactionsRequest): Promise<GetTransactionsResponse>;
}
