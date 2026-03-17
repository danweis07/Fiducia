/**
 * Health Check Handler
 *
 * Returns system health status by probing database connectivity and auth.
 * Designed to never throw — if a subsystem is down, the response degrades
 * gracefully instead of crashing the gateway.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// TYPES
// =============================================================================

type CheckStatus = 'pass' | 'fail';
type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

interface HealthCheck {
  name: string;
  status: CheckStatus;
  latencyMs: number;
  error?: string;
}

// =============================================================================
// VERSION
// =============================================================================

const GATEWAY_VERSION = '1.0.0';

// =============================================================================
// INDIVIDUAL CHECKS
// =============================================================================

/**
 * Database connectivity check — executes `select 1` to verify the
 * Supabase PostgreSQL connection is alive.
 */
async function checkDatabase(ctx: GatewayContext): Promise<HealthCheck> {
  const start = performance.now();
  try {
    // Simple select to verify DB connectivity (equivalent to `select 1`)
    const { error } = await ctx.db
      .from('properties')
      .select('id')
      .limit(1);

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        name: 'database',
        status: 'fail',
        latencyMs,
        error: error.message,
      };
    }

    return { name: 'database', status: 'pass', latencyMs };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : 'Unknown database error';
    return { name: 'database', status: 'fail', latencyMs, error: message };
  }
}

/**
 * Auth service check — verifies the auth subsystem is responsive
 * by attempting to read the current session. This does not require
 * a valid session; it only checks that the auth service responds.
 */
async function checkAuth(ctx: GatewayContext): Promise<HealthCheck> {
  const start = performance.now();
  try {
    // Uses raw Supabase client for auth health check (admin API not in AuthPort)
    const { error } = await ctx.supabase.auth.getSession();
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return {
        name: 'auth',
        status: 'fail',
        latencyMs,
        error: error.message,
      };
    }

    return { name: 'auth', status: 'pass', latencyMs };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : 'Unknown auth error';
    return { name: 'auth', status: 'fail', latencyMs, error: message };
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

/**
 * Health check handler.
 *
 * Does NOT require authentication — health endpoints should be accessible
 * to load balancers, monitoring tools, and ops dashboards.
 */
export async function healthCheck(ctx: GatewayContext): Promise<GatewayResponse> {
  // Run all checks concurrently
  const checks = await Promise.all([
    checkDatabase(ctx),
    checkAuth(ctx),
  ]);

  // Determine overall status
  const failedCount = checks.filter((c) => c.status === 'fail').length;
  let status: OverallStatus;

  if (failedCount === 0) {
    status = 'healthy';
  } else if (failedCount < checks.length) {
    status = 'degraded';
  } else {
    status = 'unhealthy';
  }

  return {
    data: {
      status,
      timestamp: new Date().toISOString(),
      version: GATEWAY_VERSION,
      checks,
    },
  };
}
