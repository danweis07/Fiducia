/**
 * Device Management Handlers
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
// DEVICE CRUD
// =============================================================================

export async function listDevices(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('user_devices')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('last_active_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { devices: (rows ?? []).map(toDevice) } };
}

export async function getDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('user_devices')
    .select('*')
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Device not found' }, status: 404 };
  return { data: { device: toDevice(row) } };
}

export async function renameDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { deviceId, name } = ctx.params as { deviceId: string; name: string };
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { error: { code: 'INVALID_PARAMS', message: 'name required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('user_devices')
    .update({ name: name.trim() })
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function removeDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  // Also revoke any sessions tied to this device
  await ctx.db
    .from('user_sessions')
    .update({ is_revoked: true, revoked_at: new Date().toISOString() })
    .eq('device_id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  const { error } = await ctx.db
    .from('user_devices')
    .delete()
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// DEVICE ACTIVITY
// =============================================================================

export async function getDeviceActivity(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  const limit = (ctx.params.limit as number) || 50;
  const offset = (ctx.params.offset as number) || 0;

  const { data: rows, error, count } = await ctx.db
    .from('device_activity_log')
    .select('*', { count: 'exact' })
    .eq('device_id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId)
    .order('timestamp', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { activity: (rows ?? []).map(toActivityEntry) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

// =============================================================================
// TRUST MANAGEMENT
// =============================================================================

export async function trustDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  const { error } = await ctx.db
    .from('user_devices')
    .update({ is_trusted: true, trusted_at: new Date().toISOString() })
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

export async function untrustDevice(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deviceId = ctx.params.deviceId as string;
  if (!deviceId) return { error: { code: 'INVALID_PARAMS', message: 'deviceId required' }, status: 400 };

  const { error } = await ctx.db
    .from('user_devices')
    .update({ is_trusted: false, trusted_at: null })
    .eq('id', deviceId)
    .eq('user_id', ctx.userId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toDevice(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name ?? 'Unknown Device',
    deviceType: row.device_type ?? 'unknown',
    os: row.os ?? 'Unknown',
    browser: row.browser ?? null,
    isTrusted: row.is_trusted ?? false,
    isCurrent: row.is_current ?? false,
    lastActiveAt: row.last_active_at,
    lastIpAddress: row.last_ip_address ?? '',
    lastLocation: row.last_location ?? null,
    registeredAt: row.registered_at ?? row.created_at,
  };
}

function toActivityEntry(row: Record<string, unknown>) {
  return {
    id: row.id,
    deviceId: row.device_id,
    action: row.action,
    ipAddress: row.ip_address ?? '',
    location: row.location ?? null,
    timestamp: row.timestamp ?? row.created_at,
  };
}
