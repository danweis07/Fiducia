/**
 * Data Aggregation Types (Multi-Bank)
 *
 * Salt Edge, Akoya, Plaid aggregation entities.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// DATA AGGREGATION (Multi-Bank — Salt Edge, Akoya, Plaid)
// =============================================================================

export type AggregatedAccountType =
  | "checking"
  | "savings"
  | "credit_card"
  | "loan"
  | "mortgage"
  | "investment"
  | "pension"
  | "insurance"
  | "other";

export type AggregatorConnectionStatus = "active" | "inactive" | "reconnect_required" | "error";

export type AggregatorConsentStatus = "active" | "expired" | "revoked" | "pending";

export type AggregatorProvider = "salt_edge" | "akoya" | "plaid" | "mock";

export interface AggregatorInstitution {
  institutionId: string;
  name: string;
  logoUrl: string | null;
  countryCode: string;
  providerInstitutionId: string;
  supportedAccountTypes: AggregatedAccountType[];
}

export interface AggregatorConnection {
  connectionId: string;
  institutionId: string;
  institutionName: string;
  institutionLogo: string | null;
  countryCode: string;
  status: AggregatorConnectionStatus;
  consentStatus: AggregatorConsentStatus;
  consentExpiresAt: string | null;
  accountCount: number;
  lastSyncedAt: string | null;
  createdAt: string;
  provider: AggregatorProvider;
}

export interface AggregatedAccount {
  accountId: string;
  connectionId: string;
  institutionName: string;
  name: string;
  type: AggregatedAccountType;
  /** Always masked — last 4 digits only */
  mask: string;
  balanceCents: number;
  availableBalanceCents: number | null;
  currencyCode: string;
  /** Masked IBAN for EU accounts */
  ibanMasked: string | null;
  lastSyncedAt: string;
}

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
