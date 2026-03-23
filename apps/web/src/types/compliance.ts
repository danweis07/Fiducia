/**
 * Compliance Types
 *
 * User consent, KYC verification, KYC refresh, and AML screening types.
 */

// =============================================================================
// KYC STATUS
// =============================================================================

export type KYCStatus = "pending" | "in_review" | "approved" | "rejected" | "expired";

// =============================================================================
// USER CONSENT (GDPR / GLBA)
// =============================================================================

export type ConsentType = "data_sharing" | "marketing" | "analytics" | "third_party";

export interface UserConsent {
  id: string;
  userId: string;
  tenantId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  revokedAt: string | null;
  version: string;
}

// =============================================================================
// KYC VERIFICATION
// =============================================================================

export interface KYCVerification {
  id: string;
  userId: string;
  tenantId: string;
  provider: string;
  status: KYCStatus;
  verifiedAt: string | null;
  expiresAt: string | null;
  /** No raw documents stored — status only */
  createdAt: string;
}

// =============================================================================
// KYC REFRESH (Perpetual KYC)
// =============================================================================

export type KYCRefreshTrigger = "scheduled" | "event_driven" | "risk_based" | "manual";

export interface KYCRefreshResult {
  refreshId: string;
  evaluationToken: string;
  trigger: KYCRefreshTrigger;
  status: KYCStatus;
  changes: string[];
  riskScore: number;
  refreshedAt: string;
  nextRefreshAt: string | null;
}

// =============================================================================
// AML SCREENING
// =============================================================================

export type WatchlistSource =
  | "ofac_sdn"
  | "ofac_non_sdn"
  | "un_sanctions"
  | "eu_sanctions"
  | "uk_hmt"
  | "pep"
  | "adverse_media"
  | "law_enforcement"
  | "custom";

export type ScreeningRiskLevel = "no_match" | "low" | "medium" | "high" | "confirmed";

export type MatchStatus =
  | "no_match"
  | "potential_match"
  | "confirmed_match"
  | "false_positive"
  | "true_positive";

export type MonitoringStatus = "active" | "paused" | "expired" | "removed";

export interface ScreeningMatch {
  matchId: string;
  matchedName: string;
  source: WatchlistSource;
  score: number;
  status: MatchStatus;
  riskLevel: ScreeningRiskLevel;
  details: {
    aliases: string[];
    countries: string[];
    listingType: string;
    listedDate: string | null;
    listingReason: string | null;
  };
}

export interface ScreeningResult {
  screeningId: string;
  customerId: string;
  riskLevel: ScreeningRiskLevel;
  totalMatches: number;
  matches: ScreeningMatch[];
  watchlistsChecked: WatchlistSource[];
  screenedAt: string;
  expiresAt: string;
  provider: string;
}

export interface MonitoringSubscription {
  subscriptionId: string;
  customerId: string;
  status: MonitoringStatus;
  watchlists: WatchlistSource[];
  refreshIntervalHours: number;
  lastScreenedAt: string;
  nextScreeningAt: string;
  totalAlerts: number;
  createdAt: string;
}

export interface MonitoringAlert {
  alertId: string;
  subscriptionId: string;
  customerId: string;
  changeType: "new_match" | "status_change" | "new_listing" | "delisting";
  match: ScreeningMatch;
  reviewed: boolean;
  reviewNotes: string | null;
  alertedAt: string;
  reviewedAt: string | null;
}
