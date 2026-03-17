/**
 * Integrations Handlers
 *
 * Server-side integration management. Replaces direct supabase.from()
 * calls for integration_providers and firm_integrations.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

export async function listProviders(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db } = ctx;

  const { data, error } = await db
    .from('integration_providers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) throw new Error(`Failed to fetch providers: ${error.message}`);

  return { data: { providers: data ?? [] } };
}

export async function listConnected(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db, params } = ctx;
  const firmId = (params.firmId as string) ?? ctx.firmId;

  if (!firmId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing firmId' }, status: 400 };
  }

  const { data, error } = await db
    .from('firm_integrations')
    .select('*')
    .eq('firm_id', firmId)
    .order('connected_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch integrations: ${error.message}`);

  return { data: { integrations: data ?? [] } };
}

export async function connectWithApiKey(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db, params } = ctx;
  const firmId = (params.firmId as string) ?? ctx.firmId;
  const providerId = params.providerId as string;
  const apiKey = params.apiKey as string;

  if (!firmId || !providerId || !apiKey) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing firmId, providerId, or apiKey' }, status: 400 };
  }

  const { data, error } = await db
    .from('firm_integrations')
    .upsert({
      firm_id: firmId,
      provider_id: providerId,
      auth_type: 'api_key',
      access_token: apiKey,
      status: 'active',
      connected_at: new Date().toISOString(),
      connected_by: ctx.userId,
    }, { onConflict: 'firm_id,provider_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to connect integration: ${error.message}`);

  return { data: { integration: data } };
}

export async function disconnectIntegration(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db, params } = ctx;
  const firmId = (params.firmId as string) ?? ctx.firmId;
  const providerId = params.providerId as string;
  const deleteData = params.deleteData as boolean | undefined;

  if (!firmId || !providerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing firmId or providerId' }, status: 400 };
  }

  const { error } = await db
    .from('firm_integrations')
    .update({
      status: 'disconnected',
      access_token: null,
      refresh_token: null,
      disconnected_at: new Date().toISOString(),
    })
    .eq('firm_id', firmId)
    .eq('provider_id', providerId);

  if (error) throw new Error(`Failed to disconnect integration: ${error.message}`);

  return { data: { success: true, dataDeleted: deleteData ?? false } };
}

export async function getIntegrationHealth(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db, params } = ctx;
  const firmId = (params.firmId as string) ?? ctx.firmId;

  if (!firmId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing firmId' }, status: 400 };
  }

  const { data, error } = await db
    .from('integration_health')
    .select('*')
    .eq('firm_id', firmId);

  if (error) throw new Error(`Failed to fetch health: ${error.message}`);

  return { data: { health: data ?? [] } };
}

export async function getSyncLogs(ctx: GatewayContext): Promise<GatewayResponse> {
  const { db, params } = ctx;
  const firmId = (params.firmId as string) ?? ctx.firmId;
  const providerId = params.providerId as string;
  const limit = (params.limit as number) ?? 20;

  if (!firmId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing firmId' }, status: 400 };
  }

  let query = db
    .from('integration_sync_logs')
    .select('*')
    .eq('firm_id', firmId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (providerId) query = query.eq('provider_id', providerId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch sync logs: ${error.message}`);

  return { data: { logs: data ?? [] } };
}
