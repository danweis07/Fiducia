/**
 * Open Banking Consent Management Handlers
 *
 * CFPB Section 1033 compliance — consumer-authorized data sharing.
 * Provides full consent lifecycle: list, grant, revoke, get access logs.
 */

import type { GatewayContext, GatewayResponse } from '../index.ts';

// =============================================================================
// AUTH GUARD
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * List all third-party consents for the authenticated user.
 * Supports filtering by status (active, revoked, expired).
 */
export async function listConsents(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const status = ctx.params.status as string | undefined;
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.supabase
    .from('open_banking_consents')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('consent_granted_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { consents: (rows ?? []).map(toConsent) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

/**
 * Get a single consent by ID.
 */
export async function getConsent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string;
  if (!consentId) return { error: { code: 'INVALID_PARAMS', message: 'consentId required' }, status: 400 };

  const { data: row, error } = await ctx.supabase
    .from('open_banking_consents')
    .select('*')
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .single();

  if (error || !row) return { error: { code: 'NOT_FOUND', message: 'Consent not found' }, status: 404 };

  return { data: { consent: toConsent(row) } };
}

/**
 * Grant a new third-party data access consent.
 */
export async function grantConsent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const providerName = ctx.params.providerName as string;
  const providerId = ctx.params.providerId as string;
  const scopes = ctx.params.scopes as string[];
  const accountIds = ctx.params.accountIds as string[] | undefined;
  const expiresInDays = ctx.params.expiresInDays as number | undefined;

  if (!providerName || !providerId || !scopes?.length) {
    return { error: { code: 'INVALID_PARAMS', message: 'providerName, providerId, and scopes required' }, status: 400 };
  }

  const now = new Date();
  const expiresAt = expiresInDays
    ? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const { data: row, error } = await ctx.supabase
    .from('open_banking_consents')
    .insert({
      tenant_id: ctx.firmId,
      user_id: ctx.userId,
      provider_name: providerName,
      provider_id: providerId,
      provider_logo: (ctx.params.providerLogo as string) ?? null,
      provider_url: (ctx.params.providerUrl as string) ?? null,
      scopes,
      account_ids: accountIds ?? [],
      consent_expires_at: expiresAt,
      access_frequency: (ctx.params.accessFrequency as string) ?? 'on_demand',
      connection_id: (ctx.params.connectionId as string) ?? null,
      metadata: (ctx.params.metadata as Record<string, unknown>) ?? {},
    })
    .select()
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'openBanking.consent.grant',
      success: true,
      ip_address: null,
      created_at: now.toISOString(),
    })
    .then(() => {});

  return { data: { consent: toConsent(row) } };
}

/**
 * Revoke an active consent — one-click disconnect per CFPB 1033.
 */
export async function revokeConsent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string;
  if (!consentId) return { error: { code: 'INVALID_PARAMS', message: 'consentId required' }, status: 400 };

  const now = new Date().toISOString();

  const { data: row, error } = await ctx.supabase
    .from('open_banking_consents')
    .update({
      status: 'revoked',
      consent_revoked_at: now,
      updated_at: now,
    })
    .eq('id', consentId)
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .eq('status', 'active')
    .select()
    .single();

  if (error || !row) {
    return { error: { code: 'NOT_FOUND', message: 'Active consent not found' }, status: 404 };
  }

  const revokedRow = row as Record<string, unknown>;

  // CFPB 1033.421(d): Notify the third-party provider that consent has been revoked.
  // Fire-and-forget webhook — revocation is effective immediately regardless of delivery.
  notifyProviderRevocation(ctx, {
    consentId,
    providerId: revokedRow.provider_id as string,
    providerUrl: revokedRow.provider_url as string | null,
    scopes: revokedRow.scopes as string[],
    revokedAt: now,
  });

  // Audit log: fire-and-forget
  ctx.supabase
    .from('audit_logs')
    .insert({
      user_id: ctx.userId,
      firm_id: ctx.firmId,
      action: 'openBanking.consent.revoke',
      success: true,
      ip_address: null,
      created_at: now,
    })
    .then(() => {});

  return { data: { consent: toConsent(row) } };
}

/**
 * List access logs for a specific consent (or all consents).
 */
export async function listAccessLogs(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const consentId = ctx.params.consentId as string | undefined;
  const limit = (ctx.params.limit as number) ?? 50;
  const offset = (ctx.params.offset as number) ?? 0;

  let query = ctx.supabase
    .from('open_banking_access_logs')
    .select('*', { count: 'exact' })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .order('accessed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (consentId) {
    query = query.eq('consent_id', consentId);
  }

  const { data: rows, error, count } = await query;
  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  return {
    data: { accessLogs: (rows ?? []).map(toAccessLog) },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: (count ?? 0) > offset + limit,
      },
    },
  };
}

