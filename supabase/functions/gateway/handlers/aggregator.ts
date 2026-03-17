/**
 * Data Aggregator Domain Handlers
 *
 * Gateway handlers for multi-bank data aggregation powered by the
 * AggregatorAdapter (Salt Edge, Akoya, or mock).
 *
 * Provides institution search, connection management, and aggregated
 * account/transaction retrieval for the Net Worth Tracker and
 * Open Banking (Section 1033) features.
 *
 * All monetary values are integer cents.
 * Account numbers are always masked (last 4 only).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { AggregatorAdapter } from '../../_shared/adapters/aggregator/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<AggregatorAdapter> {
  const { adapter } = await resolveAdapter<AggregatorAdapter>('aggregator', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Search for financial institutions available to connect */
export async function searchAggregatorInstitutions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { query, countryCode, limit } = ctx.params as {
    query?: string; countryCode?: string; limit?: number;
  };

  if (!query) {
    return { error: { code: 'VALIDATION_ERROR', message: 'query is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.searchInstitutions({ query, countryCode, limit });

  return { data: result };
}

/** Initiate a connection to an external institution */
export async function createAggregatorConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { institutionId, redirectUrl, scopes } = ctx.params as {
    institutionId?: string; redirectUrl?: string; scopes?: string[];
  };

  if (!institutionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'institutionId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createConnection({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    institutionId,
    redirectUrl,
    scopes,
  });

  return { data: result };
}

/** Handle the callback after user authorizes at the institution */
export async function handleAggregatorCallback(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { connectionId, callbackParams } = ctx.params as {
    connectionId?: string; callbackParams?: Record<string, string>;
  };

  if (!connectionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.handleCallback({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    connectionId,
    callbackParams: callbackParams ?? {},
  });

  return { data: result };
}

/** List all active aggregator connections for the user */
export async function listAggregatorConnections(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listConnections({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Refresh/re-sync data for a connection */
export async function refreshAggregatorConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { connectionId } = ctx.params as { connectionId?: string };

  if (!connectionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.refreshConnection({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    connectionId,
  });

  return { data: result };
}

/** Remove/disconnect an aggregator connection */
export async function removeAggregatorConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { connectionId } = ctx.params as { connectionId?: string };

  if (!connectionId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'connectionId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.removeConnection({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    connectionId,
  });

  return { data: result };
}

/** List aggregated accounts across all connections */
export async function listAggregatedAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { connectionId } = ctx.params as { connectionId?: string };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listAccounts({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    connectionId,
  });

  return { data: result };
}

/** List transactions for an aggregated account */
export async function listAggregatedTransactions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId, fromDate, toDate, limit, offset } = ctx.params as {
    accountId?: string; fromDate?: string; toDate?: string; limit?: number; offset?: number;
  };

  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listTransactions({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    accountId,
    fromDate,
    toDate,
    limit,
    offset,
  });

  return { data: result };
}
