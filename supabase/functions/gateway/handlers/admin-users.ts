/**
 * Admin User Management Handlers
 *
 * Gateway handlers for tenant-level user administration:
 * suspend/activate users, password resets, and invitations.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Caller must have 'owner' or 'admin' role in firm_users.
 * - NEVER log PII (emails, user IDs) beyond what is necessary.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function requireAdminRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const { data: firmUser, error } = await ctx.db
    .from('firm_users')
    .select('role')
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !firmUser) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (firmUser.role !== 'owner' && firmUser.role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin or owner role required' }, status: 403 };
  }

  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * admin.users.suspend — Suspend a user within the tenant
 *
 * Params:
 *   - userId: string (required) — ID of the user to suspend
 */
export async function suspendUser(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const targetUserId = ctx.params.userId as string;
  if (!targetUserId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: userId' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('firm_users')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('user_id', targetUserId)
    .eq('firm_id', ctx.firmId!)
    .select('user_id, firm_id, status, role')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'User not found in tenant' }, status: 404 };
  }

  return {
    data: {
      user: {
        userId: data.user_id,
        firmId: data.firm_id,
        status: data.status,
        role: data.role,
      },
    },
  };
}

/**
 * admin.users.activate — Activate a user within the tenant
 *
 * Params:
 *   - userId: string (required) — ID of the user to activate
 */
export async function activateUser(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const targetUserId = ctx.params.userId as string;
  if (!targetUserId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: userId' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('firm_users')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('user_id', targetUserId)
    .eq('firm_id', ctx.firmId!)
    .select('user_id, firm_id, status, role')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'User not found in tenant' }, status: 404 };
  }

  return {
    data: {
      user: {
        userId: data.user_id,
        firmId: data.firm_id,
        status: data.status,
        role: data.role,
      },
    },
  };
}

/**
 * admin.users.resetPassword — Generate a password reset link for a user
 *
 * Params:
 *   - userId: string (required) — ID of the user to reset
 */
export async function resetUserPassword(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const targetUserId = ctx.params.userId as string;
  if (!targetUserId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: userId' }, status: 400 };
  }

  // Verify the target user belongs to this tenant
  const { data: firmUser, error: firmErr } = await ctx.db
    .from('firm_users')
    .select('user_id')
    .eq('user_id', targetUserId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (firmErr || !firmUser) {
    return { error: { code: 'NOT_FOUND', message: 'User not found in tenant' }, status: 404 };
  }

  // Look up the user's email from auth.users (uses raw Supabase client for admin auth API)
  const { data: authUser, error: authErr2 } = await ctx.supabase.auth.admin.getUserById(targetUserId);

  if (authErr2 || !authUser?.user?.email) {
    return { error: { code: 'NOT_FOUND', message: 'Unable to retrieve user email' }, status: 404 };
  }

  // Generate a password recovery link
  const { data: linkData, error: linkErr } = await ctx.supabase.auth.admin.generateLink({
    type: 'recovery',
    email: authUser.user.email,
  });

  if (linkErr || !linkData) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate password reset link' }, status: 500 };
  }

  return {
    data: {
      resetLink: linkData.properties?.action_link ?? null,
      userId: targetUserId,
    },
  };
}

/**
 * admin.users.invite — Invite a new user to the tenant
 *
 * Params:
 *   - email: string (required) — Email of the user to invite
 *   - role: string (optional, default 'member') — Role to assign
 */
export async function inviteUser(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const email = ctx.params.email as string;
  if (!email) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: email' }, status: 400 };
  }

  const role = (ctx.params.role as string) || 'member';
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await ctx.db
    .from('firm_invitations')
    .insert({
      firm_id: ctx.firmId!,
      email,
      role,
      invited_by: ctx.userId!,
      token,
      expires_at: expiresAt,
    })
    .select('id, email, role, token, expires_at')
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create invitation' }, status: 500 };
  }

  return {
    data: {
      invitation: {
        id: data.id,
        email: data.email,
        role: data.role,
        token: data.token,
        expiresAt: data.expires_at,
      },
    },
  };
}
