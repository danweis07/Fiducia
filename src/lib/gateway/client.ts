/**
 * Gateway API Client — Core transport layer
 *
 * Provides the `callGateway` function, error class, and shared types
 * used by all domain modules.
 *
 * Includes client-side throttling and circuit breaker for resilience.
 */

import { getBackend } from "@/lib/backend";
import { isDemoMode } from "@/lib/demo";
import { GatewayThrottle, extractDomain, DEFAULT_RATE_LIMIT } from "./throttle";
import { CircuitBreakerRegistry } from "./circuit-breaker";
import type { RateLimitConfig } from "@/types/tenant";

// =============================================================================
// CORE TYPES
// =============================================================================

export interface GatewayError {
  code: string;
  message: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface _GatewayRawResponse {
  data?: unknown;
  error?: GatewayError;
  meta?: { pagination?: Pagination };
}

export class GatewayApiError extends Error {
  code: string;
  status?: number;

  constructor(error: GatewayError, status?: number) {
    super(error.message);
    this.name = "GatewayApiError";
    this.code = error.code;
    this.status = status;
  }
}

// =============================================================================
// THROTTLE & CIRCUIT BREAKER INSTANCES
// =============================================================================

const throttle = new GatewayThrottle(DEFAULT_RATE_LIMIT);
const circuitBreaker = new CircuitBreakerRegistry();

/** Update the throttle configuration (e.g., when tenant config loads) */
export function updateGatewayRateLimits(config: RateLimitConfig): void {
  throttle.updateConfig(config);
}

/** Reset circuit breaker state — used in tests and after tenant switch */
export function resetCircuitBreakers(): void {
  circuitBreaker.resetAll();
}

// =============================================================================
// CALL GATEWAY FUNCTION
// =============================================================================

export async function callGateway<T>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  if (isDemoMode()) {
    const { getDemoResponse } = await import("../demo-data");
    return getDemoResponse(action, params) as T;
  }

  const domain = extractDomain(action);

  // Circuit breaker check — fail fast if domain is in open state
  circuitBreaker.checkDomain(domain);

  // Throttle — wait for a rate limit slot
  await throttle.waitForSlot(domain);

  try {
    const backend = getBackend();
    const response = await backend.gateway.invoke(action, params);

    if (response.error) {
      circuitBreaker.recordFailure(domain);
      throw new GatewayApiError(response.error);
    }

    circuitBreaker.recordSuccess(domain);

    const result = response.data as T;
    if (response.meta?.pagination && typeof result === "object" && result !== null) {
      (result as Record<string, unknown>)._pagination = response.meta.pagination;
    }

    return result;
  } catch (err) {
    if (err instanceof GatewayApiError) throw err;
    circuitBreaker.recordFailure(domain);
    throw err;
  }
}

/** Type signature for callGateway, used by domain creator functions */
export type CallGatewayFn = typeof callGateway;
