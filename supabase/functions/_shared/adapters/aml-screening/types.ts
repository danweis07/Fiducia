/**
 * AML Screening Adapter — Types
 *
 * Defines the interface for Anti-Money Laundering screening providers
 * (e.g. ComplyAdvantage, LexisNexis). Any adapter that performs watchlist
 * screening, sanctions checks, or PEP checks must implement AMLScreeningAdapter.
 *
 * Supported watchlists: OFAC (SDN), UN Sanctions, EU Sanctions, PEP lists,
 * and provider-specific adverse media databases.
 *
 * IMPORTANT: PII handling rules
 * - Full names and DOBs are sent to providers but MUST NOT appear in logs
 * - Only screening result IDs, match statuses, and risk levels may be logged
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// WATCHLIST TYPES
// =============================================================================

/** Global sanctions and watchlist sources */
export type WatchlistSource =
  | 'ofac_sdn'        // OFAC Specially Designated Nationals
  | 'ofac_non_sdn'    // OFAC Non-SDN lists (SSI, FSE, etc.)
  | 'un_sanctions'     // United Nations Security Council sanctions
  | 'eu_sanctions'     // European Union consolidated sanctions
  | 'uk_hmt'           // UK HM Treasury sanctions
  | 'pep'              // Politically Exposed Persons
  | 'adverse_media'    // Negative news / adverse media
  | 'law_enforcement'  // Global law enforcement lists
  | 'custom';          // Tenant-specific custom watchlists

/** Risk level classification for screening matches */
export type ScreeningRiskLevel = 'no_match' | 'low' | 'medium' | 'high' | 'confirmed';

/** Match status for a screening result */
export type MatchStatus =
  | 'no_match'         // No matches found
  | 'potential_match'  // Possible match — needs review
  | 'confirmed_match'  // Confirmed match on a watchlist
  | 'false_positive'   // Reviewed and dismissed
  | 'true_positive';   // Reviewed and confirmed

// =============================================================================
// SCREENING SUBJECT (input)
// =============================================================================

export interface ScreeningSubject {
  /** Internal customer/applicant ID */
  customerId: string;
  /** @pii Legal first name */
  firstName: string;
  /** @pii Optional middle name */
  middleName?: string;
  /** @pii Legal last name */
  lastName: string;
  /** @pii Date of birth (ISO 8601: YYYY-MM-DD) */
  dateOfBirth?: string;
  /** Two-letter ISO country code of nationality */
  nationality?: string;
  /** Two-letter ISO country code of residence */
  countryOfResidence?: string;
  /** Type of entity being screened */
  entityType: 'individual' | 'organization';
  /** @pii Organization name (if entityType is 'organization') */
  organizationName?: string;
  /** @pii Identification document number (passport, national ID) */
  idNumber?: string;
  /** Type of identification document */
  idType?: 'passport' | 'national_id' | 'drivers_license' | 'ssn' | 'ein';
}

// =============================================================================
// SCREENING MATCH (output)
// =============================================================================

export interface ScreeningMatch {
  /** Provider-specific match ID */
  matchId: string;
  /** Matched entity name from the watchlist */
  matchedName: string;
  /** Which watchlist the match came from */
  source: WatchlistSource;
  /** Match confidence score (0.0 - 1.0) */
  score: number;
  /** Current status of the match */
  status: MatchStatus;
  /** Risk level based on the match */
  riskLevel: ScreeningRiskLevel;
  /** Additional details about the matched entity */
  details: {
    /** Aliases or alternate names on the watchlist */
    aliases: string[];
    /** Countries associated with the matched entity */
    countries: string[];
    /** Type of listing (e.g. "sanctions", "pep", "adverse_media") */
    listingType: string;
    /** Date the entity was listed */
    listedDate: string | null;
    /** Reason for listing */
    listingReason: string | null;
  };
}

// =============================================================================
// SCREENING RESULT (output)
// =============================================================================

export interface ScreeningResult {
  /** Unique screening ID */
  screeningId: string;
  /** Customer/applicant ID that was screened */
  customerId: string;
  /** Overall risk level */
  riskLevel: ScreeningRiskLevel;
  /** Total number of matches found */
  totalMatches: number;
  /** Individual matches */
  matches: ScreeningMatch[];
  /** Which watchlists were checked */
  watchlistsChecked: WatchlistSource[];
  /** ISO 8601 timestamp of when the screening was performed */
  screenedAt: string;
  /** ISO 8601 timestamp when the screening expires (for perpetual KYC) */
  expiresAt: string;
  /** Provider name */
  provider: string;
}

