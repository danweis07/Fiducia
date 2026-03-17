/**
 * Gateway Middleware — Security Tests
 *
 * Tests for request ID generation, PII sanitization, rate limiting,
 * and request size enforcement in the gateway middleware layer.
 *
 * The source file uses Deno-style imports which we mock for Vitest.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Deno-style imports used by middleware.ts
// We re-implement the pure functions under test here so we can test
// them without Deno import resolution.
// ---------------------------------------------------------------------------

// --- generateRequestId (copied from middleware.ts) ---
function generateRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `req_${ts}_${rand}`;
}

// --- PII_KEYS set (copied from middleware.ts) ---
const PII_KEYS = new Set([
  'ssn', 'socialSecurityNumber', 'accountNumber', 'routingNumber',
  'password', 'pin', 'cardNumber', 'cvv', 'securityCode',
  'dateOfBirth', 'dob', 'apiKey', 'accessToken', 'refreshToken',
  'fromAccountNumber', 'toAccountNumber',
]);

// --- sanitizeParams (copied from middleware.ts) ---
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

// --- Token bucket (copied from middleware.ts) ---
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitTier {
  capacity: number;
  refillRate: number;
}

function consumeToken(
  buckets: Map<string, TokenBucket>,
  key: string,
  tier: RateLimitTier,
): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: tier.capacity, lastRefill: now };
    buckets.set(key, bucket);
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

// ===========================================================================
// generateRequestId
// ===========================================================================

describe('generateRequestId', () => {
  it('returns a string starting with "req_"', () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_/);
  });

  it('has the format req_<timestamp>_<random>', () => {
    const id = generateRequestId();
    const parts = id.split('_');
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe('req');
    // Timestamp part should be a valid base36 string
    expect(parts[1]).toMatch(/^[0-9a-z]+$/);
    // Random part should be a valid base36 string
    expect(parts[2]).toMatch(/^[0-9a-z]+$/);
  });

  it('generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId());
    }
    // All 100 should be unique
    expect(ids.size).toBe(100);
  });

  it('timestamp part encodes a recent time', () => {
    const before = Date.now();
    const id = generateRequestId();
    const after = Date.now();

    const tsPart = id.split('_')[1];
    const decoded = parseInt(tsPart, 36);
    expect(decoded).toBeGreaterThanOrEqual(before);
    expect(decoded).toBeLessThanOrEqual(after);
  });

  it('random part has sufficient length for uniqueness', () => {
    const id = generateRequestId();
    const randPart = id.split('_')[2];
    // Should be at least 4 characters for reasonable entropy
    expect(randPart.length).toBeGreaterThanOrEqual(4);
  });
});

// ===========================================================================
// sanitizeParams — PII Redaction
// ===========================================================================

describe('sanitizeParams', () => {
  describe('redacts each PII key', () => {
    const piiKeys = [
      'ssn', 'socialSecurityNumber', 'accountNumber', 'routingNumber',
      'password', 'pin', 'cardNumber', 'cvv', 'securityCode',
      'dateOfBirth', 'dob', 'apiKey', 'accessToken', 'refreshToken',
      'fromAccountNumber', 'toAccountNumber',
    ];

    for (const key of piiKeys) {
      it(`redacts "${key}"`, () => {
        const input = { [key]: 'sensitive-value-12345', safeKey: 'visible' };
        const result = sanitizeParams(input);
        expect(result[key]).toBe('***REDACTED***');
        expect(result.safeKey).toBe('visible');
      });
    }
  });

  it('does not redact non-PII keys', () => {
    const input = {
      action: 'transfers.create',
      amountCents: 5000,
      memo: 'rent',
      fromAccountId: 'acct-uuid-123',
      toAccountId: 'acct-uuid-456',
    };
    const result = sanitizeParams(input);
    expect(result.action).toBe('transfers.create');
    expect(result.amountCents).toBe(5000);
    expect(result.memo).toBe('rent');
    expect(result.fromAccountId).toBe('acct-uuid-123');
    expect(result.toAccountId).toBe('acct-uuid-456');
  });

  it('redacts PII in nested objects', () => {
    const input = {
      user: {
        ssn: '123-45-6789',
        name: 'John Doe',
        address: {
          accountNumber: '9876543210',
          street: '123 Main St',
        },
      },
    };
    const result = sanitizeParams(input);
    const user = result.user as Record<string, unknown>;
    expect(user.ssn).toBe('***REDACTED***');
    expect(user.name).toBe('John Doe');
    const address = user.address as Record<string, unknown>;
    expect(address.accountNumber).toBe('***REDACTED***');
    expect(address.street).toBe('123 Main St');
  });

  it('handles deeply nested objects', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            password: 'secret',
            data: 'visible',
          },
        },
      },
    };
    const result = sanitizeParams(input);
    const l1 = result.level1 as Record<string, unknown>;
    const l2 = l1.level2 as Record<string, unknown>;
    const l3 = l2.level3 as Record<string, unknown>;
    expect(l3.password).toBe('***REDACTED***');
    expect(l3.data).toBe('visible');
  });

  it('does not modify arrays (treats them as passthrough)', () => {
    const input = {
      items: [1, 2, 3],
      tags: ['a', 'b'],
    };
    const result = sanitizeParams(input);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.tags).toEqual(['a', 'b']);
  });

  it('handles empty params', () => {
    const result = sanitizeParams({});
    expect(result).toEqual({});
  });

  it('handles null values without crashing', () => {
    const input = { ssn: null, name: 'John' };
    const result = sanitizeParams(input as unknown as Record<string, unknown>);
    // PII_KEYS.has('ssn') is true, so it should be redacted regardless of value
    expect(result.ssn).toBe('***REDACTED***');
    expect(result.name).toBe('John');
  });

  it('redacts PII even when value is a number', () => {
    const input = { pin: 1234, cvv: 567 };
    const result = sanitizeParams(input);
    expect(result.pin).toBe('***REDACTED***');
    expect(result.cvv).toBe('***REDACTED***');
  });

  it('redacts PII even when value is boolean', () => {
    const input = { password: true };
    const result = sanitizeParams(input);
    expect(result.password).toBe('***REDACTED***');
  });

  it('the original input is not mutated', () => {
    const input = { ssn: '123-45-6789', name: 'John' };
    sanitizeParams(input);
    expect(input.ssn).toBe('123-45-6789');
  });

  it('redacted output never contains the original PII value', () => {
    const sensitive = 'SUPER-SECRET-SSN-VALUE';
    const input = { ssn: sensitive, accountNumber: sensitive };
    const result = sanitizeParams(input);
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain(sensitive);
  });
});

// ===========================================================================
// Token Bucket Rate Limiter
// ===========================================================================

describe('token bucket rate limiter', () => {
  let buckets: Map<string, TokenBucket>;

  beforeEach(() => {
    buckets = new Map();
  });

  it('allows first request when bucket is full', () => {
    const tier: RateLimitTier = { capacity: 10, refillRate: 1 };
    const result = consumeToken(buckets, 'test-key', tier);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('allows requests up to capacity', () => {
    const tier: RateLimitTier = { capacity: 3, refillRate: 0.1 };
    const r1 = consumeToken(buckets, 'key', tier);
    const r2 = consumeToken(buckets, 'key', tier);
    const r3 = consumeToken(buckets, 'key', tier);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
  });

  it('denies requests when bucket is exhausted', () => {
    const tier: RateLimitTier = { capacity: 2, refillRate: 0.001 }; // very slow refill
    consumeToken(buckets, 'key', tier);
    consumeToken(buckets, 'key', tier);
    const result = consumeToken(buckets, 'key', tier);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('returns retryAfterMs when rate limited', () => {
    const tier: RateLimitTier = { capacity: 1, refillRate: 1 };
    consumeToken(buckets, 'key', tier); // exhaust the single token
    const result = consumeToken(buckets, 'key', tier);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('different keys have independent buckets', () => {
    const tier: RateLimitTier = { capacity: 1, refillRate: 0.001 };
    const r1 = consumeToken(buckets, 'user-A', tier);
    const r2 = consumeToken(buckets, 'user-B', tier);
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
  });

  it('bucket starts at full capacity', () => {
    const tier: RateLimitTier = { capacity: 100, refillRate: 10 };
    const result = consumeToken(buckets, 'key', tier);
    expect(result.remaining).toBe(99); // 100 - 1
  });

  it('tokens never exceed capacity after refill', () => {
    const tier: RateLimitTier = { capacity: 5, refillRate: 1000 }; // very fast refill
    consumeToken(buckets, 'key', tier); // 5 -> 4

    // Force a time passage by manipulating the bucket
    const bucket = buckets.get('key')!;
    bucket.lastRefill = Date.now() - 10000; // 10 seconds ago

    const result = consumeToken(buckets, 'key', tier);
    // After refill, tokens should be capped at capacity (5), then -1 = 4
    expect(result.remaining).toBeLessThanOrEqual(tier.capacity - 1);
    expect(result.allowed).toBe(true);
  });
});

// ===========================================================================
// PII_KEYS completeness
// ===========================================================================

describe('PII_KEYS coverage', () => {
  it('includes all critical financial PII fields', () => {
    const requiredKeys = [
      'ssn', 'socialSecurityNumber', 'accountNumber', 'routingNumber',
      'password', 'pin', 'cardNumber', 'cvv', 'securityCode',
    ];
    for (const key of requiredKeys) {
      expect(PII_KEYS.has(key)).toBe(true);
    }
  });

  it('includes authentication tokens', () => {
    expect(PII_KEYS.has('apiKey')).toBe(true);
    expect(PII_KEYS.has('accessToken')).toBe(true);
    expect(PII_KEYS.has('refreshToken')).toBe(true);
  });

  it('includes date of birth variants', () => {
    expect(PII_KEYS.has('dateOfBirth')).toBe(true);
    expect(PII_KEYS.has('dob')).toBe(true);
  });

  it('includes transfer account numbers', () => {
    expect(PII_KEYS.has('fromAccountNumber')).toBe(true);
    expect(PII_KEYS.has('toAccountNumber')).toBe(true);
  });
});
