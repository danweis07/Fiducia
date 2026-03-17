/**
 * Admin Analytics Handlers
 *
 * Gateway handlers for aggregated analytics data from existing banking tables.
 * Provides account growth, transaction volume, deposit trends, and key metrics.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Caller must be authenticated (admin role not strictly required for read-only analytics,
 *   but auth is enforced).
 * - Monetary values are integer cents.
 * - NEVER log PII.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

/**
 * Parse a range string (e.g. '30d', '3m', '6m', '9m', '1y') into a Date.
 * Returns the start date for the range window.
 */
function parseRangeStart(range?: string): Date {
  const now = new Date();

  if (!range) {
    // Default to 12 months
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const match = range.match(/^(\d+)(d|m|y)$/);
  if (!match) {
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
    case 'm':
      return new Date(now.getFullYear(), now.getMonth() - value, now.getDate());
    case 'y':
      return new Date(now.getFullYear() - value, now.getMonth(), now.getDate());
    default:
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthYear(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * admin.analytics.accountGrowth — Account creation over time
 *
 * Params:
 *   - range: string (optional) — '30d', '3m', '6m', '9m', '1y' (default '1y')
 *
 * Returns array of { date: 'Mon YYYY', accounts: count }
 */
export async function getAccountGrowth(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const rangeStart = parseRangeStart(ctx.params.range as string | undefined);

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('id, created_at')
    .eq('firm_id', ctx.firmId!)
    .gte('created_at', rangeStart.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query account growth' }, status: 500 };
  }

  // Group by month
  const monthMap = new Map<string, number>();
  for (const row of data ?? []) {
    const key = formatMonthYear(row.created_at);
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }

  const growth = Array.from(monthMap.entries()).map(([date, accounts]) => ({
    date,
    accounts,
  }));

  return { data: { growth } };
}

/**
 * admin.analytics.transactionVolume — Transaction counts and amounts by type
 *
 * Params:
 *   - range: string (optional) — '30d', '3m', '6m', '9m', '1y' (default '1y')
 *
 * Returns array of { type, count, amount }
 */
export async function getTransactionVolume(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const rangeStart = parseRangeStart(ctx.params.range as string | undefined);

  const { data, error } = await ctx.db
    .from('banking_transactions')
    .select('type, amount_cents, created_at')
    .eq('firm_id', ctx.firmId!)
    .gte('created_at', rangeStart.toISOString());

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query transaction volume' }, status: 500 };
  }

  // Group by type
  const typeMap = new Map<string, { count: number; amountCents: number }>();
  for (const row of data ?? []) {
    const existing = typeMap.get(row.type) ?? { count: 0, amountCents: 0 };
    existing.count += 1;
    existing.amountCents += Number(row.amount_cents);
    typeMap.set(row.type, existing);
  }

  const volume = Array.from(typeMap.entries()).map(([type, stats]) => ({
    type,
    count: stats.count,
    amountCents: stats.amountCents,
  }));

  return { data: { volume } };
}

/**
 * admin.analytics.depositTrends — Deposit balances over time by account type
 *
 * Params:
 *   - range: string (optional) — '30d', '3m', '6m', '9m', '1y' (default '1y')
 *
 * Returns time-series grouped by account type and month
 */
export async function getDepositTrends(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const rangeStart = parseRangeStart(ctx.params.range as string | undefined);

  const { data, error } = await ctx.db
    .from('banking_accounts')
    .select('type, balance_cents, created_at')
    .eq('firm_id', ctx.firmId!)
    .gte('created_at', rangeStart.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query deposit trends' }, status: 500 };
  }

  // Group by type + month
  const trendMap = new Map<string, Map<string, number>>();
  for (const row of data ?? []) {
    const monthKey = formatMonthYear(row.created_at);
    if (!trendMap.has(row.type)) {
      trendMap.set(row.type, new Map());
    }
    const monthData = trendMap.get(row.type)!;
    monthData.set(monthKey, (monthData.get(monthKey) ?? 0) + Number(row.balance_cents));
  }

  const trends: Array<{ type: string; series: Array<{ date: string; balanceCents: number }> }> = [];
  for (const [type, monthData] of trendMap) {
    const series = Array.from(monthData.entries()).map(([date, balanceCents]) => ({
      date,
      balanceCents,
    }));
    trends.push({ type, series });
  }

  return { data: { trends } };
}

/**
 * admin.analytics.keyMetrics — Computed high-level tenant metrics
 *
 * Params:
 *   - range: string (optional) — '30d', '3m', '6m', '9m', '1y' (default '1y')
 *
 * Returns:
 *   - totalCustomers: number
 *   - avgDepositCents: number
 *   - monthlyActiveUsers: number
 *   - signupConversionRate: number (0-1)
 */
export async function getKeyMetrics(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const rangeStart = parseRangeStart(ctx.params.range as string | undefined);

  // Total customers (firm_users count)
  const { count: totalCustomers, error: custErr } = await ctx.db
    .from('firm_users')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId!);

  if (custErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query customer count' }, status: 500 };
  }

  // Average deposit (banking_accounts balance)
  const { data: accounts, error: acctErr } = await ctx.db
    .from('banking_accounts')
    .select('balance_cents')
    .eq('firm_id', ctx.firmId!);

  if (acctErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query account balances' }, status: 500 };
  }

  const totalBalanceCents = (accounts ?? []).reduce(
    (sum, row) => sum + Number(row.balance_cents),
    0
  );
  const accountCount = accounts?.length ?? 0;
  const avgDepositCents = accountCount > 0 ? Math.round(totalBalanceCents / accountCount) : 0;

  // Monthly active users — distinct users with transactions in the range
  const { data: activeTxns, error: txnErr } = await ctx.db
    .from('banking_transactions')
    .select('user_id')
    .eq('firm_id', ctx.firmId!)
    .gte('created_at', rangeStart.toISOString());

  if (txnErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query active users' }, status: 500 };
  }

  const uniqueActiveUsers = new Set((activeTxns ?? []).map((t) => t.user_id));
  const monthlyActiveUsers = uniqueActiveUsers.size;

  // Signup conversion rate: users with at least one account / total users
  const { count: usersWithAccounts, error: convErr } = await ctx.db
    .from('banking_accounts')
    .select('user_id', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId!);

  if (convErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query conversion data' }, status: 500 };
  }

  const signupConversionRate =
    (totalCustomers ?? 0) > 0
      ? Math.round(((usersWithAccounts ?? 0) / (totalCustomers ?? 1)) * 100) / 100
      : 0;

  return {
    data: {
      metrics: {
        totalCustomers: totalCustomers ?? 0,
        avgDepositCents,
        monthlyActiveUsers,
        signupConversionRate,
      },
    },
  };
}
