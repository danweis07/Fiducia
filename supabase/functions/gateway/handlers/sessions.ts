/**
 * Session Management Handlers
 */
import type { GatewayContext, GatewayResponse } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

export async function listSessions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('user_sessions')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('last_active_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { sessions: (rows ?? []).map(toSession) } };
}

export async function revokeSession(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const sessionId = ctx.params.sessionId as string;
  if (!sessionId) return { error: { code: 'INVALID_PARAMS', message: 'sessionId required' }, status: 400 };

  const { error } = await ctx.db
    .from('user_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function revokeAllSessions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const excludeCurrent = ctx.params.excludeCurrent as boolean ?? true;

  let query = ctx.db
    .from('user_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .eq('is_revoked', false);

  if (excludeCurrent && ctx.params.currentSessionId) {
    query = query.neq('id', ctx.params.currentSessionId as string);
  }

  const { error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function getSessionActivity(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('user_sessions')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .eq('is_revoked', false)
    .order('last_active_at', { ascending: false })
    .limit(50);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const active = (rows ?? []).filter(r => !r.is_revoked);
  return {
    data: {
      activeSessions: active.length,
      sessions: active.map(toSession),
    },
  };
}

function toSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    deviceName: row.device_name ?? 'Unknown Device',
    deviceType: row.device_type ?? 'unknown',
    browser: row.browser ?? 'Unknown',
    os: row.os ?? 'Unknown',
    ipAddress: row.ip_address,
    location: row.location,
    isCurrent: row.is_current ?? false,
    isRevoked: row.is_revoked ?? false,
    lastActiveAt: row.last_active_at,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}
