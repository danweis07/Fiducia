/**
 * Financial Data & Insights Types
 *
 * Spending analysis, budgets, net worth, and recurring transactions.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// FINANCIAL DATA & INSIGHTS
// =============================================================================

export type SpendingCategory =
  | 'housing' | 'transportation' | 'food_dining' | 'groceries'
  | 'utilities' | 'healthcare' | 'entertainment' | 'shopping'
  | 'personal_care' | 'education' | 'travel' | 'insurance'
  | 'subscriptions' | 'income' | 'transfer' | 'fees'
  | 'investments' | 'charitable' | 'other';

export interface SpendingByCategory {
  category: SpendingCategory;
  totalCents: number;
  transactionCount: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  changeFromPreviousCents: number;
  topMerchants: { name: string; totalCents: number; logoUrl?: string }[];
}

export interface SpendingSummary {
  totalSpendingCents: number;
  totalIncomeCents: number;
  netCashFlowCents: number;
  avgDailySpendingCents: number;
  byCategory: SpendingByCategory[];
  periodStart: string;
  periodEnd: string;
}

export interface MonthlyTrend {
  month: string;
  spendingCents: number;
  incomeCents: number;
  savingsCents: number;
  topCategory: string;
}

export interface BudgetItem {
  budgetId: string;
  category: SpendingCategory;
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  percentUsed: number;
  isOverBudget: boolean;
  projectedCents: number;
}

export interface NetWorthSnapshot {
  date: string;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  accounts: {
    accountId: string;
    name: string;
    type: string;
    balanceCents: number;
    institution?: string;
  }[];
}

export interface RecurringTransaction {
  recurringId: string;
  merchantName: string;
  merchantLogoUrl?: string;
  category: string;
  averageAmountCents: number;
  lastAmountCents: number;
  frequency: string;
  nextExpectedDate: string;
  isActive: boolean;
  lastChargeDate: string;
  chargeCount: number;
}
