/**
 * Admin Autonomous Execution Handlers
 *
 * Admin-facing gateway handlers for managing:
 * - Service accounts (machine identity for AI agents)
 * - Execution policies (per-action permission boundaries)
 * - Autonomous execution monitoring and control
 * - Event inbox inspection
 * - Kill switch toggle
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { generateServiceAccountKey, hashApiKey } from '../../_shared/middleware/service-account-auth.ts';
import { executeAutonomousLoop } from '../../_shared/ai/autonomous-executor.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAdmin(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

// =============================================================================
// SERVICE ACCOUNTS
// =============================================================================

/** List all service accounts for the tenant */
export async function listServiceAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { status: filterStatus, limit = 50, offset = 0 } = ctx.params as {
    status?: string;
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('service_accounts')
    .select('id, tenant_id, name, description, api_key_suffix, status, allowed_actions, rate_limit_per_hour, ip_allowlist, created_at, updated_at, last_used_at, total_invocations', { count: 'exact' })
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) {
    query = query.eq('status', filterStatus);
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[admin-autonomous] listServiceAccounts error:', error instanceof Error ? error.message : 'Unknown error');
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list service accounts' }, status: 500 };
  }

  return {
    data: {
      serviceAccounts: data ?? [],
      total: count ?? 0,
    },
  };
}

/** Create a new service account */
export async function createServiceAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { name, description, allowedActions, rateLimitPerHour = 100, ipAllowlist = [] } = ctx.params as {
    name: string;
    description?: string;
    allowedActions: string[];
    rateLimitPerHour?: number;
    ipAllowlist?: string[];
  };

  if (!name || !allowedActions || allowedActions.length === 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'name and allowedActions are required' }, status: 400 };
  }

  // Generate a new API key
  const rawKey = generateServiceAccountKey();
  const keyHash = await hashApiKey(rawKey);
  const keySuffix = rawKey.slice(-4);

  const accountId = crypto.randomUUID();
  const { error: insertError } = await ctx.db
    .from('service_accounts')
    .insert({
      id: accountId,
      tenant_id: ctx.firmId,
      name,
      description: description ?? null,
      api_key_hash: keyHash,
      api_key_suffix: keySuffix,
      status: 'active',
      allowed_actions: allowedActions,
      rate_limit_per_hour: rateLimitPerHour,
      ip_allowlist: ipAllowlist,
      created_by: ctx.userId,
    });

  if (insertError) {
    console.error('[admin-autonomous] createServiceAccount error:', insertError);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create service account' }, status: 500 };
  }

  // Return the raw key ONCE — it cannot be retrieved again
  return {
    data: {
      serviceAccount: {
        id: accountId,
        name,
        apiKey: rawKey,
        apiKeySuffix: keySuffix,
        allowedActions,
        rateLimitPerHour,
        status: 'active',
        createdAt: new Date().toISOString(),
      },
      warning: 'Save this API key now. It will not be shown again.',
    },
  };
}

/** Update a service account (status, permissions, rate limits) */
export async function updateServiceAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { accountId, status, allowedActions, rateLimitPerHour, ipAllowlist, name, description } = ctx.params as {
    accountId: string;
    status?: string;
    allowedActions?: string[];
    rateLimitPerHour?: number;
    ipAllowlist?: string[];
    name?: string;
    description?: string;
  };

  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (status) updates.status = status;
  if (allowedActions) updates.allowed_actions = allowedActions;
  if (rateLimitPerHour !== undefined) updates.rate_limit_per_hour = rateLimitPerHour;
  if (ipAllowlist) updates.ip_allowlist = ipAllowlist;
  if (name) updates.name = name;
  if (description !== undefined) updates.description = description;

  const { data, error } = await ctx.db
    .from('service_accounts')
    .update(updates)
    .eq('id', accountId)
    .eq('tenant_id', ctx.firmId)
    .select()
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Service account not found' }, status: 404 };
  }

  return { data: { serviceAccount: data } };
}

