/**
 * Cash Sweep Handlers — Smart Sweep / Yield Optimization
 *
 * Automated cash management rules that sweep excess balances
 * from operating accounts into high-yield accounts or treasury funds.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';
import { requireAuth, paginate } from '../handler-utils.ts';

// =============================================================================
// LIST SWEEP RULES
// =============================================================================

export async function listSweepRules(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;

  let query = ctx.db
    .from('cash_sweep_rules')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data: rows, error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return { data: { rules: (rows ?? []).map(toRule) } };
}

// =============================================================================
// CREATE SWEEP RULE
// =============================================================================

export async function createSweepRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const name = ctx.params.name as string;
  const sourceAccountId = ctx.params.sourceAccountId as string;
  const destinationAccountId = ctx.params.destinationAccountId as string;
  const thresholdCents = ctx.params.thresholdCents as number;
  const direction = ctx.params.direction as string;
  const frequency = ctx.params.frequency as string;

  if (!name || !sourceAccountId || !destinationAccountId || !thresholdCents || !direction || !frequency) {
    return { error: { code: 'INVALID_PARAMS', message: 'name, sourceAccountId, destinationAccountId, thresholdCents, direction, and frequency required' }, status: 400 };
  }

  const now = new Date().toISOString();
  const ruleId = crypto.randomUUID();

  const { data, error } = await ctx.db.from('cash_sweep_rules').insert({
    id: ruleId,
    firm_id: ctx.firmId,
    user_id: ctx.userId,
    name,
    source_account_id: sourceAccountId,
    destination_account_id: destinationAccountId,
    threshold_cents: thresholdCents,
    target_balance_cents: (ctx.params.targetBalanceCents as number) ?? null,
    direction,
    frequency,
    status: 'active',
    total_swept_cents: 0,
    sweep_count: 0,
    created_at: now,
    updated_at: now,
  }).select('*').single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { rule: toRule(data) } };
}

// =============================================================================
// UPDATE SWEEP RULE
// =============================================================================

export async function updateSweepRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const ruleId = ctx.params.ruleId as string;
  if (!ruleId) return { error: { code: 'INVALID_PARAMS', message: 'ruleId required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (ctx.params.name !== undefined) updates.name = ctx.params.name;
  if (ctx.params.thresholdCents !== undefined) updates.threshold_cents = ctx.params.thresholdCents;
  if (ctx.params.targetBalanceCents !== undefined) updates.target_balance_cents = ctx.params.targetBalanceCents;
  if (ctx.params.frequency !== undefined) updates.frequency = ctx.params.frequency;
  if (ctx.params.status !== undefined) updates.status = ctx.params.status;

  const { data, error } = await ctx.db
    .from('cash_sweep_rules')
    .update(updates)
    .eq('id', ruleId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { rule: toRule(data) } };
}

// =============================================================================
// DELETE SWEEP RULE
// =============================================================================

export async function deleteSweepRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const ruleId = ctx.params.ruleId as string;
  if (!ruleId) return { error: { code: 'INVALID_PARAMS', message: 'ruleId required' }, status: 400 };

  const { error } = await ctx.db
    .from('cash_sweep_rules')
    .delete()
    .eq('id', ruleId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// TOGGLE SWEEP RULE (active/paused)
// =============================================================================

export async function toggleSweepRule(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const ruleId = ctx.params.ruleId as string;
  const status = ctx.params.status as string;
  if (!ruleId || !status) return { error: { code: 'INVALID_PARAMS', message: 'ruleId and status required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('cash_sweep_rules')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', ruleId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { rule: toRule(data) } };
}

// =============================================================================
// LIST SWEEP EXECUTIONS
// =============================================================================

export async function listSweepExecutions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const ruleId = ctx.params.ruleId as string | undefined;
  const limit = Math.min((ctx.params.limit as number) || 25, 100);
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('sweep_executions')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .order('executed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (ruleId) query = query.eq('rule_id', ruleId);

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { executions: (rows ?? []).map(toExecution) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// SWEEP SUMMARY
// =============================================================================

export async function getSweepSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Get active rules count + totals
  const { data: rules } = await ctx.db
    .from('cash_sweep_rules')
    .select('status, total_swept_cents, sweep_count')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  const activeRules = (rules ?? []).filter((r: Record<string, unknown>) => r.status === 'active').length;
  const totalSweptCents = (rules ?? []).reduce((sum: number, r: Record<string, unknown>) => sum + ((r.total_swept_cents as number) || 0), 0);
  const totalSweepCount = (rules ?? []).reduce((sum: number, r: Record<string, unknown>) => sum + ((r.sweep_count as number) || 0), 0);

  // Estimate yield (simplified: 4.5% APY on swept amount / 52 weeks)
  const estimatedYieldCents = Math.round(totalSweptCents * 0.045 / 52);

  // Recent executions
  const { data: execRows } = await ctx.db
    .from('sweep_executions')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('executed_at', { ascending: false })
    .limit(5);

  return {
    data: {
      summary: {
        activeRules,
        totalSweptCents,
        totalSweepCount,
        estimatedYieldCents,
        recentExecutions: (execRows ?? []).map(toExecution),
      },
    },
  };
}

// =============================================================================
// ROW → DTO MAPPING
// =============================================================================

function toRule(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    sourceAccountId: row.source_account_id as string,
    sourceAccountName: (row.source_account_name as string) ?? 'Operating Account',
    destinationAccountId: row.destination_account_id as string,
    destinationAccountName: (row.destination_account_name as string) ?? 'High-Yield Account',
    thresholdCents: row.threshold_cents as number,
    targetBalanceCents: (row.target_balance_cents as number) ?? null,
    direction: row.direction as string,
    frequency: row.frequency as string,
    status: row.status as string,
    lastExecutedAt: (row.last_executed_at as string) ?? null,
    nextExecutionAt: (row.next_execution_at as string) ?? null,
    totalSweptCents: (row.total_swept_cents as number) ?? 0,
    sweepCount: (row.sweep_count as number) ?? 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toExecution(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    ruleId: row.rule_id as string,
    ruleName: (row.rule_name as string) ?? '',
    amountCents: row.amount_cents as number,
    sourceAccountName: (row.source_account_name as string) ?? '',
    destinationAccountName: (row.destination_account_name as string) ?? '',
    direction: row.direction as string,
    status: row.status as string,
    executedAt: row.executed_at as string,
    failureReason: (row.failure_reason as string) ?? null,
  };
}
