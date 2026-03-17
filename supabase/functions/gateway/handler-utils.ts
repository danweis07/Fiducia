/**
 * Shared Handler Utilities
 *
 * Common helpers used across gateway handlers. Extracted to avoid
 * duplication of requireAuth() and paginate() in every handler file.
 */
import type { GatewayContext, GatewayResponse, Pagination } from './core.ts';

/** Returns an error response if the user is not authenticated, or null to continue. */
export function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

/** Builds a pagination metadata object from query results. */
export function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}
