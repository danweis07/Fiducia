/**
 * Engagement Banking Adapter Interface
 *
 * Defines the contract for customer engagement, personal financial management
 * (PFM), and life-event journey providers.
 *
 * Providers: Backbase (AI-Native Engagement), Meniga (PFM/Insights)
 *
 * These providers enable:
 *   - Personal financial management dashboards (net worth, budgets, goals)
 *   - Life-event banking journeys (home buying, retirement, etc.)
 *   - Transaction categorization and spending insights
 *   - Financial wellness scores and recommendations
 *   - Cashflow forecasting and anomaly detection
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// PFM TYPES
// =============================================================================

export interface SpendingCategory {
  /** Category name (e.g., "Food & Drink", "Transportation") */
  name: string;
  /** Category code */
  code: string;
  /** Spending amount in cents for the period */
  amountCents: number;
  /** Budget amount in cents (null if no budget set) */
  budgetCents: number | null;
  /** Percentage of total spending */
  percentage: number;
  /** Change from previous period (-100 to +∞) */
  changePercent: number;
  /** Number of transactions */
  transactionCount: number;
}

export interface SpendingSummary {
  /** Period start (ISO 8601) */
  periodStart: string;
  /** Period end (ISO 8601) */
  periodEnd: string;
  /** Total spending in cents */
  totalSpendingCents: number;
  /** Total income in cents */
  totalIncomeCents: number;
  /** Net cashflow in cents */
  netCashflowCents: number;
  /** Spending by category */
  categories: SpendingCategory[];
}

export interface NetWorthSnapshot {
  /** Snapshot date (ISO 8601) */
  date: string;
  /** Total assets in cents */
  totalAssetsCents: number;
  /** Total liabilities in cents */
  totalLiabilitiesCents: number;
  /** Net worth in cents */
  netWorthCents: number;
  /** Assets breakdown */
  assets: Array<{ name: string; balanceCents: number; type: 'checking' | 'savings' | 'investment' | 'property' | 'other' }>;
  /** Liabilities breakdown */
  liabilities: Array<{ name: string; balanceCents: number; type: 'credit_card' | 'mortgage' | 'auto_loan' | 'student_loan' | 'other' }>;
}

export interface CashflowForecast {
  /** Forecast date (ISO 8601) */
  date: string;
  /** Predicted balance in cents */
  predictedBalanceCents: number;
  /** Predicted income in cents */
  predictedIncomeCents: number;
  /** Predicted expenses in cents */
  predictedExpensesCents: number;
  /** Confidence (0.0 - 1.0) */
  confidence: number;
}

export interface FinancialInsight {
  /** Insight ID */
  insightId: string;
  /** Insight type */
  type: 'spending_spike' | 'recurring_charge' | 'savings_opportunity' | 'bill_reminder' | 'unusual_activity' | 'goal_progress' | 'budget_alert';
  /** Title */
  title: string;
  /** Description */
  description: string;
  /** Severity/priority */
  priority: 'low' | 'medium' | 'high';
  /** Related amount in cents (if applicable) */
  amountCents: number | null;
  /** Action URL or deep link (if applicable) */
  actionUrl: string | null;
  /** Whether dismissed by user */
  dismissed: boolean;
  /** Created at (ISO 8601) */
  createdAt: string;
}

export interface FinancialGoal {
  /** Goal ID */
  goalId: string;
  /** Goal name */
  name: string;
  /** Target amount in cents */
  targetAmountCents: number;
  /** Current amount in cents */
  currentAmountCents: number;
  /** Target date (ISO 8601) */
  targetDate: string;
  /** Status */
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  /** Monthly contribution suggestion in cents */
  suggestedMonthlyCents: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Created at (ISO 8601) */
  createdAt: string;
}

export type WellnessScoreCategory = 'spending' | 'saving' | 'borrowing' | 'planning';

export interface FinancialWellnessScore {
  /** Overall score (0-100) */
  overallScore: number;
  /** Category scores */
  categories: Array<{
    category: WellnessScoreCategory;
    score: number;
    description: string;
  }>;
  /** Recommendations */
  recommendations: string[];
  /** Calculated at (ISO 8601) */
  calculatedAt: string;
}

