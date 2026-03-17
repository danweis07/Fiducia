/**
 * Card Provisioning Domain Handlers
 *
 * Gateway handlers for digital card provisioning operations using the
 * CardProvisioningAdapter (Jack Henry or mock).
 *
 * Covers: provisioning config, eligibility checks, push provisioning,
 * digital issuance (view credentials), digital-only cards, and replacements.
 *
 * SECURITY:
 *   - getCardCredentials requires strong authentication (enforced upstream)
 *   - PAN/CVV values are NEVER logged by handlers
 *   - All operations scoped by userId + tenantId
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { CardProvisioningAdapter } from '../../_shared/adapters/card-provisioning/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<CardProvisioningAdapter> {
  const { adapter } = await resolveAdapter<CardProvisioningAdapter>('card_provisioning', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Get provisioning configuration for the tenant */
export async function getProvisioningConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const config = await adapter.getProvisioningConfig({ tenantId: ctx.firmId! });

  return { data: { config } };
}

/** Check if a card is eligible for provisioning to a wallet */
export async function checkProvisioningEligibility(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, walletProvider } = ctx.params as { cardId: string; walletProvider: string };

  if (!cardId || !walletProvider) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId and walletProvider are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const eligibility = await adapter.checkEligibility({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
    walletProvider: walletProvider as never,
  });

  return { data: { eligibility } };
}

/** Initiate push provisioning to a digital wallet */
export async function initiateProvisioning(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, walletProvider, deviceId } = ctx.params as {
    cardId: string; walletProvider: string; deviceId?: string;
  };

  if (!cardId || !walletProvider) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId and walletProvider are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.initiateProvisioning({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
    walletProvider: walletProvider as never,
    deviceId,
  });

  return { data: result };
}

/** Complete provisioning after wallet SDK callback */
export async function completeProvisioning(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { provisioningId, cardId, walletProvider, walletToken } = ctx.params as {
    provisioningId: string; cardId: string; walletProvider: string; walletToken: string;
  };

  if (!provisioningId || !cardId || !walletProvider || !walletToken) {
    return { error: { code: 'VALIDATION_ERROR', message: 'provisioningId, cardId, walletProvider, and walletToken are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.completeProvisioning({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    provisioningId,
    cardId,
    walletProvider: walletProvider as never,
    walletToken,
  });

  return { data: result };
}

/** Get card credentials for digital issuance (view card details) */
export async function getCardCredentials(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId } = ctx.params as { cardId: string };

  if (!cardId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const credentials = await adapter.getCardCredentials({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
  });

  return { data: { credentials } };
}

/** Set temporary expiration date for non-activated card */
export async function setTemporaryExpiration(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId } = ctx.params as { cardId: string };

  if (!cardId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.setTemporaryExpiration({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
  });

  return { data: result };
}

/** Request a digital-only card (no physical plastic) */
export async function requestDigitalOnlyCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId } = ctx.params as { accountId: string };

  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const card = await adapter.requestDigitalOnlyCard({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    accountId,
  });

  return { data: { card } };
}

/** Request physical plastic for an existing digital-only card */
export async function requestPhysicalCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId } = ctx.params as { cardId: string };

  if (!cardId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.requestPhysicalCard({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
  });

  return { data: result };
}

/** Report card lost/stolen and issue replacement */
export async function reportAndReplaceCard(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, reason, digitalOnly } = ctx.params as {
    cardId: string; reason: 'lost' | 'stolen'; digitalOnly?: boolean;
  };

  if (!cardId || !reason) {
    return { error: { code: 'VALIDATION_ERROR', message: 'cardId and reason are required' }, status: 400 };
  }

  if (reason !== 'lost' && reason !== 'stolen') {
    return { error: { code: 'VALIDATION_ERROR', message: 'reason must be "lost" or "stolen"' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.reportAndReplaceCard({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
    reason,
    digitalOnly,
  });

  return { data: result };
}