// =============================================================================
// ONGOING MONITORING (Perpetual KYC/AML)
// =============================================================================

export type MonitoringStatus = 'active' | 'paused' | 'expired' | 'removed';

export interface MonitoringSubscription {
  /** Subscription ID */
  subscriptionId: string;
  /** Customer ID being monitored */
  customerId: string;
  /** Current monitoring status */
  status: MonitoringStatus;
  /** Which watchlists to monitor */
  watchlists: WatchlistSource[];
  /** How often the screening is refreshed (in hours) */
  refreshIntervalHours: number;
  /** ISO 8601 timestamp of the last screening */
  lastScreenedAt: string;
  /** ISO 8601 timestamp of the next scheduled screening */
  nextScreeningAt: string;
  /** Number of alerts generated since subscription started */
  totalAlerts: number;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

export interface MonitoringAlert {
  /** Alert ID */
  alertId: string;
  /** Subscription ID that generated this alert */
  subscriptionId: string;
  /** Customer ID */
  customerId: string;
  /** Type of change detected */
  changeType: 'new_match' | 'status_change' | 'new_listing' | 'delisting';
  /** The match that triggered the alert */
  match: ScreeningMatch;
  /** Whether this alert has been reviewed */
  reviewed: boolean;
  /** Review notes */
  reviewNotes: string | null;
  /** ISO 8601 timestamp */
  alertedAt: string;
  /** ISO 8601 timestamp of review */
  reviewedAt: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ScreenRequest {
  tenantId: string;
  /** Subject to screen */
  subject: ScreeningSubject;
  /** Which watchlists to check (defaults to all) */
  watchlists?: WatchlistSource[];
  /** Minimum match confidence threshold (0.0 - 1.0, default 0.7) */
  matchThreshold?: number;
  /** Enable ongoing monitoring after initial screen */
  enableMonitoring?: boolean;
  /** Monitoring refresh interval in hours (default 24) */
  monitoringIntervalHours?: number;
}

export interface ScreenResponse {
  result: ScreeningResult;
  /** Monitoring subscription if enableMonitoring was true */
  monitoring?: MonitoringSubscription;
}

export interface GetScreeningRequest {
  tenantId: string;
  screeningId: string;
}

export interface GetScreeningResponse {
  result: ScreeningResult;
}

export interface ListMonitoringRequest {
  tenantId: string;
  customerId?: string;
  status?: MonitoringStatus;
  limit?: number;
  offset?: number;
}

export interface ListMonitoringResponse {
  subscriptions: MonitoringSubscription[];
  total: number;
}

export interface UpdateMonitoringRequest {
  tenantId: string;
  subscriptionId: string;
  status?: MonitoringStatus;
  watchlists?: WatchlistSource[];
  refreshIntervalHours?: number;
}

export interface UpdateMonitoringResponse {
  subscription: MonitoringSubscription;
}

export interface ListAlertsRequest {
  tenantId: string;
  customerId?: string;
  subscriptionId?: string;
  unreviewedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ListAlertsResponse {
  alerts: MonitoringAlert[];
  total: number;
}

export interface ReviewAlertRequest {
  tenantId: string;
  alertId: string;
  /** Whether the match is confirmed as a true positive */
  confirmedMatch: boolean;
  notes: string;
}

export interface ReviewAlertResponse {
  alert: MonitoringAlert;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * AML Screening adapter — abstracts sanctions/watchlist screening providers.
 *
 * Implementations handle provider-specific APIs (ComplyAdvantage, LexisNexis)
 * while exposing a uniform interface for real-time screening, ongoing
 * monitoring, and alert management.
 */
export interface AMLScreeningAdapter extends BaseAdapter {
  /** Screen a subject against global watchlists in real-time */
  screen(request: ScreenRequest): Promise<ScreenResponse>;

  /** Retrieve a previous screening result */
  getScreening(request: GetScreeningRequest): Promise<GetScreeningResponse>;

  /** List ongoing monitoring subscriptions */
  listMonitoring(request: ListMonitoringRequest): Promise<ListMonitoringResponse>;

  /** Update a monitoring subscription (pause, resume, change watchlists) */
  updateMonitoring(request: UpdateMonitoringRequest): Promise<UpdateMonitoringResponse>;

  /** List monitoring alerts */
  listAlerts(request: ListAlertsRequest): Promise<ListAlertsResponse>;

  /** Review/disposition a monitoring alert */
  reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse>;
}
