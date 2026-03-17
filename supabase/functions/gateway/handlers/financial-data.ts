/**
 * Financial Data & Insights Domain Handlers
 *
 * Gateway handlers for financial management features powered by the
 * FinancialDataAdapter (MX Platform or mock).
 *
 * Covers: transaction enrichment, spending insights, budgets, net worth,
 * recurring transaction detection.
 *
 * All monetary values are integer cents.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { FinancialDataAdapter } from '../../_shared/adapters/financial-data/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<FinancialDataAdapter> {
  const { adapter } = await resolveAdapter<FinancialDataAdapter>('financial_data', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Enrich transactions with merchant data, categories, logos */
export async function enrichTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { transactions } = ctx.params as {
    transactions: { transactionId: string; description: string; amountCents: number; date: string; type: 'debit' | 'credit' }[];
  };

  if (!transactions?.length) {
    return { error: { code: 'VALIDATION_ERROR', message: 'transactions array is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.enrichTransactions({
    transactions,
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Get spending breakdown by category */
export async function getSpendingSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { periodStart, periodEnd, accountIds } = ctx.params as {
    periodStart?: string; periodEnd?: string; accountIds?: string[];
  };

  // Default to current month
  const now = new Date();
  const start = periodStart ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = periodEnd ?? now.toISOString().split('T')[0];

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getSpendingSummary({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    periodStart: start,
    periodEnd: end,
    accountIds,
  });

  return { data: result };
}

/** Get monthly spending/income trends */
export async function getMonthlyTrends(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { months, accountIds } = ctx.params as { months?: number; accountIds?: string[] };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getMonthlyTrends({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    months: months ?? 6,
    accountIds,
  });

  return { data: result };
}

/** List user's budgets */
export async function listBudgets(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listBudgets({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Create or update a budget for a category */
export async function setBudget(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { category, limitCents } = ctx.params as { category: string; limitCents: number };

  if (!category || !limitCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'category and limitCents are required' }, status: 400 };
  }

  if (limitCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'limitCents must be positive' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.setBudget({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    category: category as never,
    limitCents,
  });

  return { data: result };
}

/** Get current net worth snapshot */
export async function getNetWorth(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getNetWorth({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Get net worth history over time */
export async function getNetWorthHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { months } = ctx.params as { months?: number };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getNetWorthHistory({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    months: months ?? 12,
  });

  return { data: result };
}

/** Detect and list recurring transactions/subscriptions */
export async function getRecurringTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getRecurringTransactions({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}
