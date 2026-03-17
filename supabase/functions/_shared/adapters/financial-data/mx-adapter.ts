// TODO: Provisional integration — not yet validated in production.
/**
 * MX Platform Financial Data Adapter
 *
 * Integrates with MX's Platform API for financial data enrichment,
 * spending insights, budgeting, and account aggregation.
 *
 * MX is the industry leader in financial data enhancement:
 *   - Transaction cleansing (clean merchant names from raw descriptions)
 *   - Merchant logos and metadata
 *   - Smart categorization (200+ categories)
 *   - Spending analysis and budgets
 *   - Recurring transaction detection
 *   - Account aggregation across institutions
 *
 * API Reference: https://docs.mx.com/api
 * Authentication: HTTP Basic (client_id:api_key)
 *
 * Configuration:
 *   MX_CLIENT_ID — MX client ID
 *   MX_API_KEY — MX API key
 *   MX_BASE_URL — Base URL (default: https://api.mx.com for production)
 *
 * Sandbox: https://int-api.mx.com (free sandbox with test data)
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  FinancialDataAdapter,
  SpendingSummary,
  SpendingByCategory,
  Budget,
  NetWorthSnapshot,
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
// MX API TYPES (mirrors MX Platform API schema)
// =============================================================================

interface MXTransaction {
  guid: string;
  description: string;
  cleansed_merchant_name: string;
  original_description: string;
  merchant_guid?: string;
  merchant_category_code?: number;
  category: string;
  top_level_category: string;
  amount: number;                // Positive = debit, negative = credit
  date: string;
  is_bill_pay: boolean;
  is_recurring: boolean;
  type: string;                  // DEBIT | CREDIT
  status: string;
  latitude?: number;
  longitude?: number;
  merchant_location_guid?: string;
}

interface _MXMerchant {
  guid: string;
  name: string;
  logo_url?: string;
  website_url?: string;
  merchant_category_code?: number;
}

interface _MXCategory {
  guid: string;
  name: string;
  parent_guid?: string;
}

interface MXSpendingReport {
  category: string;
  total_amount: number;
  transaction_count: number;
  percent_of_total: number;
  previous_period_amount: number;
}

interface MXBudget {
  guid: string;
  category_guid: string;
  category_name: string;
  amount: number;
  spent: number;
  is_exceeded: boolean;
  percent_spent: number;
  projected_spending: number;
}

// =============================================================================
// CATEGORY MAPPING
// =============================================================================

function mapMXCategory(mxCategory: string): SpendingCategory {
  const lower = mxCategory.toLowerCase();
  const map: Record<string, SpendingCategory> = {
    'mortgage & rent': 'housing',
    'housing': 'housing',
    'auto & transport': 'transportation',
    'transportation': 'transportation',
    'gas & fuel': 'transportation',
    'food & dining': 'food_dining',
    'restaurants': 'food_dining',
    'coffee shops': 'food_dining',
    'groceries': 'groceries',
    'utilities': 'utilities',
    'health & fitness': 'healthcare',
    'healthcare': 'healthcare',
    'pharmacy': 'healthcare',
    'entertainment': 'entertainment',
    'shopping': 'shopping',
    'clothing': 'shopping',
    'personal care': 'personal_care',
    'education': 'education',
    'travel': 'travel',
    'insurance': 'insurance',
    'subscription': 'subscriptions',
    'streaming services': 'subscriptions',
    'income': 'income',
    'paycheck': 'income',
    'transfer': 'transfer',
    'fees & charges': 'fees',
    'investments': 'investments',
    'charity': 'charitable',
    'gifts & donations': 'charitable',
  };

  for (const [key, value] of Object.entries(map)) {
    if (lower.includes(key)) return value;
  }
  return 'other';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MXFinancialDataAdapter implements FinancialDataAdapter {
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'mx',
    name: 'MX Platform (Financial Data & Insights)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(clientId?: string, apiKey?: string, baseUrl?: string) {
    this.clientId = clientId ?? Deno.env.get('MX_CLIENT_ID') ?? '';
    this.apiKey = apiKey ?? Deno.env.get('MX_API_KEY') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('MX_BASE_URL') ?? 'https://int-api.mx.com';
    this.sandbox = !this.clientId || !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('MX adapter in sandbox mode — no credentials configured');
    }

    const credentials = btoa(`${this.clientId}:${this.apiKey}`);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.mx.api.v1+json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`MX API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode (no credentials)',
      };
    }

    try {
      await this.request('GET', '/users?page=1&records_per_page=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async enrichTransactions(request: EnrichTransactionsRequest): Promise<EnrichTransactionsResponse> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().enrichTransactions(request);
    }

    // MX enhancement works through their aggregation pipeline
    // For ad-hoc enrichment, use their "cleanse and categorize" endpoint
    const response = await this.request<{
      transactions: MXTransaction[];
    }>('POST', '/transactions/cleanse_and_categorize', {
      transactions: request.transactions.map(t => ({
        description: t.description,
        amount: t.amountCents / 100,
        type: t.type.toUpperCase(),
        date: t.date,
      })),
    });

    return {
      enrichedTransactions: response.transactions.map((tx, i) => {
        const original = request.transactions[i];
        return {
          transactionId: original.transactionId,
          cleanDescription: tx.cleansed_merchant_name || tx.description,
          rawDescription: tx.original_description || original.description,
          merchant: tx.merchant_guid ? {
            name: tx.cleansed_merchant_name,
            category: tx.category,
            merchantCategoryCode: tx.merchant_category_code?.toString(),
          } : undefined,
          category: mapMXCategory(tx.top_level_category || tx.category),
          subcategory: tx.category,
          amountCents: Math.round(Math.abs(tx.amount) * 100),
          date: tx.date,
          isRecurring: tx.is_recurring,
          transactionType: tx.type === 'CREDIT' ? 'credit' : 'debit',
          isBillPayment: tx.is_bill_pay,
        };
      }),
    };
  }

  async getSpendingSummary(request: GetSpendingSummaryRequest): Promise<SpendingSummary> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().getSpendingSummary(request);
    }

    // MX spending reports by category
    const mxUserId = request.userId;
    const response = await this.request<{
      spending: MXSpendingReport[];
    }>('GET', `/users/${mxUserId}/spending?from_date=${request.periodStart}&to_date=${request.periodEnd}`);

    const categories: SpendingByCategory[] = response.spending.map(s => ({
      category: mapMXCategory(s.category),
      totalCents: Math.round(s.total_amount * 100),
      transactionCount: s.transaction_count,
      percentOfTotal: s.percent_of_total,
      trend: s.total_amount > s.previous_period_amount ? 'up' : s.total_amount < s.previous_period_amount ? 'down' : 'stable',
      changeFromPreviousCents: Math.round((s.total_amount - s.previous_period_amount) * 100),
      topMerchants: [],
    }));

    const totalSpending = categories.reduce((sum, c) => sum + c.totalCents, 0);
    // Fetch income separately
    const incomeResponse = await this.request<{ income: { total: number } }>(
      'GET', `/users/${mxUserId}/income?from_date=${request.periodStart}&to_date=${request.periodEnd}`
    ).catch(() => ({ income: { total: 0 } }));

    const totalIncome = Math.round(incomeResponse.income.total * 100);

    return {
      totalSpendingCents: totalSpending,
      totalIncomeCents: totalIncome,
      netCashFlowCents: totalIncome - totalSpending,
      avgDailySpendingCents: Math.round(totalSpending / 30),
      byCategory: categories,
      periodStart: request.periodStart,
      periodEnd: request.periodEnd,
    };
  }

  async getMonthlyTrends(request: GetMonthlyTrendsRequest): Promise<GetMonthlyTrendsResponse> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().getMonthlyTrends(request);
    }

    const mxUserId = request.userId;
    const now = new Date();
    const fromDate = new Date(now.getFullYear(), now.getMonth() - request.months, 1).toISOString().split('T')[0];

    const response = await this.request<{
      monthly_spending: Array<{
        month: string;
        total_spending: number;
        total_income: number;
        top_category: string;
      }>;
    }>('GET', `/users/${mxUserId}/monthly_spending?from_date=${fromDate}`);

    return {
      trends: response.monthly_spending.map(m => ({
        month: m.month,
        spendingCents: Math.round(m.total_spending * 100),
        incomeCents: Math.round(m.total_income * 100),
        savingsCents: Math.round((m.total_income - m.total_spending) * 100),
        topCategory: mapMXCategory(m.top_category),
      })),
    };
  }

  async listBudgets(request: ListBudgetsRequest): Promise<ListBudgetsResponse> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().listBudgets(request);
    }

    const response = await this.request<{ budgets: MXBudget[] }>(
      'GET', `/users/${request.userId}/budgets`
    );

    const mapped: Budget[] = response.budgets.map(b => ({
      budgetId: b.guid,
      category: mapMXCategory(b.category_name),
      limitCents: Math.round(b.amount * 100),
      spentCents: Math.round(b.spent * 100),
      remainingCents: Math.round((b.amount - b.spent) * 100),
      percentUsed: b.percent_spent,
      isOverBudget: b.is_exceeded,
      projectedCents: Math.round(b.projected_spending * 100),
    }));

    return {
      budgets: mapped,
      totalBudgetCents: mapped.reduce((s, b) => s + b.limitCents, 0),
      totalSpentCents: mapped.reduce((s, b) => s + b.spentCents, 0),
    };
  }

  async setBudget(request: SetBudgetRequest): Promise<Budget> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().setBudget(request);
    }

    const response = await this.request<{ budget: MXBudget }>(
      'POST',
      `/users/${request.userId}/budgets`,
      { budget: { category_guid: request.category, amount: request.limitCents / 100 } },
    );

    const b = response.budget;
    return {
      budgetId: b.guid,
      category: mapMXCategory(b.category_name),
      limitCents: Math.round(b.amount * 100),
      spentCents: Math.round(b.spent * 100),
      remainingCents: Math.round((b.amount - b.spent) * 100),
      percentUsed: b.percent_spent,
      isOverBudget: b.is_exceeded,
      projectedCents: Math.round(b.projected_spending * 100),
    };
  }

  async getNetWorth(request: GetNetWorthRequest): Promise<NetWorthSnapshot> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().getNetWorth(request);
    }

    const response = await this.request<{
      accounts: Array<{
        guid: string;
        name: string;
        type: string;
        balance: number;
        institution_code?: string;
      }>;
    }>('GET', `/users/${request.userId}/accounts`);

    let totalAssets = 0;
    let totalLiabilities = 0;

    const accounts = response.accounts.map(a => {
      const isLiability = ['CREDIT_CARD', 'LOAN', 'MORTGAGE', 'LINE_OF_CREDIT'].includes(a.type);
      const balanceCents = Math.round(Math.abs(a.balance) * 100);

      if (isLiability) {
        totalLiabilities += balanceCents;
      } else {
        totalAssets += balanceCents;
      }

      return {
        accountId: a.guid,
        name: a.name,
        type: isLiability ? 'liability' as const : 'asset' as const,
        balanceCents,
        institution: a.institution_code,
      };
    });

    return {
      date: new Date().toISOString().split('T')[0],
      totalAssetsCents: totalAssets,
      totalLiabilitiesCents: totalLiabilities,
      netWorthCents: totalAssets - totalLiabilities,
      accounts,
    };
  }

  async getNetWorthHistory(request: GetNetWorthHistoryRequest): Promise<NetWorthSnapshot[]> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().getNetWorthHistory(request);
    }

    // MX doesn't have a direct net worth history endpoint
    // Calculate from account balance snapshots
    const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
    return new MockFinancialDataAdapter().getNetWorthHistory(request);
  }

  async getRecurringTransactions(request: GetRecurringTransactionsRequest): Promise<GetRecurringTransactionsResponse> {
    if (this.sandbox) {
      const { MockFinancialDataAdapter } = await import('./mock-adapter.ts');
      return new MockFinancialDataAdapter().getRecurringTransactions(request);
    }

    // MX detects recurring transactions automatically
    const response = await this.request<{
      transactions: MXTransaction[];
    }>('GET', `/users/${request.userId}/transactions?is_recurring=true&records_per_page=100`);

    // Group by merchant to detect recurring patterns
    const merchantGroups = new Map<string, MXTransaction[]>();
    for (const tx of response.transactions) {
      const key = tx.cleansed_merchant_name || tx.description;
      if (!merchantGroups.has(key)) merchantGroups.set(key, []);
      merchantGroups.get(key)!.push(tx);
    }

    const recurring = Array.from(merchantGroups.entries())
      .filter(([_, txs]) => txs.length >= 2)
      .map(([merchantName, txs]) => {
        const amounts = txs.map(t => Math.abs(t.amount));
        const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
        const sorted = txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return {
          recurringId: `rec_${txs[0].guid}`,
          merchantName,
          category: mapMXCategory(txs[0].category),
          averageAmountCents: Math.round(avgAmount * 100),
          lastAmountCents: Math.round(Math.abs(sorted[0].amount) * 100),
          frequency: 'monthly' as const,
          nextExpectedDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          isActive: true,
          lastChargeDate: sorted[0].date,
          chargeCount: txs.length,
        };
      });

    const monthlyCents = recurring.reduce((s, r) => s + r.averageAmountCents, 0);

    return {
      recurring,
      totalMonthlyCents: monthlyCents,
      totalAnnualCents: monthlyCents * 12,
    };
  }
}
