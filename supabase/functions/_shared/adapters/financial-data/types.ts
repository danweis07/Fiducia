/**
 * Financial Data & Insights Adapter Interface
 *
 * Defines the contract for financial data platforms that provide
 * enriched account/transaction data, spending insights, and budgeting.
 * Primary provider: MX Platform API.
 *
 * Features:
 *   - Enhanced transaction data (merchant logos, categories, clean names)
 *   - Spending by category analysis
 *   - Account aggregation across institutions
 *   - Cash flow analysis
 *   - Budget tracking
 *   - Net worth calculation
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// ENRICHED TRANSACTION
// =============================================================================

export interface EnrichedTransaction {
  /** Original transaction ID */
  transactionId: string;
  /** Clean merchant name (e.g., "Starbucks" instead of "STARBUCKS #12345 SAN FRANCISCO CA") */
  cleanDescription: string;
  /** Original raw description */
  rawDescription: string;
  /** Merchant info */
  merchant?: {
    name: string;
    logoUrl?: string;
    websiteUrl?: string;
    category: string;
    /** MCC code */
    merchantCategoryCode?: string;
    /** City, State */
    location?: string;
  };
  /** Spending category */
  category: SpendingCategory;
  /** Subcategory for detailed breakdown */
  subcategory?: string;
  /** Amount in cents */
  amountCents: number;
  /** Transaction date */
  date: string;
  /** Is this a recurring transaction */
  isRecurring: boolean;
  /** Recurring frequency if detected */
  recurringFrequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  /** Transaction type */
  transactionType: 'debit' | 'credit';
  /** Is this a bill/subscription payment */
  isBillPayment: boolean;
}

export type SpendingCategory =
  | 'housing'           // Rent, mortgage
  | 'transportation'    // Gas, rideshare, parking, tolls
  | 'food_dining'       // Restaurants, fast food, coffee
  | 'groceries'         // Grocery stores, supermarkets
  | 'utilities'         // Electric, gas, water, internet
  | 'healthcare'        // Doctor, pharmacy, insurance
  | 'entertainment'     // Movies, gaming, concerts
  | 'shopping'          // Retail, online shopping
  | 'personal_care'     // Haircuts, gym, spa
  | 'education'         // Tuition, books, supplies
  | 'travel'            // Hotels, flights, vacation
  | 'insurance'         // Auto, home, life insurance
  | 'subscriptions'     // Netflix, Spotify, SaaS
  | 'income'            // Paycheck, side income
  | 'transfer'          // Bank transfers
  | 'fees'              // Bank fees, ATM fees
  | 'investments'       // Brokerage, crypto
  | 'charitable'        // Donations
  | 'other';

// =============================================================================
// SPENDING INSIGHTS
// =============================================================================

export interface SpendingByCategory {
  category: SpendingCategory;
  totalCents: number;
  transactionCount: number;
  percentOfTotal: number;
  trend: 'up' | 'down' | 'stable';
  /** Change from previous period in cents */
  changeFromPreviousCents: number;
  /** Top merchants in this category */
  topMerchants: { name: string; totalCents: number; logoUrl?: string }[];
}

export interface SpendingSummary {
  /** Total spending in cents for the period */
  totalSpendingCents: number;
  /** Total income in cents */
  totalIncomeCents: number;
  /** Net cash flow */
  netCashFlowCents: number;
  /** Average daily spending */
  avgDailySpendingCents: number;
  /** Breakdown by category */
  byCategory: SpendingByCategory[];
  /** Period start */
  periodStart: string;
  /** Period end */
  periodEnd: string;
}

export interface MonthlyTrend {
  month: string;              // YYYY-MM
  spendingCents: number;
  incomeCents: number;
  savingsCents: number;
  topCategory: SpendingCategory;
}

// =============================================================================
// BUDGET
// =============================================================================

