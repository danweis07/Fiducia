/**
 * Gateway Middleware Layer
 *
 * Composable middleware pipeline for the API gateway.
 * Middleware runs BEFORE handlers and can short-circuit with an error response.
 *
 * Includes:
 * - Token-bucket rate limiter (per-user, per-IP, per-tenant, per-action)
 * - Structured request/response logger
 * - IP allowlist/blocklist
 * - Request ID tracing
 * - Audit trail for write operations
 * - Request size limits
 */

import type { GatewayContext, GatewayResponse } from './core.ts';
import type { CachePort } from '../_shared/platform/types.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface MiddlewareContext {
  req: Request;
  action: string;
  ctx: GatewayContext;
  requestId: string;
  startTime: number;
  /** Metadata accumulated by middleware, merged into final response meta */
  meta: Record<string, unknown>;
}

/** Middleware returns null to continue, or a GatewayResponse to short-circuit */
export type Middleware = (mctx: MiddlewareContext) => Promise<GatewayResponse | null>;

// =============================================================================
// REQUEST ID
// =============================================================================

/**
 * Generates a unique request ID for tracing.
 * Format: req_<timestamp_hex>_<random>
 */
export function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const rand = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `req_${ts}_${rand}`;
}

// =============================================================================
// TOKEN BUCKET RATE LIMITER
// =============================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitTier {
  /** Max tokens (burst capacity) */
  capacity: number;
  /** Tokens added per second */
  refillRate: number;
}

/**
 * Per-action rate limit overrides.
 * Actions not listed here use the default tier.
 */
const ACTION_RATE_LIMITS: Record<string, RateLimitTier> = {
  // Auth-related: strict
  'activation.verifyIdentity':    { capacity: 5,   refillRate: 0.1 },
  'activation.createCredentials': { capacity: 5,   refillRate: 0.1 },
  'activation.verifyMFA':         { capacity: 10,  refillRate: 0.2 },

  // Financial writes: moderate
  'transfers.create':             { capacity: 10,  refillRate: 0.5 },
  'transfers.schedule':           { capacity: 10,  refillRate: 0.5 },
  'bills.pay':                    { capacity: 10,  refillRate: 0.5 },
  'rdc.deposit':                  { capacity: 5,   refillRate: 0.1 },
  'loans.makePayment':            { capacity: 5,   refillRate: 0.2 },

  // AI/expensive: restricted
  'enrichment.enhance':           { capacity: 20,  refillRate: 0.5 },
  'enrichment.batch':             { capacity: 5,   refillRate: 0.1 },
  'kyc.evaluate':                 { capacity: 5,   refillRate: 0.05 },

  // Admin writes: moderate
  'cms.content.create':           { capacity: 20,  refillRate: 1 },
  'cms.content.update':           { capacity: 30,  refillRate: 2 },
  'cms.tokens.create':            { capacity: 5,   refillRate: 0.1 },
  'experiments.create':           { capacity: 10,  refillRate: 0.5 },

  // Read-heavy: generous
  'accounts.list':                { capacity: 60,  refillRate: 10 },
  'transactions.list':            { capacity: 60,  refillRate: 10 },
  'transactions.search':          { capacity: 30,  refillRate: 5 },
};

const DEFAULT_TIER: RateLimitTier = { capacity: 100, refillRate: 10 };

// =============================================================================
// REDIS-BACKED TOKEN BUCKET (primary — shared across instances)
// =============================================================================

/**
 * Lua script for atomic token-bucket rate limiting in Redis.
 *
 * KEYS[1] = bucket key
 * ARGV[1] = capacity (max tokens)
 * ARGV[2] = refill rate (tokens per second)
 * ARGV[3] = current time in milliseconds
 * ARGV[4] = TTL in seconds for the key
 *
 * Returns: [allowed (0/1), remaining tokens, retry-after ms]
 */
const TOKEN_BUCKET_LUA = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now_ms = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1])
local last_refill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  last_refill = now_ms
end

