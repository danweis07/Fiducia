/**
 * Bill Pay Domain Handlers
 *
 * Gateway handlers for bill payment operations using the adapter pattern.
 * Supports biller search, payee enrollment, payment scheduling, and e-bills.
 *
 * All monetary values are integer cents.
 * Account numbers are always masked in responses.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { BillPayAdapter } from '../../_shared/adapters/bill-pay/types.ts';
import { tSync } from '../../_shared/i18n/index.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: tSync(ctx.locale, 'AUTH_REQUIRED', 'message') }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<BillPayAdapter> {
  const { adapter } = await resolveAdapter<BillPayAdapter>('bill_pay', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Search the biller directory */
export async function searchBillers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { query, category, zipCode, limit } = ctx.params as {
    query: string; category?: string; zipCode?: string; limit?: number;
  };

  if (!query) {
    return { error: { code: 'VALIDATION_ERROR', message: 'query is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.searchBillers({
    query,
    category: category as never,
    zipCode,
    limit: limit ?? 20,
  });

  return { data: result };
}

/** Enroll a payee (link a biller to user's account) */
export async function enrollPayee(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { billerId, accountNumber, nickname, enrollmentFields } = ctx.params as {
    billerId: string; accountNumber: string; nickname?: string; enrollmentFields?: Record<string, string>;
  };

  if (!billerId || !accountNumber) {
    return { error: { code: 'VALIDATION_ERROR', message: 'billerId and accountNumber are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.enrollPayee({
    billerId,
    accountNumber,
    nickname,
    enrollmentFields,
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** List user's enrolled payees */
export async function listPayees(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayees({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Schedule a payment */
export async function schedulePayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { payeeId, fromAccountId, amountCents, scheduledDate, method, memo, recurringRule } = ctx.params as {
    payeeId: string; fromAccountId: string; amountCents: number; scheduledDate: string;
    method?: string; memo?: string; recurringRule?: unknown;
  };

  if (!payeeId || !fromAccountId || !amountCents || !scheduledDate) {
    return { error: { code: 'VALIDATION_ERROR', message: 'payeeId, fromAccountId, amountCents, and scheduledDate are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'amountCents must be positive' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.schedulePayment({
    payeeId,
    fromAccountId,
    amountCents,
    scheduledDate,
    method: (method as 'electronic' | 'check' | 'rush') ?? 'electronic',
    memo,
    recurringRule: recurringRule as never,
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Cancel a scheduled payment */
export async function cancelPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId, providerPaymentId } = ctx.params as { paymentId: string; providerPaymentId?: string };

  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.cancelPayment({
    paymentId,
    providerPaymentId: providerPaymentId ?? paymentId,
  });

  return { data: result };
}

/** Get payment status */
export async function getPaymentStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { paymentId, providerPaymentId } = ctx.params as { paymentId: string; providerPaymentId?: string };

  if (!paymentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'paymentId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getPaymentStatus({
    paymentId,
    providerPaymentId: providerPaymentId ?? paymentId,
  });

  return { data: result };
}

/** List payment history */
export async function listPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { payeeId, status, fromDate, toDate, limit, offset } = ctx.params as {
    payeeId?: string; status?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPayments({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    payeeId,
    status: status as never,
    fromDate,
    toDate,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.payments,
    meta: { pagination: { total: result.totalCount, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.totalCount } },
  };
}

/** List e-bills for enrolled payees */
export async function listEBills(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { payeeId, status } = ctx.params as { payeeId?: string; status?: string };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listEBills({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    payeeId,
    status: status as never,
  });

  return { data: result };
}
