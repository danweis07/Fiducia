/**
 * P2P / Zelle Transfer Handlers
 *
 * Gateway handlers for peer-to-peer money transfers.
 * Backed by p2p_enrollments and p2p_transactions tables.
 *
 * IMPORTANT:
 * - All monetary values are integer cents.
 * - NEVER log PII (account numbers, email, phone).
 * - All data is scoped by ctx.firmId + ctx.userId for tenant isolation.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?1?\d{10,15}$/;

function toEnrollment(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    accountMasked: row.account_masked,
    enrollmentType: row.enrollment_type,
    enrollmentValue: row.enrollment_value,
    isActive: row.is_active,
    enrolledAt: row.enrolled_at,
  };
}

function toP2PTransaction(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    senderName: row.sender_name,
    recipientName: row.recipient_name,
    recipientType: row.recipient_type,
    recipientValue: row.recipient_value,
    amountCents: Number(row.amount_cents),
    memo: row.memo ?? null,
    status: row.status,
    completedAt: row.completed_at ?? null,
    expiresAt: row.expires_at ?? null,
    createdAt: row.created_at,
  };
}

// Default limits (cents)
const DEFAULT_DAILY_LIMIT = 250000;      // $2,500
const DEFAULT_MONTHLY_LIMIT = 2000000;   // $20,000
const DEFAULT_PER_TXN_LIMIT = 250000;    // $2,500

// =============================================================================
// HANDLERS
// =============================================================================

export async function enrollP2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, enrollmentType, enrollmentValue } = ctx.params as {
    accountId?: string;
    enrollmentType?: 'email' | 'phone';
    enrollmentValue?: string;
  };

  if (!accountId || !enrollmentType || !enrollmentValue) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId, enrollmentType, and enrollmentValue are required' }, status: 400 };
  }

  if (enrollmentType === 'email' && !EMAIL_RE.test(enrollmentValue)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Invalid email format' }, status: 400 };
  }
  if (enrollmentType === 'phone' && !PHONE_RE.test(enrollmentValue.replace(/[\s()-]/g, ''))) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Invalid phone format' }, status: 400 };
  }

  // Verify account belongs to user
  const { data: acct, error: acctErr } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (acctErr || !acct) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Check for existing enrollment
  const { data: existing } = await ctx.db
    .from('p2p_enrollments')
    .select('id')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('is_active', true)
    .limit(1);

  if (existing && existing.length > 0) {
    return { error: { code: 'CONFLICT', message: 'Already enrolled for P2P. Unenroll first to change.' }, status: 409 };
  }

  const now = new Date().toISOString();
  const { data: row, error: insertErr } = await ctx.db
    .from('p2p_enrollments')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      account_id: accountId,
      account_masked: acct.account_number_masked,
      enrollment_type: enrollmentType,
      enrollment_value: enrollmentValue,
      is_active: true,
      enrolled_at: now,
    })
    .select('*')
    .single();

  if (insertErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create enrollment' }, status: 500 };
  }

  return { data: { enrollment: toEnrollment(row) } };
}

export async function getP2PEnrollment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('p2p_enrollments')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('is_active', true)
    .limit(1);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch enrollment' }, status: 500 };
  }

  const enrollment = rows && rows.length > 0 ? toEnrollment(rows[0]) : null;
  return { data: { enrollment } };
}

export async function unenrollP2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { error } = await ctx.db
    .from('p2p_enrollments')
    .update({ is_active: false })
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('is_active', true);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to unenroll' }, status: 500 };
  }

  return { data: { success: true } };
}

export async function sendP2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { recipientType, recipientValue, amountCents, memo } = ctx.params as {
    recipientType?: 'email' | 'phone' | 'token';
    recipientValue?: string;
    amountCents?: number;
    memo?: string;
  };

  if (!recipientType || !recipientValue || !amountCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'recipientType, recipientValue, and amountCents are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' }, status: 400 };
  }

  if (amountCents > DEFAULT_PER_TXN_LIMIT) {
    return { error: { code: 'LIMIT_EXCEEDED', message: 'Amount exceeds per-transaction limit' }, status: 400 };
  }

  // Check enrollment
  const { data: enrollment } = await ctx.db
    .from('p2p_enrollments')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!enrollment) {
    return { error: { code: 'NOT_ENROLLED', message: 'Enroll for P2P before sending' }, status: 400 };
  }

  // Check daily/monthly limits
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const { data: dailyTxns } = await ctx.db
    .from('p2p_transactions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('type', 'send')
    .in('status', ['pending', 'completed'])
    .gte('created_at', todayStart.toISOString());

  const usedToday = (dailyTxns ?? []).reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount_cents), 0);
  if (usedToday + amountCents > DEFAULT_DAILY_LIMIT) {
    return { error: { code: 'LIMIT_EXCEEDED', message: 'Daily send limit exceeded' }, status: 400 };
  }

  const { data: monthlyTxns } = await ctx.db
    .from('p2p_transactions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('type', 'send')
    .in('status', ['pending', 'completed'])
    .gte('created_at', monthStart.toISOString());

  const usedMonth = (monthlyTxns ?? []).reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount_cents), 0);
  if (usedMonth + amountCents > DEFAULT_MONTHLY_LIMIT) {
    return { error: { code: 'LIMIT_EXCEEDED', message: 'Monthly send limit exceeded' }, status: 400 };
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: row, error: insertErr } = await ctx.db
    .from('p2p_transactions')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      type: 'send',
      sender_name: 'You',
      recipient_name: recipientValue,
      recipient_type: recipientType,
      recipient_value: recipientValue,
      amount_cents: amountCents,
      memo: memo ?? null,
      status: 'pending',
      expires_at: expiresAt,
      created_at: now,
    })
    .select('*')
    .single();

  if (insertErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create P2P send' }, status: 500 };
  }

  return { data: { transaction: toP2PTransaction(row) } };
}

export async function requestP2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { recipientType, recipientValue, amountCents, memo } = ctx.params as {
    recipientType?: 'email' | 'phone' | 'token';
    recipientValue?: string;
    amountCents?: number;
    memo?: string;
  };

  if (!recipientType || !recipientValue || !amountCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'recipientType, recipientValue, and amountCents are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' }, status: 400 };
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: row, error: insertErr } = await ctx.db
    .from('p2p_transactions')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      type: 'request',
      sender_name: recipientValue,
      recipient_name: 'You',
      recipient_type: recipientType,
      recipient_value: recipientValue,
      amount_cents: amountCents,
      memo: memo ?? null,
      status: 'pending',
      expires_at: expiresAt,
      created_at: now,
    })
    .select('*')
    .single();

  if (insertErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create P2P request' }, status: 500 };
  }

  return { data: { transaction: toP2PTransaction(row) } };
}

export async function listP2PTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { filter, limit = 20, offset = 0 } = ctx.params as {
    filter?: 'sent' | 'received' | 'requests';
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('p2p_transactions')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filter === 'sent') query = query.eq('type', 'send');
  else if (filter === 'received') query = query.eq('type', 'receive');
  else if (filter === 'requests') query = query.eq('type', 'request');

  const { data: rows, count, error } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list P2P transactions' }, status: 500 };
  }

  return {
    data: { transactions: (rows ?? []).map(toP2PTransaction) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

export async function getP2PTransaction(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id?: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: row, error } = await ctx.db
    .from('p2p_transactions')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'P2P transaction not found' }, status: 404 };
  }

  return { data: { transaction: toP2PTransaction(row) } };
}

export async function cancelP2PRequest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id?: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: row, error: fetchErr } = await ctx.db
    .from('p2p_transactions')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (fetchErr || !row) {
    return { error: { code: 'NOT_FOUND', message: 'P2P transaction not found' }, status: 404 };
  }

  if (row.status !== 'pending') {
    return { error: { code: 'INVALID_STATE', message: 'Only pending requests can be cancelled' }, status: 400 };
  }

  const { error: updateErr } = await ctx.db
    .from('p2p_transactions')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (updateErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel request' }, status: 500 };
  }

  return { data: { success: true } };
}

export async function getP2PLimits(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

  const { data: dailyTxns } = await ctx.db
    .from('p2p_transactions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('type', 'send')
    .in('status', ['pending', 'completed'])
    .gte('created_at', todayStart.toISOString());

  const usedToday = (dailyTxns ?? []).reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount_cents), 0);

  const { data: monthlyTxns } = await ctx.db
    .from('p2p_transactions')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .eq('type', 'send')
    .in('status', ['pending', 'completed'])
    .gte('created_at', monthStart.toISOString());

  const usedMonth = (monthlyTxns ?? []).reduce((sum: number, t: Record<string, unknown>) => sum + Number(t.amount_cents), 0);

  return {
    data: {
      limits: {
        dailySendLimitCents: DEFAULT_DAILY_LIMIT,
        monthlySendLimitCents: DEFAULT_MONTHLY_LIMIT,
        perTransactionLimitCents: DEFAULT_PER_TXN_LIMIT,
        usedTodayCents: usedToday,
        usedThisMonthCents: usedMonth,
      },
    },
  };
}
