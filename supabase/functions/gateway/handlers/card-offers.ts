/**
 * Card-Linked Offers Domain Handlers
 *
 * Gateway handlers for card-linked offer (CLO) operations using the
 * CardOffersAdapter (Cardlytics or mock).
 *
 * Covers: offer listing, activation, deactivation, redemption history,
 * and offer summaries for dashboard widgets.
 *
 * All monetary values are integer cents.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { CardOffersAdapter } from '../../_shared/adapters/card-offers/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<CardOffersAdapter> {
  const { adapter } = await resolveAdapter<CardOffersAdapter>('card_offers', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** List available offers for a user (with optional geo-filtering) */
export async function listOffers(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { cardId, status, category, latitude, longitude, radiusMiles, limit, offset } = ctx.params as {
    cardId?: string; status?: string; category?: string;
    latitude?: number; longitude?: number; radiusMiles?: number;
    limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listOffers({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    cardId,
    status: status as never,
    category,
    latitude,
    longitude,
    radiusMiles,
    limit: limit ?? 20,
    offset: offset ?? 0,
  });

  return {
    data: {
      offers: result.offers,
      nearbyOffers: result.nearbyOffers,
    },
    meta: {
      pagination: {
        total: result.totalCount,
        limit: limit ?? 20,
        offset: offset ?? 0,
        hasMore: (offset ?? 0) + (limit ?? 20) < result.totalCount,
      },
    },
  };
}

/** Activate an offer (opt-in / link to card) */
export async function activateOffer(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { offerId, cardId } = ctx.params as { offerId: string; cardId: string };

  if (!offerId || !cardId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'offerId and cardId are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.activateOffer({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    offerId,
    cardId,
  });

  return { data: result };
}

/** Deactivate an offer */
export async function deactivateOffer(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { offerId } = ctx.params as { offerId: string };

  if (!offerId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'offerId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  await adapter.deactivateOffer({
    userId: ctx.userId!,
    offerId,
  });

  return { data: { success: true } };
}

/** List offer redemptions/rewards history */
export async function listRedemptions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromDate, toDate, limit } = ctx.params as {
    fromDate?: string; toDate?: string; limit?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listRedemptions({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    fromDate,
    toDate,
    limit: limit ?? 50,
  });

  return { data: result };
}

/** Get offer summary for dashboard widgets */
export async function getOfferSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getOfferSummary({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}