/** Revoke a service account (permanent disable) */
export async function revokeServiceAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { accountId } = ctx.params as { accountId: string };
  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('service_accounts')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', accountId)
    .eq('tenant_id', ctx.firmId);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to revoke account' }, status: 500 };
  }

  return { data: { revoked: true } };
}

// =============================================================================
// EXECUTION POLICIES
// =============================================================================

/** List execution policies */
export async function listExecutionPolicies(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('execution_policies')
    .select('*')
    .eq('tenant_id', ctx.firmId)
    .order('action', { ascending: true })
    .order('priority', { ascending: true });

  if (error) {
    console.error('[admin-autonomous] listExecutionPolicies error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list policies' }, status: 500 };
  }

  return { data: { policies: data ?? [] } };
}

/** Create or update an execution policy */
export async function upsertExecutionPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { action, approval, conditions, maxAutoPerHour, notifyOnAuto, reviewChannels, description, priority = 0 } = ctx.params as {
    action: string;
    approval: string;
    conditions?: Record<string, unknown>;
    maxAutoPerHour?: number;
    notifyOnAuto?: boolean;
    reviewChannels?: string[];
    description?: string;
    priority?: number;
  };

  if (!action || !approval) {
    return { error: { code: 'VALIDATION_ERROR', message: 'action and approval are required' }, status: 400 };
  }

  const validApprovals = ['auto_approve', 'human_required', 'disabled'];
  if (!validApprovals.includes(approval)) {
    return { error: { code: 'VALIDATION_ERROR', message: `approval must be one of: ${validApprovals.join(', ')}` }, status: 400 };
  }

  const policyData = {
    tenant_id: ctx.firmId,
    action,
    approval,
    conditions: conditions ?? {},
    max_auto_per_hour: maxAutoPerHour ?? 50,
    notify_on_auto: notifyOnAuto ?? true,
    review_channels: reviewChannels ?? ['email'],
    description: description ?? null,
    priority,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.db
    .from('execution_policies')
    .upsert(policyData, { onConflict: 'tenant_id,action,priority' })
    .select()
    .single();

  if (error) {
    console.error('[admin-autonomous] upsertExecutionPolicy error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to save policy' }, status: 500 };
  }

  return { data: { policy: data } };
}

/** Delete an execution policy */
export async function deleteExecutionPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { policyId } = ctx.params as { policyId: string };
  if (!policyId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'policyId is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('execution_policies')
    .delete()
    .eq('id', policyId)
    .eq('tenant_id', ctx.firmId);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete policy' }, status: 500 };
  }

  return { data: { deleted: true } };
}

// =============================================================================
// AUTONOMOUS EXECUTION MONITORING
// =============================================================================

/** List autonomous executions (admin view across all users) */
export async function listAutonomousExecutions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { status: filterStatus, action, limit = 50, offset = 0 } = ctx.params as {
    status?: string;
    action?: string;
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('autonomous_executions')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) query = query.eq('status', filterStatus);
  if (action) query = query.eq('action', action);

  const { data, count, error } = await query;

  if (error) {
    console.error('[admin-autonomous] listAutonomousExecutions error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list executions' }, status: 500 };
  }

  return { data: { executions: data ?? [], total: count ?? 0 } };
}