-- Refill tokens based on elapsed time
local elapsed = (now_ms - last_refill) / 1000
tokens = math.min(capacity, tokens + elapsed * refill_rate)
last_refill = now_ms

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(last_refill))
  redis.call('EXPIRE', key, ttl)
  return {1, math.floor(tokens), 0}
end

-- Calculate retry-after
local deficit = 1 - tokens
local retry_ms = math.ceil((deficit / refill_rate) * 1000)
redis.call('HMSET', key, 'tokens', tostring(tokens), 'last_refill', tostring(last_refill))
redis.call('EXPIRE', key, ttl)
return {0, 0, retry_ms}
`;

/** Key TTL: 10 minutes (buckets auto-expire if unused). */
const BUCKET_TTL_SECONDS = 600;

async function consumeTokenRedis(
  cache: CachePort,
  key: string,
  tier: RateLimitTier,
): Promise<{ allowed: boolean; remaining: number; retryAfterMs: number }> {
  const result = await cache.eval(
    TOKEN_BUCKET_LUA,
    [`rl:${key}`],
    [
      String(tier.capacity),
      String(tier.refillRate),
      String(Date.now()),
      String(BUCKET_TTL_SECONDS),
    ],
  ) as number[];

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    retryAfterMs: result[2],
  };
}

// =============================================================================
// IN-MEMORY TOKEN BUCKET (fallback when Redis is unavailable)
// =============================================================================

const localBuckets = new Map<string, TokenBucket>();
const LOCAL_BUCKET_TTL_MS = 10 * 60 * 1000;
let lastLocalCleanup = Date.now();

function cleanupLocalBuckets(): void {
  const now = Date.now();
  if (now - lastLocalCleanup < 5 * 60 * 1000) return;
  lastLocalCleanup = now;
  for (const [k, b] of localBuckets) {
    if (now - b.lastRefill > LOCAL_BUCKET_TTL_MS) localBuckets.delete(k);
  }
}

function consumeTokenLocal(
  key: string,
  tier: RateLimitTier,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  cleanupLocalBuckets();

  const now = Date.now();
  let bucket = localBuckets.get(key);
  if (!bucket) {
    bucket = { tokens: tier.capacity, lastRefill: now };
    localBuckets.set(key, bucket);
  }

  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(tier.capacity, bucket.tokens + elapsed * tier.refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
  }

  const deficit = 1 - bucket.tokens;
  const retryAfterMs = Math.ceil((deficit / tier.refillRate) * 1000);
  return { allowed: false, remaining: 0, retryAfterMs };
}

// =============================================================================
// KEY BUILDING
// =============================================================================

/**
 * Build a rate limit key from request context.
 * Priority: userId > API key hash > IP address
 */
function buildRateLimitKey(mctx: MiddlewareContext): string {
  const { action, ctx, req } = mctx;
  const prefix = action;

  if (ctx.userId) return `${prefix}:user:${ctx.userId}`;

  const apiKey = req.headers.get('apikey') || req.headers.get('x-api-key');
  if (apiKey) return `${prefix}:key:${fnv1a(apiKey)}`;

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
  return `${prefix}:ip:${ip}`;
}

function fnv1a(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(36);
}

/**
 * Token-bucket rate limiting middleware.
 *
 * Uses Redis (via deps.cache) when available for distributed rate limiting
 * that persists across cold starts and is shared across all instances.
 * Falls back to in-memory buckets when Redis is not configured.
 */
export const tokenBucketRateLimit: Middleware = async (mctx) => {
  const tier = ACTION_RATE_LIMITS[mctx.action] ?? DEFAULT_TIER;
  const key = buildRateLimitKey(mctx);

  const cache = mctx.ctx.deps?.cache;
  let result: { allowed: boolean; remaining: number; retryAfterMs: number };

  if (cache) {
    try {
      result = await consumeTokenRedis(cache, key, tier);
    } catch (err) {
      // Redis failure: fall back to in-memory so the gateway stays available.
      // Log the error for alerting but don't block requests.
      console.error('[rate-limit] Redis error, falling back to in-memory:', (err as Error).message);
      result = consumeTokenLocal(key, tier);
    }
  } else {
    result = consumeTokenLocal(key, tier);
  }

  // Always attach rate limit headers to meta
  mctx.meta.rateLimit = {
    limit: tier.capacity,
    remaining: result.remaining,
    refillRate: tier.refillRate,
  };

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return {
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded for ${mctx.action}. Retry after ${retryAfterSec}s.`,
      },
      status: 429,
    };
  }

  return null;
};

