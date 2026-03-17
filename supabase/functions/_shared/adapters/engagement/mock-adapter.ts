/**
 * Mock Engagement Banking Adapter
 *
 * Deterministic PFM, insights, and journey data for development and testing.
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
} from './types.ts';

const goalStore = new Map<string, FinancialGoal>();
const journeyStore = new Map<string, LifeEventJourney>();
const dismissedInsights = new Set<string>();

export class MockEngagementAdapter implements EngagementAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-engagement',
    name: 'Mock Engagement Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
      totalSpendingCents: 285000,
      totalIncomeCents: 550000,
      netCashflowCents: 265000,
      categories: [
        { name: 'Housing', code: 'housing', amountCents: 120000, budgetCents: 125000, percentage: 42.1, changePercent: 0, transactionCount: 1 },
        { name: 'Food & Drink', code: 'food_drink', amountCents: 48000, budgetCents: 50000, percentage: 16.8, changePercent: 5.2, transactionCount: 24 },
        { name: 'Transportation', code: 'transport', amountCents: 35000, budgetCents: 40000, percentage: 12.3, changePercent: -3.1, transactionCount: 12 },
        { name: 'Shopping', code: 'shopping', amountCents: 32000, budgetCents: null, percentage: 11.2, changePercent: 15.0, transactionCount: 8 },
        { name: 'Utilities', code: 'utilities', amountCents: 25000, budgetCents: 30000, percentage: 8.8, changePercent: 2.1, transactionCount: 5 },
        { name: 'Entertainment', code: 'entertainment', amountCents: 25000, budgetCents: 30000, percentage: 8.8, changePercent: -8.0, transactionCount: 6 },
      ],
    };
  }

  async getNetWorth(_request: GetNetWorthRequest): Promise<NetWorthSnapshot> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      date: new Date().toISOString(),
      totalAssetsCents: 15850000,
      totalLiabilitiesCents: 8250000,
      netWorthCents: 7600000,
      assets: [
        { name: 'Checking Account', balanceCents: 850000, type: 'checking' },
        { name: 'Savings Account', balanceCents: 3500000, type: 'savings' },
        { name: 'Investment Portfolio', balanceCents: 6500000, type: 'investment' },
        { name: 'Home Equity', balanceCents: 5000000, type: 'property' },
      ],
      liabilities: [
        { name: 'Mortgage', balanceCents: 7500000, type: 'mortgage' },
        { name: 'Credit Card', balanceCents: 250000, type: 'credit_card' },
        { name: 'Auto Loan', balanceCents: 500000, type: 'auto_loan' },
      ],
    };
  }

  async getCashflowForecast(request: GetCashflowForecastRequest): Promise<GetCashflowForecastResponse> {
    await new Promise((r) => setTimeout(r, 300));
    const forecasts = [];
    const now = new Date();
    let balance = 850000;
    for (let i = 1; i <= request.forecastDays; i++) {
      const date = new Date(now.getTime() + i * 86400000);
      const income = i % 15 === 0 ? 275000 : 0;
      const expenses = 8500 + Math.floor(Math.random() * 5000);
      balance = balance + income - expenses;
      forecasts.push({
        date: date.toISOString(),
        predictedBalanceCents: balance,
        predictedIncomeCents: income,
        predictedExpensesCents: expenses,
        confidence: Math.max(0.5, 1 - i * 0.01),
      });
    }
    return { forecasts };
  }

  async listInsights(request: ListInsightsRequest): Promise<ListInsightsResponse> {
    await new Promise((r) => setTimeout(r, 100));
    const allInsights = [
      { insightId: 'ins_1', type: 'spending_spike' as const, title: 'Spending spike in Shopping', description: 'Your shopping spending is 15% higher than usual this month.', priority: 'medium' as const, amountCents: 32000, actionUrl: null, dismissed: dismissedInsights.has('ins_1'), createdAt: new Date().toISOString() },
      { insightId: 'ins_2', type: 'savings_opportunity' as const, title: 'Potential savings on subscriptions', description: 'You have 3 subscriptions you haven\'t used in 30+ days.', priority: 'low' as const, amountCents: 4500, actionUrl: null, dismissed: dismissedInsights.has('ins_2'), createdAt: new Date().toISOString() },
      { insightId: 'ins_3', type: 'bill_reminder' as const, title: 'Upcoming credit card payment', description: 'Your credit card payment of $250.00 is due in 3 days.', priority: 'high' as const, amountCents: 25000, actionUrl: null, dismissed: dismissedInsights.has('ins_3'), createdAt: new Date().toISOString() },
    ];
    let filtered = allInsights;
    if (request.type) filtered = filtered.filter((i) => i.type === request.type);
    if (!request.includeDismissed) filtered = filtered.filter((i) => !i.dismissed);
    return { insights: filtered.slice(0, request.limit ?? 25), total: filtered.length };
  }

  async dismissInsight(request: DismissInsightRequest): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
    dismissedInsights.add(request.insightId);
  }

  async getWellnessScore(_request: GetWellnessScoreRequest): Promise<FinancialWellnessScore> {
    await new Promise((r) => setTimeout(r, 200));
    return {
      overallScore: 72,
      categories: [
        { category: 'spending', score: 68, description: 'Your spending is mostly within budget, but shopping is trending up.' },
        { category: 'saving', score: 80, description: 'Great savings rate — you\'re putting away 18% of income.' },
        { category: 'borrowing', score: 65, description: 'Credit utilization at 25% — aim for under 20%.' },
        { category: 'planning', score: 75, description: 'You have active goals and an emergency fund started.' },
      ],
      recommendations: [
        'Reduce shopping spending by 10% to stay within budget',
        'Pay down credit card balance to lower utilization below 20%',
        'Consider increasing emergency fund to 6 months of expenses',
      ],
      calculatedAt: new Date().toISOString(),
    };
  }

  async listGoals(request: ListGoalsRequest): Promise<ListGoalsResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let goals = Array.from(goalStore.values());
    if (request.status) goals = goals.filter((g) => g.status === request.status);
    return { goals, total: goals.length };
  }

  async createGoal(request: CreateGoalRequest): Promise<FinancialGoal> {
    await new Promise((r) => setTimeout(r, 200));
    const now = new Date();
    const targetDate = new Date(request.targetDate);
    const monthsRemaining = Math.max(1, (targetDate.getTime() - now.getTime()) / (30 * 86400000));
    const goal: FinancialGoal = {
      goalId: `mock_goal_${crypto.randomUUID()}`,
      name: request.name,
      targetAmountCents: request.targetAmountCents,
      currentAmountCents: 0,
      targetDate: request.targetDate,
      status: 'active',
      suggestedMonthlyCents: Math.ceil(request.targetAmountCents / monthsRemaining),
      progressPercent: 0,
      createdAt: now.toISOString(),
    };
    goalStore.set(goal.goalId, goal);
    return goal;
  }

  async listJourneys(request: ListJourneysRequest): Promise<ListJourneysResponse> {
    await new Promise((r) => setTimeout(r, 100));
    let journeys = Array.from(journeyStore.values());
    if (request.status) journeys = journeys.filter((j) => j.status === request.status);
    return { journeys, total: journeys.length };
  }

  async startJourney(request: StartJourneyRequest): Promise<LifeEventJourney> {
    await new Promise((r) => setTimeout(r, 300));
    const stepsMap: Record<string, Array<{ name: string; description: string }>> = {
      home_buying: [
        { name: 'Check credit score', description: 'Review your credit report and score' },
        { name: 'Set savings goal', description: 'Determine down payment amount needed' },
        { name: 'Get pre-approved', description: 'Apply for mortgage pre-approval' },
        { name: 'Find a home', description: 'Search for properties in your budget' },
        { name: 'Close the deal', description: 'Complete the purchase process' },
      ],
      retirement: [
        { name: 'Assess current savings', description: 'Review your retirement accounts' },
        { name: 'Set retirement target', description: 'Calculate your retirement number' },
        { name: 'Optimize contributions', description: 'Maximize tax-advantaged contributions' },
        { name: 'Review investments', description: 'Ensure proper asset allocation' },
      ],
      debt_payoff: [
        { name: 'List all debts', description: 'Catalog all outstanding debts' },
        { name: 'Choose strategy', description: 'Avalanche (highest rate) or Snowball (smallest balance)' },
        { name: 'Set up payments', description: 'Automate extra payments to target debt' },
        { name: 'Track progress', description: 'Monitor debt reduction monthly' },
      ],
    };

    const steps = (stepsMap[request.type] ?? [{ name: 'Get started', description: 'Begin your journey' }])
      .map((s, i) => ({
        stepId: `step_${i + 1}`,
        name: s.name,
        description: s.description,
        status: 'pending' as const,
        order: i + 1,
        actionUrl: null,
      }));

    const journey: LifeEventJourney = {
      journeyId: `mock_journey_${crypto.randomUUID()}`,
      type: request.type,
      name: request.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      status: 'in_progress',
      steps,
      progressPercent: 0,
      createdAt: new Date().toISOString(),
    };
    journeyStore.set(journey.journeyId, journey);
    return journey;
  }
}
