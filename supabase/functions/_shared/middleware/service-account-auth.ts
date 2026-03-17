/**
 * Service Account Authentication Middleware
 *
 * Provides machine-identity authentication for autonomous AI agents.
 * Service accounts authenticate with API keys (via X-Service-Key header)
 * and are scoped to specific gateway actions per tenant.
 *
 * This layer sits alongside user auth — requests are either user-authenticated
 * (Bearer token) or service-authenticated (X-Service-Key), never both.
 */

import { type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { CachePort } from '../platform/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceAccountContext {
  /** Service account UUID */
  serviceAccountId: string;
  /** Tenant (firm) the service account belongs to */
  tenantId: string;
  /** Human-readable name */
  name: string;
  /** Gateway actions this account is permitted to invoke */
  allowedActions: string[];
  /** Maximum invocations per hour */
  rateLimitPerHour: number;
}

interface ServiceAccountRow {
  id: string;
  tenant_id: string;
  name: string;
  api_key_hash: string;
  status: string;
  allowed_actions: string[];
  rate_limit_per_hour: number;
  ip_allowlist: string[];
}

// =============================================================================
// HOURLY RATE TRACKING — Redis-backed with database fallback
// =============================================================================

/**
 * Check hourly rate limit for a service account.
 *
 * When a CachePort (Redis) is available, uses INCR + EXPIRE for a distributed
 * counter shared across all serverless instances and surviving cold starts.
 * Falls back to database-backed counters (via Supabase) when Redis is not
 * configured, ensuring rate limits are enforced across cold starts and
 * multiple serverless instances.
 */
async function checkHourlyRate(
  accountId: string,
  limit: number,
  cache?: CachePort,
  supabase?: SupabaseClient,
): Promise<boolean> {
  if (limit <= 0) return true; // unlimited

  if (cache) {
    try {
      return await checkHourlyRateRedis(accountId, limit, cache);
    } catch (err) {
      console.error('[service-account-rate] Redis error, falling back to database:', (err as Error).message);
    }
  }

  if (supabase) {
    try {
      return await checkHourlyRateDb(accountId, limit, supabase);
    } catch (err) {
      console.error('[service-account-rate] Database rate-limit error:', (err as Error).message);
      // Fail open — allow the request but log the error so operators can investigate
      return true;
    }
  }

  // No cache or database available — fail open with a warning
  console.warn('[service-account-rate] No rate-limit backend available; allowing request');
  return true;
}

// --- Redis implementation ---

async function checkHourlyRateRedis(
  accountId: string,
  limit: number,
  cache: CachePort,
): Promise<boolean> {
  const key = `sa_rl:${accountId}`;
  const count = await cache.incr(key);

  // Set TTL on first increment (new key)
  if (count === 1) {
    await cache.expire(key, 3600);
  }

  return count <= limit;
}

// --- Database fallback (Supabase) ---

/**
 * Database-backed rate limiting using the service_account_rate_limits table.
 *
 * Uses an upsert with a window_start timestamp truncated to the current hour.
 * This ensures counters are shared across all serverless instances and survive
 * cold starts, unlike in-memory Maps.
 *
 * Expected table schema:
 *   service_account_rate_limits (
 *     account_id UUID REFERENCES service_accounts(id),
 *     window_start TIMESTAMPTZ,  -- truncated to hour
 *     request_count INT DEFAULT 1,
 *     PRIMARY KEY (account_id, window_start)
 *   )
 */
async function checkHourlyRateDb(
  accountId: string,
  limit: number,
  supabase: SupabaseClient,
): Promise<boolean> {
  // Truncate current time to the hour boundary
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const windowStart = now.toISOString();

  // Attempt to increment the counter via RPC for atomicity
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_account_id: accountId,
    p_window_start: windowStart,
    p_limit: limit,
  });

  if (error) {
    // If the RPC doesn't exist yet, fall back to a select+upsert approach
    if (error.message?.includes('function') || error.code === '42883') {
      return await checkHourlyRateDbFallback(accountId, limit, windowStart, supabase);
    }
    throw error;
  }

  // RPC returns the current count; check against limit
  return (data as number) <= limit;
}

async function checkHourlyRateDbFallback(
  accountId: string,
  limit: number,
  windowStart: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  // Read current count
  const { data: existing } = await supabase
    .from('service_account_rate_limits')
    .select('request_count')
    .eq('account_id', accountId)
    .eq('window_start', windowStart)
    .maybeSingle();

  const currentCount = existing?.request_count ?? 0;
  if (currentCount >= limit) return false;

  // Upsert with incremented count
  await supabase
    .from('service_account_rate_limits')
    .upsert(
      {
        account_id: accountId,
        window_start: windowStart,
        request_count: currentCount + 1,
      },
      { onConflict: 'account_id,window_start' },
    );

  return true;
}

