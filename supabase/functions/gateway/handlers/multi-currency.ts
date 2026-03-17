/**
 * Multi-Currency & Regulatory Transparency Domain Handlers
 *
 * Gateway handlers for multi-currency pots, vIBAN management,
 * FX swaps, safeguarding info, tax withholding, and carbon tracking.
 *
 * All monetary values are integer cents (or minor currency units).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { MultiCurrencyAdapter } from '../../_shared/adapters/multi-currency/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<MultiCurrencyAdapter> {
  const { adapter } = await resolveAdapter<MultiCurrencyAdapter>('multi_currency', tenantId);
  return adapter;
}

// =============================================================================
// CURRENCY POTS
// =============================================================================

export async function listCurrencyPots(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status } = ctx.params as { status?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listPots({ tenantId: ctx.firmId!, status: status as never });
  return { data: result };
}

export async function createCurrencyPot(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { currency, initialDepositCents, sourceAccountId } = ctx.params as {
    currency: string; initialDepositCents?: number; sourceAccountId?: string;
  };

  if (!currency) {
    return { error: { code: 'INVALID_PARAMS', message: 'currency is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createPot({ tenantId: ctx.firmId!, currency, initialDepositCents, sourceAccountId });
  return { data: result };
}

export async function getCurrencyPot(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { potId } = ctx.params as { potId: string };
  if (!potId) {
    return { error: { code: 'INVALID_PARAMS', message: 'potId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getPot({ tenantId: ctx.firmId!, potId });
  return { data: result };
}

export async function closeCurrencyPot(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { potId, transferToPotId } = ctx.params as { potId: string; transferToPotId: string };
  if (!potId || !transferToPotId) {
    return { error: { code: 'INVALID_PARAMS', message: 'potId and transferToPotId are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.closePot({ tenantId: ctx.firmId!, potId, transferToPotId });
  return { data: result };
}

// =============================================================================
// vIBANs
// =============================================================================

export async function generateVIBAN(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { potId, country } = ctx.params as { potId: string; country: string };
  if (!potId || !country) {
    return { error: { code: 'INVALID_PARAMS', message: 'potId and country are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.generateVIBAN({ tenantId: ctx.firmId!, potId, country });
  return { data: result };
}

// =============================================================================
// FX SWAPS
// =============================================================================

export async function getSwapQuote(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromPotId, toPotId, fromAmountCents } = ctx.params as {
    fromPotId: string; toPotId: string; fromAmountCents: number;
  };

  if (!fromPotId || !toPotId || !fromAmountCents) {
    return { error: { code: 'INVALID_PARAMS', message: 'fromPotId, toPotId, and fromAmountCents are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getSwapQuote({ tenantId: ctx.firmId!, fromPotId, toPotId, fromAmountCents });
  return { data: result };
}

export async function executeSwap(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as {
    quoteId: string; fromPotId: string; toPotId: string;
    fromAmountCents: number; idempotencyKey: string;
  };

  if (!params.quoteId || !params.fromPotId || !params.toPotId) {
    return { error: { code: 'INVALID_PARAMS', message: 'quoteId, fromPotId, and toPotId are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.executeSwap({ tenantId: ctx.firmId!, ...params });
  return { data: result };
}

export async function listSwaps(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { potId, limit, cursor } = ctx.params as { potId?: string; limit?: number; cursor?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listSwaps({ tenantId: ctx.firmId!, potId, limit, cursor });
  return { data: result };
}

// =============================================================================
// REGULATORY TRANSPARENCY
// =============================================================================

export async function getSafeguardingInfo(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country } = ctx.params as { country?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getSafeguarding({ tenantId: ctx.firmId!, country });
  return { data: result };
}

export async function listInterestWithholding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, year, currency } = ctx.params as { accountId?: string; year?: number; currency?: string };
  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listWithholding({ tenantId: ctx.firmId!, accountId, year, currency });
  return { data: result };
}

export async function getCarbonFootprint(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { transactionId } = ctx.params as { transactionId: string };
  if (!transactionId) {
    return { error: { code: 'INVALID_PARAMS', message: 'transactionId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getCarbonFootprint({ tenantId: ctx.firmId!, transactionId });
  return { data: result };
}

export async function getCarbonSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { periodStart, periodEnd } = ctx.params as { periodStart: string; periodEnd: string };
  if (!periodStart || !periodEnd) {
    return { error: { code: 'INVALID_PARAMS', message: 'periodStart and periodEnd are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getCarbonSummary({ tenantId: ctx.firmId!, periodStart, periodEnd });
  return { data: result };
}
