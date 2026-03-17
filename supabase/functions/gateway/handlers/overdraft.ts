/**
 * Overdraft Protection Handlers
 */
import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

// =============================================================================
// GET OVERDRAFT SETTINGS
// =============================================================================

export async function getOverdraftSettings(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  if (!accountId) return { error: { code: 'INVALID_PARAMS', message: 'accountId required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('overdraft_settings')
    .select('*')
    .eq('account_id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  if (!row) {
    return {
      data: {
        settings: {
          accountId,
          isEnabled: false,
          protectionType: null,
          linkedAccountId: null,
          linkedAccountMasked: null,
          courtesyPayLimitCents: null,
          optedIntoOverdraftFees: false,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  return { data: { settings: toSettings(row) } };
}

// =============================================================================
// UPDATE OVERDRAFT SETTINGS
// =============================================================================

export async function updateOverdraftSettings(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  if (!accountId) return { error: { code: 'INVALID_PARAMS', message: 'accountId required' }, status: 400 };

  const now = new Date().toISOString();
  const payload: Record<string, unknown> = {
    account_id: accountId,
    firm_id: ctx.firmId,
    user_id: ctx.userId,
    updated_at: now,
  };

  if (ctx.params.isEnabled !== undefined) payload.is_enabled = ctx.params.isEnabled;
  if (ctx.params.protectionType !== undefined) payload.protection_type = ctx.params.protectionType;
  if (ctx.params.linkedAccountId !== undefined) payload.linked_account_id = ctx.params.linkedAccountId;
  if (ctx.params.courtesyPayLimitCents !== undefined) payload.courtesy_pay_limit_cents = ctx.params.courtesyPayLimitCents;
  if (ctx.params.optedIntoOverdraftFees !== undefined) payload.opted_into_overdraft_fees = ctx.params.optedIntoOverdraftFees;

  const { data: row, error } = await ctx.db
    .from('overdraft_settings')
    .upsert(payload, { onConflict: 'account_id,firm_id,user_id' })
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { settings: toSettings(row) } };
}

// =============================================================================
// GET OVERDRAFT HISTORY
// =============================================================================

export async function getOverdraftHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  if (!accountId) return { error: { code: 'INVALID_PARAMS', message: 'accountId required' }, status: 400 };

  const limit = Math.min((ctx.params.limit as number) || 20, 100);
  const offset = (ctx.params.offset as number) || 0;

  const { count } = await ctx.db
    .from('overdraft_events')
    .select('*', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const { data: rows, error } = await ctx.db
    .from('overdraft_events')
    .select('*')
    .eq('account_id', accountId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { events: (rows ?? []).map(toEvent) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

// =============================================================================
// GET OVERDRAFT FEE SCHEDULE
// =============================================================================

export async function getOverdraftFeeSchedule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Return tenant-level fee schedule
  const { data: rows, error } = await ctx.db
    .from('charge_definitions')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .in('charge_type', ['overdraft', 'nsf', 'courtesy_pay'])
    .eq('is_active', true);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const schedule = (rows ?? []).map((r: Record<string, unknown>) => ({
    chargeType: r.charge_type,
    name: r.name,
    amountCents: r.amount_cents,
    description: r.description,
    isPercentage: r.is_percentage ?? false,
    maxPerDay: r.max_per_day,
  }));

  return { data: { feeSchedule: schedule } };
}

// =============================================================================
// MAPPERS
// =============================================================================

function toSettings(row: Record<string, unknown>) {
  return {
    accountId: row.account_id,
    isEnabled: row.is_enabled ?? false,
    protectionType: row.protection_type ?? null,
    linkedAccountId: row.linked_account_id ?? null,
    linkedAccountMasked: row.linked_account_masked ?? null,
    courtesyPayLimitCents: row.courtesy_pay_limit_cents ?? null,
    optedIntoOverdraftFees: row.opted_into_overdraft_fees ?? false,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    accountId: row.account_id,
    transactionId: row.transaction_id,
    amountCents: row.amount_cents,
    feeCents: row.fee_cents,
    protectionType: row.protection_type,
    wasProtected: row.was_protected ?? false,
    occurredAt: row.occurred_at,
  };
}
