/**
 * Cash Flow Forecast Handler — Business Liquidity Dashboard
 *
 * AI-powered cash flow projection using 90-day transaction history.
 * Shows projected balances, runway, and actionable insights.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';
import { requireAuth } from '../handler-utils.ts';

export async function getCashFlowForecast(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const daysAhead = (ctx.params.daysAhead as number) || 30;
  const accountId = ctx.params.accountId as string | undefined;
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch account balances
  let accountQuery = ctx.db
    .from('accounts')
    .select('id, available_balance_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (accountId) accountQuery = accountQuery.eq('id', accountId);

  const { data: accounts } = await accountQuery;
  const currentBalanceCents = (accounts ?? []).reduce(
    (sum: number, a: Record<string, unknown>) => sum + ((a.available_balance_cents as number) || 0),
    0
  );

  // Fetch 90-day transaction history for analysis
  const { data: transactions } = await ctx.db
    .from('transactions')
    .select('amount_cents, type, created_at')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: true });

  const txns = transactions ?? [];

  // Calculate average daily inflows/outflows
  let totalInflow = 0;
  let totalOutflow = 0;
  for (const tx of txns) {
    const amount = Math.abs(tx.amount_cents as number);
    if ((tx.amount_cents as number) > 0) {
      totalInflow += amount;
    } else {
      totalOutflow += amount;
    }
  }

  const daysCovered = Math.max(1, Math.ceil((Date.now() - new Date(ninetyDaysAgo).getTime()) / (24 * 60 * 60 * 1000)));
  const avgDailyInflowCents = Math.round(totalInflow / daysCovered);
  const avgDailyOutflowCents = Math.round(totalOutflow / daysCovered);
  const netDailyCents = avgDailyInflowCents - avgDailyOutflowCents;

  // Generate data points (historical + projected)
  const dataPoints = [];
  const today = new Date();

  // Historical (last 30 days, simplified)
  let runningBalance = currentBalanceCents - (netDailyCents * 30);
  for (let i = -30; i <= 0; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    runningBalance += netDailyCents;
    dataPoints.push({
      date: date.toISOString().split('T')[0],
      balanceCents: Math.max(0, runningBalance),
      inflowCents: avgDailyInflowCents,
      outflowCents: avgDailyOutflowCents,
      isProjected: false,
    });
  }

  // Projected (future)
  let projectedBalance = currentBalanceCents;
  for (let i = 1; i <= daysAhead; i++) {
    projectedBalance += netDailyCents;
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    dataPoints.push({
      date: date.toISOString().split('T')[0],
      balanceCents: Math.max(0, projectedBalance),
      inflowCents: avgDailyInflowCents,
      outflowCents: avgDailyOutflowCents,
      isProjected: true,
    });
  }

  // Upcoming estimated payroll/bills — ratios configurable via params, defaults to heuristic
  const payrollRatio = (ctx.params.payrollRatio as number) ?? 0.6;
  const billsRatio = (ctx.params.billsRatio as number) ?? 0.4;
  const upcomingPayrollCents = Math.round(avgDailyOutflowCents * 14 * payrollRatio);
  const upcomingBillsCents = Math.round(avgDailyOutflowCents * 30 * billsRatio);

  // Runway calculation
  const runwayDays = avgDailyOutflowCents > avgDailyInflowCents
    ? Math.floor(currentBalanceCents / (avgDailyOutflowCents - avgDailyInflowCents))
    : 999;

  // Generate insights
  const insights = [];

  if (runwayDays < 30) {
    insights.push({
      type: 'warning',
      title: 'Low Cash Runway',
      description: `At current burn rate, your accounts will be depleted in ~${runwayDays} days.`,
      actionLabel: 'Request Line of Credit',
      actionRoute: '/apply-loan',
    });
  }

  if (avgDailyInflowCents > avgDailyOutflowCents * 1.5) {
    const idleCash = currentBalanceCents - (avgDailyOutflowCents * 30);
    if (idleCash > 0) {
      insights.push({
        type: 'opportunity',
        title: 'Idle Cash Detected',
        description: `You have ~${Math.round(idleCash / 100).toLocaleString()} in excess cash that could earn yield.`,
        actionLabel: 'Set Up Smart Sweep',
        actionRoute: '/cash-sweeps',
      });
    }
  }

  if (txns.length > 50) {
    insights.push({
      type: 'info',
      title: 'High Transaction Volume',
      description: `${txns.length} transactions in the last 90 days. Consider automated reconciliation.`,
      actionLabel: null,
      actionRoute: null,
    });
  }

  const projectedDate = new Date(today);
  projectedDate.setDate(projectedDate.getDate() + daysAhead);

  return {
    data: {
      forecast: {
        currentBalanceCents,
        projectedBalanceCents: Math.max(0, projectedBalance),
        projectedDate: projectedDate.toISOString().split('T')[0],
        avgDailyInflowCents,
        avgDailyOutflowCents,
        upcomingPayrollCents,
        upcomingBillsCents,
        runwayDays: Math.min(runwayDays, 999),
        dataPoints,
        insights,
      },
    },
  };
}
