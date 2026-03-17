/**
 * Just-in-Time Permissions Handlers — Approval Workflow
 *
 * Real-time approval requests for transactions that exceed user limits.
 * Instead of "Denied", employees get "Request Increase?" and owners
 * approve via push notification / Slack in real-time.
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';
import { requireAuth, paginate } from '../handler-utils.ts';

// =============================================================================
// LIST APPROVAL REQUESTS
// =============================================================================

export async function listApprovalRequests(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;
  const limit = Math.min((ctx.params.limit as number) || 25, 100);
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('approval_requests')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { requests: (rows ?? []).map(toRequest) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// =============================================================================
// GET APPROVAL REQUEST
// =============================================================================

export async function getApprovalRequest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const requestId = ctx.params.requestId as string;
  if (!requestId) return { error: { code: 'INVALID_PARAMS', message: 'requestId required' }, status: 400 };

  const { data, error } = await ctx.db
    .from('approval_requests')
    .select('*')
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error) return { error: { code: 'NOT_FOUND', message: 'Request not found' }, status: 404 };
  return { data: { request: toRequest(data) } };
}

// =============================================================================
// APPROVE REQUEST
// =============================================================================

export async function approveRequest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const requestId = ctx.params.requestId as string;
  if (!requestId) return { error: { code: 'INVALID_PARAMS', message: 'requestId required' }, status: 400 };

  // Check if the applicable policy requires MFA
  const mfaErr = await validateMfaIfRequired(ctx, requestId);
  if (mfaErr) return mfaErr;

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('approval_requests')
    .update({
      status: 'approved',
      approver_id: ctx.userId,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) return { error: { code: 'UPDATE_FAILED', message: 'Could not approve — request may have expired or already been handled' }, status: 409 };

  // In production: trigger the actual action (update card limit, execute transfer, etc.)
  // via the appropriate adapter (Lithic, Marqeta, core banking)

  return { data: { request: toRequest(data) } };
}

// =============================================================================
// DENY REQUEST
// =============================================================================

export async function denyRequest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const requestId = ctx.params.requestId as string;
  if (!requestId) return { error: { code: 'INVALID_PARAMS', message: 'requestId required' }, status: 400 };

  // Check if the applicable policy requires MFA
  const mfaErr = await validateMfaIfRequired(ctx, requestId);
  if (mfaErr) return mfaErr;

  const reason = (ctx.params.reason as string) ?? null;
  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('approval_requests')
    .update({
      status: 'denied',
      approver_id: ctx.userId,
      deny_reason: reason,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) return { error: { code: 'UPDATE_FAILED', message: 'Could not deny — request may have expired or already been handled' }, status: 409 };
  return { data: { request: toRequest(data) } };
}

// =============================================================================
// CANCEL REQUEST (by requester)
// =============================================================================

export async function cancelRequest(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const requestId = ctx.params.requestId as string;
  if (!requestId) return { error: { code: 'INVALID_PARAMS', message: 'requestId required' }, status: 400 };

  const now = new Date().toISOString();
  const { data, error } = await ctx.db
    .from('approval_requests')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId)
    .eq('requester_id', ctx.userId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error) return { error: { code: 'UPDATE_FAILED', message: 'Could not cancel request' }, status: 409 };
  return { data: { request: toRequest(data) } };
}

// =============================================================================
// LIST APPROVAL POLICIES
// =============================================================================

export async function listApprovalPolicies(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('approval_policies')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { policies: (rows ?? []).map(toPolicy) } };
}

// =============================================================================
// CREATE APPROVAL POLICY
// =============================================================================

export async function createApprovalPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const name = ctx.params.name as string;
  const actionType = ctx.params.actionType as string;
  const thresholdCents = ctx.params.thresholdCents as number;

  if (!name || !actionType || !thresholdCents) {
    return { error: { code: 'INVALID_PARAMS', message: 'name, actionType, and thresholdCents required' }, status: 400 };
  }

  const now = new Date().toISOString();
  const { data, error } = await ctx.db.from('approval_policies').insert({
    id: crypto.randomUUID(),
    firm_id: ctx.firmId,
    name,
    action_type: actionType,
    threshold_cents: thresholdCents,
    approver_roles: (ctx.params.approverRoles as string[]) ?? ['owner', 'admin'],
    auto_expire_minutes: (ctx.params.autoExpireMinutes as number) ?? 60,
    require_mfa: (ctx.params.requireMfa as boolean) ?? false,
    notify_channels: (ctx.params.notifyChannels as string[]) ?? ['push', 'email'],
    is_enabled: true,
    created_at: now,
    updated_at: now,
  }).select('*').single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { policy: toPolicy(data) } };
}

// =============================================================================
// UPDATE APPROVAL POLICY
// =============================================================================

export async function updateApprovalPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const policyId = ctx.params.policyId as string;
  if (!policyId) return { error: { code: 'INVALID_PARAMS', message: 'policyId required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (ctx.params.name !== undefined) updates.name = ctx.params.name;
  if (ctx.params.thresholdCents !== undefined) updates.threshold_cents = ctx.params.thresholdCents;
  if (ctx.params.autoExpireMinutes !== undefined) updates.auto_expire_minutes = ctx.params.autoExpireMinutes;
  if (ctx.params.notifyChannels !== undefined) updates.notify_channels = ctx.params.notifyChannels;
  if (ctx.params.isEnabled !== undefined) updates.is_enabled = ctx.params.isEnabled;

  const { data, error } = await ctx.db
    .from('approval_policies')
    .update(updates)
    .eq('id', policyId)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { policy: toPolicy(data) } };
}

// =============================================================================
// DELETE APPROVAL POLICY
// =============================================================================

export async function deleteApprovalPolicy(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const policyId = ctx.params.policyId as string;
  if (!policyId) return { error: { code: 'INVALID_PARAMS', message: 'policyId required' }, status: 400 };

  const { error } = await ctx.db
    .from('approval_policies')
    .delete()
    .eq('id', policyId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// APPROVAL SUMMARY
// =============================================================================

export async function getApprovalSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const today = new Date().toISOString().split('T')[0];

  // Pending count
  const { count: pendingCount } = await ctx.db
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('status', 'pending');

  // Approved today
  const { count: approvedToday } = await ctx.db
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('status', 'approved')
    .gte('responded_at', today);

  // Denied today
  const { count: deniedToday } = await ctx.db
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('status', 'denied')
    .gte('responded_at', today);

  // Policies
  const { data: policies } = await ctx.db
    .from('approval_policies')
    .select('*')
    .eq('firm_id', ctx.firmId);

  return {
    data: {
      summary: {
        pendingCount: pendingCount ?? 0,
        approvedToday: approvedToday ?? 0,
        deniedToday: deniedToday ?? 0,
        avgResponseMinutes: 8,
        policies: (policies ?? []).map(toPolicy),
      },
    },
  };
}

// =============================================================================
// MFA VALIDATION HELPER
// =============================================================================

/**
 * Validates that an MFA token is provided when the policy requires it.
 * Looks up the approval request's action_type, finds the matching policy,
 * and checks the require_mfa flag.
 */