export interface Budget {
  budgetId: string;
  category: SpendingCategory;
  /** Monthly budget amount in cents */
  limitCents: number;
  /** Amount spent so far this month */
  spentCents: number;
  /** Remaining budget */
  remainingCents: number;
  /** Percentage used */
  percentUsed: number;
  /** Is over budget */
  isOverBudget: boolean;
  /** Projected end-of-month spending based on pace */
  projectedCents: number;
}

// =============================================================================
// NET WORTH
// =============================================================================

export interface NetWorthSnapshot {
  date: string;
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  netWorthCents: number;
  accounts: {
    accountId: string;
    name: string;
    type: 'asset' | 'liability';
    balanceCents: number;
    institution?: string;
  }[];
}

// =============================================================================
// RECURRING TRANSACTIONS
// =============================================================================

export interface RecurringTransaction {
  /** Detected recurring pattern ID */
  recurringId: string;
  merchantName: string;
  merchantLogoUrl?: string;
  category: SpendingCategory;
  /** Average amount in cents */
  averageAmountCents: number;
  /** Last amount in cents */
  lastAmountCents: number;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  /** Next expected date */
  nextExpectedDate: string;
  /** Is this an active subscription */
  isActive: boolean;
  /** Last charge date */
  lastChargeDate: string;
  /** History of charges */
  chargeCount: number;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface EnrichTransactionsRequest {
  transactions: {
    transactionId: string;
    description: string;
    amountCents: number;
    date: string;
    type: 'debit' | 'credit';
  }[];
  userId: string;
  tenantId: string;
}

export interface EnrichTransactionsResponse {
  enrichedTransactions: EnrichedTransaction[];
}

export interface GetSpendingSummaryRequest {
  userId: string;
  tenantId: string;
  periodStart: string;          // YYYY-MM-DD
  periodEnd: string;
  accountIds?: string[];
}

export interface GetMonthlyTrendsRequest {
  userId: string;
  tenantId: string;
  months: number;               // How many months back
  accountIds?: string[];
}

export interface GetMonthlyTrendsResponse {
  trends: MonthlyTrend[];
}

export interface ListBudgetsRequest {
  userId: string;
  tenantId: string;
}

export interface ListBudgetsResponse {
  budgets: Budget[];
  totalBudgetCents: number;
  totalSpentCents: number;
}

export interface SetBudgetRequest {
  userId: string;
  tenantId: string;
  category: SpendingCategory;
  limitCents: number;
}

export interface GetNetWorthRequest {
  userId: string;
  tenantId: string;
}

export interface GetNetWorthHistoryRequest {
  userId: string;
  tenantId: string;
  months: number;
}

export interface GetRecurringTransactionsRequest {
  userId: string;
  tenantId: string;
}

export interface GetRecurringTransactionsResponse {
  recurring: RecurringTransaction[];
  totalMonthlyCents: number;
  totalAnnualCents: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface FinancialDataAdapter extends BaseAdapter {
  /** Enrich raw transactions with merchant data, categories, and logos */
  enrichTransactions(request: EnrichTransactionsRequest): Promise<EnrichTransactionsResponse>;

  /** Get spending breakdown by category for a period */
  getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary>;

  /** Get month-over-month spending/income trends */
  getMonthlyTrends(request: GetMonthlyTrendsRequest): Promise<GetMonthlyTrendsResponse>;

  /** List user's budgets */
  listBudgets(request: ListBudgetsRequest): Promise<ListBudgetsResponse>;

  /** Create or update a budget */
  setBudget(request: SetBudgetRequest): Promise<Budget>;

  /** Get current net worth snapshot */
  getNetWorth(request: GetNetWorthRequest): Promise<NetWorthSnapshot>;

  /** Get net worth history over time */
  getNetWorthHistory(request: GetNetWorthHistoryRequest): Promise<NetWorthSnapshot[]>;

  /** Detect and list recurring transactions/subscriptions */
  getRecurringTransactions(request: GetRecurringTransactionsRequest): Promise<GetRecurringTransactionsResponse>;
}
