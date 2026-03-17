// TODO: Provisional integration — not yet validated in production.
/**
 * Meniga Engagement Banking Adapter
 *
 * Integrates with Meniga's Personal Financial Management (PFM) platform
 * for transaction enrichment, spending insights, net worth tracking,
 * and financial wellness scoring.
 *
 * Meniga API docs: https://docs.meniga.com
 * Auth: API key via x-api-key header + OAuth2 for user context
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

export class MenigaEngagementAdapter implements EngagementAdapter {
  readonly config: AdapterConfig = {
    id: 'meniga',
    name: 'Meniga PFM & Insights',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('MENIGA_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('MENIGA_BASE_URL') ?? 'https://api.meniga.com/v1';
  }

  private get sandbox(): boolean { return !this.apiKey; }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }
    try {
      await this.request<unknown>('GET', '/health');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Unknown' };
    }
  }

  async getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary> {
    const data = await this.request<{
      period_from: string; period_to: string;
      total_expenses: number; total_income: number;
      categories: Array<{ category_name: string; category_id: string; amount: number; budget_amount: number | null; share: number; delta_pct: number; transaction_count: number }>;
    }>('POST', '/transactions/categorysummary', {
      period_from: request.periodStart,
      period_to: request.periodEnd,
      account_ids: request.accountIds ?? [],
    });

    return {
      periodStart: data.period_from,
      periodEnd: data.period_to,
      totalSpendingCents: Math.round(data.total_expenses * 100),
      totalIncomeCents: Math.round(data.total_income * 100),
      netCashflowCents: Math.round((data.total_income - data.total_expenses) * 100),
      categories: data.categories.map((c): SpendingCategory => ({
        name: c.category_name, code: c.category_id,
        amountCents: Math.round(c.amount * 100),
        budgetCents: c.budget_amount != null ? Math.round(c.budget_amount * 100) : null,
        percentage: c.share, changePercent: c.delta_pct, transactionCount: c.transaction_count,
      })),
    };
  }

  async getNetWorth(request: GetNetWorthRequest): Promise<NetWorthSnapshot> {
    const data = await this.request<{
      date: string; total_assets: number; total_liabilities: number; net_worth: number;
      asset_accounts: Array<{ name: string; balance: number; account_type: string }>;
      liability_accounts: Array<{ name: string; balance: number; account_type: string }>;
    }>('GET', `/users/${request.userId}/networth`);

    const assetTypeMap: Record<string, 'checking' | 'savings' | 'investment' | 'property' | 'other'> = {
      checking: 'checking', savings: 'savings', investment: 'investment', real_estate: 'property',
    };
    const liabilityTypeMap: Record<string, 'credit_card' | 'mortgage' | 'auto_loan' | 'student_loan' | 'other'> = {
      credit_card: 'credit_card', mortgage: 'mortgage', auto_loan: 'auto_loan', student_loan: 'student_loan',
    };

    return {
      date: data.date,
      totalAssetsCents: Math.round(data.total_assets * 100),
      totalLiabilitiesCents: Math.round(data.total_liabilities * 100),
      netWorthCents: Math.round(data.net_worth * 100),
      assets: data.asset_accounts.map((a) => ({
        name: a.name, balanceCents: Math.round(a.balance * 100),
        type: assetTypeMap[a.account_type] ?? 'other',
      })),
      liabilities: data.liability_accounts.map((l) => ({
        name: l.name, balanceCents: Math.round(l.balance * 100),
        type: liabilityTypeMap[l.account_type] ?? 'other',
      })),
    };
  }

  async getCashflowForecast(request: GetCashflowForecastRequest): Promise<GetCashflowForecastResponse> {
    const data = await this.request<{ forecasts: Array<{
      date: string; balance: number; income: number; expenses: number; confidence: number;
    }> }>('GET', `/users/${request.userId}/cashflow-forecast?days=${request.forecastDays}`);

    return {
      forecasts: data.forecasts.map((f): CashflowForecast => ({
        date: f.date,
        predictedBalanceCents: Math.round(f.balance * 100),
        predictedIncomeCents: Math.round(f.income * 100),
        predictedExpensesCents: Math.round(f.expenses * 100),
        confidence: f.confidence,
      })),
    };
  }

  async listInsights(request: ListInsightsRequest): Promise<ListInsightsResponse> {
    const params = new URLSearchParams();
    if (request.type) params.set('type', request.type);
    if (!request.includeDismissed) params.set('active_only', 'true');
    params.set('top', String(request.limit ?? 25));

    const data = await this.request<{ items: Array<{
      id: string; type: string; title: string; text: string; importance: string;
      amount: number | null; action_url: string | null; is_read: boolean; created: string;
    }>; total_count: number }>('GET', `/feed?${params.toString()}`);

    const priorityMap: Record<string, 'low' | 'medium' | 'high'> = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high' };
    const typeMap: Record<string, FinancialInsight['type']> = {
      SPENDING_SPIKE: 'spending_spike', RECURRING: 'recurring_charge',
      SAVING_TIP: 'savings_opportunity', BILL_REMINDER: 'bill_reminder',
      UNUSUAL: 'unusual_activity', GOAL: 'goal_progress', BUDGET: 'budget_alert',
    };

    return {
      insights: data.items.map((i): FinancialInsight => ({
        insightId: i.id,
        type: typeMap[i.type] ?? 'spending_spike',
        title: i.title, description: i.text,
        priority: priorityMap[i.importance] ?? 'medium',
        amountCents: i.amount != null ? Math.round(i.amount * 100) : null,
        actionUrl: i.action_url, dismissed: i.is_read, createdAt: i.created,
      })),
      total: data.total_count,
    };
  }

  async dismissInsight(request: DismissInsightRequest): Promise<void> {
    await this.request<unknown>('PUT', `/feed/${request.insightId}/read`);
  }

  async getWellnessScore(request: GetWellnessScoreRequest): Promise<FinancialWellnessScore> {
    const data = await this.request<{
      score: number;
      dimensions: Array<{ name: string; score: number; description: string }>;
      tips: string[];
      timestamp: string;
    }>('GET', `/users/${request.userId}/financial-health`);

    const categoryMap: Record<string, import('./types.ts').WellnessScoreCategory> = {
      spending: 'spending', saving: 'saving', borrowing: 'borrowing', planning: 'planning',
    };

    return {
      overallScore: data.score,
      categories: data.dimensions.map((d) => ({
        category: categoryMap[d.name.toLowerCase()] ?? 'spending',
        score: d.score, description: d.description,
      })),
      recommendations: data.tips,
      calculatedAt: data.timestamp,
    };
  }

  async listGoals(request: ListGoalsRequest): Promise<ListGoalsResponse> {
    const params = new URLSearchParams();
    if (request.status) params.set('status', request.status);

    const data = await this.request<{ items: Array<{
      id: string; name: string; target_amount: number; saved_amount: number;
      target_date: string; status: string; monthly_suggestion: number; progress_pct: number; created_at: string;
    }>; total: number }>('GET', `/users/${request.userId}/goals?${params.toString()}`);

    return {
      goals: data.items.map((g): FinancialGoal => ({
        goalId: g.id, name: g.name,
        targetAmountCents: Math.round(g.target_amount * 100),
        currentAmountCents: Math.round(g.saved_amount * 100),
        targetDate: g.target_date,
        status: g.status as FinancialGoal['status'],
        suggestedMonthlyCents: Math.round(g.monthly_suggestion * 100),
        progressPercent: g.progress_pct, createdAt: g.created_at,
      })),
      total: data.total,
    };
  }

  async createGoal(request: CreateGoalRequest): Promise<FinancialGoal> {
    const data = await this.request<{
      id: string; name: string; target_amount: number; saved_amount: number;
      target_date: string; status: string; monthly_suggestion: number; progress_pct: number; created_at: string;
    }>('POST', `/users/${request.userId}/goals`, {
      name: request.name,
      target_amount: request.targetAmountCents / 100,
      target_date: request.targetDate,
    });

    return {
      goalId: data.id, name: data.name,
      targetAmountCents: Math.round(data.target_amount * 100),
      currentAmountCents: Math.round(data.saved_amount * 100),
      targetDate: data.target_date,
      status: data.status as FinancialGoal['status'],
      suggestedMonthlyCents: Math.round(data.monthly_suggestion * 100),
      progressPercent: data.progress_pct, createdAt: data.created_at,
    };
  }

  async listJourneys(_request: ListJourneysRequest): Promise<ListJourneysResponse> {
    // Meniga doesn't have native journey support — return empty
    // Life-event journeys are primarily a Backbase feature
    return { journeys: [], total: 0 };
  }

  async startJourney(_request: StartJourneyRequest): Promise<LifeEventJourney> {
    throw new Error('Meniga does not support life-event journeys — use Backbase for journey capabilities');
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Meniga adapter in sandbox mode — MENIGA_API_KEY not configured');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'x-api-key': this.apiKey, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Meniga API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }
}
