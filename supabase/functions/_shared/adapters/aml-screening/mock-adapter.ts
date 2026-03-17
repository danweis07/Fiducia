/**
 * Mock AML Screening Adapter
 *
 * Deterministic watchlist screening for development and testing.
 *
 * Decision rules:
 * - Last name starting with "SANCTIONED" → confirmed match (OFAC SDN)
 * - Last name starting with "PEP" → potential match (PEP list)
 * - Last name starting with "ADVERSE" → potential match (adverse media)
 * - All others → no match (clean)
 *
 * IMPORTANT: Even in mock mode, PII must never appear in logs.
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
  MonitoringSubscription,
  MonitoringAlert,
  WatchlistSource,
} from './types.ts';

// =============================================================================
// IN-MEMORY STORES
// =============================================================================

const screeningStore = new Map<string, ScreeningResult>();
const monitoringStore = new Map<string, MonitoringSubscription>();
const alertStore = new Map<string, MonitoringAlert>();

// =============================================================================
// ALL WATCHLISTS
// =============================================================================

const ALL_WATCHLISTS: WatchlistSource[] = [
  'ofac_sdn', 'ofac_non_sdn', 'un_sanctions', 'eu_sanctions',
  'uk_hmt', 'pep', 'adverse_media', 'law_enforcement',
];

// =============================================================================
// ADAPTER
// =============================================================================

export class MockAMLScreeningAdapter implements AMLScreeningAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-aml-screening',
    name: 'Mock AML Screening',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async screen(request: ScreenRequest): Promise<ScreenResponse> {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = new Date();
    const screeningId = `mock_scr_${crypto.randomUUID()}`;
    const { subject } = request;
    const watchlists = request.watchlists ?? ALL_WATCHLISTS;
    const lastName = subject.lastName.toUpperCase();

    const { matches, riskLevel } = this.decide(lastName, watchlists);

    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result: ScreeningResult = {
      screeningId,
      customerId: subject.customerId,
      riskLevel,
      totalMatches: matches.length,
      matches,
      watchlistsChecked: watchlists,
      screenedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      provider: 'mock',
    };

    screeningStore.set(screeningId, result);

    // Log WITHOUT PII
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'mock-aml-screening',
      action: 'screen',
      screeningId,
      customerId: subject.customerId,
      riskLevel,
      totalMatches: matches.length,
      timestamp: now.toISOString(),
    }));

    let monitoring: MonitoringSubscription | undefined;
    if (request.enableMonitoring) {
      monitoring = this.createMonitoringSubscription(
        subject.customerId,
        watchlists,
        request.monitoringIntervalHours ?? 24,
        now,
      );
    }

    return { result, monitoring };
  }

  async getScreening(request: GetScreeningRequest): Promise<GetScreeningResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const result = screeningStore.get(request.screeningId);
    if (!result) {
      throw new Error(`Screening not found: ${request.screeningId}`);
    }

    return { result };
  }

  async listMonitoring(request: ListMonitoringRequest): Promise<ListMonitoringResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    let subs = Array.from(monitoringStore.values());

    if (request.customerId) {
      subs = subs.filter((s) => s.customerId === request.customerId);
    }
    if (request.status) {
      subs = subs.filter((s) => s.status === request.status);
    }

    const total = subs.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    subs = subs.slice(offset, offset + limit);

    return { subscriptions: subs, total };
  }

  async updateMonitoring(request: UpdateMonitoringRequest): Promise<UpdateMonitoringResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const sub = monitoringStore.get(request.subscriptionId);
    if (!sub) {
      throw new Error(`Monitoring subscription not found: ${request.subscriptionId}`);
    }

    if (request.status) sub.status = request.status;
    if (request.watchlists) sub.watchlists = request.watchlists;
    if (request.refreshIntervalHours) sub.refreshIntervalHours = request.refreshIntervalHours;

    monitoringStore.set(request.subscriptionId, sub);

    return { subscription: sub };
  }

  async listAlerts(request: ListAlertsRequest): Promise<ListAlertsResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    let alerts = Array.from(alertStore.values());

    if (request.customerId) {
      alerts = alerts.filter((a) => a.customerId === request.customerId);
    }
    if (request.subscriptionId) {
      alerts = alerts.filter((a) => a.subscriptionId === request.subscriptionId);
    }
    if (request.unreviewedOnly) {
      alerts = alerts.filter((a) => !a.reviewed);
    }

    const total = alerts.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 25;
    alerts = alerts.slice(offset, offset + limit);

    return { alerts, total };
  }

  async reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const alert = alertStore.get(request.alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${request.alertId}`);
    }

    alert.reviewed = true;
    alert.reviewNotes = request.notes;
    alert.reviewedAt = new Date().toISOString();

    if (request.confirmedMatch) {
      alert.match.status = 'true_positive';
    } else {
      alert.match.status = 'false_positive';
    }

    alertStore.set(request.alertId, alert);

    return { alert };
  }

  // ---------------------------------------------------------------------------
  // DECISION LOGIC
  // ---------------------------------------------------------------------------

  private decide(
    lastName: string,
    watchlists: WatchlistSource[],
  ): { matches: ScreeningMatch[]; riskLevel: ScreeningRiskLevel } {
    const matches: ScreeningMatch[] = [];

    if (lastName.startsWith('SANCTIONED')) {
      if (watchlists.includes('ofac_sdn')) {
        matches.push({
          matchId: `mock_match_${crypto.randomUUID()}`,
          matchedName: `${lastName} (OFAC SDN Entry)`,
          source: 'ofac_sdn',
          score: 0.95,
          status: 'confirmed_match',
          riskLevel: 'confirmed',
          details: {
            aliases: ['Alias One', 'Alias Two'],
            countries: ['IR', 'SY'],
            listingType: 'sanctions',
            listedDate: '2020-01-15',
            listingReason: 'Designated pursuant to E.O. 13224',
          },
        });
      }
      if (watchlists.includes('un_sanctions')) {
        matches.push({
          matchId: `mock_match_${crypto.randomUUID()}`,
          matchedName: `${lastName} (UN Sanctions Entry)`,
          source: 'un_sanctions',
          score: 0.92,
          status: 'confirmed_match',
          riskLevel: 'confirmed',
          details: {
            aliases: [],
            countries: ['IR'],
            listingType: 'sanctions',
            listedDate: '2019-06-01',
            listingReason: 'UN Security Council Resolution 2231',
          },
        });
      }
      return { matches, riskLevel: 'confirmed' };
    }

    if (lastName.startsWith('PEP')) {
      if (watchlists.includes('pep')) {
        matches.push({
          matchId: `mock_match_${crypto.randomUUID()}`,
          matchedName: `${lastName} (PEP Entry)`,
          source: 'pep',
          score: 0.78,
          status: 'potential_match',
          riskLevel: 'medium',
          details: {
            aliases: [],
            countries: ['US'],
            listingType: 'pep',
            listedDate: null,
            listingReason: 'Government official — enhanced due diligence required',
          },
        });
      }
      return { matches, riskLevel: 'medium' };
    }

    if (lastName.startsWith('ADVERSE')) {
      if (watchlists.includes('adverse_media')) {
        matches.push({
          matchId: `mock_match_${crypto.randomUUID()}`,
          matchedName: `${lastName} (Adverse Media Hit)`,
          source: 'adverse_media',
          score: 0.72,
          status: 'potential_match',
          riskLevel: 'low',
          details: {
            aliases: [],
            countries: ['US'],
            listingType: 'adverse_media',
            listedDate: '2024-03-10',
            listingReason: 'Mentioned in financial fraud investigation reporting',
          },
        });
      }
      return { matches, riskLevel: 'low' };
    }

    return { matches: [], riskLevel: 'no_match' };
  }

  // ---------------------------------------------------------------------------
  // MONITORING HELPERS
  // ---------------------------------------------------------------------------

  private createMonitoringSubscription(
    customerId: string,
    watchlists: WatchlistSource[],
    intervalHours: number,
    now: Date,
  ): MonitoringSubscription {
    const subscriptionId = `mock_mon_${crypto.randomUUID()}`;
    const nextScreening = new Date(now.getTime() + intervalHours * 60 * 60 * 1000);

    const sub: MonitoringSubscription = {
      subscriptionId,
      customerId,
      status: 'active',
      watchlists,
      refreshIntervalHours: intervalHours,
      lastScreenedAt: now.toISOString(),
      nextScreeningAt: nextScreening.toISOString(),
      totalAlerts: 0,
      createdAt: now.toISOString(),
    };

    monitoringStore.set(subscriptionId, sub);
    return sub;
  }
}
