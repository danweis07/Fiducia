/**
 * Proactive Financial Insights Engine
 *
 * Analyzes a user's accounts, transactions, and recurring payments to
 * generate actionable financial insights. Each insight includes a severity
 * level and an optional one-tap suggested action that maps to a gateway
 * endpoint.
 *
 * Insight types:
 *   - overdraft_prediction: Balance may not cover upcoming recurring payments
 *   - spending_anomaly: Category spend is significantly above rolling average
 *   - subscription_creep: (future) Total subscriptions trending upward
 *   - bill_increase: (future) Recurring bill amount increased
 *   - savings_opportunity: Excess checking balance could earn interest
 *   - rate_alert: (future) Better rate available for existing products
 *   - unusual_merchant: (future) First-time or rare merchant activity
 *   - payment_failure_risk: Insufficient balance for a scheduled payment
 *
 * All monetary values are in cents (integer). No floating-point dollar math.
 */

// =============================================================================
// TYPES
// =============================================================================

export type InsightType =
  | 'overdraft_prediction'
  | 'spending_anomaly'
  | 'subscription_creep'
  | 'bill_increase'
  | 'savings_opportunity'
  | 'rate_alert'
  | 'unusual_merchant'
  | 'payment_failure_risk';

export interface InsightGeneratorContext {
  userId: string;
  tenantId: string;
  accounts: Array<{
    id: string;
    type: string;
    balanceCents: number;
    availableBalanceCents: number;
  }>;
  recentTransactions: Array<{
    amountCents: number;
    category: string;
    merchantName: string;
    date: string;
    type: string;
  }>;
  recurringPayments?: Array<{
    amountCents: number;
    nextDate: string;
    payeeName: string;
  }>;
}

export interface SuggestedAction {
  /** Gateway action type (e.g., 'transfer.create', 'account.open') */
  type: string;
  /** User-facing button label */
  label: string;
  /** Parameters to pass to the gateway action */
  params: Record<string, unknown>;
}