/**
 * Get a summary of open banking consent activity.
 */
export async function getConsentSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: consents, error } = await ctx.supabase
    .from('open_banking_consents')
    .select('status')
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const rows = consents ?? [];
  const active = rows.filter(r => r.status === 'active').length;
  const revoked = rows.filter(r => r.status === 'revoked').length;
  const expired = rows.filter(r => r.status === 'expired').length;

  // Count recent access (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recentAccessCount } = await ctx.supabase
    .from('open_banking_access_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .eq('tenant_id', ctx.firmId)
    .gte('accessed_at', thirtyDaysAgo);

  return {
    data: {
      summary: {
        totalConsents: rows.length,
        activeConsents: active,
        revokedConsents: revoked,
        expiredConsents: expired,
        recentAccessCount: recentAccessCount ?? 0,
      },
    },
  };
}

// =============================================================================
// CONSENT REVOCATION WEBHOOK (CFPB 1033.421(d))
// =============================================================================

interface RevocationNotification {
  consentId: string;
  providerId: string;
  providerUrl: string | null;
  scopes: string[];
  revokedAt: string;
}

/**
 * Notify the third-party data recipient that consent has been revoked.
 * CFPB 1033.421(d) requires data providers to notify authorized third parties
 * when a consumer revokes data access authorization.
 *
 * Fire-and-forget: revocation is effective immediately. Webhook delivery is
 * recorded in open_banking_revocation_webhooks for retry/audit.
 */
function notifyProviderRevocation(ctx: GatewayContext, notification: RevocationNotification): void {
  // Look up the provider's registered webhook URL
  const sendWebhook = async () => {
    // Check for a registered revocation webhook URL for this provider
    const { data: provider } = await ctx.supabase
      .from('open_banking_providers')
      .select('revocation_webhook_url')
      .eq('provider_id', notification.providerId)
      .eq('tenant_id', ctx.firmId)
      .single();

    const webhookUrl = (provider as Record<string, unknown> | null)?.revocation_webhook_url as string | null;
    if (!webhookUrl) return; // Provider has no registered webhook

    const payload = {
      event: 'consent.revoked',
      consentId: notification.consentId,
      providerId: notification.providerId,
      scopes: notification.scopes,
      revokedAt: notification.revokedAt,
      tenantId: ctx.firmId,
    };

    // Record the webhook attempt
    const { data: record } = await ctx.supabase
      .from('open_banking_revocation_webhooks')
      .insert({
        tenant_id: ctx.firmId,
        consent_id: notification.consentId,
        provider_id: notification.providerId,
        webhook_url: webhookUrl,
        payload,
        status: 'pending',
      })
      .select('id')
      .single();

    const webhookId = (record as Record<string, unknown> | null)?.id;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'consent.revoked',
          'X-Consent-Id': notification.consentId,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000), // 10s timeout
      });

      const status = response.ok ? 'delivered' : 'failed';
      if (webhookId) {
        await ctx.supabase
          .from('open_banking_revocation_webhooks')
          .update({ status, response_code: response.status, delivered_at: new Date().toISOString() })
          .eq('id', webhookId);
      }
    } catch {
      // Delivery failed — will be retried by background job
      if (webhookId) {
        await ctx.supabase
          .from('open_banking_revocation_webhooks')
          .update({ status: 'failed', attempts: 1 })
          .eq('id', webhookId);
      }
    }
  };

  // Fire and forget — don't block the revocation response
  sendWebhook().catch(() => {});
}

// =============================================================================
// ROW MAPPERS
// =============================================================================

function toConsent(row: Record<string, unknown>) {
  return {
    id: row.id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    providerLogo: row.provider_logo ?? null,
    providerUrl: row.provider_url ?? null,
    status: row.status,
    scopes: row.scopes ?? [],
    accountIds: row.account_ids ?? [],
    consentGrantedAt: row.consent_granted_at,
    consentExpiresAt: row.consent_expires_at ?? null,
    consentRevokedAt: row.consent_revoked_at ?? null,
    lastAccessedAt: row.last_accessed_at ?? null,
    accessFrequency: row.access_frequency ?? 'on_demand',
    connectionId: row.connection_id ?? null,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAccessLog(row: Record<string, unknown>) {
  return {
    id: row.id,
    consentId: row.consent_id,
    providerId: row.provider_id,
    providerName: row.provider_name,
    scope: row.scope,
    endpoint: row.endpoint,
    requestId: row.request_id ?? null,
    ipAddress: row.ip_address ?? null,
    responseCode: row.response_code ?? null,
    dataPoints: row.data_points ?? 0,
    accessedAt: row.accessed_at,
  };
}
