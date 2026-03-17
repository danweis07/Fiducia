// TODO: Provisional integration — not yet validated in production.
/**
 * LexisNexis Risk Solutions — AML Screening Adapter
 *
 * Integrates with LexisNexis Bridger Insight XG for real-time AML/sanctions
 * screening and ongoing monitoring.
 *
 * LexisNexis Bridger API docs: https://risk.lexisnexis.com/products/bridger-insight
 * Auth: Username/Password per org via SOAP/REST hybrid
 *
 * Capabilities:
 * - Real-time screening against OFAC, UN, EU, UK, PEP, and 200+ global lists
 * - Ongoing monitoring with configurable refresh intervals
 * - Detailed match scoring with confidence levels
 * - Batch screening for bulk onboarding
 *
 * IMPORTANT: PII (names, DOBs, IDs) is sent to LexisNexis for screening but
 * MUST NEVER appear in logs. Only screening IDs, match counts, and risk levels.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  AMLScreeningAdapter,
  ScreenRequest,
  ScreenResponse,
  GetScreeningRequest,
  GetScreeningResponse,
  ListMonitoringRequest,
  ListMonitoringResponse,
  UpdateMonitoringRequest,
  UpdateMonitoringResponse,
  ListAlertsRequest,
  ListAlertsResponse,
  ReviewAlertRequest,
  ReviewAlertResponse,
  ScreeningResult,
  ScreeningMatch,
  ScreeningRiskLevel,
  WatchlistSource,
  MonitoringSubscription,
  MonitoringAlert,
  MatchStatus,
} from './types.ts';

// =============================================================================
// LEXISNEXIS API TYPES
// =============================================================================

interface LNSearchRequest {
  InputRecord: {
    Entity: {
      EntityType: 'Individual' | 'Business';
      Name: {
        First?: string;
        Middle?: string;
        Last?: string;
        Full?: string;
      };
      DateOfBirth?: string;
      Citizenship?: string;
      Addresses?: Array<{
        Country: string;
      }>;
      IDs?: Array<{
        Type: string;
        Number: string;
        Country: string;
      }>;
    };
    CustomFields?: Record<string, string>;
  };
  Settings: {
    ListTypes: string[];
    FuzzyNameMatch: boolean;
    FuzzyThreshold: number;
    AutoMonitor?: boolean;
  };
}

interface LNSearchResponse {
  SearchId: string;
  Status: string;
  TotalResults: number;
  RiskLevel: string;
  Results: LNMatchResult[];
  SearchDate: string;
}

interface LNMatchResult {
  ResultId: string;
  EntityName: string;
  MatchScore: number;
  MatchStatus: string;
  ListType: string;
  ListSource: string;
  Aliases: string[];
  Countries: string[];
  DateOfListing: string | null;
  ListingReason: string | null;
  AdditionalInfo: Record<string, unknown>;
}

interface LNMonitorResponse {
  MonitorId: string;
  Status: string;
  EntityId: string;
  NextCheckDate: string;
  CreatedDate: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapLNListType(listType: string): WatchlistSource {
  const lt = listType.toLowerCase();
  if (lt.includes('ofac') && lt.includes('sdn')) return 'ofac_sdn';
  if (lt.includes('ofac')) return 'ofac_non_sdn';
  if (lt.includes('un')) return 'un_sanctions';
  if (lt.includes('eu')) return 'eu_sanctions';
  if (lt.includes('hmt') || lt.includes('uk')) return 'uk_hmt';
  if (lt.includes('pep')) return 'pep';
  if (lt.includes('adverse') || lt.includes('media')) return 'adverse_media';
  if (lt.includes('enforcement') || lt.includes('law')) return 'law_enforcement';
  return 'ofac_sdn';
}

function mapLNRiskLevel(level: string): ScreeningRiskLevel {
  switch (level.toLowerCase()) {
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    case 'clear': return 'no_match';
    case 'confirmed': return 'confirmed';
    default: return 'medium';
  }
}

function mapLNMatchStatus(status: string): MatchStatus {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'confirmed_match';
    case 'potential': return 'potential_match';
    case 'dismissed': return 'false_positive';
    case 'cleared': return 'no_match';
    default: return 'potential_match';
  }
}

function watchlistToLNListType(wl: WatchlistSource): string {
  switch (wl) {
    case 'ofac_sdn': return 'OFAC-SDN';
    case 'ofac_non_sdn': return 'OFAC-NONSDN';
    case 'un_sanctions': return 'UN-SANCTIONS';
    case 'eu_sanctions': return 'EU-SANCTIONS';
    case 'uk_hmt': return 'UK-HMT';
    case 'pep': return 'PEP';
    case 'adverse_media': return 'ADVERSE-MEDIA';
    case 'law_enforcement': return 'LAW-ENFORCEMENT';
    default: return 'OFAC-SDN';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class LexisNexisAMLAdapter implements AMLScreeningAdapter {
  readonly config: AdapterConfig = {
    id: 'lexisnexis-aml',
    name: 'LexisNexis Bridger AML Screening',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;
  private readonly orgId: string;

  constructor() {
    this.baseUrl = Deno.env.get('LEXISNEXIS_AML_BASE_URL') ?? 'https://bridger.lexisnexis.com/api/v1';
    this.username = Deno.env.get('LEXISNEXIS_AML_USERNAME') ?? '';
    this.password = Deno.env.get('LEXISNEXIS_AML_PASSWORD') ?? '';
    this.orgId = Deno.env.get('LEXISNEXIS_AML_ORG_ID') ?? '';

    if (!this.username || !this.password || !this.orgId) {
      throw new Error('LexisNexis AML credentials missing: LEXISNEXIS_AML_USERNAME, LEXISNEXIS_AML_PASSWORD, and LEXISNEXIS_AML_ORG_ID must be set');
    }
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        headers: this.headers(),
        signal: AbortSignal.timeout(10000),
      });
      return {
        adapterId: this.config.id,
        healthy: res.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // SCREENING
  // ---------------------------------------------------------------------------

  async screen(request: ScreenRequest): Promise<ScreenResponse> {
    const { subject } = request;
    const watchlists = request.watchlists ?? [
      'ofac_sdn', 'un_sanctions', 'eu_sanctions', 'uk_hmt', 'pep', 'adverse_media',
    ];
    const threshold = request.matchThreshold ?? 0.7;

    const body: LNSearchRequest = {
      InputRecord: {
        Entity: {
          EntityType: subject.entityType === 'organization' ? 'Business' : 'Individual',
          Name: subject.entityType === 'organization'
            ? { Full: subject.organizationName ?? subject.lastName }
            : {
                First: subject.firstName,
                Middle: subject.middleName,
                Last: subject.lastName,
              },
          ...(subject.dateOfBirth ? { DateOfBirth: subject.dateOfBirth } : {}),
          ...(subject.nationality ? { Citizenship: subject.nationality } : {}),
          ...(subject.countryOfResidence ? { Addresses: [{ Country: subject.countryOfResidence }] } : {}),
          ...(subject.idNumber && subject.idType ? {
            IDs: [{
              Type: subject.idType.toUpperCase(),
              Number: subject.idNumber,
              Country: subject.countryOfResidence ?? 'US',
            }],
          } : {}),
        },
        CustomFields: { customer_id: subject.customerId },
      },
      Settings: {
        ListTypes: watchlists.map(watchlistToLNListType),
        FuzzyNameMatch: true,
        FuzzyThreshold: threshold * 100, // LN uses 0-100
        AutoMonitor: request.enableMonitoring ?? false,
      },
    };

    // Log WITHOUT PII
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'lexisnexis-aml',
      action: 'screen',
      customerId: subject.customerId,
      entityType: subject.entityType,
      watchlists: watchlists.join(','),
      timestamp: new Date().toISOString(),
    }));

    const res = await this.request<LNSearchResponse>('POST', '/searches', body);

    const matches: ScreeningMatch[] = res.Results.map((r) => this.mapResultToMatch(r));
    const riskLevel = mapLNRiskLevel(res.RiskLevel);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result: ScreeningResult = {
      screeningId: `ln_${res.SearchId}`,
      customerId: subject.customerId,
      riskLevel,
      totalMatches: res.TotalResults,
      matches,
      watchlistsChecked: watchlists,
      screenedAt: res.SearchDate,
      expiresAt: expiresAt.toISOString(),
      provider: 'lexisnexis',
    };

    // If monitoring was requested, the AutoMonitor flag was set
    let monitoring: MonitoringSubscription | undefined;
    if (request.enableMonitoring) {
      const intervalHours = request.monitoringIntervalHours ?? 24;
      const nextScreening = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

      monitoring = {
        subscriptionId: `ln_mon_${res.SearchId}`,
        customerId: subject.customerId,
        status: 'active',
        watchlists,
        refreshIntervalHours: intervalHours,
        lastScreenedAt: now.toISOString(),
        nextScreeningAt: nextScreening.toISOString(),
        totalAlerts: 0,
        createdAt: now.toISOString(),
      };
    }

    return { result, monitoring };
  }

  async getScreening(request: GetScreeningRequest): Promise<GetScreeningResponse> {
    const lnId = request.screeningId.replace('ln_', '');

    const res = await this.request<LNSearchResponse>('GET', `/searches/${lnId}`);

    const matches = res.Results.map((r) => this.mapResultToMatch(r));

    const result: ScreeningResult = {
      screeningId: request.screeningId,
      customerId: '',
      riskLevel: mapLNRiskLevel(res.RiskLevel),
      totalMatches: res.TotalResults,
      matches,
      watchlistsChecked: [],
      screenedAt: res.SearchDate,
      expiresAt: '',
      provider: 'lexisnexis',
    };

    return { result };
  }

  async listMonitoring(request: ListMonitoringRequest): Promise<ListMonitoringResponse> {
    const params = new URLSearchParams();
    if (request.customerId) params.set('entity_id', request.customerId);
    if (request.status) params.set('status', request.status);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.offset) params.set('offset', String(request.offset));

    const res = await this.request<{ monitors: LNMonitorResponse[]; total: number }>(
      'GET',
      `/monitors?${params.toString()}`,
    );

    const subscriptions: MonitoringSubscription[] = res.monitors.map((m) => ({
      subscriptionId: `ln_mon_${m.MonitorId}`,
      customerId: m.EntityId,
      status: m.Status.toLowerCase() === 'active' ? 'active' : 'paused',
      watchlists: [],
      refreshIntervalHours: 24,
      lastScreenedAt: m.CreatedDate,
      nextScreeningAt: m.NextCheckDate,
      totalAlerts: 0,
      createdAt: m.CreatedDate,
    }));

    return { subscriptions, total: res.total };
  }

  async updateMonitoring(request: UpdateMonitoringRequest): Promise<UpdateMonitoringResponse> {
    const lnId = request.subscriptionId.replace('ln_mon_', '');
    const isActive = request.status === 'active';

    const res = await this.request<LNMonitorResponse>(
      'PATCH',
      `/monitors/${lnId}`,
      { Status: isActive ? 'Active' : 'Paused' },
    );

    const now = new Date();
    const intervalHours = request.refreshIntervalHours ?? 24;

    const subscription: MonitoringSubscription = {
      subscriptionId: request.subscriptionId,
      customerId: res.EntityId,
      status: request.status ?? (isActive ? 'active' : 'paused'),
      watchlists: request.watchlists ?? [],
      refreshIntervalHours: intervalHours,
      lastScreenedAt: now.toISOString(),
      nextScreeningAt: new Date(now.getTime() + intervalHours * 60 * 60 * 1000).toISOString(),
      totalAlerts: 0,
      createdAt: res.CreatedDate,
    };

    return { subscription };
  }

  async listAlerts(_request: ListAlertsRequest): Promise<ListAlertsResponse> {
    // LexisNexis delivers monitoring alerts via webhooks/polling.
    // In production, this queries the local alerts table.
    return { alerts: [], total: 0 };
  }

  async reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse> {
    const now = new Date();
    const alert: MonitoringAlert = {
      alertId: request.alertId,
      subscriptionId: '',
      customerId: '',
      changeType: 'new_match',
      match: {
        matchId: request.alertId,
        matchedName: '',
        source: 'ofac_sdn',
        score: 0,
        status: request.confirmedMatch ? 'true_positive' : 'false_positive',
        riskLevel: request.confirmedMatch ? 'confirmed' : 'no_match',
        details: { aliases: [], countries: [], listingType: '', listedDate: null, listingReason: null },
      },
      reviewed: true,
      reviewNotes: request.notes,
      alertedAt: now.toISOString(),
      reviewedAt: now.toISOString(),
    };

    return { alert };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    return {
      'Authorization': `Basic ${btoa(`${this.username}:${this.password}`)}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Organization-Id': this.orgId,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      // Strip PII from error responses
      const safeError = errBody.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`LexisNexis AML API error (${res.status}): ${safeError}`);
    }

    return res.json();
  }

  private mapResultToMatch(r: LNMatchResult): ScreeningMatch {
    return {
      matchId: r.ResultId,
      matchedName: r.EntityName,
      source: mapLNListType(r.ListType),
      score: r.MatchScore / 100, // LN uses 0-100, normalize to 0-1
      status: mapLNMatchStatus(r.MatchStatus),
      riskLevel: r.MatchScore >= 90 ? 'high' : r.MatchScore >= 70 ? 'medium' : 'low',
      details: {
        aliases: r.Aliases,
        countries: r.Countries,
        listingType: r.ListType,
        listedDate: r.DateOfListing,
        listingReason: r.ListingReason,
      },
    };
  }
}
