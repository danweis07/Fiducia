/**
 * Instant Payments Domain Handlers
 *
 * Gateway handlers for real-time payment operations including:
 *   - Sending instant payments (FedNow, RTP, SEPA Instant, Pix, UPI)
 *   - Payment status tracking
 *   - Receiver eligibility checks
 *   - Request for Payment (R2P) — push-payment requests
 *   - Export ISO 20022 XML for a payment
 *   - Payment limits and fees
 *
 * All monetary values are integer cents (or smallest currency unit).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { InstantPaymentAdapter } from '../../_shared/adapters/instant-payments/types.ts';
import { toISO20022Pacs008, toISO20022Pain001 } from '../../_shared/iso20022/index.ts';
import type { InternalTransfer } from '../../_shared/iso20022/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<InstantPaymentAdapter> {
  const { adapter } = await resolveAdapter<InstantPaymentAdapter>('instant_payments', tenantId);
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

  // Check daily usage
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

  // Check monthly usage
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

/** Send an instant payment */
export async function sendInstantPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { sourceAccountId, receiverRoutingNumber, receiverAccountNumber, receiverName, amountCents, currency, description, preferredRail, idempotencyKey, receiverIBAN, receiverBIC, pixKey, pixKeyType, receiverVPA, receiverIFSC } = ctx.params as {
    sourceAccountId: string; receiverRoutingNumber: string; receiverAccountNumber: string;
    receiverName: string; amountCents: number; currency?: string; description: string;
    preferredRail?: string; idempotencyKey: string; receiverIBAN?: string; receiverBIC?: string;
    pixKey?: string; pixKeyType?: string; receiverVPA?: string; receiverIFSC?: string;
  };

  if (!sourceAccountId || !receiverName || !amountCents || !description || !idempotencyKey) {
    return { error: { code: 'VALIDATION_ERROR', message: 'sourceAccountId, receiverName, amountCents, description, and idempotencyKey are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // Enforce per-transaction, daily, and monthly limits
  const limitErr = await checkPaymentLimits(ctx, amountCents, 'instant_payment', 'instant_payments', 'amount_cents');
  if (limitErr) return limitErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.sendPayment({
    tenantId: ctx.firmId!,
    sourceAccountId,
    receiverRoutingNumber,
    receiverAccountNumber,
    receiverName,
    amountCents,
    currency,
    description,
    preferredRail: preferredRail as never,
    idempotencyKey,
    receiverIBAN,
    receiverBIC,
    pixKey,
    pixKeyType: pixKeyType as never,
    receiverVPA,
    receiverIFSC,
  });

  return { data: result };
}

/** Get instant payment details */
export async function getInstantPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId } = ctx.params as { paymentId: string };
  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getPayment({ tenantId: ctx.firmId!, paymentId });

  return { data: { payment: result } };
}

/** List instant payments */
export async function listInstantPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, direction, status, startDate, endDate, limit, cursor } = ctx.params as {
    accountId?: string; direction?: string; status?: string; startDate?: string;
    endDate?: string; limit?: number; cursor?: string;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayments({
    tenantId: ctx.firmId!,
    accountId,
    direction: direction as never,
    status: status as never,
    startDate,
    endDate,
    limit: limit ?? 50,
    cursor,
  });

  return {
    data: { payments: result.payments },
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: 0, hasMore: result.hasMore } },
  };
}

