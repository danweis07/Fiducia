/**
 * Joint Account Management Handlers
 *
 * Gateway handlers for managing joint account ownership:
 * list owners, add/remove owners, manage invitations.
 *
 * IMPORTANT:
 * - All operations scoped by ctx.firmId for tenant isolation.
 * - Primary owner cannot be removed.
 * - NEVER log PII (emails, names) beyond what is necessary.
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

const VALID_PERMISSIONS = ['full', 'view_only', 'limited'] as const;
const VALID_RELATIONSHIPS = ['spouse', 'child', 'parent', 'business_partner', 'other'] as const;

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * jointAccounts.owners.list — List all owners/authorized users on an account
 *
 * Params:
 *   - accountId: string (required)
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 */
export async function listJointOwners(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  if (!accountId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: accountId' }, status: 400 };
  }

  const limit = Math.min(Number(ctx.params.limit) || 50, 100);
  const offset = Number(ctx.params.offset) || 0;

  // Verify user has access to this account within their tenant
  const { data: account, error: acctErr } = await ctx.db
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (acctErr || !account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Check that the requesting user is an owner of this account
  const { data: callerOwner } = await ctx.db
    .from('account_owners')
    .select('id')
    .eq('account_id', accountId)
    .eq('user_id', ctx.userId!)
    .single();

  if (!callerOwner) {
    return { error: { code: 'FORBIDDEN', message: 'You are not an owner of this account' }, status: 403 };
  }

  // Fetch owners
  const { data: owners, error: ownersErr, count } = await ctx.db
    .from('account_owners')
    .select('id, account_id, user_id, first_name, last_name, email, relationship, permissions, is_primary, added_at', { count: 'exact' })
    .eq('account_id', accountId)
    .order('is_primary', { ascending: false })
    .order('added_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (ownersErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch account owners' }, status: 500 };
  }

  const total = count ?? 0;

  return {
    data: {
      owners: (owners ?? []).map((o) => ({
        id: o.id,
        accountId: o.account_id,
        userId: o.user_id,
        firstName: o.first_name,
        lastName: o.last_name,
        email: o.email,
        relationship: o.relationship,
        permissions: o.permissions,
        isPrimary: o.is_primary,
        addedAt: o.added_at,
      })),
    },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

/**
 * jointAccounts.owners.add — Add a joint owner to an account (sends invitation)
 *
 * Params:
 *   - accountId: string (required)
 *   - email: string (required)
 *   - firstName: string (required)
 *   - lastName: string (required)
 *   - relationship: 'spouse'|'child'|'parent'|'business_partner'|'other' (required)
 *   - permissions: 'full'|'view_only'|'limited' (required)
 */
export async function addJointOwner(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  const email = ctx.params.email as string;
  const firstName = ctx.params.firstName as string;
  const lastName = ctx.params.lastName as string;
  const relationship = ctx.params.relationship as string;
  const permissions = ctx.params.permissions as string;

  if (!accountId || !email || !firstName || !lastName || !relationship || !permissions) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: accountId, email, firstName, lastName, relationship, permissions' }, status: 400 };
  }

  if (!VALID_RELATIONSHIPS.includes(relationship as typeof VALID_RELATIONSHIPS[number])) {
    return { error: { code: 'BAD_REQUEST', message: `Invalid relationship. Must be one of: ${VALID_RELATIONSHIPS.join(', ')}` }, status: 400 };
  }

  if (!VALID_PERMISSIONS.includes(permissions as typeof VALID_PERMISSIONS[number])) {
    return { error: { code: 'BAD_REQUEST', message: `Invalid permissions. Must be one of: ${VALID_PERMISSIONS.join(', ')}` }, status: 400 };
  }

  // Verify account belongs to tenant
  const { data: account, error: acctErr } = await ctx.db
    .from('accounts')
    .select('id, account_number_masked')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (acctErr || !account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Verify caller is primary owner
  const { data: callerOwner } = await ctx.db
    .from('account_owners')
    .select('id, is_primary, first_name, last_name')
    .eq('account_id', accountId)
    .eq('user_id', ctx.userId!)
    .single();

  if (!callerOwner || !callerOwner.is_primary) {
    return { error: { code: 'FORBIDDEN', message: 'Only the primary account owner can add joint owners' }, status: 403 };
  }

  // Check for duplicate invitation
  const { data: existing } = await ctx.db
    .from('joint_account_invitations')
    .select('id')
    .eq('account_id', accountId)
    .eq('invitee_email', email)
    .eq('status', 'pending')
    .single();

  if (existing) {
    return { error: { code: 'CONFLICT', message: 'A pending invitation already exists for this email' }, status: 409 };
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const inviterName = `${callerOwner.first_name} ${callerOwner.last_name}`;

  const { data: invitation, error: invErr } = await ctx.db
    .from('joint_account_invitations')
    .insert({
      account_id: accountId,
      account_masked: account.account_number_masked,
      inviter_id: ctx.userId!,
      inviter_name: inviterName,
      invitee_name: `${firstName} ${lastName}`,
      invitee_email: email,
      relationship,
      permissions,
      status: 'pending',
      firm_id: ctx.firmId!,
      sent_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select('id, account_id, account_masked, inviter_name, invitee_name, invitee_email, relationship, permissions, status, sent_at, responded_at, expires_at')
    .single();

  if (invErr || !invitation) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create invitation' }, status: 500 };
  }

  return {
    data: {
      invitation: {
        id: invitation.id,
        accountId: invitation.account_id,
        accountMasked: invitation.account_masked,
        inviterName: invitation.inviter_name,
        inviteeName: invitation.invitee_name,
        inviteeEmail: invitation.invitee_email,
        relationship: invitation.relationship,
        permissions: invitation.permissions,
        status: invitation.status,
        sentAt: invitation.sent_at,
        respondedAt: invitation.responded_at,
        expiresAt: invitation.expires_at,
      },
    },
  };
}

/**
 * jointAccounts.owners.remove — Remove a joint owner from an account
 *
 * Params:
 *   - accountId: string (required)
 *   - ownerId: string (required) — ID of the account_owners row
 */
export async function removeJointOwner(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  const ownerId = ctx.params.ownerId as string;

  if (!accountId || !ownerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: accountId, ownerId' }, status: 400 };
  }

  // Verify account belongs to tenant
  const { data: account } = await ctx.db
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Verify caller is primary owner
  const { data: callerOwner } = await ctx.db
    .from('account_owners')
    .select('id, is_primary')
    .eq('account_id', accountId)
    .eq('user_id', ctx.userId!)
    .single();

  if (!callerOwner || !callerOwner.is_primary) {
    return { error: { code: 'FORBIDDEN', message: 'Only the primary account owner can remove joint owners' }, status: 403 };
  }

  // Fetch the target owner
  const { data: targetOwner } = await ctx.db
    .from('account_owners')
    .select('id, is_primary')
    .eq('id', ownerId)
    .eq('account_id', accountId)
    .single();

  if (!targetOwner) {
    return { error: { code: 'NOT_FOUND', message: 'Owner not found on this account' }, status: 404 };
  }

  if (targetOwner.is_primary) {
    return { error: { code: 'BAD_REQUEST', message: 'Cannot remove the primary account owner' }, status: 400 };
  }

  const { error: delErr } = await ctx.db
    .from('account_owners')
    .delete()
    .eq('id', ownerId)
    .eq('account_id', accountId);

  if (delErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to remove joint owner' }, status: 500 };
  }

  return { data: { success: true } };
}

/**
 * jointAccounts.owners.updatePermissions — Update permissions for a joint owner
 *
 * Params:
 *   - accountId: string (required)
 *   - ownerId: string (required)
 *   - permissions: 'full'|'view_only'|'limited' (required)
 */
export async function updateJointOwnerPermissions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const accountId = ctx.params.accountId as string;
  const ownerId = ctx.params.ownerId as string;
  const permissions = ctx.params.permissions as string;

  if (!accountId || !ownerId || !permissions) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: accountId, ownerId, permissions' }, status: 400 };
  }

  if (!VALID_PERMISSIONS.includes(permissions as typeof VALID_PERMISSIONS[number])) {
    return { error: { code: 'BAD_REQUEST', message: `Invalid permissions. Must be one of: ${VALID_PERMISSIONS.join(', ')}` }, status: 400 };
  }

  // Verify account belongs to tenant
  const { data: account } = await ctx.db
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (!account) {
    return { error: { code: 'NOT_FOUND', message: 'Account not found' }, status: 404 };
  }

  // Verify caller is primary owner
  const { data: callerOwner } = await ctx.db
    .from('account_owners')
    .select('id, is_primary')
    .eq('account_id', accountId)
    .eq('user_id', ctx.userId!)
    .single();

  if (!callerOwner || !callerOwner.is_primary) {
    return { error: { code: 'FORBIDDEN', message: 'Only the primary account owner can update permissions' }, status: 403 };
  }

  const { data: updated, error: updErr } = await ctx.db
    .from('account_owners')
    .update({ permissions })
    .eq('id', ownerId)
    .eq('account_id', accountId)
    .select('id, account_id, user_id, first_name, last_name, email, relationship, permissions, is_primary, added_at')
    .single();

  if (updErr || !updated) {
    return { error: { code: 'NOT_FOUND', message: 'Owner not found on this account' }, status: 404 };
  }

  return {
    data: {
      owner: {
        id: updated.id,
        accountId: updated.account_id,
        userId: updated.user_id,
        firstName: updated.first_name,
        lastName: updated.last_name,
        email: updated.email,
        relationship: updated.relationship,
        permissions: updated.permissions,
        isPrimary: updated.is_primary,
        addedAt: updated.added_at,
      },
    },
  };
}

/**
 * jointAccounts.invitations.list — List pending invitations (sent and received)
 *
 * Params:
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 */
export async function listPendingInvitations(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min(Number(ctx.params.limit) || 50, 100);
  const offset = Number(ctx.params.offset) || 0;

  // Get the user's email for received invitations
  const { data: authUser } = await ctx.supabase.auth.admin.getUserById(ctx.userId!);
  const userEmail = authUser?.user?.email;

  // Sent invitations (user is the inviter)
  const { data: sent, error: sentErr } = await ctx.db
    .from('joint_account_invitations')
    .select('id, account_id, account_masked, inviter_name, invitee_name, invitee_email, relationship, permissions, status, sent_at, responded_at, expires_at')
    .eq('inviter_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .in('status', ['pending'])
    .order('sent_at', { ascending: false });

  // Received invitations (user's email is the invitee)
  const { data: received, error: recvErr } = await ctx.db
    .from('joint_account_invitations')
    .select('id, account_id, account_masked, inviter_name, invitee_name, invitee_email, relationship, permissions, status, sent_at, responded_at, expires_at')
    .eq('invitee_email', userEmail ?? '')
    .eq('firm_id', ctx.firmId!)
    .in('status', ['pending'])
    .order('sent_at', { ascending: false });

  if (sentErr || recvErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch invitations' }, status: 500 };
  }

  const allInvitations = [...(sent ?? []), ...(received ?? [])];
  // Deduplicate by id
  const uniqueMap = new Map(allInvitations.map((inv) => [inv.id, inv]));
  const deduped = Array.from(uniqueMap.values());
  const total = deduped.length;
  const paged = deduped.slice(offset, offset + limit);

  return {
    data: {
      invitations: paged.map((inv) => ({
        id: inv.id,
        accountId: inv.account_id,
        accountMasked: inv.account_masked,
        inviterName: inv.inviter_name,
        inviteeName: inv.invitee_name,
        inviteeEmail: inv.invitee_email,
        relationship: inv.relationship,
        permissions: inv.permissions,
        status: inv.status,
        sentAt: inv.sent_at,
        respondedAt: inv.responded_at,
        expiresAt: inv.expires_at,
        direction: inv.invitee_email === userEmail ? 'received' : 'sent',
      })),
    },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

/**
 * jointAccounts.invitations.accept — Accept a joint account invitation
 *
 * Params:
 *   - invitationId: string (required)
 */
export async function acceptInvitation(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const invitationId = ctx.params.invitationId as string;
  if (!invitationId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: invitationId' }, status: 400 };
  }

  // Get user email
  const { data: authUser } = await ctx.supabase.auth.admin.getUserById(ctx.userId!);
  const userEmail = authUser?.user?.email;

  // Fetch invitation
  const { data: invitation, error: invErr } = await ctx.db
    .from('joint_account_invitations')
    .select('*')
    .eq('id', invitationId)
    .eq('invitee_email', userEmail ?? '')
    .eq('firm_id', ctx.firmId!)
    .eq('status', 'pending')
    .single();

  if (invErr || !invitation) {
    return { error: { code: 'NOT_FOUND', message: 'Invitation not found or already responded' }, status: 404 };
  }

  // Check expiration
  if (new Date(invitation.expires_at) < new Date()) {
    await ctx.db
      .from('joint_account_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);
    return { error: { code: 'BAD_REQUEST', message: 'Invitation has expired' }, status: 400 };
  }

  const now = new Date().toISOString();

  // Update invitation status
  const { error: updErr } = await ctx.db
    .from('joint_account_invitations')
    .update({ status: 'accepted', responded_at: now })
    .eq('id', invitationId);

  if (updErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to accept invitation' }, status: 500 };
  }

  // Add user as account owner
  const nameParts = (invitation.invitee_name as string).split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const { error: ownerErr } = await ctx.db
    .from('account_owners')
    .insert({
      account_id: invitation.account_id,
      user_id: ctx.userId!,
      first_name: firstName,
      last_name: lastName,
      email: userEmail,
      relationship: invitation.relationship,
      permissions: invitation.permissions,
      is_primary: false,
      added_at: now,
    });

  if (ownerErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to add as account owner' }, status: 500 };
  }

  return { data: { success: true, invitationId } };
}

/**
 * jointAccounts.invitations.decline — Decline a joint account invitation
 *
 * Params:
 *   - invitationId: string (required)
 */
export async function declineInvitation(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const invitationId = ctx.params.invitationId as string;
  if (!invitationId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: invitationId' }, status: 400 };
  }

  // Get user email
  const { data: authUser } = await ctx.supabase.auth.admin.getUserById(ctx.userId!);
  const userEmail = authUser?.user?.email;

  const { data: invitation, error: invErr } = await ctx.db
    .from('joint_account_invitations')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('invitee_email', userEmail ?? '')
    .eq('firm_id', ctx.firmId!)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (invErr || !invitation) {
    return { error: { code: 'NOT_FOUND', message: 'Invitation not found or already responded' }, status: 404 };
  }

  return { data: { success: true, invitationId } };
}

/**
 * jointAccounts.summary — Summary of accounts user is joint owner on vs primary owner
 */
export async function getJointAccountSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  // Get all account_owners entries for this user
  const { data: ownerships, error: ownErr } = await ctx.db
    .from('account_owners')
    .select('id, account_id, is_primary, permissions')
    .eq('user_id', ctx.userId!);

  if (ownErr) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch account summary' }, status: 500 };
  }

  const rows = ownerships ?? [];
  const primaryCount = rows.filter((r) => r.is_primary).length;
  const jointCount = rows.filter((r) => !r.is_primary).length;

  // Get pending received invitations
  const { data: authUser } = await ctx.supabase.auth.admin.getUserById(ctx.userId!);
  const userEmail = authUser?.user?.email;

  const { count: pendingCount } = await ctx.db
    .from('joint_account_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('invitee_email', userEmail ?? '')
    .eq('firm_id', ctx.firmId!)
    .eq('status', 'pending');

  return {
    data: {
      summary: {
        primaryAccountCount: primaryCount,
        jointAccountCount: jointCount,
        totalAccountCount: rows.length,
        pendingInvitationCount: pendingCount ?? 0,
      },
    },
  };
}
