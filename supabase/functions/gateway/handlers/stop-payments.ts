/**
 * Stop Payment Domain Handlers
 *
 * Gateway handlers for stop payment orders on checks.
 * Supports creation, listing, cancellation, renewal, and fee retrieval.
 *
 * All monetary values are integer cents.
 * Account numbers are always masked in responses (****1234).
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

function computeExpirationDate(effectiveDate: Date, duration: string): string | null {
  if (duration === 'permanent') return null;
  const expiry = new Date(effectiveDate);
  if (duration === '6months') expiry.setMonth(expiry.getMonth() + 6);
  else if (duration === '12months') expiry.setMonth(expiry.getMonth() + 12);
  return expiry.toISOString();
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Create a stop payment order */
export async function createStopPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    accountId, checkNumber, checkNumberEnd, payeeName,
    amountCents, amountRangeLowCents, amountRangeHighCents,
    reason, duration,
  } = ctx.params as {
    accountId: string; checkNumber: string; checkNumberEnd?: string;
    payeeName?: string; amountCents?: number;
    amountRangeLowCents?: number; amountRangeHighCents?: number;
    reason: string; duration: '6months' | '12months' | 'permanent';
  };

  if (!accountId || !checkNumber || !reason || !duration) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId, checkNumber, reason, and duration are required' }, status: 400 };
  }

  if (!['6months', '12months', 'permanent'].includes(duration)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'duration must be 6months, 12months, or permanent' }, status: 400 };
  }

  // Verify account belongs to user
  const { data: account } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Get fee
  const { data: feeConfig } = await ctx.db
    .from('charge_definitions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('charge_type', 'stop_payment')
    .eq('is_active', true)
    .limit(1)
    .single();

  const feeCents = feeConfig?.amount_cents ?? 3000; // $30 default fee

  const now = new Date();
  const expirationDate = computeExpirationDate(now, duration);

  const { data: stopPayment, error } = await ctx.db
    .from('stop_payments')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      account_id: accountId,
      account_masked: account.account_number_masked,
      check_number_start: checkNumber,
      check_number_end: checkNumberEnd ?? null,
      payee_name: payeeName ?? null,
      amount_cents: amountCents ?? null,
      amount_range_low_cents: amountRangeLowCents ?? null,
      amount_range_high_cents: amountRangeHighCents ?? null,
      reason,
      status: 'active',
      fee_cents: feeCents,
      duration,
      effective_date: now.toISOString(),
      expiration_date: expirationDate,
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create stop payment' }, status: 500 };
  }

  return {
    data: {
      stopPayment: {
        id: stopPayment.id,
        accountId: stopPayment.account_id,
        accountMasked: stopPayment.account_masked,
        checkNumberStart: stopPayment.check_number_start,
        checkNumberEnd: stopPayment.check_number_end,
        payeeName: stopPayment.payee_name,
        amountCents: stopPayment.amount_cents,
        amountRangeLowCents: stopPayment.amount_range_low_cents,
        amountRangeHighCents: stopPayment.amount_range_high_cents,
        reason: stopPayment.reason,
        status: stopPayment.status,
        feeCents: stopPayment.fee_cents,
        duration: stopPayment.duration,
        effectiveDate: stopPayment.effective_date,
        expirationDate: stopPayment.expiration_date,
        createdAt: stopPayment.created_at,
        updatedAt: stopPayment.updated_at,
      },
    },
  };
}