/** Check receiver eligibility for instant payments */
export async function checkInstantPaymentReceiver(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { routingNumber, accountNumber, rail, receiverIBAN, receiverBIC, pixKey, receiverVPA } = ctx.params as {
    routingNumber: string; accountNumber: string; rail?: string;
    receiverIBAN?: string; receiverBIC?: string; pixKey?: string; receiverVPA?: string;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.checkReceiver({
    tenantId: ctx.firmId!,
    routingNumber,
    accountNumber,
    rail: rail as never,
    receiverIBAN,
    receiverBIC,
    pixKey,
    receiverVPA,
  });

  return { data: result };
}

/** Send a Request for Payment (R2P) — push-payment request */
export async function sendRequestForPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { requesterAccountId, payerRoutingNumber, payerAccountNumber, payerName, amountCents, description, expiresAt, preferredRail } = ctx.params as {
    requesterAccountId: string; payerRoutingNumber: string; payerAccountNumber: string;
    payerName: string; amountCents: number; description: string; expiresAt: string;
    preferredRail?: string;
  };

  if (!requesterAccountId || !payerRoutingNumber || !payerAccountNumber || !payerName || !amountCents || !description || !expiresAt) {
    return { error: { code: 'VALIDATION_ERROR', message: 'requesterAccountId, payerRoutingNumber, payerAccountNumber, payerName, amountCents, description, and expiresAt are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  // R2P amount limit
  const r2pPerTxnLimit = 10000000; // $100k per R2P request
  if (amountCents > r2pPerTxnLimit) {
    return { error: { code: 'LIMIT_EXCEEDED', message: `R2P amount exceeds per-request limit of ${r2pPerTxnLimit} cents` }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.sendRequestForPayment({
    tenantId: ctx.firmId!,
    requesterAccountId,
    payerRoutingNumber,
    payerAccountNumber,
    payerName,
    amountCents,
    description,
    expiresAt,
    preferredRail: preferredRail as never,
  });

  return { data: result };
}

/** Export an instant payment as ISO 20022 XML (pain.001 or pacs.008) */
export async function exportPaymentISO20022(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId, format } = ctx.params as {
    paymentId: string;
    format?: 'pain.001' | 'pacs.008';
  };

  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  // Retrieve payment via adapter
  const adapter = await getAdapter(ctx.firmId);
  const payment = await adapter.getPayment({ tenantId: ctx.firmId!, paymentId });

  if (!payment) {
    return { error: { code: 'NOT_FOUND', message: 'Payment not found' }, status: 404 };
  }

  const p = payment as Record<string, unknown>;

  const transfer: InternalTransfer = {
    id: p.paymentId as string ?? paymentId,
    fromAccountId: p.sourceAccountId as string ?? '',
    fromRoutingNumber: p.senderRoutingNumber as string ?? '',
    toRoutingNumber: p.receiverRoutingNumber as string ?? '',
    fromAccountNumber: undefined,
    toAccountNumber: undefined,
    amountCents: p.amountCents as number,
    currency: p.currency as string ?? 'USD',
    memo: p.description as string ?? '',
    senderName: p.senderName as string ?? '',
    recipientName: p.receiverName as string ?? '',
    requestedDate: p.createdAt as string ?? new Date().toISOString(),
    createdAt: p.createdAt as string ?? new Date().toISOString(),
    tenantId: ctx.firmId!,
  };

  const messageFormat = format ?? 'pacs.008';
  const xml = messageFormat === 'pain.001'
    ? toISO20022Pain001(transfer)
    : toISO20022Pacs008(transfer, { settlementMethod: 'CLRG' });

  return {
    data: {
      xml,
      messageType: messageFormat === 'pain.001' ? 'pain.001.001.11' : 'pacs.008.001.10',
      paymentId,
    },
  };
}

/** Get instant payment limits and fees */
export async function getInstantPaymentLimits(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // FedNow and RTP have different limits
  return {
    data: {
      limits: {
        fednow: {
          perTransactionLimitCents: 10000000, // $100,000
          dailyLimitCents: 50000000,          // $500,000
          feeCents: 0,                         // FedNow has no per-transaction fee currently
        },
        rtp: {
          perTransactionLimitCents: 100000000, // $1,000,000
          dailyLimitCents: 100000000,          // $1,000,000
          feeCents: 100,                        // $1.00 typical RTP fee
        },
      },
      supportedCurrencies: ['USD'],
      supportedRails: ['fednow', 'rtp'],
    },
  };
}