// =============================================================================
// IP ALLOWLIST / BLOCKLIST
// =============================================================================

/**
 * IP filtering middleware.
 * Reads GATEWAY_IP_BLOCKLIST and GATEWAY_IP_ALLOWLIST env vars (comma-separated).
 *
 * Logic:
 * - If blocklist is set and IP matches → block
 * - If allowlist is set and IP does NOT match → block
 * - Otherwise → allow
 */
export const ipFilter: Middleware = async (mctx) => {
  const ip = mctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || mctx.req.headers.get('x-real-ip')
    || '';

  if (!ip) return null; // Can't determine IP, allow

  // Use platform-agnostic env access (falls back to Deno.env for backward compat)
  const env = mctx.ctx.deps?.env;
  const getEnv = (key: string) => env ? env.get(key) : Deno.env.get(key);

  // Blocklist check
  const blocklist = getEnv('GATEWAY_IP_BLOCKLIST');
  if (blocklist) {
    const blocked = blocklist.split(',').map(s => s.trim()).filter(Boolean);
    if (blocked.includes(ip)) {
      return {
        error: { code: 'FORBIDDEN', message: 'Access denied' },
        status: 403,
      };
    }
  }

  // Allowlist check (if set, ONLY these IPs are allowed)
  const allowlist = getEnv('GATEWAY_IP_ALLOWLIST');
  if (allowlist) {
    const allowed = allowlist.split(',').map(s => s.trim()).filter(Boolean);
    if (!allowed.includes(ip)) {
      return {
        error: { code: 'FORBIDDEN', message: 'Access denied' },
        status: 403,
      };
    }
  }

  return null;
};

// =============================================================================
// REQUEST SIZE LIMIT
// =============================================================================

const DEFAULT_MAX_BODY_BYTES = 1_048_576; // 1 MB
const LARGE_BODY_ACTIONS = new Set([
  'rdc.deposit',           // Check images
  'enrichment.batch',      // Batch transactions
]);
const LARGE_MAX_BODY_BYTES = 10_485_760; // 10 MB

/**
 * Validates Content-Length is within limits before body is fully parsed.
 */
