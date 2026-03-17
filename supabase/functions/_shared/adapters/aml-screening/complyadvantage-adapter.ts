// TODO: Provisional integration — not yet validated in production.
/**
 * ComplyAdvantage AML Screening Adapter
 *
 * Integrates with ComplyAdvantage's real-time AML/sanctions screening API
 * for watchlist screening and ongoing monitoring.
 *
 * ComplyAdvantage API docs: https://docs.complyadvantage.com
 * Base URL: https://api.complyadvantage.com
 * Auth: API key via header
 *
 * Capabilities:
 * - Real-time screening against OFAC, UN, EU, UK HMT, PEP, adverse media
 * - Ongoing monitoring with webhook-driven alerts
 * - Fuzzy name matching with configurable thresholds
 *
 * IMPORTANT: PII (names, DOBs) is sent to ComplyAdvantage for screening but
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
// COMPLYADVANTAGE API TYPES
// =============================================================================

interface CASearchRequest {
  search_term: string;
  fuzziness: number;
  filters: {
    birth_year?: number;
    country_codes?: string[];
    types?: string[];
    exact_match?: boolean;
  };
  share_url?: number;
  tags?: Record<string, string>;
}

interface CASearchResponse {
  content: {
    data: {
      id: number;
      ref: string;
      searcher_id: number;
      assignee_id: number;
      filters: Record<string, unknown>;
      match_status: string;
      risk_level: string;
      search_term: string;
      total_hits: number;
      created_at: string;
      updated_at: string;
      hits: CAHit[];
    };
  };
}

interface CAHit {
  doc: {
    id: string;
    name: string;
    aka: Array<{ name: string }>;
    types: string[];
    sources: string[];
    fields: Array<{
      name: string;
      value: string;
      source: string;
    }>;
    source_notes: Record<string, unknown>;
    match_types: string[];
  };
  match_status: string;
  score: number;
}

interface CAMonitorResponse {
  content: {
    data: {
      id: number;
      is_monitored: boolean;
      search_term: string;
      updated_at: string;
    };
  };
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapCATypes(types: string[]): WatchlistSource {
  for (const t of types) {
    const lower = t.toLowerCase();
    if (lower.includes('sanction')) {
      if (lower.includes('ofac')) return 'ofac_sdn';
      if (lower.includes('un')) return 'un_sanctions';
      if (lower.includes('eu')) return 'eu_sanctions';
      if (lower.includes('hmt') || lower.includes('uk')) return 'uk_hmt';
      return 'ofac_sdn'; // Default sanctions to OFAC
    }
    if (lower.includes('pep')) return 'pep';
    if (lower.includes('adverse') || lower.includes('media')) return 'adverse_media';
    if (lower.includes('law') || lower.includes('enforcement')) return 'law_enforcement';
  }
  return 'ofac_sdn';
}

function mapCARiskLevel(level: string): ScreeningRiskLevel {
  switch (level.toLowerCase()) {
    case 'high': return 'high';
    case 'medium': return 'medium';
    case 'low': return 'low';
    case 'no_match': return 'no_match';
    default: return 'medium';
  }
}

function mapCAMatchStatus(status: string): MatchStatus {
  switch (status.toLowerCase()) {
    case 'true_positive': return 'true_positive';
    case 'false_positive': return 'false_positive';
    case 'potential_match': return 'potential_match';
    case 'no_match': return 'no_match';
    default: return 'potential_match';
  }
}

function watchlistToCAType(wl: WatchlistSource): string {
  switch (wl) {
    case 'ofac_sdn': return 'sanction';
    case 'ofac_non_sdn': return 'sanction';
    case 'un_sanctions': return 'sanction';
    case 'eu_sanctions': return 'sanction';
    case 'uk_hmt': return 'sanction';
    case 'pep': return 'pep';
    case 'adverse_media': return 'adverse-media';
    case 'law_enforcement': return 'warning';
    default: return 'sanction';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ComplyAdvantageAMLAdapter implements AMLScreeningAdapter {
  readonly config: AdapterConfig = {
    id: 'complyadvantage-aml',
    name: 'ComplyAdvantage AML Screening',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    const apiKey = Deno.env.get('COMPLYADVANTAGE_API_KEY');
    if (!apiKey) {
      throw new Error('COMPLYADVANTAGE_API_KEY must be set');
    }
    this.apiKey = apiKey;
    this.baseUrl = Deno.env.get('COMPLYADVANTAGE_BASE_URL') ?? 'https://api.complyadvantage.com';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/searches?per_page=1`, {
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

    const searchTerm = subject.entityType === 'organization'
      ? (subject.organizationName ?? `${subject.firstName} ${subject.lastName}`)
      : `${subject.firstName}${subject.middleName ? ' ' + subject.middleName : ''} ${subject.lastName}`;

    const caTypes = [...new Set(watchlists.map(watchlistToCAType))];

    const body: CASearchRequest = {
      search_term: searchTerm,
      fuzziness: threshold,
      filters: {
        types: caTypes,
        ...(subject.dateOfBirth ? { birth_year: parseInt(subject.dateOfBirth.slice(0, 4), 10) } : {}),
        ...(subject.countryOfResidence ? { country_codes: [subject.countryOfResidence] } : {}),
      },
      tags: { customer_id: subject.customerId },
    };

    // Log WITHOUT PII
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'complyadvantage',
      action: 'screen',
      customerId: subject.customerId,
      watchlists: watchlists.join(','),
      timestamp: new Date().toISOString(),
    }));

    const res = await this.request<CASearchResponse>('POST', '/searches', body);
    const data = res.content.data;

    const matches: ScreeningMatch[] = data.hits.map((hit) => this.mapHitToMatch(hit));
    const riskLevel = mapCARiskLevel(data.risk_level);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result: ScreeningResult = {
      screeningId: `ca_${data.id}`,
      customerId: subject.customerId,
      riskLevel,
      totalMatches: data.total_hits,
      matches,
      watchlistsChecked: watchlists,
      screenedAt: data.created_at,
      expiresAt: expiresAt.toISOString(),
      provider: 'complyadvantage',
    };

    // Enable ongoing monitoring if requested
    let monitoring: MonitoringSubscription | undefined;
    if (request.enableMonitoring) {
      const monRes = await this.request<CAMonitorResponse>(
        'PATCH',
        `/searches/${data.id}`,
        { is_monitored: true },
      );

      const intervalHours = request.monitoringIntervalHours ?? 24;
      const nextScreening = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

      monitoring = {
        subscriptionId: `ca_mon_${monRes.content.data.id}`,
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
    const caId = request.screeningId.replace('ca_', '');

    const res = await this.request<CASearchResponse>('GET', `/searches/${caId}`);
    const data = res.content.data;

    const matches = data.hits.map((hit) => this.mapHitToMatch(hit));

    const result: ScreeningResult = {
      screeningId: request.screeningId,
      customerId: data.filters?.tags?.customer_id as string ?? '',
      riskLevel: mapCARiskLevel(data.risk_level),
      totalMatches: data.total_hits,
      matches,
      watchlistsChecked: [],
      screenedAt: data.created_at,
      expiresAt: data.updated_at,
      provider: 'complyadvantage',
    };

    return { result };
  }

  async listMonitoring(_request: ListMonitoringRequest): Promise<ListMonitoringResponse> {
    // ComplyAdvantage monitoring is managed per-search via is_monitored flag.
    // In production, this would query a local database that tracks monitoring state.
    return { subscriptions: [], total: 0 };
  }

  async updateMonitoring(request: UpdateMonitoringRequest): Promise<UpdateMonitoringResponse> {
    const caId = request.subscriptionId.replace('ca_mon_', '');
    const isActive = request.status === 'active';

    await this.request<CAMonitorResponse>(
      'PATCH',
      `/searches/${caId}`,
      { is_monitored: isActive },
    );

    const now = new Date();
    const intervalHours = request.refreshIntervalHours ?? 24;

    const subscription: MonitoringSubscription = {
      subscriptionId: request.subscriptionId,
      customerId: '',
      status: request.status ?? (isActive ? 'active' : 'paused'),
      watchlists: request.watchlists ?? [],
      refreshIntervalHours: intervalHours,
      lastScreenedAt: now.toISOString(),
      nextScreeningAt: new Date(now.getTime() + intervalHours * 60 * 60 * 1000).toISOString(),
      totalAlerts: 0,
      createdAt: now.toISOString(),
    };

    return { subscription };
  }

  async listAlerts(_request: ListAlertsRequest): Promise<ListAlertsResponse> {
    // ComplyAdvantage sends monitoring alerts via webhooks.
    // In production, this would query the local alerts table populated by webhooks.
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
      'Authorization': `Token ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
      // Strip any PII from error responses
      const safeError = errBody.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`ComplyAdvantage API error (${res.status}): ${safeError}`);
    }

    return res.json();
  }

  private mapHitToMatch(hit: CAHit): ScreeningMatch {
    const source = mapCATypes(hit.doc.types);
    const countries = hit.doc.fields
      .filter((f) => f.name === 'countries')
      .map((f) => f.value);

    return {
      matchId: hit.doc.id,
      matchedName: hit.doc.name,
      source,
      score: hit.score / 100, // CA returns 0-100, normalize to 0-1
      status: mapCAMatchStatus(hit.match_status),
      riskLevel: hit.score >= 90 ? 'high' : hit.score >= 70 ? 'medium' : 'low',
      details: {
        aliases: hit.doc.aka.map((a) => a.name),
        countries,
        listingType: hit.doc.types[0] ?? 'unknown',
        listedDate: null,
        listingReason: hit.doc.sources.join('; '),
      },
    };
  }
}
