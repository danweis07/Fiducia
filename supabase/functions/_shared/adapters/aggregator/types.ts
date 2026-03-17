/**
 * Data Aggregator Adapter Interface
 *
 * Defines the contract for multi-bank data aggregation services that pull
 * account and transaction data from external financial institutions.
 *
 * Used by the Net Worth Tracker and Open Banking (Section 1033) features
 * to aggregate data across institutions.
 *
 * Providers:
 *   - Salt Edge: 2,500+ EU banks via a single PSD2-compliant API
 *   - Akoya: US/International FDX-compliant data access network
 *   - Plaid: US standard for account verification and transaction aggregation
 *
 * All monetary values are integer cents.
 * Account numbers are always masked in responses (last 4 only).
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// COMMON TYPES
// =============================================================================

export type AggregatorProvider = 'salt_edge' | 'akoya' | 'plaid' | 'mock';

export type AggregatedAccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'loan'
  | 'mortgage'
  | 'investment'
  | 'pension'
  | 'insurance'
  | 'other';

export type ConnectionStatus =
  | 'active'
  | 'inactive'
  | 'reconnect_required'
  | 'error';

export type ConsentStatus =
  | 'active'
  | 'expired'
  | 'revoked'
  | 'pending';

// =============================================================================
// INSTITUTION TYPES
// =============================================================================

export interface AggregatorInstitution {
  institutionId: string;
  name: string;
  logoUrl: string | null;
  countryCode: string;
  /** Provider-specific institution identifier */
  providerInstitutionId: string;
  supportedAccountTypes: AggregatedAccountType[];
}

export interface SearchInstitutionsRequest {
  query: string;
  countryCode?: string;
  limit?: number;
}

export interface SearchInstitutionsResponse {
  institutions: AggregatorInstitution[];
  totalCount: number;
}

// =============================================================================
// CONNECTION TYPES
// =============================================================================

export interface CreateConnectionRequest {
  userId: string;
  tenantId: string;
  institutionId: string;
  /** Provider-specific redirect URL for OAuth flows */
  redirectUrl?: string;
  /** Requested scopes/permissions */
  scopes?: string[];
}

export interface CreateConnectionResponse {
  connectionId: string;
  /** URL to redirect the user to for bank authorization */
  connectUrl: string;
  /** Expiration of the connect URL */
  expiresAt: string;
}

export interface ConnectionCallbackRequest {
  userId: string;
  tenantId: string;
  connectionId: string;
  /** Provider-specific callback parameters (query string from redirect) */
  callbackParams: Record<string, string>;
}

export interface ConnectionCallbackResponse {
  connectionId: string;
  status: ConnectionStatus;
  institutionName: string;
  accountCount: number;
}

export interface Connection {
  connectionId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  countryCode: string;
  status: ConnectionStatus;
  consentStatus: ConsentStatus;
  consentExpiresAt: string | null;
  accountCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  provider: AggregatorProvider;
}

export interface ListConnectionsRequest {
  userId: string;
  tenantId: string;
}

export interface ListConnectionsResponse {
  connections: Connection[];
}

export interface RefreshConnectionRequest {
  userId: string;
  tenantId: string;
  connectionId: string;
}

export interface RefreshConnectionResponse {
  connectionId: string;
  status: ConnectionStatus;
  lastSyncedAt: string;
}

export interface RemoveConnectionRequest {
  userId: string;
  tenantId: string;
  connectionId: string;
}

export interface RemoveConnectionResponse {
  connectionId: string;
  removed: boolean;
}

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

export interface AggregatedAccount {
  accountId: string;
  connectionId: string;
  institutionName: string;
  name: string;
  type: AggregatedAccountType;
  /** Always masked — last 4 digits only (e.g., "****7890") */
  mask: string;
  balanceCents: number;
  availableBalanceCents: number | null;
  currencyCode: string;
  /** IBAN (masked) for EU accounts */
  ibanMasked: string | null;
  lastSyncedAt: string;
}

export interface ListAccountsRequest {
  userId: string;
  tenantId: string;
  connectionId?: string;
}

export interface ListAccountsResponse {
  accounts: AggregatedAccount[];
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export interface AggregatedTransaction {
  transactionId: string;
  accountId: string;
  connectionId: string;
  amountCents: number;
  description: string;
  merchantName: string | null;
  category: string | null;
  date: string;
  pending: boolean;
  currencyCode: string;
}

export interface ListTransactionsRequest {
  userId: string;
  tenantId: string;
  accountId: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListTransactionsResponse {
  transactions: AggregatedTransaction[];
  totalCount: number;
  hasMore: boolean;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface AggregatorAdapter extends BaseAdapter {
  /** Search for financial institutions available to connect */
  searchInstitutions(request: SearchInstitutionsRequest): Promise<SearchInstitutionsResponse>;

  /** Initiate a connection to an external institution (returns a redirect URL) */
  createConnection(request: CreateConnectionRequest): Promise<CreateConnectionResponse>;

  /** Handle the callback after user authorizes at the institution */
  handleCallback(request: ConnectionCallbackRequest): Promise<ConnectionCallbackResponse>;

  /** List all active connections for a user */
  listConnections(request: ListConnectionsRequest): Promise<ListConnectionsResponse>;

  /** Refresh/re-sync data for a connection */
  refreshConnection(request: RefreshConnectionRequest): Promise<RefreshConnectionResponse>;

  /** Disconnect and remove a connection */
  removeConnection(request: RemoveConnectionRequest): Promise<RemoveConnectionResponse>;

  /** List aggregated accounts across connections */
  listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse>;

  /** List transactions for an aggregated account */
  listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse>;
}