/** Approve a pending autonomous execution */
export async function approveExecution(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { executionId } = ctx.params as { executionId: string };
  if (!executionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'executionId is required' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('autonomous_executions')
    .update({ status: 'approved', started_at: new Date().toISOString() })
    .eq('id', executionId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Pending execution not found' }, status: 404 };
  }

  return { data: { execution: data } };
}

/** Reject a pending autonomous execution */
export async function rejectExecution(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { executionId, reason } = ctx.params as { executionId: string; reason?: string };
  if (!executionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'executionId is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('autonomous_executions')
    .update({
      status: 'rejected',
      error_message: reason ?? 'Manually rejected by admin',
      completed_at: new Date().toISOString(),
    })
    .eq('id', executionId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending');

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to reject execution' }, status: 500 };
  }

  return { data: { rejected: true } };
}

/** Get execution statistics / dashboard summary */
export async function getExecutionStats(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch counts by status for last 24h
  const { data: recent } = await ctx.db
    .from('autonomous_executions')
    .select('status')
    .eq('tenant_id', ctx.firmId)
    .gte('created_at', last24h);

  // Fetch total for last 7 days
  const { count: weekTotal } = await ctx.db
    .from('autonomous_executions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.firmId)
    .gte('created_at', last7d);

  // Fetch pending events
  const { count: pendingEvents } = await ctx.db
    .from('event_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending');

  // Fetch pending approvals
  const { count: pendingApprovals } = await ctx.db
    .from('autonomous_executions')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'pending');

  // Fetch active rules count
  const { count: activeRules } = await ctx.db
    .from('automation_rules')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'active');

  // Fetch active service accounts
  const { count: activeServiceAccounts } = await ctx.db
    .from('service_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'active');

  // Compute status breakdown
  const statusCounts: Record<string, number> = {};
  for (const row of (recent ?? []) as Array<{ status: string }>) {
    statusCounts[row.status] = (statusCounts[row.status] ?? 0) + 1;
  }

  // Get kill switch status
  const { data: firm } = await ctx.db
    .from('firms')
    .select('autonomous_enabled, autonomous_paused_at')
    .eq('id', ctx.firmId)
    .single();

  return {
    data: {
      autonomousEnabled: firm?.autonomous_enabled ?? false,
      pausedAt: firm?.autonomous_paused_at ?? null,
      last24h: {
        total: recent?.length ?? 0,
        byStatus: statusCounts,
      },
      last7dTotal: weekTotal ?? 0,
      pendingEvents: pendingEvents ?? 0,
      pendingApprovals: pendingApprovals ?? 0,
      activeRules: activeRules ?? 0,
      activeServiceAccounts: activeServiceAccounts ?? 0,
    },
  };
}

// =============================================================================
// EVENT INBOX
// =============================================================================

/** List events in the inbox */
export async function listEventInbox(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { status: filterStatus, eventType, source, limit = 50, offset = 0 } = ctx.params as {
    status?: string;
    eventType?: string;
    source?: string;
    limit?: number;
    offset?: number;
  };

  let query = ctx.db
    .from('event_inbox')
    .select('*', { count: 'exact' })
    .eq('tenant_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filterStatus) query = query.eq('status', filterStatus);
  if (eventType) query = query.eq('event_type', eventType);
  if (source) query = query.eq('source', source);

  const { data, count, error } = await query;

  if (error) {
    console.error('[admin-autonomous] listEventInbox error:', error);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list events' }, status: 500 };
  }

  return { data: { events: data ?? [], total: count ?? 0 } };
}

// =============================================================================
// KILL SWITCH
// =============================================================================

/** Toggle the autonomous execution kill switch */
export async function toggleAutonomous(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { enabled } = ctx.params as { enabled: boolean };
  if (typeof enabled !== 'boolean') {
    return { error: { code: 'VALIDATION_ERROR', message: 'enabled (boolean) is required' }, status: 400 };
  }

  const updates: Record<string, unknown> = {
    autonomous_enabled: enabled,
  };

  if (!enabled) {
    updates.autonomous_paused_at = new Date().toISOString();
    updates.autonomous_paused_by = ctx.userId;
  } else {
    updates.autonomous_paused_at = null;
    updates.autonomous_paused_by = null;
  }

  const { error } = await ctx.db
    .from('firms')
    .update(updates)
    .eq('id', ctx.firmId);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to toggle autonomous execution' }, status: 500 };
  }

  return { data: { autonomousEnabled: enabled } };
}

// =============================================================================
// TRIGGER EXECUTOR (admin-initiated or cron)
// =============================================================================

/** Manually trigger the autonomous executor to process pending events */
export async function triggerExecutor(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAdmin(ctx);
  if (authErr) return authErr;

  const { batchSize = 50 } = ctx.params as { batchSize?: number };

  const executionResult = await executeAutonomousLoop(
    ctx.db,
    ctx.firmId!,
    { batchSize, timeoutMs: 25_000 },
  );

  return { data: executionResult };
}
