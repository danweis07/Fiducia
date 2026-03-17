/**
 * Open Banking Types (CFPB Section 1033)
 *
 * Consent management, access logs, and summaries.
 */

// =============================================================================
// OPEN BANKING — CFPB SECTION 1033 CONSENT MANAGEMENT
// =============================================================================

export type OpenBankingConsentStatus = 'active' | 'revoked' | 'expired' | 'suspended';

export type OpenBankingScope =
  | 'account_info'
  | 'balances'
  | 'transactions'
  | 'transfer_initiate'
  | 'identity';

export interface OpenBankingConsent {
  id: string;
  providerId: string;
  providerName: string;
  providerLogo: string | null;
  providerUrl: string | null;
  status: OpenBankingConsentStatus;
  scopes: OpenBankingScope[];
  accountIds: string[];
  consentGrantedAt: string;
  consentExpiresAt: string | null;
  consentRevokedAt: string | null;
  lastAccessedAt: string | null;
  accessFrequency: string;
  connectionId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OpenBankingAccessLog {
  id: string;
  consentId: string;
  providerId: string;
  providerName: string;
  scope: OpenBankingScope;
  endpoint: string;
  requestId: string | null;
  ipAddress: string | null;
  responseCode: number | null;
  dataPoints: number;
  accessedAt: string;
}

export interface OpenBankingConsentSummary {
  totalConsents: number;
  activeConsents: number;
  revokedConsents: number;
  expiredConsents: number;
  recentAccessCount: number;
}
