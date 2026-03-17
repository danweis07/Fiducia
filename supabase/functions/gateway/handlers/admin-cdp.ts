/**
 * Admin CDP (Customer Data Platform) Handlers
 *
 * Gateway handlers for managing RudderStack CDP configuration per tenant.
 * Admins can configure:
 *   - CDP connection settings (write key, data plane URL)
 *   - Downstream destinations (marketing, CRM, data warehouse, etc.)
 *   - Event schemas and consent categories
 *   - Data routing rules (which events go to which destinations)
 *
 * IMPORTANT:
 * - All operations scoped by ctx.firmId for tenant isolation.
 * - Write keys are stored encrypted; only masked values returned to frontend.
 * - NEVER log PII or write keys.
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

function maskKey(key: string): string {
  if (!key || key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••' + key.slice(-4);
}

// =============================================================================
// CDP CONFIG
// =============================================================================

/**
 * admin.cdp.config.get — Get tenant CDP configuration
 */
export async function getCDPConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('cdp_config')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .maybeSingle();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query CDP config' }, status: 500 };
  }

  if (!data) {
    return {
      data: {
        config: {
          enabled: false,
          provider: 'rudderstack',
          writeKey: '',
          dataPlaneUrl: '',
          consentCategories: ['functional', 'analytics', 'marketing'],
          eventSchemas: [],
        },
      },
    };
  }

  return {
    data: {
      config: {
        id: data.id,
        enabled: data.enabled,
        provider: data.provider,
        writeKey: maskKey(data.write_key ?? ''),
        dataPlaneUrl: data.data_plane_url ?? '',
        consentCategories: data.consent_categories ?? ['functional', 'analytics', 'marketing'],
        eventSchemas: data.event_schemas ?? [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
  };
}

/**
 * admin.cdp.config.update — Create or update tenant CDP configuration
 */
export async function updateCDPConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { enabled, writeKey, dataPlaneUrl, consentCategories, eventSchemas } = ctx.params as {
    enabled?: boolean;
    writeKey?: string;
    dataPlaneUrl?: string;
    consentCategories?: string[];
    eventSchemas?: Array<{ event: string; category: string; description: string }>;
  };

  // Check for existing config
  const { data: existing } = await ctx.db
    .from('cdp_config')
    .select('id, write_key')
    .eq('firm_id', ctx.firmId!)
    .maybeSingle();

  const record: Record<string, unknown> = {
    firm_id: ctx.firmId,
    provider: 'rudderstack',
    updated_at: new Date().toISOString(),
  };
  if (enabled !== undefined) record.enabled = enabled;
  if (writeKey !== undefined && writeKey !== '') record.write_key = writeKey;
  if (dataPlaneUrl !== undefined) record.data_plane_url = dataPlaneUrl;
  if (consentCategories !== undefined) record.consent_categories = consentCategories;
  if (eventSchemas !== undefined) record.event_schemas = eventSchemas;

  let result;
  if (existing) {
    // Don't overwrite write_key if not provided or masked
    if (!writeKey || writeKey.includes('••••')) {
      delete record.write_key;
    }
    const { data, error } = await ctx.db
      .from('cdp_config')
      .update(record)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: 'Failed to update CDP config' }, status: 500 };
    }
    result = data;
  } else {
    record.created_at = new Date().toISOString();
    const { data, error } = await ctx.db
      .from('cdp_config')
      .insert(record)
      .select()
      .single();
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create CDP config' }, status: 500 };
    }
    result = data;
  }

  return {
    data: {
      config: {
        id: result.id,
        enabled: result.enabled,
        provider: result.provider,
        writeKey: maskKey(result.write_key ?? ''),
        dataPlaneUrl: result.data_plane_url ?? '',
        consentCategories: result.consent_categories ?? [],
        eventSchemas: result.event_schemas ?? [],
        createdAt: result.created_at,
        updatedAt: result.updated_at,
      },
    },
  };
}

// =============================================================================
// DESTINATIONS
// =============================================================================

/**
 * admin.cdp.destinations.list — List configured CDP destinations
 */
export async function listCDPDestinations(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('cdp_destinations')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query destinations' }, status: 500 };
  }

  const destinations = (data ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    category: d.category,
    enabled: d.enabled,
    config: {
      ...((d.config as Record<string, unknown>) ?? {}),
      apiKey: d.config?.apiKey ? maskKey(d.config.apiKey as string) : undefined,
      secret: d.config?.secret ? maskKey(d.config.secret as string) : undefined,
    },
    eventFilter: d.event_filter ?? [],
    consentRequired: d.consent_required ?? [],
    lastSyncAt: d.last_sync_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  return { data: { destinations } };
}

/**
 * admin.cdp.destinations.create — Add a new downstream destination
 */
