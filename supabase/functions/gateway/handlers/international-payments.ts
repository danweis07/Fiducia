/**
 * International Payments Domain Handlers
 *
 * Gateway handlers for cross-border payments, FX quotes, global card issuing,
 * and international payouts. Backed by Stripe and Marqeta adapters.
 *
 * All monetary values are integer cents (or minor currency units).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { InternationalPaymentsAdapter } from '../../_shared/adapters/international-payments/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<InternationalPaymentsAdapter> {
  const { adapter } = await resolveAdapter<InternationalPaymentsAdapter>('international_payments', tenantId);
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

  const perTxnLimit = limits?.per_transaction_limit_cents ?? 10000000; // $100k default
  const dailyLimit = limits?.daily_limit_cents ?? 25000000; // $250k default
  const monthlyLimit = limits?.monthly_limit_cents ?? 100000000; // $1M default

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

/** Get supported country coverage */
export async function getInternationalCoverage(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { region } = ctx.params as { region?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getCoverage({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    region: region as never,
  });

  return { data: result };
}

/** Get FX quote */
export async function getFXQuote(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromCurrency, toCurrency, fromAmountCents, toAmountCents } = ctx.params as {
    fromCurrency: string; toCurrency: string; fromAmountCents?: number; toAmountCents?: number;
  };

  if (!fromCurrency || !toCurrency) {
    return { error: { code: 'VALIDATION_ERROR', message: 'fromCurrency and toCurrency are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getFXQuote({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    fromCurrency,
    toCurrency,
    fromAmountCents,
    toAmountCents,
  });

  return { data: result };
}

/** Create an international payment */
export async function createInternationalPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromAccountId, fromCurrency, toCurrency, amountCents, rail, beneficiaryName, beneficiaryCountry, beneficiaryAccountNumber, swiftBic, iban, reference, quoteId } = ctx.params as {
    fromAccountId: string; fromCurrency: string; toCurrency: string; amountCents: number;
    rail?: string; beneficiaryName: string; beneficiaryCountry: string;
    beneficiaryAccountNumber: string; swiftBic?: string; iban?: string;
    reference?: string; quoteId?: string;
  };

  if (!fromAccountId || !fromCurrency || !toCurrency || !amountCents || !beneficiaryName || !beneficiaryCountry || !beneficiaryAccountNumber) {
    return { error: { code: 'VALIDATION_ERROR', message: 'fromAccountId, fromCurrency, toCurrency, amountCents, beneficiaryName, beneficiaryCountry, and beneficiaryAccountNumber are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Enforce per-transaction, daily, and monthly limits
  const limitErr = await checkPaymentLimits(ctx, amountCents, 'international_payment', 'international_payments', 'amount_cents');
  if (limitErr) return limitErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createPayment({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    payment: { fromAccountId, fromCurrency, toCurrency, amountCents, rail: rail as never, beneficiaryName, beneficiaryCountry, beneficiaryAccountNumber, swiftBic, iban, reference, quoteId },
  });

  return { data: result };
}

/** Get international payment details */
export async function getInternationalPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId } = ctx.params as { paymentId: string };
  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getPayment({ userId: ctx.userId!, tenantId: ctx.firmId!, paymentId });

  return { data: result };
}

/** List international payments */
export async function listInternationalPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, fromDate, toDate, limit, offset } = ctx.params as {
    status?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayments({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
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

/** Issue a global card */
export async function issueGlobalCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { type, cardholderName, currency, country, spendLimitCents, spendLimitInterval, metadata } = ctx.params as {
    type: string; cardholderName: string; currency: string; country: string;
    spendLimitCents: number; spendLimitInterval: string; metadata?: Record<string, string>;
  };

  if (!type || !cardholderName || !currency || !country || !spendLimitCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'type, cardholderName, currency, country, and spendLimitCents are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.issueGlobalCard({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    card: { type: type as never, cardholderName, currency, country, spendLimitCents, spendLimitInterval: spendLimitInterval as never ?? 'monthly', metadata },
  });

  return { data: result };
}

/** List global issued cards */
export async function listGlobalCards(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, country, limit, offset } = ctx.params as {
    status?: string; country?: string; limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listGlobalCards({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    status: status as never,
    country,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.cards,
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.total } },
  };
}

/** Create an international payout */
export async function createInternationalPayout(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { destinationCountry, destinationCurrency, amountCents, rail, recipientName, recipientAccountNumber, recipientBankCode, reference } = ctx.params as {
    destinationCountry: string; destinationCurrency: string; amountCents: number;
    rail?: string; recipientName: string; recipientAccountNumber: string;
    recipientBankCode?: string; reference?: string;
  };

  if (!destinationCountry || !destinationCurrency || !amountCents || !recipientName || !recipientAccountNumber) {
    return { error: { code: 'VALIDATION_ERROR', message: 'destinationCountry, destinationCurrency, amountCents, recipientName, and recipientAccountNumber are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Enforce per-transaction, daily, and monthly limits
  const limitErr = await checkPaymentLimits(ctx, amountCents, 'international_payout', 'international_payouts', 'amount_cents');
  if (limitErr) return limitErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createPayout({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    payout: { destinationCountry, destinationCurrency, amountCents, rail: rail as never, recipientName, recipientAccountNumber, recipientBankCode, reference },
  });

  return { data: result };
}

/** List international payouts */
export async function listInternationalPayouts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, limit, offset } = ctx.params as { status?: string; limit?: number; offset?: number };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayouts({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    status: status as never,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.payouts,
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.total } },
  };
}
