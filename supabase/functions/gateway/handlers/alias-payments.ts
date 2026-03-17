/**
 * Alias-First Payments Domain Handlers
 *
 * Gateway handlers for global alias resolution, pay-by-alias,
 * and Request-to-Pay (R2P) operations.
 *
 * All monetary values are integer cents (or minor currency units).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { AliasResolutionAdapter } from '../../_shared/adapters/alias-resolution/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<AliasResolutionAdapter> {
  const { adapter } = await resolveAdapter<AliasResolutionAdapter>('alias_resolution', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Resolve an alias to account details */
export async function resolveAlias(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { aliasType, aliasValue, region } = ctx.params as {
    aliasType: string; aliasValue: string; region?: string;
  };

  if (!aliasType || !aliasValue) {
    return { error: { code: 'INVALID_PARAMS', message: 'aliasType and aliasValue are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.resolveAlias({
    tenantId: ctx.firmId!,
    aliasType: aliasType as never,
    aliasValue,
    region: region as never,
  });
  return { data: result };
}

/** Pay by alias — resolve + send in one step */
export async function payByAlias(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as {
    sourceAccountId: string; aliasType: string; aliasValue: string;
    amountCents: number; currency: string; description: string; idempotencyKey: string;
  };

  if (!params.sourceAccountId || !params.aliasType || !params.aliasValue || !params.amountCents) {
    return { error: { code: 'INVALID_PARAMS', message: 'sourceAccountId, aliasType, aliasValue, and amountCents are required' }, status: 400 };
  }

  if (params.amountCents <= 0) {
    return { error: { code: 'INVALID_PARAMS', message: 'amountCents must be positive' }, status: 400 };
  }

  // Transaction limit validation for alias payments
  const perTxnLimit = 10000000; // $100k per-transaction default
  const dailyLimit = 25000000;  // $250k daily default

  if (params.amountCents > perTxnLimit) {
    return { error: { code: 'LIMIT_EXCEEDED', message: `Amount exceeds per-transaction limit of ${perTxnLimit} cents` }, status: 400 };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: todayPayments } = await ctx.db
    .from('alias_payments')
    .select('amount_cents')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .gte('created_at', todayStart.toISOString())
    .not('status', 'in', '("cancelled","failed")');

  const usedToday = (todayPayments ?? []).reduce((sum: number, p: { amount_cents: number }) => sum + p.amount_cents, 0);
  if (usedToday + params.amountCents > dailyLimit) {
    return { error: { code: 'DAILY_LIMIT_EXCEEDED', message: 'Payment would exceed your daily alias payment limit' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.payByAlias({
    tenantId: ctx.firmId!,
    ...params,
    aliasType: params.aliasType as never,
  });
  return { data: result };
}

/** List inbound Request-to-Pay requests */
export async function listInboundR2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, limit, cursor } = ctx.params as { status?: string; limit?: number; cursor?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listInboundR2P({
    tenantId: ctx.firmId!,
    status: status as never,
    limit,
    cursor,
  });
  return { data: result };
}

/** Respond to an inbound R2P (approve/decline) */
export async function respondToR2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { requestId, action, sourceAccountId } = ctx.params as {
    requestId: string; action: string; sourceAccountId?: string;
  };

  if (!requestId || !action) {
    return { error: { code: 'INVALID_PARAMS', message: 'requestId and action are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.respondToR2P({
    tenantId: ctx.firmId!,
    requestId,
    action: action as 'approve' | 'decline',
    sourceAccountId,
  });
  return { data: result };
}

/** Send a Request-to-Pay (request money from someone) */
export async function sendR2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as {
    sourceAccountId: string; payerAlias: string; payerAliasType: string;
    amountCents: number; currency: string; description: string; expiresAt: string;
  };

  if (!params.sourceAccountId || !params.payerAlias || !params.amountCents) {
    return { error: { code: 'INVALID_PARAMS', message: 'sourceAccountId, payerAlias, and amountCents are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.sendR2P({
    tenantId: ctx.firmId!,
    ...params,
    payerAliasType: params.payerAliasType as never,
  });
  return { data: result };
}

/** List outbound R2P requests */
export async function listOutboundR2P(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, limit, cursor } = ctx.params as { status?: string; limit?: number; cursor?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listOutboundR2P({
    tenantId: ctx.firmId!,
    status: status as never,
    limit,
    cursor,
  });
  return { data: result };
}

/** Get supported alias directories by region */
export async function getSupportedDirectories(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getSupportedDirectories({ tenantId: ctx.firmId! });
  return { data: result };
}