/** List stop payment orders with pagination and filters */
export async function listStopPayments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, accountId, limit = 20, offset = 0 } = ctx.params as {
    status?: string; accountId?: string; limit?: number; offset?: number;
  };

  let query = ctx.db
    .from('stop_payments')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (accountId) query = query.eq('account_id', accountId);

  const { data: stopPayments, count, error } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list stop payments' }, status: 500 };
  }

  const total = count ?? 0;

  return {
    data: {
      stopPayments: (stopPayments ?? []).map((sp: Record<string, unknown>) => ({
        id: sp.id,
        accountId: sp.account_id,
        accountMasked: sp.account_masked,
        checkNumberStart: sp.check_number_start,
        checkNumberEnd: sp.check_number_end,
        payeeName: sp.payee_name,
        amountCents: sp.amount_cents,
        amountRangeLowCents: sp.amount_range_low_cents,
        amountRangeHighCents: sp.amount_range_high_cents,
        reason: sp.reason,
        status: sp.status,
        feeCents: sp.fee_cents,
        duration: sp.duration,
        effectiveDate: sp.effective_date,
        expirationDate: sp.expiration_date,
        createdAt: sp.created_at,
        updatedAt: sp.updated_at,
      })),
    },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

/** Get a single stop payment order */
export async function getStopPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: sp, error } = await ctx.db
    .from('stop_payments')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (error || !sp) {
    return { error: { code: 'NOT_FOUND', message: 'Stop payment not found' }, status: 404 };
  }

  return {
    data: {
      stopPayment: {
        id: sp.id,
        accountId: sp.account_id,
        accountMasked: sp.account_masked,
        checkNumberStart: sp.check_number_start,
        checkNumberEnd: sp.check_number_end,
        payeeName: sp.payee_name,
        amountCents: sp.amount_cents,
        amountRangeLowCents: sp.amount_range_low_cents,
        amountRangeHighCents: sp.amount_range_high_cents,
        reason: sp.reason,
        status: sp.status,
        feeCents: sp.fee_cents,
        duration: sp.duration,
        effectiveDate: sp.effective_date,
        expirationDate: sp.expiration_date,
        createdAt: sp.created_at,
        updatedAt: sp.updated_at,
      },
    },
  };
}

/** Cancel/release a stop payment order */
export async function cancelStopPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: sp } = await ctx.db
    .from('stop_payments')
    .select('id, status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!sp) {
    return { error: { code: 'NOT_FOUND', message: 'Stop payment not found' }, status: 404 };
  }

  if (sp.status !== 'active') {
    return { error: { code: 'INVALID_STATE', message: 'Only active stop payments can be cancelled' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('stop_payments')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel stop payment' }, status: 500 };
  }

  return { data: { success: true } };
}

/** Renew an expiring stop payment */
export async function renewStopPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { stopPaymentId, duration } = ctx.params as {
    stopPaymentId: string; duration: '6months' | '12months' | 'permanent';
  };

  if (!stopPaymentId || !duration) {
    return { error: { code: 'VALIDATION_ERROR', message: 'stopPaymentId and duration are required' }, status: 400 };
  }

  if (!['6months', '12months', 'permanent'].includes(duration)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'duration must be 6months, 12months, or permanent' }, status: 400 };
  }

  const { data: sp } = await ctx.db
    .from('stop_payments')
    .select('*')
    .eq('id', stopPaymentId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .single();

  if (!sp) {
    return { error: { code: 'NOT_FOUND', message: 'Stop payment not found' }, status: 404 };
  }

  if (sp.status !== 'active' && sp.status !== 'expired') {
    return { error: { code: 'INVALID_STATE', message: 'Only active or expired stop payments can be renewed' }, status: 400 };
  }

  const now = new Date();
  const expirationDate = computeExpirationDate(now, duration);

  // Get fee for renewal
  const { data: feeConfig } = await ctx.db
    .from('charge_definitions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('charge_type', 'stop_payment')
    .eq('is_active', true)
    .limit(1)
    .single();

  const feeCents = feeConfig?.amount_cents ?? 3000;

  const { data: updated, error } = await ctx.db
    .from('stop_payments')
    .update({
      status: 'active',
      duration,
      effective_date: now.toISOString(),
      expiration_date: expirationDate,
      fee_cents: (sp.fee_cents as number) + feeCents,
      updated_at: now.toISOString(),
    })
    .eq('id', stopPaymentId)
    .select()
    .single();

  if (error || !updated) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to renew stop payment' }, status: 500 };
  }

  return {
    data: {
      stopPayment: {
        id: updated.id,
        accountId: updated.account_id,
        accountMasked: updated.account_masked,
        checkNumberStart: updated.check_number_start,
        checkNumberEnd: updated.check_number_end,
        payeeName: updated.payee_name,
        amountCents: updated.amount_cents,
        amountRangeLowCents: updated.amount_range_low_cents,
        amountRangeHighCents: updated.amount_range_high_cents,
        reason: updated.reason,
        status: updated.status,
        feeCents: updated.fee_cents,
        duration: updated.duration,
        effectiveDate: updated.effective_date,
        expirationDate: updated.expiration_date,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    },
  };
}

/** Get the fee for stop payment orders */
export async function getStopPaymentFee(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: feeConfig } = await ctx.db
    .from('charge_definitions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('charge_type', 'stop_payment')
    .eq('is_active', true)
    .limit(1)
    .single();

  return {
    data: {
      feeCents: feeConfig?.amount_cents ?? 3000,
    },
  };
}
