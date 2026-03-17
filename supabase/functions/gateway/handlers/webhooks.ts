/**
 * Webhook Delivery System Handlers
 * Dead letter queue, retry logic, and delivery dashboard.
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

// List webhook endpoints configured for tenant
export async function listWebhookEndpoints(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('webhook_endpoints')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { endpoints: (rows ?? []).map(toEndpoint) } };
}

// Create webhook endpoint
export async function createWebhookEndpoint(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { url, events, description, secret } = ctx.params as {
    url: string;
    events: string[];
    description?: string;
    secret?: string;
  };

  if (!url || !events?.length) {
    return { error: { code: 'INVALID_PARAMS', message: 'url and events are required' }, status: 400 };
  }

  // Generate signing secret if not provided
  const signingSecret = secret || `whsec_${crypto.randomUUID().replace(/-/g, '')}`;

  const { data: row, error } = await ctx.db
    .from('webhook_endpoints')
    .insert({
      firm_id: ctx.firmId,
      url,
      events,
      description: description ?? '',
      signing_secret: signingSecret,
      is_active: true,
      created_by: ctx.userId,
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { endpoint: toEndpoint(row), signingSecret } };
}

// Update webhook endpoint
export async function updateWebhookEndpoint(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { endpointId, url, events, description, isActive } = ctx.params as {
    endpointId: string;
    url?: string;
    events?: string[];
    description?: string;
    isActive?: boolean;
  };

  if (!endpointId) return { error: { code: 'INVALID_PARAMS', message: 'endpointId is required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (url) updates.url = url;
  if (events) updates.events = events;
  if (description !== undefined) updates.description = description;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data: row, error } = await ctx.db
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', endpointId)
    .eq('firm_id', ctx.firmId)
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { endpoint: toEndpoint(row) } };
}

// Delete webhook endpoint
export async function deleteWebhookEndpoint(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const endpointId = ctx.params.endpointId as string;
  if (!endpointId) return { error: { code: 'INVALID_PARAMS', message: 'endpointId is required' }, status: 400 };

  const { error } = await ctx.db
    .from('webhook_endpoints')
    .delete()
    .eq('id', endpointId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// List delivery attempts with filtering
export async function listDeliveries(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min(Number(ctx.params.limit) || 25, 100);
  const offset = Number(ctx.params.offset) || 0;
  const status = ctx.params.status as string | undefined;
  const endpointId = ctx.params.endpointId as string | undefined;

  let query = ctx.db
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (endpointId) query = query.eq('endpoint_id', endpointId);

  const { data: rows, count, error } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return {
    data: { deliveries: (rows ?? []).map(toDelivery) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// Get dead letter queue (failed deliveries)
export async function getDeadLetterQueue(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min(Number(ctx.params.limit) || 25, 100);
  const offset = Number(ctx.params.offset) || 0;

  const { data: rows, count, error } = await ctx.db
    .from('webhook_deliveries')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId)
    .eq('status', 'failed')
    .gte('retry_count', 3)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return {
    data: { deadLetters: (rows ?? []).map(toDelivery) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}

// Retry a failed delivery
export async function retryDelivery(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const deliveryId = ctx.params.deliveryId as string;
  if (!deliveryId) return { error: { code: 'INVALID_PARAMS', message: 'deliveryId is required' }, status: 400 };

  const { data: delivery, error: fetchErr } = await ctx.db
    .from('webhook_deliveries')
    .select('*')
    .eq('id', deliveryId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchErr || !delivery) return { error: { code: 'NOT_FOUND', message: 'Delivery not found' }, status: 404 };

  // Reset for retry
  const { error } = await ctx.db
    .from('webhook_deliveries')
    .update({
      status: 'pending',
      next_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .eq('firm_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true, message: 'Delivery queued for retry' } };
}

// Get delivery stats / dashboard summary
export async function getWebhookStats(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: allDeliveries, error } = await ctx.db
    .from('webhook_deliveries')
    .select('status, response_code, created_at')
    .eq('firm_id', ctx.firmId)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const all = allDeliveries ?? [];
  const delivered = all.filter(d => d.status === 'delivered').length;
  const failed = all.filter(d => d.status === 'failed').length;
  const pending = all.filter(d => d.status === 'pending').length;

  const { count: endpointCount } = await ctx.db
    .from('webhook_endpoints')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('is_active', true);

  return {
    data: {
      stats: {
        totalDeliveries30d: all.length,
        delivered,
        failed,
        pending,
        successRate: all.length > 0 ? Math.round((delivered / all.length) * 100) : 100,
        activeEndpoints: endpointCount ?? 0,
      },
    },
  };
}

function toEndpoint(row: Record<string, unknown>) {
  return {
    id: row.id,
    url: row.url,
    events: row.events,
    description: row.description ?? '',
    isActive: row.is_active ?? true,
    signingSecretLast4: ((row.signing_secret as string) ?? '').slice(-4),
    successRate: row.success_rate,
    lastDeliveryAt: row.last_delivery_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDelivery(row: Record<string, unknown>) {
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    event: row.event,
    payload: row.payload,
    status: row.status,
    responseCode: row.response_code,
    responseBody: row.response_body,
    retryCount: row.retry_count ?? 0,
    maxRetries: row.max_retries ?? 3,
    nextRetryAt: row.next_retry_at,
    error: row.error,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}