// =============================================================================
// LIFE EVENT JOURNEY TYPES
// =============================================================================

export interface LifeEventJourney {
  /** Journey ID */
  journeyId: string;
  /** Journey type */
  type: 'home_buying' | 'retirement' | 'education' | 'new_baby' | 'career_change' | 'debt_payoff' | 'custom';
  /** Journey name */
  name: string;
  /** Status */
  status: 'not_started' | 'in_progress' | 'completed';
  /** Steps */
  steps: JourneyStep[];
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Created at (ISO 8601) */
  createdAt: string;
}

export interface JourneyStep {
  /** Step ID */
  stepId: string;
  /** Step name */
  name: string;
  /** Description */
  description: string;
  /** Status */
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  /** Order */
  order: number;
  /** Action URL/deep link */
  actionUrl: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface GetSpendingSummaryRequest {
  tenantId: string;
  userId: string;
  /** Period start (ISO 8601) */
  periodStart: string;
  /** Period end (ISO 8601) */
  periodEnd: string;
  /** Account IDs to include (null = all) */
  accountIds?: string[];
}

export interface GetNetWorthRequest {
  tenantId: string;
  userId: string;
}

export interface GetCashflowForecastRequest {
  tenantId: string;
  userId: string;
  /** Number of days to forecast */
  forecastDays: number;
}

export interface GetCashflowForecastResponse {
  forecasts: CashflowForecast[];
}

export interface ListInsightsRequest {
  tenantId: string;
  userId: string;
  type?: FinancialInsight['type'];
  includeDismissed?: boolean;
  limit?: number;
}

export interface ListInsightsResponse {
  insights: FinancialInsight[];
  total: number;
}

export interface DismissInsightRequest {
  tenantId: string;
  userId: string;
  insightId: string;
}

export interface GetWellnessScoreRequest {
  tenantId: string;
  userId: string;
}

export interface ListGoalsRequest {
  tenantId: string;
  userId: string;
  status?: FinancialGoal['status'];
}

export interface ListGoalsResponse {
  goals: FinancialGoal[];
  total: number;
}

export interface CreateGoalRequest {
  tenantId: string;
  userId: string;
  name: string;
  targetAmountCents: number;
  targetDate: string;
}

export interface ListJourneysRequest {
  tenantId: string;
  userId: string;
  status?: LifeEventJourney['status'];
}

export interface ListJourneysResponse {
  journeys: LifeEventJourney[];
  total: number;
}

export interface StartJourneyRequest {
  tenantId: string;
  userId: string;
  type: LifeEventJourney['type'];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Engagement Banking adapter — abstracts PFM, insights, and life-event journeys.
 *
 * Implementations handle provider-specific APIs (Backbase, Meniga) while
 * exposing a uniform interface for financial insights, wellness scoring,
 * and guided banking journeys.
 */
export interface EngagementAdapter extends BaseAdapter {
  /** Get spending summary for a period */
  getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary>;

  /** Get current net worth snapshot */
  getNetWorth(request: GetNetWorthRequest): Promise<NetWorthSnapshot>;

  /** Get cashflow forecast */
  getCashflowForecast(request: GetCashflowForecastRequest): Promise<GetCashflowForecastResponse>;

  /** List financial insights */
  listInsights(request: ListInsightsRequest): Promise<ListInsightsResponse>;

  /** Dismiss an insight */
  dismissInsight(request: DismissInsightRequest): Promise<void>;

  /** Get financial wellness score */
  getWellnessScore(request: GetWellnessScoreRequest): Promise<FinancialWellnessScore>;

  /** List financial goals */
  listGoals(request: ListGoalsRequest): Promise<ListGoalsResponse>;

  /** Create a financial goal */
  createGoal(request: CreateGoalRequest): Promise<FinancialGoal>;

  /** List life-event journeys */
  listJourneys(request: ListJourneysRequest): Promise<ListJourneysResponse>;

  /** Start a life-event journey */
  startJourney(request: StartJourneyRequest): Promise<LifeEventJourney>;
}