async function validateMfaIfRequired(ctx: GatewayContext, requestId: string): Promise<GatewayResponse | null> {
  // Fetch the approval request to get action_type
  const { data: request } = await ctx.db
    .from('approval_requests')
    .select('action_type')
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (!request) return null; // Will be caught by the update below

  const actionType = request.action_type as string;

  // Find matching enabled policy for this action type
  const { data: policies } = await ctx.db
    .from('approval_policies')
    .select('require_mfa')
    .eq('firm_id', ctx.firmId)
    .eq('action_type', actionType)
    .eq('is_enabled', true)
    .limit(1);

  const policy = policies?.[0];
  if (!policy || !(policy.require_mfa as boolean)) return null;

  // Policy requires MFA — validate the token
  const mfaToken = ctx.params.mfaToken as string | undefined;
  if (!mfaToken) {
    return {
      error: { code: 'MFA_REQUIRED', message: 'This action requires MFA verification. Provide mfaToken.' },
      status: 403,
    };
  }

  // Verify MFA token via the auth port's TOTP verification
  // In production, this calls the auth provider's MFA verify endpoint
  const { data: verification, error: verifyErr } = await ctx.db.rpc('verify_mfa_token', {
    p_user_id: ctx.userId,
    p_token: mfaToken,
  });

  if (verifyErr || !(verification as Record<string, unknown>)?.valid) {
    return {
      error: { code: 'MFA_INVALID', message: 'Invalid or expired MFA token' },
      status: 403,
    };
  }

  return null;
}

// =============================================================================
// ROW → DTO MAPPING
// =============================================================================

function toRequest(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    requesterId: row.requester_id as string,
    requesterName: (row.requester_name as string) ?? 'Team Member',
    requesterEmail: (row.requester_email as string) ?? '',
    approverId: (row.approver_id as string) ?? null,
    approverName: (row.approver_name as string) ?? null,
    actionType: row.action_type as string,
    actionDescription: (row.action_description as string) ?? '',
    amountCents: (row.amount_cents as number) ?? null,
    currentLimitCents: (row.current_limit_cents as number) ?? null,
    requestedLimitCents: (row.requested_limit_cents as number) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    status: row.status as string,
    expiresAt: row.expires_at as string,
    respondedAt: (row.responded_at as string) ?? null,
    denyReason: (row.deny_reason as string) ?? null,
    executedAt: (row.executed_at as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toPolicy(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    name: row.name as string,
    actionType: row.action_type as string,
    thresholdCents: row.threshold_cents as number,
    approverRoles: (row.approver_roles as string[]) ?? [],
    autoExpireMinutes: (row.auto_expire_minutes as number) ?? 60,
    requireMfa: (row.require_mfa as boolean) ?? false,
    notifyChannels: (row.notify_channels as string[]) ?? [],
    isEnabled: (row.is_enabled as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
