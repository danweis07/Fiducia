/**
 * Location Domain Handlers
 *
 * Gateway handlers for ATM / branch locator.
 * Uses the adapter pattern so the provider is swappable per tenant
 * (mock, CO-OP Network, Allpoint, or a direct DB table).
 *
 * IMPORTANT:
 * - All data is scoped by ctx.firmId for tenant isolation.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { LocationAdapter, LocationType } from '../../_shared/adapters/locations/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

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
// HANDLERS
// =============================================================================

/**
 * Search for ATMs and branches near a coordinate.
 *
 * Params:
 *   latitude     — decimal degrees (-90..90)
 *   longitude    — decimal degrees (-180..180)
 *   radiusMiles  — search radius (default 25)
 *   type         — optional filter: 'atm' | 'branch' | 'shared_branch'
 *   limit        — pagination limit (default 20)
 *   offset       — pagination offset (default 0)
 */
export async function searchLocations(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    latitude,
    longitude,
    radiusMiles = 25,
    type,
    limit = 20,
    offset = 0,
  } = ctx.params;

  try {
    const { adapter } = await resolveAdapter<LocationAdapter>('locations', ctx.firmId);

    const result = await adapter.search({
      tenantId: ctx.firmId!,
      latitude: latitude as number,
      longitude: longitude as number,
      radiusMiles: radiusMiles as number,
      type: type as LocationType | undefined,
      limit: limit as number,
      offset: offset as number,
    });

    return {
      data: { locations: result.locations },
      meta: { pagination: paginate(result.total, limit as number, offset as number) },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to search locations';
    console.error(`[locations.search] Error for firm=${ctx.firmId}: ${message}`);
    return {
      error: { code: 'LOCATION_SEARCH_FAILED', message },
      status: 500,
    };
  }
}