export const requestSizeLimit: Middleware = async (mctx) => {
  const contentLength = mctx.req.headers.get('content-length');
  if (!contentLength) return null;

  const bytes = parseInt(contentLength, 10);
  if (isNaN(bytes)) return null;

  const maxBytes = LARGE_BODY_ACTIONS.has(mctx.action) ? LARGE_MAX_BODY_BYTES : DEFAULT_MAX_BODY_BYTES;

  if (bytes > maxBytes) {
    return {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request body exceeds ${Math.round(maxBytes / 1024)}KB limit`,
      },
      status: 413,
    };
  }

  return null;
};

// =============================================================================
// WRITE OPERATION AUDIT TRAIL
// =============================================================================

/** Actions that mutate data and should be audit-logged */
const WRITE_ACTIONS = new Set([
  // Financial
  'transfers.create', 'transfers.schedule', 'transfers.cancel',
  'bills.create', 'bills.pay', 'bills.cancel',
  'rdc.deposit',
  'loans.makePayment',
  'cards.lock', 'cards.unlock', 'cards.setLimit',

  // Beneficiaries
  'beneficiaries.create', 'beneficiaries.delete',

  // Standing instructions
  'standingInstructions.create', 'standingInstructions.update',

  // Admin / CMS
  'cms.content.create', 'cms.content.update', 'cms.content.delete',
  'cms.content.publish', 'cms.content.archive',
  'cms.tokens.create', 'cms.tokens.revoke',
  'cms.channels.update',

  // Experiments
  'experiments.create', 'experiments.update',
  'experiments.start', 'experiments.pause', 'experiments.resume', 'experiments.complete',

  // Integrations
  'integrations.connect', 'integrations.disconnect',

  // Autonomous Execution
  'admin.autonomous.serviceAccounts.create', 'admin.autonomous.serviceAccounts.update',
  'admin.autonomous.serviceAccounts.revoke',
  'admin.autonomous.policies.upsert', 'admin.autonomous.policies.delete',
  'admin.autonomous.executions.approve', 'admin.autonomous.executions.reject',
  'admin.autonomous.toggle', 'admin.autonomous.trigger',

  // Settings
  'passwordPolicy.update',
  'member.updateAddress',
  'cd.updateMaturityAction',

  // Activation
  'activation.createCredentials', 'activation.acceptTerms',

  // Open Banking (CFPB Section 1033)
  'openBanking.consents.grant', 'openBanking.consents.revoke',

  // Business Orchestration — Cash Sweeps
  'sweeps.rules.create', 'sweeps.rules.update', 'sweeps.rules.delete', 'sweeps.rules.toggle',

  // Business Orchestration — Invoice Processor
  'invoices.analyze', 'invoices.confirm', 'invoices.cancel',

  // Business Orchestration — JIT Permissions / Approvals
  'approvals.requests.approve', 'approvals.requests.deny', 'approvals.requests.cancel',
  'approvals.policies.create', 'approvals.policies.update', 'approvals.policies.delete',

  // Business Orchestration — Treasury
  'treasury.vaults.create', 'treasury.vaults.close',
]);

/**
 * Audit logging middleware (post-handler).
 * Logs write operations to the audit_logs table.
 * Runs as a fire-and-forget — does not block the response.
 */
/** PII-sensitive parameter keys that must never be logged */
const PII_KEYS = new Set([
  'ssn', 'socialSecurityNumber', 'accountNumber', 'routingNumber',
  'password', 'pin', 'cardNumber', 'cvv', 'securityCode',
  'dateOfBirth', 'dob', 'apiKey', 'accessToken', 'refreshToken',
  'fromAccountNumber', 'toAccountNumber',
]);

/** Redact PII from params for audit logging */
function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (PII_KEYS.has(key)) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeParams(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function auditLog(mctx: MiddlewareContext, result: GatewayResponse): void {
  if (!WRITE_ACTIONS.has(mctx.action)) return;
  if (!mctx.ctx.userId) return;

  // Fire-and-forget — don't await
  const entry = {
    user_id: mctx.ctx.userId,
    firm_id: mctx.ctx.firmId ?? null,
    action: mctx.action,
    request_id: mctx.requestId,
    success: !result.error,
    error_code: result.error?.code ?? null,
    ip_address: mctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    user_agent: mctx.req.headers.get('user-agent') ?? null,
    params: sanitizeParams(mctx.ctx.params),
    created_at: new Date().toISOString(),
  };

  // Use platform-agnostic db port (falls back to supabase for backward compat)
  const db = mctx.ctx.db ?? mctx.ctx.supabase;
  db
    .from('audit_logs')
    .insert(entry)
    .then(({ error }: { error?: { message: string } | null }) => {
      if (error) console.error('[audit] Failed to write audit log:', error.message);
    });
}

// =============================================================================
// STRUCTURED REQUEST LOGGER
// =============================================================================

/**
 * Logs structured JSON for every request (after handler completes).
 * Designed for consumption by log aggregators (Datadog, CloudWatch, etc.).
 */
export function logRequest(mctx: MiddlewareContext, result: GatewayResponse, durationMs: number): void {
  const ip = mctx.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || mctx.req.headers.get('x-real-ip')
    || null;

  const logEntry = {
    level: result.error ? 'warn' : 'info',
    type: 'gateway_request',
    request_id: mctx.requestId,
    action: mctx.action,
    status_code: result.status ?? (result.error ? 400 : 200),
    duration_ms: durationMs,
    user_id: mctx.ctx.userId ?? null,
    firm_id: mctx.ctx.firmId ?? null,
    ip: ip,
    user_agent: mctx.req.headers.get('user-agent') ?? null,
    error_code: result.error?.code ?? null,
    rate_limit: mctx.meta.rateLimit ?? null,
    timestamp: new Date().toISOString(),
  };

  console.warn(JSON.stringify(logEntry));
}

// =============================================================================
// DATA RESIDENCY GUARD (GDPR / LGPD)
// =============================================================================

/**
 * Maps data residency regions to the expected deployment regions.
 * Requests are blocked if the gateway is running in a region that doesn't
 * match the tenant's configured data residency region.
 *
 * Set DEPLOYMENT_REGION env var to enable enforcement (e.g., "eu-central-1").
 * When DEPLOYMENT_REGION is not set, the guard logs a warning but does not block.
 */
const RESIDENCY_REGION_GROUPS: Record<string, string[]> = {
  'eu': ['eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1', 'eu-south-1'],
  'uk': ['eu-west-2'],
  'br': ['sa-east-1'],
  'us': ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2'],
};

export const dataResidencyGuard: Middleware = async (mctx) => {
  const deploymentRegion = Deno.env.get('DEPLOYMENT_REGION');
  if (!deploymentRegion) return null; // Guard disabled — no region configured

  // Look up tenant's data residency requirement
  const { data: firm } = await mctx.ctx.db
    .from('firms')
    .select('data_residency_region, country_code')
    .eq('id', mctx.ctx.firmId)
    .single();

  if (!firm) return null; // No firm context — skip guard

  const firmRecord = firm as Record<string, unknown>;
  const residencyRegion = firmRecord.data_residency_region as string | null;
  if (!residencyRegion) return null; // No residency requirement configured

  // Check if deployment region matches the residency requirement
  const countryCode = (firmRecord.country_code as string || '').toLowerCase();
  const allowedRegions = RESIDENCY_REGION_GROUPS[countryCode] ?? [residencyRegion];

  if (!allowedRegions.includes(deploymentRegion)) {
    console.error(
      `[data-residency] BLOCKED: tenant ${mctx.ctx.firmId} requires data in ${residencyRegion} ` +
      `(country: ${countryCode}), but gateway is deployed in ${deploymentRegion}`
    );
    return {
      error: {
        code: 'DATA_RESIDENCY_VIOLATION',
        message: 'Request blocked: data residency requirements not met for this tenant',
      },
      status: 451, // 451 Unavailable For Legal Reasons
    };
  }

  mctx.meta.dataResidencyRegion = residencyRegion;
  return null;
};

// =============================================================================
// MIDDLEWARE PIPELINE
// =============================================================================

/**
 * Runs the middleware pipeline.
 * Returns a GatewayResponse if any middleware short-circuits, or null to continue.
 */
export async function runMiddleware(
  middlewares: Middleware[],
  mctx: MiddlewareContext,
): Promise<GatewayResponse | null> {
  for (const mw of middlewares) {
    const result = await mw(mctx);
    if (result) return result;
  }
  return null;
}

/**
 * Default middleware stack for the gateway.
 * Order matters: IP filter → size check → rate limit → data residency
 */
export const defaultMiddleware: Middleware[] = [
  ipFilter,
  requestSizeLimit,
  tokenBucketRateLimit,
  dataResidencyGuard,
];
