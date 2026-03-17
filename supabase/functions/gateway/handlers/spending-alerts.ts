/**
 * Spending Alerts & Thresholds Handlers
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
// LIST ALERT RULES
// =============================================================================

export async function listAlerts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('spending_alert_rules')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { alerts: (rows ?? []).map(toRule) } };
}

// =============================================================================
// CREATE ALERT RULE
// =============================================================================

export async function createAlert(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const name = ctx.params.name as string;
  const alertType = ctx.params.alertType as string;
  if (!name || !alertType) {
    return { error: { code: 'INVALID_PARAMS', message: 'name and alertType required' }, status: 400 };
  }

  const channels = (ctx.params.channels as string[]) ?? ['push'];

  const now = new Date().toISOString();
  const payload = {
    firm_id: ctx.firmId,
    user_id: ctx.userId,
    name,
    alert_type: alertType,
    threshold_cents: ctx.params.thresholdCents ?? null,
    category_id: ctx.params.categoryId ?? null,
    account_id: ctx.params.accountId ?? null,
    channels,
    is_enabled: true,
    created_at: now,
    updated_at: now,
  };

  const { data: row, error } = await ctx.db
    .from('spending_alert_rules')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { alert: toRule(row) }, status: 201 };
}

// =============================================================================
// UPDATE ALERT RULE
// =============================================================================

export async function updateAlert(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const alertId = ctx.params.alertId as string;
  if (!alertId) return { error: { code: 'INVALID_PARAMS', message: 'alertId required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (ctx.params.name !== undefined) updates.name = ctx.params.name;
  if (ctx.params.alertType !== undefined) updates.alert_type = ctx.params.alertType;
  if (ctx.params.thresholdCents !== undefined) updates.threshold_cents = ctx.params.thresholdCents;
  if (ctx.params.categoryId !== undefined) updates.category_id = ctx.params.categoryId;
  if (ctx.params.accountId !== undefined) updates.account_id = ctx.params.accountId;
  if (ctx.params.channels !== undefined) updates.channels = ctx.params.channels;
  if (ctx.params.isEnabled !== undefined) updates.is_enabled = ctx.params.isEnabled;

  const { data: row, error } = await ctx.db
    .from('spending_alert_rules')
    .update(updates)
    .eq('id', alertId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { alert: toRule(row) } };
}

// =============================================================================
// DELETE ALERT RULE
// =============================================================================

export async function deleteAlert(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const alertId = ctx.params.alertId as string;
  if (!alertId) return { error: { code: 'INVALID_PARAMS', message: 'alertId required' }, status: 400 };

  const { error } = await ctx.db
    .from('spending_alert_rules')
    .delete()
    .eq('id', alertId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// LIST ALERT HISTORY
// =============================================================================

export async function listAlertHistory(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min((ctx.params.limit as number) || 20, 100);
  const offset = (ctx.params.offset as number) || 0;

  const { count } = await ctx.db
    .from('spending_alert_history')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const { data: rows, error } = await ctx.db
    .from('spending_alert_history')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('triggered_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { events: (rows ?? []).map(toEvent) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

// =============================================================================
// GET ALERT SUMMARY
// =============================================================================

export async function getAlertSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rules } = await ctx.db
    .from('spending_alert_rules')
    .select('is_enabled')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const activeCount = (rules ?? []).filter((r: Record<string, unknown>) => r.is_enabled).length;

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: triggeredWeek } = await ctx.db
    .from('spending_alert_history')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('triggered_at', weekAgo);

  const { count: triggeredMonth } = await ctx.db
    .from('spending_alert_history')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('triggered_at', monthAgo);

  return {
    data: {
      summary: {
        activeRules: activeCount,
        triggeredThisWeek: triggeredWeek ?? 0,
        triggeredThisMonth: triggeredMonth ?? 0,
      },
    },
  };
}

// =============================================================================
// MAPPERS
// =============================================================================

function toRule(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    alertType: row.alert_type,
    accountId: row.account_id ?? null,
    accountMasked: row.account_masked ?? null,
    thresholdCents: row.threshold_cents ?? null,
    categoryId: row.category_id ?? null,
    categoryName: row.category_name ?? null,
    channels: row.channels ?? [],
    isEnabled: row.is_enabled ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    ruleId: row.rule_id,
    ruleName: row.rule_name,
    alertType: row.alert_type,
    message: row.message,
    amountCents: row.amount_cents ?? null,
    triggeredAt: row.triggered_at,
    acknowledged: row.acknowledged ?? false,
  };
}
