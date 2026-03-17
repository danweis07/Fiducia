/**
 * Mock Financial Data Adapter
 *
 * Sandbox implementation with realistic spending data, merchant logos,
 * and financial insights for development and demos.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  FinancialDataAdapter,
  SpendingSummary,
  SpendingByCategory,
  Budget,
  NetWorthSnapshot,
  RecurringTransaction,
  SpendingCategory,
  EnrichTransactionsRequest,
  EnrichTransactionsResponse,
  GetSpendingSummaryRequest,
  GetMonthlyTrendsRequest,
  GetMonthlyTrendsResponse,
  ListBudgetsRequest,
  ListBudgetsResponse,
  SetBudgetRequest,
  GetNetWorthRequest,
  GetNetWorthHistoryRequest,
  GetRecurringTransactionsRequest,
  GetRecurringTransactionsResponse,
} from './types.ts';

// =============================================================================
// MOCK MERCHANT DATABASE
// =============================================================================

const MERCHANT_DB: Record<string, { name: string; category: SpendingCategory; logoUrl: string }> = {
  'starbucks': { name: 'Starbucks', category: 'food_dining', logoUrl: 'https://logo.clearbit.com/starbucks.com' },
  'netflix': { name: 'Netflix', category: 'subscriptions', logoUrl: 'https://logo.clearbit.com/netflix.com' },
  'spotify': { name: 'Spotify', category: 'subscriptions', logoUrl: 'https://logo.clearbit.com/spotify.com' },
  'amazon': { name: 'Amazon', category: 'shopping', logoUrl: 'https://logo.clearbit.com/amazon.com' },
  'walmart': { name: 'Walmart', category: 'groceries', logoUrl: 'https://logo.clearbit.com/walmart.com' },
  'target': { name: 'Target', category: 'shopping', logoUrl: 'https://logo.clearbit.com/target.com' },
  'uber': { name: 'Uber', category: 'transportation', logoUrl: 'https://logo.clearbit.com/uber.com' },
  'lyft': { name: 'Lyft', category: 'transportation', logoUrl: 'https://logo.clearbit.com/lyft.com' },
  'chevron': { name: 'Chevron', category: 'transportation', logoUrl: 'https://logo.clearbit.com/chevron.com' },
  'shell': { name: 'Shell', category: 'transportation', logoUrl: 'https://logo.clearbit.com/shell.com' },
  'cvs': { name: 'CVS Pharmacy', category: 'healthcare', logoUrl: 'https://logo.clearbit.com/cvs.com' },
  'walgreens': { name: 'Walgreens', category: 'healthcare', logoUrl: 'https://logo.clearbit.com/walgreens.com' },
  'costco': { name: 'Costco', category: 'groceries', logoUrl: 'https://logo.clearbit.com/costco.com' },
  'wholefoods': { name: 'Whole Foods', category: 'groceries', logoUrl: 'https://logo.clearbit.com/wholefoodsmarket.com' },
  'chipotle': { name: 'Chipotle', category: 'food_dining', logoUrl: 'https://logo.clearbit.com/chipotle.com' },
  'gym': { name: 'Planet Fitness', category: 'personal_care', logoUrl: 'https://logo.clearbit.com/planetfitness.com' },
};

function lookupMerchant(description: string): { name: string; category: SpendingCategory; logoUrl?: string } {
  const lower = description.toLowerCase();
  for (const [key, value] of Object.entries(MERCHANT_DB)) {
    if (lower.includes(key)) return value;
  }
  return { name: description.split(/\s+/).slice(0, 3).join(' '), category: 'other' };
}

// In-memory budget store
const budgets = new Map<string, Budget>();

export class MockFinancialDataAdapter implements FinancialDataAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Financial Data (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async enrichTransactions(request: EnrichTransactionsRequest): Promise<EnrichTransactionsResponse> {
    return {
      enrichedTransactions: request.transactions.map(t => {
        const merchant = lookupMerchant(t.description);
        return {
          transactionId: t.transactionId,
          cleanDescription: merchant.name,
          rawDescription: t.description,
          merchant: {
            name: merchant.name,
            logoUrl: 'logoUrl' in merchant ? merchant.logoUrl : undefined,
            category: merchant.category,
          },
          category: merchant.category,
          amountCents: t.amountCents,
          date: t.date,
          isRecurring: ['netflix', 'spotify', 'gym'].some(k => t.description.toLowerCase().includes(k)),
          transactionType: t.type,
          isBillPayment: ['electric', 'water', 'internet', 'phone'].some(k => t.description.toLowerCase().includes(k)),
        };
      }),
    };
  }

  async getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary> {
    const categories: SpendingByCategory[] = [
      { category: 'housing', totalCents: 180000, transactionCount: 1, percentOfTotal: 32, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [{ name: 'Apartment Rent', totalCents: 180000 }] },
      { category: 'food_dining', totalCents: 62000, transactionCount: 28, percentOfTotal: 11, trend: 'up', changeFromPreviousCents: 5200, topMerchants: [{ name: 'Starbucks', totalCents: 18000, logoUrl: MERCHANT_DB.starbucks.logoUrl }, { name: 'Chipotle', totalCents: 12000, logoUrl: MERCHANT_DB.chipotle.logoUrl }] },
      { category: 'groceries', totalCents: 48000, transactionCount: 12, percentOfTotal: 9, trend: 'stable', changeFromPreviousCents: -2000, topMerchants: [{ name: 'Costco', totalCents: 28000, logoUrl: MERCHANT_DB.costco.logoUrl }, { name: 'Whole Foods', totalCents: 20000, logoUrl: MERCHANT_DB.wholefoods.logoUrl }] },
      { category: 'transportation', totalCents: 35000, transactionCount: 15, percentOfTotal: 6, trend: 'down', changeFromPreviousCents: -8000, topMerchants: [{ name: 'Chevron', totalCents: 18000, logoUrl: MERCHANT_DB.chevron.logoUrl }, { name: 'Uber', totalCents: 12000, logoUrl: MERCHANT_DB.uber.logoUrl }] },
      { category: 'subscriptions', totalCents: 8500, transactionCount: 5, percentOfTotal: 2, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [{ name: 'Netflix', totalCents: 1599, logoUrl: MERCHANT_DB.netflix.logoUrl }, { name: 'Spotify', totalCents: 1099, logoUrl: MERCHANT_DB.spotify.logoUrl }] },
      { category: 'shopping', totalCents: 42000, transactionCount: 8, percentOfTotal: 8, trend: 'up', changeFromPreviousCents: 12000, topMerchants: [{ name: 'Amazon', totalCents: 28000, logoUrl: MERCHANT_DB.amazon.logoUrl }, { name: 'Target', totalCents: 14000, logoUrl: MERCHANT_DB.target.logoUrl }] },
      { category: 'utilities', totalCents: 22000, transactionCount: 4, percentOfTotal: 4, trend: 'up', changeFromPreviousCents: 3000, topMerchants: [{ name: 'PG&E', totalCents: 12000 }, { name: 'Comcast', totalCents: 8500 }] },
      { category: 'healthcare', totalCents: 15000, transactionCount: 3, percentOfTotal: 3, trend: 'stable', changeFromPreviousCents: 0, topMerchants: [{ name: 'CVS Pharmacy', totalCents: 8000, logoUrl: MERCHANT_DB.cvs.logoUrl }] },
    ];

    const totalSpending = categories.reduce((sum, c) => sum + c.totalCents, 0);

    return {
      totalSpendingCents: totalSpending,
      totalIncomeCents: 720000,
      netCashFlowCents: 720000 - totalSpending,
      avgDailySpendingCents: Math.round(totalSpending / 30),
      byCategory: categories,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
    };
  }

  async getMonthlyTrends(_request: GetMonthlyTrendsRequest): Promise<GetMonthlyTrendsResponse> {
    const now = new Date();
    return {
      trends: Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = d.toISOString().slice(0, 7);
        const spending = 400000 + Math.floor(Math.random() * 150000);
        const income = 720000;
        return {
          month,
          spendingCents: spending,
          incomeCents: income,
          savingsCents: income - spending,
          topCategory: (['housing', 'food_dining', 'groceries'] as SpendingCategory[])[i % 3],
        };
      }).reverse(),
    };
  }

  async listBudgets(_request: ListBudgetsRequest): Promise<ListBudgetsResponse> {
    const defaultBudgets: Budget[] = [
      { budgetId: 'bgt_food', category: 'food_dining', limitCents: 60000, spentCents: 52000, remainingCents: 8000, percentUsed: 87, isOverBudget: false, projectedCents: 65000 },
      { budgetId: 'bgt_grocery', category: 'groceries', limitCents: 50000, spentCents: 38000, remainingCents: 12000, percentUsed: 76, isOverBudget: false, projectedCents: 47000 },
      { budgetId: 'bgt_transport', category: 'transportation', limitCents: 40000, spentCents: 28000, remainingCents: 12000, percentUsed: 70, isOverBudget: false, projectedCents: 35000 },
      { budgetId: 'bgt_shopping', category: 'shopping', limitCents: 30000, spentCents: 42000, remainingCents: -12000, percentUsed: 140, isOverBudget: true, projectedCents: 52000 },
      { budgetId: 'bgt_entertain', category: 'entertainment', limitCents: 20000, spentCents: 12000, remainingCents: 8000, percentUsed: 60, isOverBudget: false, projectedCents: 15000 },
    ];

    const all = defaultBudgets.map(b => budgets.get(b.budgetId) ?? b);
    return {
      budgets: all,
      totalBudgetCents: all.reduce((s, b) => s + b.limitCents, 0),
      totalSpentCents: all.reduce((s, b) => s + b.spentCents, 0),
    };
  }

  async setBudget(request: SetBudgetRequest): Promise<Budget> {
    const budgetId = `bgt_${request.category}`;
    const budget: Budget = {
      budgetId,
      category: request.category,
      limitCents: request.limitCents,
      spentCents: 0,
      remainingCents: request.limitCents,
      percentUsed: 0,
      isOverBudget: false,
      projectedCents: 0,
    };
    budgets.set(budgetId, budget);
    return budget;
  }

  async getNetWorth(_request: GetNetWorthRequest): Promise<NetWorthSnapshot> {
    return {
      date: new Date().toISOString().split('T')[0],
      totalAssetsCents: 8274883,
      totalLiabilitiesCents: 35695000,
      netWorthCents: 8274883 - 35695000,
      accounts: [
        { accountId: 'acc-checking', name: 'Primary Checking', type: 'asset', balanceCents: 1254783, institution: 'Digital Bank' },
        { accountId: 'acc-savings', name: 'High-Yield Savings', type: 'asset', balanceCents: 4520100, institution: 'Digital Bank' },
        { accountId: 'acc-cd', name: '12-Month CD', type: 'asset', balanceCents: 2500000, institution: 'Digital Bank' },
        { accountId: 'loan-auto', name: 'Auto Loan', type: 'liability', balanceCents: 2245000, institution: 'Digital Bank' },
        { accountId: 'loan-mortgage', name: 'Home Mortgage', type: 'liability', balanceCents: 33450000, institution: 'Digital Bank' },
      ],
    };
  }

  async getNetWorthHistory(request: GetNetWorthHistoryRequest): Promise<NetWorthSnapshot[]> {
    const now = new Date();
    return Array.from({ length: request.months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const base = -27420117;  // Starting net worth
      const growth = i * 85000; // ~$850/month growth (paying down debt + saving)
      return {
        date: d.toISOString().split('T')[0],
        totalAssetsCents: 8274883 - growth * 0.3,
        totalLiabilitiesCents: 35695000 + growth * 0.7,
        netWorthCents: base + growth,
        accounts: [],
      };
    }).reverse();
  }

  async getRecurringTransactions(_request: GetRecurringTransactionsRequest): Promise<GetRecurringTransactionsResponse> {
    const recurring: RecurringTransaction[] = [
      { recurringId: 'rec_1', merchantName: 'Netflix', merchantLogoUrl: MERCHANT_DB.netflix.logoUrl, category: 'subscriptions', averageAmountCents: 1599, lastAmountCents: 1599, frequency: 'monthly', nextExpectedDate: '2026-04-01', isActive: true, lastChargeDate: '2026-03-01', chargeCount: 24 },
      { recurringId: 'rec_2', merchantName: 'Spotify', merchantLogoUrl: MERCHANT_DB.spotify.logoUrl, category: 'subscriptions', averageAmountCents: 1099, lastAmountCents: 1099, frequency: 'monthly', nextExpectedDate: '2026-04-05', isActive: true, lastChargeDate: '2026-03-05', chargeCount: 36 },
      { recurringId: 'rec_3', merchantName: 'Planet Fitness', merchantLogoUrl: MERCHANT_DB.gym.logoUrl, category: 'personal_care', averageAmountCents: 2499, lastAmountCents: 2499, frequency: 'monthly', nextExpectedDate: '2026-04-01', isActive: true, lastChargeDate: '2026-03-01', chargeCount: 12 },
      { recurringId: 'rec_4', merchantName: 'Amazon Prime', merchantLogoUrl: MERCHANT_DB.amazon.logoUrl, category: 'subscriptions', averageAmountCents: 1490, lastAmountCents: 1490, frequency: 'monthly', nextExpectedDate: '2026-04-15', isActive: true, lastChargeDate: '2026-03-15', chargeCount: 18 },
      { recurringId: 'rec_5', merchantName: 'Comcast Internet', category: 'utilities', averageAmountCents: 8999, lastAmountCents: 8999, frequency: 'monthly', nextExpectedDate: '2026-04-10', isActive: true, lastChargeDate: '2026-03-10', chargeCount: 24 },
      { recurringId: 'rec_6', merchantName: 'State Farm Auto', category: 'insurance', averageAmountCents: 12500, lastAmountCents: 12500, frequency: 'monthly', nextExpectedDate: '2026-04-01', isActive: true, lastChargeDate: '2026-03-01', chargeCount: 36 },
    ];

    const monthlyCents = recurring.filter(r => r.frequency === 'monthly').reduce((s, r) => s + r.averageAmountCents, 0);

    return {
      recurring,
      totalMonthlyCents: monthlyCents,
      totalAnnualCents: monthlyCents * 12,
    };
  }
}
