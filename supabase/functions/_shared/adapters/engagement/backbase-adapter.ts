// TODO: Provisional integration — not yet validated in production.
/**
 * Backbase Engagement Banking Adapter
 *
 * Integrates with Backbase's AI-Native Engagement platform for pre-built
 * "Life Event" journeys (home buying, retirement, etc.) that sit on top
 * of legacy or modern banking cores.
 *
 * Backbase API docs: https://developer.backbase.com
 * Auth: OAuth2 client credentials with service-to-service token
 *
 * All monetary values are integer cents.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  EngagementAdapter,
  GetSpendingSummaryRequest,
  SpendingSummary,
  GetNetWorthRequest,
  NetWorthSnapshot,
  GetCashflowForecastRequest,
  GetCashflowForecastResponse,
  ListInsightsRequest,
  ListInsightsResponse,
  DismissInsightRequest,
  GetWellnessScoreRequest,
  FinancialWellnessScore,
  ListGoalsRequest,
  ListGoalsResponse,
  CreateGoalRequest,
  FinancialGoal,
  ListJourneysRequest,
  ListJourneysResponse,
  StartJourneyRequest,
  LifeEventJourney,
  SpendingCategory,
  FinancialInsight,
  CashflowForecast,
} from './types.ts';

// =============================================================================
// ADAPTER
// =============================================================================

export class BackbaseEngagementAdapter implements EngagementAdapter {
  readonly config: AdapterConfig = {
    id: 'backbase',
    name: 'Backbase AI-Native Engagement',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = Deno.env.get('BACKBASE_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('BACKBASE_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('BACKBASE_BASE_URL') ?? 'https://api.backbase.com/engagement/v2';
  }

  private get sandbox(): boolean { return !this.clientId || !this.clientSecret; }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }
    try {
      await this.ensureToken();
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary> {
    const data = await this.request<{
      period_start: string; period_end: string;
      total_spending: number; total_income: number;
      categories: Array<{ name: string; code: string; amount: number; budget: number | null; percentage: number; change_pct: number; count: number }>;
    }>('GET', `/users/${request.userId}/spending?from=${request.periodStart}&to=${request.periodEnd}`);

    return {
      periodStart: data.period_start,
      periodEnd: data.period_end,
      totalSpendingCents: Math.round(data.total_spending * 100),
      totalIncomeCents: Math.round(data.total_income * 100),
      netCashflowCents: Math.round((data.total_income - data.total_spending) * 100),
      categories: data.categories.map((c): SpendingCategory => ({
        name: c.name, code: c.code,
        amountCents: Math.round(c.amount * 100),
        budgetCents: c.budget != null ? Math.round(c.budget * 100) : null,
        percentage: c.percentage, changePercent: c.change_pct, transactionCount: c.count,
      })),
    };
  }

  async getNetWorth(request: GetNetWorthRequest): Promise<NetWorthSnapshot> {
    const data = await this.request<{
      date: string; total_assets: number; total_liabilities: number;
      assets: Array<{ name: string; balance: number; type: string }>;
      liabilities: Array<{ name: string; balance: number; type: string }>;
    }>('GET', `/users/${request.userId}/net-worth`);

    return {
      date: data.date,
      totalAssetsCents: Math.round(data.total_assets * 100),
      totalLiabilitiesCents: Math.round(data.total_liabilities * 100),
      netWorthCents: Math.round((data.total_assets - data.total_liabilities) * 100),
      assets: data.assets.map((a) => ({ name: a.name, balanceCents: Math.round(a.balance * 100), type: a.type as 'checking' | 'savings' | 'investment' | 'property' | 'other' })),
      liabilities: data.liabilities.map((l) => ({ name: l.name, balanceCents: Math.round(l.balance * 100), type: l.type as 'credit_card' | 'mortgage' | 'auto_loan' | 'student_loan' | 'other' })),
    };
  }

  async getCashflowForecast(request: GetCashflowForecastRequest): Promise<GetCashflowForecastResponse> {
    const data = await this.request<{ forecasts: Array<{
      date: string; predicted_balance: number; predicted_income: number; predicted_expenses: number; confidence: number;
    }> }>('GET', `/users/${request.userId}/cashflow-forecast?days=${request.forecastDays}`);

    return {
      forecasts: data.forecasts.map((f): CashflowForecast => ({
        date: f.date,
        predictedBalanceCents: Math.round(f.predicted_balance * 100),
        predictedIncomeCents: Math.round(f.predicted_income * 100),
        predictedExpensesCents: Math.round(f.predicted_expenses * 100),
        confidence: f.confidence,
      })),
    };
  }

  async listInsights(request: ListInsightsRequest): Promise<ListInsightsResponse> {
    const params = new URLSearchParams();
    if (request.type) params.set('type', request.type);
    if (request.includeDismissed) params.set('include_dismissed', 'true');
    params.set('limit', String(request.limit ?? 25));

    const data = await this.request<{ items: Array<{
      id: string; type: string; title: string; description: string; priority: string;
      amount: number | null; action_url: string | null; dismissed: boolean; created_at: string;
    }>; total: number }>('GET', `/users/${request.userId}/insights?${params.toString()}`);

    return {
      insights: data.items.map((i): FinancialInsight => ({
        insightId: i.id,
        type: i.type as FinancialInsight['type'],
        title: i.title, description: i.description,
        priority: i.priority as 'low' | 'medium' | 'high',
        amountCents: i.amount != null ? Math.round(i.amount * 100) : null,
        actionUrl: i.action_url, dismissed: i.dismissed, createdAt: i.created_at,
      })),
      total: data.total,
    };
  }

  async dismissInsight(request: DismissInsightRequest): Promise<void> {
    await this.request<unknown>('POST', `/users/${request.userId}/insights/${request.insightId}/dismiss`);
  }

  async getWellnessScore(request: GetWellnessScoreRequest): Promise<FinancialWellnessScore> {
    const data = await this.request<{
      overall_score: number;
      categories: Array<{ category: string; score: number; description: string }>;
      recommendations: string[];
      calculated_at: string;
    }>('GET', `/users/${request.userId}/wellness-score`);

    return {
      overallScore: data.overall_score,
      categories: data.categories.map((c) => ({
        category: c.category as import('./types.ts').WellnessScoreCategory,
        score: c.score, description: c.description,
      })),
      recommendations: data.recommendations,
      calculatedAt: data.calculated_at,
    };
  }

  async listGoals(request: ListGoalsRequest): Promise<ListGoalsResponse> {
    const params = new URLSearchParams();
    if (request.status) params.set('status', request.status);

    const data = await this.request<{ items: Array<{
      id: string; name: string; target_amount: number; current_amount: number;
      target_date: string; status: string; suggested_monthly: number; progress: number; created_at: string;
    }>; total: number }>('GET', `/users/${request.userId}/goals?${params.toString()}`);

    return {
      goals: data.items.map((g): FinancialGoal => ({
        goalId: g.id, name: g.name,
        targetAmountCents: Math.round(g.target_amount * 100),
        currentAmountCents: Math.round(g.current_amount * 100),
        targetDate: g.target_date,
        status: g.status as FinancialGoal['status'],
        suggestedMonthlyCents: Math.round(g.suggested_monthly * 100),
        progressPercent: g.progress, createdAt: g.created_at,
      })),
      total: data.total,
    };
  }

  async createGoal(request: CreateGoalRequest): Promise<FinancialGoal> {
    const data = await this.request<{
      id: string; name: string; target_amount: number; current_amount: number;
      target_date: string; status: string; suggested_monthly: number; progress: number; created_at: string;
    }>('POST', `/users/${request.userId}/goals`, {
      name: request.name,
      target_amount: request.targetAmountCents / 100,
      target_date: request.targetDate,
    });

    return {
      goalId: data.id, name: data.name,
      targetAmountCents: Math.round(data.target_amount * 100),
      currentAmountCents: Math.round(data.current_amount * 100),
      targetDate: data.target_date,
      status: data.status as FinancialGoal['status'],
      suggestedMonthlyCents: Math.round(data.suggested_monthly * 100),
      progressPercent: data.progress, createdAt: data.created_at,
    };
  }

  async listJourneys(request: ListJourneysRequest): Promise<ListJourneysResponse> {
    const params = new URLSearchParams();
    if (request.status) params.set('status', request.status);

    const data = await this.request<{ items: Array<{
      id: string; type: string; name: string; status: string; progress: number; created_at: string;
      steps: Array<{ id: string; name: string; description: string; status: string; order: number; action_url: string | null }>;
    }>; total: number }>('GET', `/users/${request.userId}/journeys?${params.toString()}`);

    return {
      journeys: data.items.map((j): LifeEventJourney => ({
        journeyId: j.id, type: j.type as LifeEventJourney['type'],
        name: j.name, status: j.status as LifeEventJourney['status'],
        steps: j.steps.map((s) => ({
          stepId: s.id, name: s.name, description: s.description,
          status: s.status as import('./types.ts').JourneyStep['status'],
          order: s.order, actionUrl: s.action_url,
        })),
        progressPercent: j.progress, createdAt: j.created_at,
      })),
      total: data.total,
    };
  }

  async startJourney(request: StartJourneyRequest): Promise<LifeEventJourney> {
    const data = await this.request<{
      id: string; type: string; name: string; status: string; progress: number; created_at: string;
      steps: Array<{ id: string; name: string; description: string; status: string; order: number; action_url: string | null }>;
    }>('POST', `/users/${request.userId}/journeys`, { type: request.type });

    return {
      journeyId: data.id, type: data.type as LifeEventJourney['type'],
      name: data.name, status: data.status as LifeEventJourney['status'],
      steps: data.steps.map((s) => ({
        stepId: s.id, name: s.name, description: s.description,
        status: s.status as import('./types.ts').JourneyStep['status'],
        order: s.order, actionUrl: s.action_url,
      })),
      progressPercent: data.progress, createdAt: data.created_at,
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`,
    });
    if (!res.ok) throw new Error(`Backbase auth failed: ${res.status}`);
    const token = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Backbase adapter in sandbox mode — credentials not configured');
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Authorization': `Bearer ${this.accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Backbase API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }
}
