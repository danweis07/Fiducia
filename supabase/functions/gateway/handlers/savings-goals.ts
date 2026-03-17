/**
 * Savings Goals Handlers
 *
 * Gateway handlers for savings goal tracking and contributions.
 * Backed by savings_goals and goal_contributions tables.
 *
 * IMPORTANT:
 * - All monetary values are integer cents.
 * - NEVER log PII (account numbers).
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

function _paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

function toGoal(row: Record<string, unknown>) {
  const target = Number(row.target_amount_cents);
  const current = Number(row.current_amount_cents);
  const progress = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

  // Determine if on track based on target date
  let isOnTrack = true;
  if (row.target_date && row.status === 'active') {
    const targetDate = new Date(row.target_date as string);
    const createdAt = new Date(row.created_at as string);
    const now = new Date();
    const totalDuration = targetDate.getTime() - createdAt.getTime();
    const elapsed = now.getTime() - createdAt.getTime();
    if (totalDuration > 0) {
      const expectedProgress = Math.min((elapsed / totalDuration) * 100, 100);
      isOnTrack = progress >= expectedProgress - 10; // 10% grace
    }
  }

  return {
    id: row.id,
    name: row.name,
    iconEmoji: row.icon_emoji ?? null,
    targetAmountCents: target,
    currentAmountCents: current,
    progressPercent: progress,
    accountId: row.account_id,
    accountMasked: row.account_masked,
    targetDate: row.target_date ?? null,
    isOnTrack,
    status: row.status,
    autoContribute: row.auto_contribute ?? false,
    autoContributeAmountCents: row.auto_contribute_amount_cents ?? null,
    autoContributeFrequency: row.auto_contribute_frequency ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContribution(row: Record<string, unknown>) {
  return {
    id: row.id,
    goalId: row.goal_id,
    amountCents: Number(row.amount_cents),
    type: row.type,
    createdAt: row.created_at,
  };
}

// =============================================================================
// HANDLERS
// =============================================================================

export async function listSavingsGoals(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('savings_goals')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list goals' }, status: 500 };
  }

  return { data: { goals: (rows ?? []).map(toGoal) } };
}

export async function createSavingsGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    name, targetAmountCents, targetDate, accountId,
    iconEmoji, autoContribute, autoContributeAmountCents, autoContributeFrequency,
  } = ctx.params as {
    name?: string;
    targetAmountCents?: number;
    targetDate?: string;
    accountId?: string;
    iconEmoji?: string;
    autoContribute?: boolean;
    autoContributeAmountCents?: number;
    autoContributeFrequency?: 'weekly' | 'biweekly' | 'monthly';
  };

  if (!name || !targetAmountCents || !accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'name, targetAmountCents, and accountId are required' }, status: 400 };
  }

  if (targetAmountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Target amount must be positive' }, status: 400 };
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

  const now = new Date().toISOString();
  const { data: row, error: insertErr } = await ctx.db
    .from('savings_goals')
    .insert({
      firm_id: ctx.firmId,
      user_id: ctx.userId,
      name,
      icon_emoji: iconEmoji ?? null,
      target_amount_cents: targetAmountCents,
      current_amount_cents: 0,
      account_id: accountId,
      account_masked: acct.account_number_masked,
      target_date: targetDate ?? null,
      status: 'active',
      auto_contribute: autoContribute ?? false,
      auto_contribute_amount_cents: autoContributeAmountCents ?? null,
      auto_contribute_frequency: autoContributeFrequency ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single();

  if (insertErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create goal' }, status: 500 };
  }

  return { data: { goal: toGoal(row) } };
}

export async function getSavingsGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id?: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { data: row, error } = await ctx.db
    .from('savings_goals')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Goal not found' }, status: 404 };
  }

  // Fetch contributions
  const { data: contributions } = await ctx.db
    .from('goal_contributions')
    .select('*')
    .eq('goal_id', id)
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false });

  return {
    data: {
      goal: toGoal(row),
      contributions: (contributions ?? []).map(toContribution),
    },
  };
}

export async function updateSavingsGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params as {
    id?: string;
    name?: string;
    targetAmountCents?: number;
    targetDate?: string;
    iconEmoji?: string;
    autoContribute?: boolean;
    autoContributeAmountCents?: number;
    autoContributeFrequency?: string;
    status?: string;
  };

  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  // Build update object with snake_case keys
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.targetAmountCents !== undefined) dbUpdates.target_amount_cents = updates.targetAmountCents;
  if (updates.targetDate !== undefined) dbUpdates.target_date = updates.targetDate;
  if (updates.iconEmoji !== undefined) dbUpdates.icon_emoji = updates.iconEmoji;
  if (updates.autoContribute !== undefined) dbUpdates.auto_contribute = updates.autoContribute;
  if (updates.autoContributeAmountCents !== undefined) dbUpdates.auto_contribute_amount_cents = updates.autoContributeAmountCents;
  if (updates.autoContributeFrequency !== undefined) dbUpdates.auto_contribute_frequency = updates.autoContributeFrequency;
  if (updates.status !== undefined) dbUpdates.status = updates.status;

  const { data: row, error } = await ctx.db
    .from('savings_goals')
    .update(dbUpdates)
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .select('*')
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Goal not found' }, status: 404 };
  }

  return { data: { goal: toGoal(row) } };
}

export async function deleteSavingsGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id?: string };
  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('savings_goals')
    .delete()
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete goal' }, status: 500 };
  }

  return { data: { success: true } };
}

export async function contributeToGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { goalId, amountCents, fromAccountId } = ctx.params as {
    goalId?: string;
    amountCents?: number;
    fromAccountId?: string;
  };

  if (!goalId || !amountCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'goalId and amountCents are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' }, status: 400 };
  }

  // Fetch goal
  const { data: goal, error: goalErr } = await ctx.db
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (goalErr || !goal) {
    return { error: { code: 'NOT_FOUND', message: 'Goal not found' }, status: 404 };
  }

  if (goal.status !== 'active') {
    return { error: { code: 'INVALID_STATE', message: 'Goal is not active' }, status: 400 };
  }

  // If fromAccountId provided, verify it
  if (fromAccountId) {
    const { data: acct } = await ctx.db
      .from('accounts')
      .select('id')
      .eq('id', fromAccountId)
      .eq('firm_id', ctx.firmId!)
      .eq('user_id', ctx.userId!)
      .single();

    if (!acct) {
      return { error: { code: 'NOT_FOUND', message: 'Source account not found' }, status: 404 };
    }
  }

  const now = new Date().toISOString();
  const newAmount = Number(goal.current_amount_cents) + amountCents;
  const isCompleted = newAmount >= Number(goal.target_amount_cents);

  // Create contribution record
  const { data: contrib, error: contribErr } = await ctx.db
    .from('goal_contributions')
    .insert({
      firm_id: ctx.firmId,
      goal_id: goalId,
      amount_cents: amountCents,
      type: 'manual',
      created_at: now,
    })
    .select('*')
    .single();

  if (contribErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create contribution' }, status: 500 };
  }

  // Update goal balance
  const goalUpdates: Record<string, unknown> = {
    current_amount_cents: newAmount,
    updated_at: now,
  };
  if (isCompleted) {
    goalUpdates.status = 'completed';
  }

  const { data: updatedGoal } = await ctx.db
    .from('savings_goals')
    .update(goalUpdates)
    .eq('id', goalId)
    .select('*')
    .single();

  return {
    data: {
      contribution: toContribution(contrib),
      goal: updatedGoal ? toGoal(updatedGoal) : null,
    },
  };
}

export async function withdrawFromGoal(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { goalId, amountCents } = ctx.params as {
    goalId?: string;
    amountCents?: number;
  };

  if (!goalId || !amountCents) {
    return { error: { code: 'VALIDATION_ERROR', message: 'goalId and amountCents are required' }, status: 400 };
  }

  if (amountCents <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Amount must be positive' }, status: 400 };
  }

  const { data: goal, error: goalErr } = await ctx.db
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (goalErr || !goal) {
    return { error: { code: 'NOT_FOUND', message: 'Goal not found' }, status: 404 };
  }

  if (amountCents > Number(goal.current_amount_cents)) {
    return { error: { code: 'INSUFFICIENT_FUNDS', message: 'Withdrawal exceeds goal balance' }, status: 400 };
  }

  const now = new Date().toISOString();
  const newAmount = Number(goal.current_amount_cents) - amountCents;

  // Record withdrawal as negative contribution
  const { data: contrib, error: contribErr } = await ctx.db
    .from('goal_contributions')
    .insert({
      firm_id: ctx.firmId,
      goal_id: goalId,
      amount_cents: -amountCents,
      type: 'withdrawal',
      created_at: now,
    })
    .select('*')
    .single();

  if (contribErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create withdrawal record' }, status: 500 };
  }

  // Update goal balance
  const goalUpdates: Record<string, unknown> = {
    current_amount_cents: newAmount,
    updated_at: now,
  };
  // If goal was completed and now below target, revert to active
  if (goal.status === 'completed' && newAmount < Number(goal.target_amount_cents)) {
    goalUpdates.status = 'active';
  }

  const { data: updatedGoal } = await ctx.db
    .from('savings_goals')
    .update(goalUpdates)
    .eq('id', goalId)
    .select('*')
    .single();

  return {
    data: {
      contribution: toContribution(contrib),
      goal: updatedGoal ? toGoal(updatedGoal) : null,
    },
  };
}

export async function getGoalSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: goals, error } = await ctx.db
    .from('savings_goals')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch goals' }, status: 500 };
  }

  const allGoals = (goals ?? []).map(toGoal);
  const activeGoals = allGoals.filter((g: Record<string, unknown>) => g.status === 'active');
  const completedGoals = allGoals.filter((g: Record<string, unknown>) => g.status === 'completed');

  const totalSaved = allGoals.reduce((sum: number, g: Record<string, unknown>) => sum + Number(g.currentAmountCents), 0);
  const onTrack = activeGoals.filter((g: Record<string, unknown>) => g.isOnTrack).length;
  const behind = activeGoals.filter((g: Record<string, unknown>) => !g.isOnTrack).length;

  return {
    data: {
      summary: {
        totalSavedCents: totalSaved,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        onTrackCount: onTrack,
        behindCount: behind,
      },
    },
  };
}
