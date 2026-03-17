/**
 * Gateway Cache Configuration — Tenant-Configurable TTLs
 *
 * Resolves stale-time for TanStack Query hooks based on domain
 * and tenant-level cache policy. Falls back to sensible defaults
 * for banking operations.
 */

import type { CachePolicy } from "@/types/tenant";

/** Default cache policy when none is configured by the tenant */
export const DEFAULT_CACHE_POLICY: CachePolicy = {
  defaultStaleTimeMs: 5 * 60 * 1000, // 5 minutes
  domainOverrides: {
    // Frequently changing data — shorter TTL
    transactions: 60 * 1000, // 1 minute
    notifications: 60 * 1000, // 1 minute
    // Moderately stable data
    accounts: 2 * 60 * 1000, // 2 minutes
    cards: 2 * 60 * 1000, // 2 minutes
    // Stable data — longer TTL
    member: 10 * 60 * 1000, // 10 minutes
    content: 15 * 60 * 1000, // 15 minutes
    compliance: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Get the stale time for a given gateway domain.
 *
 * Resolution order:
 * 1. Tenant-level domain override
 * 2. Tenant-level default
 * 3. Built-in domain default
 * 4. Built-in global default (5 minutes)
 */
export function getStaleTime(domain: string, tenantPolicy?: CachePolicy | null): number {
  // 1. Tenant-level domain override
  if (tenantPolicy?.domainOverrides?.[domain] !== undefined) {
    return tenantPolicy.domainOverrides[domain];
  }

  // 2. Tenant-level default
  if (tenantPolicy?.defaultStaleTimeMs !== undefined) {
    // But check built-in domain override first
    const builtIn = DEFAULT_CACHE_POLICY.domainOverrides?.[domain];
    if (builtIn !== undefined) {
      return builtIn;
    }
    return tenantPolicy.defaultStaleTimeMs;
  }

  // 3. Built-in domain default
  const builtIn = DEFAULT_CACHE_POLICY.domainOverrides?.[domain];
  if (builtIn !== undefined) {
    return builtIn;
  }

  // 4. Global default
  return DEFAULT_CACHE_POLICY.defaultStaleTimeMs;
}