export interface GeneratedInsight {
  type: InsightType;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'positive';
  data: Record<string, unknown>;
  suggestedAction?: SuggestedAction;
  expiresAt?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Number of days to look ahead for upcoming payments */
const UPCOMING_WINDOW_DAYS = 7;

/** Multiplier threshold for spending anomaly detection (2x = flag if double the average) */
const SPENDING_ANOMALY_MULTIPLIER = 2;

/** Number of weeks for rolling average calculation */
const ROLLING_AVERAGE_WEEKS = 4;

/** Minimum excess balance in cents to trigger savings opportunity ($2,000) */
const SAVINGS_EXCESS_THRESHOLD_CENTS = 200_000;

/** Minimum number of days (out of last 30) the excess must be sustained */
const SAVINGS_SUSTAINED_DAYS = 14;

/** Insight TTL in hours */
const DEFAULT_INSIGHT_TTL_HOURS = 24;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format cents as a dollar string for user-facing messages.
 * Uses integer division — no floating point.
 */
function formatCentsToDollars(cents: number): string {
  const negative = cents < 0;
  const absCents = Math.abs(cents);
  const dollars = Math.floor(absCents / 100);
  const remainder = absCents % 100;
  const formatted = `$${dollars.toLocaleString('en-US')}.${String(remainder).padStart(2, '0')}`;
  return negative ? `-${formatted}` : formatted;
}

/**
 * Parse a date string to a Date object in UTC.
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

/**
 * Get the number of days between two dates (ignoring time).
 */
function daysBetween(a: Date, b: Date): number {
  const msPerDay = 86_400_000;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

/**
 * Get an ISO timestamp N hours from now, for insight expiration.
 */
function expiresInHours(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

/**
 * Get checking accounts from context.
 */
function getCheckingAccounts(ctx: InsightGeneratorContext) {
  return ctx.accounts.filter((a) => a.type === 'checking');
}

// =============================================================================
// INSIGHT GENERATORS
// =============================================================================

/**
 * Overdraft Prediction
 *
 * Compares available balance on checking accounts against the sum of
 * upcoming recurring payments within the next 7 days. If the balance
 * is insufficient to cover all upcoming payments, a critical or warning
 * insight is generated.
 */
export function checkOverdraftRisk(
  ctx: InsightGeneratorContext,
): GeneratedInsight | null {
  const checking = getCheckingAccounts(ctx);
  if (checking.length === 0 || !ctx.recurringPayments || ctx.recurringPayments.length === 0) {
    return null;
  }

  const now = new Date();
  const upcomingPayments = ctx.recurringPayments.filter((p) => {
    const nextDate = parseDate(p.nextDate);
    const daysUntil = daysBetween(now, nextDate);
    return daysUntil >= 0 && daysUntil <= UPCOMING_WINDOW_DAYS;
  });

  if (upcomingPayments.length === 0) {
    return null;
  }

  const totalUpcomingCents = upcomingPayments.reduce(
    (sum, p) => sum + p.amountCents,
    0,
  );

  // Sum available balance across all checking accounts
  const totalAvailableCents = checking.reduce(
    (sum, a) => sum + a.availableBalanceCents,
    0,
  );

  const shortfallCents = totalUpcomingCents - totalAvailableCents;

  if (shortfallCents <= 0) {
    return null;
  }

  // Determine severity: critical if shortfall is >50% of upcoming, warning otherwise
  const severity: 'critical' | 'warning' =
    shortfallCents > totalUpcomingCents / 2 ? 'critical' : 'warning';

  const paymentNames = upcomingPayments
    .map((p) => p.payeeName)
    .slice(0, 3)
    .join(', ');
  const andMore =
    upcomingPayments.length > 3
      ? ` and ${upcomingPayments.length - 3} more`
      : '';

  return {
    type: 'overdraft_prediction',
    title: 'Overdraft Risk Detected',
    message:
      `Your checking balance of ${formatCentsToDollars(totalAvailableCents)} may not cover ` +
      `${formatCentsToDollars(totalUpcomingCents)} in upcoming payments (${paymentNames}${andMore}) ` +
      `within the next ${UPCOMING_WINDOW_DAYS} days. ` +
      `You may be short by ${formatCentsToDollars(shortfallCents)}.`,
    severity,
    data: {
      availableBalanceCents: totalAvailableCents,
      upcomingPaymentsCents: totalUpcomingCents,
      shortfallCents,
      upcomingPaymentCount: upcomingPayments.length,
      windowDays: UPCOMING_WINDOW_DAYS,
    },
    suggestedAction: {
      type: 'transfer.create',
      label: 'Transfer funds to checking',
      params: {
        toAccountType: 'checking',
        suggestedAmountCents: shortfallCents,
      },
    },
    expiresAt: expiresInHours(DEFAULT_INSIGHT_TTL_HOURS),
  };
}

/**
 * Spending Anomaly Detection
 *
 * Compares the current week's spending in each transaction category
 * against the 4-week rolling average. Flags categories where current
 * spending exceeds 2x the average.
 */
export function checkSpendingAnomaly(
  ctx: InsightGeneratorContext,
): GeneratedInsight | null {
  if (ctx.recentTransactions.length === 0) {
    return null;
  }

  const now = new Date();

  // Only consider debit transactions (outflows)
  const debits = ctx.recentTransactions.filter(
    (t) => t.type === 'debit' || t.amountCents < 0,
  );

  if (debits.length === 0) {
    return null;
  }

  // Group transactions by week offset (0 = current week) and category
  const weeklyByCategory = new Map<string, Map<number, number>>();

  for (const txn of debits) {
    const txnDate = parseDate(txn.date);
    const daysAgo = daysBetween(txnDate, now);
    const weekOffset = Math.floor(daysAgo / 7);

    // Only consider last 5 weeks of data (current + 4 historical)
    if (weekOffset < 0 || weekOffset > ROLLING_AVERAGE_WEEKS) {
      continue;
    }

    const category = txn.category || 'uncategorized';
    if (!weeklyByCategory.has(category)) {
      weeklyByCategory.set(category, new Map());
    }

    const weekMap = weeklyByCategory.get(category)!;
    const absAmount = Math.abs(txn.amountCents);
    weekMap.set(weekOffset, (weekMap.get(weekOffset) ?? 0) + absAmount);
  }

  // Find the worst anomaly across all categories
  let worstAnomaly: {
    category: string;
    currentCents: number;
    averageCents: number;
    ratio: number;
  } | null = null;

  for (const [category, weekMap] of weeklyByCategory) {
    const currentWeekCents = weekMap.get(0) ?? 0;
    if (currentWeekCents === 0) continue;

    // Calculate average of weeks 1-4 (historical)
    let historicalTotal = 0;
    let historicalWeeks = 0;
    for (let w = 1; w <= ROLLING_AVERAGE_WEEKS; w++) {
      const weekAmount = weekMap.get(w);
      if (weekAmount !== undefined) {
        historicalTotal += weekAmount;
        historicalWeeks++;
      }
    }

    if (historicalWeeks === 0) continue;

    const averageCents = Math.round(historicalTotal / historicalWeeks);
    if (averageCents === 0) continue;

    const ratio = currentWeekCents / averageCents;

    if (
      ratio >= SPENDING_ANOMALY_MULTIPLIER &&
      (!worstAnomaly || ratio > worstAnomaly.ratio)
    ) {
      worstAnomaly = { category, currentCents: currentWeekCents, averageCents, ratio };
    }
  }

  if (!worstAnomaly) {
    return null;
  }

  const ratioFormatted = worstAnomaly.ratio.toFixed(1);

  return {
    type: 'spending_anomaly',
    title: `Unusual Spending: ${worstAnomaly.category}`,
    message:
      `Your spending in "${worstAnomaly.category}" this week is ` +
      `${formatCentsToDollars(worstAnomaly.currentCents)}, which is ${ratioFormatted}x ` +
      `your ${ROLLING_AVERAGE_WEEKS}-week average of ${formatCentsToDollars(worstAnomaly.averageCents)}.`,
    severity: worstAnomaly.ratio >= 3 ? 'warning' : 'info',
    data: {
      category: worstAnomaly.category,
      currentWeekCents: worstAnomaly.currentCents,
      averageWeekCents: worstAnomaly.averageCents,
      ratio: Math.round(worstAnomaly.ratio * 10) / 10,
      rollingWeeks: ROLLING_AVERAGE_WEEKS,
    },
    suggestedAction: {
      type: 'transactions.filter',
      label: `View ${worstAnomaly.category} transactions`,
      params: {
        category: worstAnomaly.category,
        dateRange: 'this_week',
      },
    },
    expiresAt: expiresInHours(DEFAULT_INSIGHT_TTL_HOURS),
  };
}

/**
 * Savings Opportunity Detection
 *
 * If the user's checking balance has consistently been more than $2,000
 * above the minimum needed (estimated from transaction outflows) for at
 * least 14 of the last 30 days, suggest moving excess to savings.
 *
 * Since we don't have daily balance snapshots, we approximate by checking
 * the current balance surplus against average daily outflows.
 */
export function checkSavingsOpportunity(
  ctx: InsightGeneratorContext,
): GeneratedInsight | null {
  const checking = getCheckingAccounts(ctx);
  if (checking.length === 0) {
    return null;
  }

  const totalBalanceCents = checking.reduce(
    (sum, a) => sum + a.availableBalanceCents,
    0,
  );

  // Estimate average daily outflow from recent transactions (last 30 days)
  const now = new Date();
  const debits = ctx.recentTransactions.filter((t) => {
    const daysAgo = daysBetween(parseDate(t.date), now);
    return daysAgo >= 0 && daysAgo <= 30 && (t.type === 'debit' || t.amountCents < 0);
  });

  const totalOutflowCents = debits.reduce(
    (sum, t) => sum + Math.abs(t.amountCents),
    0,
  );

  // Estimate how many days of data we have
  const transactionDates = new Set(
    ctx.recentTransactions
      .filter((t) => {
        const daysAgo = daysBetween(parseDate(t.date), now);
        return daysAgo >= 0 && daysAgo <= 30;
      })
      .map((t) => t.date.slice(0, 10)),
  );

  const daysWithData = Math.max(transactionDates.size, 1);

  // If we have fewer than SAVINGS_SUSTAINED_DAYS of data, not enough history
  if (daysWithData < SAVINGS_SUSTAINED_DAYS) {
    return null;
  }

  const avgDailyOutflowCents = Math.round(totalOutflowCents / daysWithData);

  // Estimate the minimum buffer needed: 14 days of average daily outflows
  const minimumBufferCents = avgDailyOutflowCents * SAVINGS_SUSTAINED_DAYS;

  const excessCents = totalBalanceCents - minimumBufferCents;

  if (excessCents < SAVINGS_EXCESS_THRESHOLD_CENTS) {
    return null;
  }

  // Round the suggested transfer to the nearest $100 (in cents)
  const suggestedTransferCents =
    Math.floor(excessCents / 10_000) * 10_000;

  if (suggestedTransferCents <= 0) {
    return null;
  }

  return {
    type: 'savings_opportunity',
    title: 'Savings Opportunity',
    message:
      `Your checking account has maintained a balance ${formatCentsToDollars(excessCents)} ` +
      `above your estimated needs. Consider moving ${formatCentsToDollars(suggestedTransferCents)} ` +
      `to savings to earn interest.`,
    severity: 'positive',
    data: {
      currentBalanceCents: totalBalanceCents,
      estimatedMinimumCents: minimumBufferCents,
      excessCents,
      suggestedTransferCents,
      avgDailyOutflowCents,
    },
    suggestedAction: {
      type: 'transfer.create',
      label: `Move ${formatCentsToDollars(suggestedTransferCents)} to savings`,
      params: {
        fromAccountType: 'checking',
        toAccountType: 'savings',
        amountCents: suggestedTransferCents,
      },
    },
    expiresAt: expiresInHours(DEFAULT_INSIGHT_TTL_HOURS * 3), // Longer TTL for non-urgent
  };
}

/**
 * Payment Failure Risk Detection
 *
 * Checks each upcoming scheduled/recurring payment individually against
 * the projected balance at that payment date (accounting for payments
 * that come before it). If the projected balance falls below a specific
 * payment, that payment is at risk.
 */
export function checkPaymentFailureRisk(
  ctx: InsightGeneratorContext,
): GeneratedInsight | null {
  const checking = getCheckingAccounts(ctx);
  if (checking.length === 0 || !ctx.recurringPayments || ctx.recurringPayments.length === 0) {
    return null;
  }

  const now = new Date();

  // Get upcoming payments sorted by date
  const upcomingPayments = ctx.recurringPayments
    .filter((p) => {
      const nextDate = parseDate(p.nextDate);
      const daysUntil = daysBetween(now, nextDate);
      return daysUntil >= 0 && daysUntil <= UPCOMING_WINDOW_DAYS;
    })
    .sort((a, b) => parseDate(a.nextDate).getTime() - parseDate(b.nextDate).getTime());

  if (upcomingPayments.length === 0) {
    return null;
  }

  const totalAvailableCents = checking.reduce(
    (sum, a) => sum + a.availableBalanceCents,
    0,
  );

  // Walk through payments in chronological order, projecting the balance
  let projectedBalanceCents = totalAvailableCents;
  let atRiskPayment: { payeeName: string; amountCents: number; nextDate: string; projectedBalanceCents: number } | null = null;

  for (const payment of upcomingPayments) {
    if (projectedBalanceCents < payment.amountCents) {
      atRiskPayment = {
        payeeName: payment.payeeName,
        amountCents: payment.amountCents,
        nextDate: payment.nextDate,
        projectedBalanceCents,
      };
      break;
    }
    projectedBalanceCents -= payment.amountCents;
  }

  if (!atRiskPayment) {
    return null;
  }

  const shortfallCents = atRiskPayment.amountCents - atRiskPayment.projectedBalanceCents;
  const paymentDate = parseDate(atRiskPayment.nextDate);
  const daysUntil = daysBetween(now, paymentDate);

  return {
    type: 'payment_failure_risk',
    title: `Payment at Risk: ${atRiskPayment.payeeName}`,
    message:
      `Your ${formatCentsToDollars(atRiskPayment.amountCents)} payment to ${atRiskPayment.payeeName} ` +
      `scheduled in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} may fail. ` +
      `Projected balance at that time is ${formatCentsToDollars(atRiskPayment.projectedBalanceCents)}, ` +
      `which is ${formatCentsToDollars(shortfallCents)} short.`,
    severity: daysUntil <= 2 ? 'critical' : 'warning',
    data: {
      payeeName: atRiskPayment.payeeName,
      paymentAmountCents: atRiskPayment.amountCents,
      projectedBalanceCents: atRiskPayment.projectedBalanceCents,
      shortfallCents,
      paymentDate: atRiskPayment.nextDate,
      daysUntilPayment: daysUntil,
    },
    suggestedAction: {
      type: 'transfer.create',
      label: `Transfer ${formatCentsToDollars(shortfallCents)} to cover payment`,
      params: {
        toAccountType: 'checking',
        suggestedAmountCents: shortfallCents,
        reason: `Cover ${atRiskPayment.payeeName} payment`,
      },
    },
    expiresAt: expiresInHours(Math.min(daysUntil * 24, DEFAULT_INSIGHT_TTL_HOURS)),
  };
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Generate all applicable proactive insights for a user.
 *
 * Runs all check functions and collects non-null results. Results are
 * sorted by severity (critical first) for prioritized display.
 *
 * @param ctx - Generator context with accounts, transactions, and recurring payments
 * @returns Array of generated insights, sorted by severity
 */
export function generateInsights(
  ctx: InsightGeneratorContext,
): GeneratedInsight[] {
  const checks = [
    checkOverdraftRisk,
    checkPaymentFailureRisk,
    checkSpendingAnomaly,
    checkSavingsOpportunity,
  ];

  const insights: GeneratedInsight[] = [];

  for (const check of checks) {
    try {
      const insight = check(ctx);
      if (insight) {
        insights.push(insight);
      }
    } catch (err) {
      // Log but don't let one failed check block the others
      const checkName = check.name || 'unknown';
      console.error(`[Insights] ${checkName} failed for user ${ctx.userId}:`, err);
    }
  }

  // Sort by severity priority
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    positive: 3,
  };

  insights.sort(
    (a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99),
  );

  return insights;
}