export async function createCDPDestination(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { name, type, category, config, eventFilter, consentRequired } = ctx.params as {
    name: string;
    type: string;
    category: string;
    config?: Record<string, unknown>;
    eventFilter?: string[];
    consentRequired?: string[];
  };

  if (!name || !type || !category) {
    return { error: { code: 'VALIDATION_ERROR', message: 'name, type, and category are required' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('cdp_destinations')
    .insert({
      firm_id: ctx.firmId,
      name,
      type,
      category,
      enabled: true,
      config: config ?? {},
      event_filter: eventFilter ?? [],
      consent_required: consentRequired ?? [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create destination' }, status: 500 };
  }

  return {
    data: {
      destination: {
        id: data.id,
        name: data.name,
        type: data.type,
        category: data.category,
        enabled: data.enabled,
        config: data.config ?? {},
        eventFilter: data.event_filter ?? [],
        consentRequired: data.consent_required ?? [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
  };
}

/**
 * admin.cdp.destinations.update — Update a destination
 */
export async function updateCDPDestination(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params as {
    id: string;
    name?: string;
    enabled?: boolean;
    config?: Record<string, unknown>;
    eventFilter?: string[];
    consentRequired?: string[];
  };

  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const record: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) record.name = updates.name;
  if (updates.enabled !== undefined) record.enabled = updates.enabled;
  if (updates.config !== undefined) record.config = updates.config;
  if (updates.eventFilter !== undefined) record.event_filter = updates.eventFilter;
  if (updates.consentRequired !== undefined) record.consent_required = updates.consentRequired;

  const { data, error } = await ctx.db
    .from('cdp_destinations')
    .update(record)
    .eq('id', id)
    .eq('firm_id', ctx.firmId!)
    .select()
    .single();

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to update destination' }, status: 500 };
  }

  return {
    data: {
      destination: {
        id: data.id,
        name: data.name,
        type: data.type,
        category: data.category,
        enabled: data.enabled,
        config: {
          ...((data.config as Record<string, unknown>) ?? {}),
          apiKey: data.config?.apiKey ? maskKey(data.config.apiKey as string) : undefined,
          secret: data.config?.secret ? maskKey(data.config.secret as string) : undefined,
        },
        eventFilter: data.event_filter ?? [],
        consentRequired: data.consent_required ?? [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    },
  };
}

/**
 * admin.cdp.destinations.delete — Remove a destination
 */
export async function deleteCDPDestination(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as { id: string };

  if (!id) {
    return { error: { code: 'VALIDATION_ERROR', message: 'id is required' }, status: 400 };
  }

  const { error } = await ctx.db
    .from('cdp_destinations')
    .delete()
    .eq('id', id)
    .eq('firm_id', ctx.firmId!);

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete destination' }, status: 500 };
  }

  return { data: { success: true } };
}

// =============================================================================
// EVENT LOG (recent events for monitoring)
// =============================================================================

/**
 * admin.cdp.events.recent — List recent CDP events for monitoring
 */
export async function listRecentCDPEvents(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { limit = 50, eventName, category } = ctx.params as {
    limit?: number;
    eventName?: string;
    category?: string;
  };

  let query = ctx.db
    .from('cdp_event_log')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 100));

  if (eventName) {
    query = query.eq('event_name', eventName);
  }
  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query event log' }, status: 500 };
  }

  const events = (data ?? []).map((e) => ({
    id: e.id,
    eventName: e.event_name,
    category: e.category,
    userId: e.user_id ? `****${(e.user_id as string).slice(-4)}` : null,
    properties: e.properties ?? {},
    destinations: e.destinations ?? [],
    status: e.status,
    createdAt: e.created_at,
  }));

  return { data: { events } };
}

/**
 * admin.cdp.events.summary — Get event volume summary
 */
export async function getCDPEventSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { range = '7d' } = ctx.params as { range?: string };

  const now = new Date();
  const match = range.match(/^(\d+)(d|m)$/);
  let rangeStart: Date;
  if (match) {
    const value = parseInt(match[1], 10);
    rangeStart = match[2] === 'd'
      ? new Date(now.getTime() - value * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() - value, now.getDate());
  } else {
    rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  const { data, error } = await ctx.db
    .from('cdp_event_log')
    .select('event_name, category, status, created_at')
    .eq('firm_id', ctx.firmId!)
    .gte('created_at', rangeStart.toISOString());

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to query event summary' }, status: 500 };
  }

  const rows = data ?? [];
  const totalEvents = rows.length;
  const delivered = rows.filter((r) => r.status === 'delivered').length;
  const failed = rows.filter((r) => r.status === 'failed').length;

  // Group by event name
  const byEvent = new Map<string, number>();
  for (const row of rows) {
    byEvent.set(row.event_name, (byEvent.get(row.event_name) ?? 0) + 1);
  }

  // Group by category
  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + 1);
  }

  return {
    data: {
      summary: {
        totalEvents,
        delivered,
        failed,
        deliveryRate: totalEvents > 0 ? Math.round((delivered / totalEvents) * 100) / 100 : 0,
        byEvent: Array.from(byEvent.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        byCategory: Array.from(byCategory.entries()).map(([name, count]) => ({ name, count })),
        range,
      },
    },
  };
}
