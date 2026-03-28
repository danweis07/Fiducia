/**
 * Gateway Request Throttle — Token Bucket Algorithm
 *
 * Client-side rate limiting for gateway calls. Configurable per-tenant
 * with optional per-domain overrides.
 *
 * Usage:
 *   const throttle = new GatewayThrottle({ defaultRpm: 1000 });
 *   await throttle.waitForSlot('accounts'); // waits if bucket is empty
 */

import type { RateLimitConfig } from "@/types/tenant";

interface PendingRequest {
  resolve: () => void;
}

class TokenBucket {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per ms
  private lastRefill: number;
  private queue: PendingRequest[] = [];
  private drainTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(rpm: number) {
    this.maxTokens = Math.max(1, Math.ceil(rpm / 60)); // burst capacity = 1 second worth
    this.tokens = this.maxTokens;
    this.refillRate = rpm / 60_000; // tokens per millisecond
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Queue the request and wait for a token
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
      this.scheduleDrain();
    });
  }

  private scheduleDrain(): void {
    if (this.drainTimer) return;

    // Time until next token is available
    const waitMs = Math.ceil((1 - this.tokens) / this.refillRate);

    this.drainTimer = setTimeout(() => {
      this.drainTimer = null;
      this.refill();

      while (this.queue.length > 0 && this.tokens >= 1) {
        this.tokens -= 1;
        const pending = this.queue.shift()!;
        pending.resolve();
      }

      if (this.queue.length > 0) {
        this.scheduleDrain();
      }
    }, waitMs);
  }

  destroy(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    // Resolve any pending requests so they don't hang
    for (const pending of this.queue) {
      pending.resolve();
    }
    this.queue = [];
  }
}

export class GatewayThrottle {
  private defaultBucket: TokenBucket;
  private domainBuckets: Map<string, TokenBucket> = new Map();

  constructor(config: RateLimitConfig) {
    this.defaultBucket = new TokenBucket(config.defaultRpm);

    if (config.domainOverrides) {
      for (const [domain, rpm] of Object.entries(config.domainOverrides)) {
        this.domainBuckets.set(domain, new TokenBucket(rpm));
      }
    }
  }

  /**
   * Wait for a rate limit slot. Resolves immediately if under limit,
   * otherwise queues until a token is available.
   */
  async waitForSlot(domain?: string): Promise<void> {
    if (domain) {
      const bucket = this.domainBuckets.get(domain);
      if (bucket) {
        await bucket.acquire();
        return;
      }
    }
    await this.defaultBucket.acquire();
  }

  /** Update configuration (e.g., when tenant settings change) */
  updateConfig(config: RateLimitConfig): void {
    this.destroy();
    this.defaultBucket = new TokenBucket(config.defaultRpm);
    this.domainBuckets.clear();

    if (config.domainOverrides) {
      for (const [domain, rpm] of Object.entries(config.domainOverrides)) {
        this.domainBuckets.set(domain, new TokenBucket(rpm));
      }
    }
  }

  /** Clean up timers */
  destroy(): void {
    this.defaultBucket.destroy();
    for (const bucket of this.domainBuckets.values()) {
      bucket.destroy();
    }
  }
}

/** Extract domain from a gateway action string. "accounts.list" → "accounts" */
export function extractDomain(action: string): string {
  const dot = action.indexOf(".");
  return dot > 0 ? action.substring(0, dot) : action;
}

/** Default rate limit config */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  defaultRpm: 1000,
};