// =============================================================================
// KEY VERIFICATION
// =============================================================================

/**
 * Verify an API key against a bcrypt hash using the Web Crypto API.
 *
 * Since Deno edge functions don't always have bcrypt available,
 * we use a SHA-256 hash comparison. The api_key_hash column stores
 * SHA-256(key) in hex. This is acceptable because the keys are
 * high-entropy random strings (not passwords).
 */
async function verifyApiKey(rawKey: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}

/**
 * Hash an API key for storage.
 */
export async function hashApiKey(rawKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a new service account API key.
 * Format: fsa_<random_hex> (fiducia service account)
 */
export function generateServiceAccountKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `fsa_${hex}`;
}

// =============================================================================
// AUTH EXTRACTION
// =============================================================================

/**
 * Extract and validate a service account from the request.
 * Returns null if no service key header is present.
 * Throws on invalid/expired/rate-limited keys.
 *
 * @param cache - Optional CachePort (Redis) for distributed rate limiting.
 *                Falls back to database-backed counters when not provided.
 */
export async function extractServiceAccount(
  req: Request,
  supabase: SupabaseClient,
  cache?: CachePort,
): Promise<ServiceAccountContext | null> {
  const serviceKey = req.headers.get('x-service-key');
  if (!serviceKey) return null;

  if (!serviceKey.startsWith('fsa_')) {
    throw new ServiceAccountError('INVALID_KEY', 'Invalid service account key format');
  }

  // Look up all active service accounts and verify key
  // In production, you'd index by key prefix/suffix for faster lookup
  const suffix = serviceKey.slice(-4);

  const { data: accounts, error } = await supabase
    .from('service_accounts')
    .select('id, tenant_id, name, api_key_hash, status, allowed_actions, rate_limit_per_hour, ip_allowlist')
    .eq('api_key_suffix', suffix)
    .eq('status', 'active');

  if (error || !accounts || accounts.length === 0) {
    throw new ServiceAccountError('INVALID_KEY', 'Service account key not found or inactive');
  }

  // Verify the full key against each candidate
  let matched: ServiceAccountRow | null = null;
  for (const account of accounts as ServiceAccountRow[]) {
    const valid = await verifyApiKey(serviceKey, account.api_key_hash);
    if (valid) {
      matched = account;
      break;
    }
  }

  if (!matched) {
    throw new ServiceAccountError('INVALID_KEY', 'Service account key verification failed');
  }

  // IP allowlist check
  if (matched.ip_allowlist.length > 0) {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '';
    if (clientIp && !matched.ip_allowlist.includes(clientIp)) {
      throw new ServiceAccountError('IP_BLOCKED', 'Request IP not in service account allowlist');
    }
  }

  // Hourly rate limit check (Redis-backed when available, database fallback)
  if (!(await checkHourlyRate(matched.id, matched.rate_limit_per_hour, cache, supabase))) {
    throw new ServiceAccountError('RATE_LIMITED', 'Service account hourly rate limit exceeded');
  }

  // Update last_used_at and increment invocations (fire-and-forget)
  supabase
    .from('service_accounts')
    .update({ last_used_at: new Date().toISOString(), total_invocations: matched.id })
    .eq('id', matched.id)
    .then(() => {});

  // Increment total_invocations via RPC or raw SQL would be better,
  // but for simplicity we just update last_used_at here.

  return {
    serviceAccountId: matched.id,
    tenantId: matched.tenant_id,
    name: matched.name,
    allowedActions: matched.allowed_actions,
    rateLimitPerHour: matched.rate_limit_per_hour,
  };
}

/**
 * Check if a service account is permitted to invoke a specific action.
 * Supports glob patterns: 'cards.*' matches 'cards.lock', 'cards.unlock', etc.
 */
export function isActionAllowed(allowedActions: string[], action: string): boolean {
  for (const pattern of allowedActions) {
    if (pattern === '*') return true;
    if (pattern === action) return true;

    // Glob matching: 'cards.*' → matches anything starting with 'cards.'
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -1); // 'cards.'
      if (action.startsWith(prefix)) return true;
    }
  }
  return false;
}

// =============================================================================
// ERROR CLASS
// =============================================================================

export class ServiceAccountError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'ServiceAccountError';
    this.code = code;
  }
}
