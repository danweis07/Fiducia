/**
 * International Bill Pay Domain Handlers
 *
 * Gateway handlers for cross-border bill payments across 46+ countries.
 * Backed by Pipit Global, Wise Platform, and ConnectPay adapters.
 *
 * All monetary values are integer minor currency units.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { InternationalBillPayAdapter } from '../../_shared/adapters/international-bill-pay/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<InternationalBillPayAdapter> {
  const { adapter } = await resolveAdapter<InternationalBillPayAdapter>('international_bill_pay', tenantId);
  return adapter;
}

// =============================================================================
// TRANSACTION LIMIT VALIDATION
// =============================================================================

async function checkPaymentLimits(
  ctx: GatewayContext,
  amountCents: number,
  channel: string,
  tableName: string,
  amountColumn: string,
): Promise<GatewayResponse | null> {
  const { data: limits } = await ctx.db
    .from('firm_payment_limits')
    .select('per_transaction_limit_cents, daily_limit_cents, monthly_limit_cents')
    .eq('firm_id', ctx.firmId)
    .eq('channel', channel)
    .limit(1)
    .single();

  const perTxnLimit = limits?.per_transaction_limit_cents ?? 5000000; // $50k default
  const dailyLimit = limits?.daily_limit_cents ?? 10000000; // $100k default
  const monthlyLimit = limits?.monthly_limit_cents ?? 50000000; // $500k default

  if (amountCents > perTxnLimit) {
    return { error: { code: 'LIMIT_EXCEEDED', message: `Amount exceeds per-transaction limit of ${perTxnLimit} cents` }, status: 400 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayTxns } = await ctx.db
    .from(tableName)
    .select(amountColumn)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'in', '("cancelled","failed","rejected")');

  const usedToday = (todayTxns ?? []).reduce((sum: number, t: Record<string, number>) => sum + (t[amountColumn] ?? 0), 0);
  if (usedToday + amountCents > dailyLimit) {
    return { error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Payment would exceed your daily limit' }, status: 400 };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: monthTxns } = await ctx.db
    .from(tableName)
    .select(amountColumn)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', monthStart.toISOString())
    .not('status', 'in', '("cancelled","failed","rejected")');

  const usedThisMonth = (monthTxns ?? []).reduce((sum: number, t: Record<string, number>) => sum + (t[amountColumn] ?? 0), 0);
  if (usedThisMonth + amountCents > monthlyLimit) {
    return { error: { code: 'MONTHLY_LIMIT_EXCEEDED', message: 'Payment would exceed your monthly limit' }, status: 400 };
  }

  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Search international billers */
export async function searchInternationalBillers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { query, country, category, limit } = ctx.params as {
    query: string; country?: string; category?: string; limit?: number;
  };

  if (!query) {
    return { error: { code: 'VALIDATION_ERROR', message: 'query is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.searchBillers({
    query,
    country,
    category: category as never,
    limit: limit ?? 20,
  });

  return { data: result };
}

/** Pay an international bill */
export async function payInternationalBill(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { billerId, fromAccountId, fromCurrency, amountCents, accountReference, referenceFields, rail } = ctx.params as {
    billerId: string; fromAccountId: string; fromCurrency: string;
    amountCents: number; accountReference: string;
    referenceFields?: Record<string, string>; rail?: string;
  };

  if (!billerId || !fromAccountId || !fromCurrency || !amountCents || !accountReference) {
    return { error: { code: 'VALIDATION_ERROR', message: 'billerId, fromAccountId, fromCurrency, amountCents, and accountReference are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Enforce per-transaction, daily, and monthly limits
  const limitErr = await checkPaymentLimits(ctx, amountCents, 'international_bill_pay', 'international_bill_payments', 'amount_cents');
  if (limitErr) return limitErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.payBill({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    billerId,
    fromAccountId,
    fromCurrency,
    amountCents,
    accountReference,
    referenceFields,
    rail: rail as never,
  });

  return { data: result };
}

/** Get international bill payment details */
export async function getInternationalBillPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId } = ctx.params as { paymentId: string };
  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getPayment({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    paymentId,
  });

  return { data: result };
}

/** List international bill payments */
export async function listInternationalBillPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country, status, fromDate, toDate, limit, offset } = ctx.params as {
    country?: string; status?: string; fromDate?: string; toDate?: string;
    limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayments({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    country,
    status: status as never,
    fromDate,
    toDate,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.payments,
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.total } },
  };
}

/** Get supported countries */
export async function getInternationalBillPayCountries(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getSupportedCountries({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}
