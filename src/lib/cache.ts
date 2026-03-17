/**
 * In-Memory Cache with TTL and LRU Eviction
 *
 * Provides caching for expensive operations like database queries
 * for data that doesn't change frequently.
 *
 * Improvements over original:
 * - Cleanup interval is stored and can be disposed
 * - LRU eviction when cache exceeds maxEntries
 * - Access tracking for LRU ordering
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  lastAccessed: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;
  private maxEntries: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtlMs: number = 5 * 60 * 1000, maxEntries: number = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;

    // Clean up expired entries periodically
    if (typeof window !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 1000);
    }
  }

  /** Get a cached value */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Update access time for LRU
    entry.lastAccessed = Date.now();
    return entry.value as T;
  }

  /** Set a cached value */
  set<T>(key: string, value: T, ttlMs?: number): void {
    // Evict LRU entries if at capacity
    if (!this.cache.has(key) && this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    const now = Date.now();
    const expiresAt = now + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt, lastAccessed: now });
  }

  /** Delete a cached value */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /** Clear all cached values */
  clear(): void {
    this.cache.clear();
  }

  /** Clear all cached values matching a prefix */
  clearPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /** Get or fetch a value, caching the result */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttlMs);
    return value;
  }

  /** Remove expired entries */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /** Evict the least recently accessed entry */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /** Get cache statistics */
  stats(): { size: number; maxEntries: number; keys: string[] } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      keys: Array.from(this.cache.keys()),
    };
  }

  /** Dispose the cache and stop background cleanup */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Singleton instance for the application
export const appCache = new MemoryCache();

// Pre-defined cache keys for common data
export const CACHE_KEYS = {
  SCORE_WEIGHTS: "scoring:weights",
  INTEGRATION_PROVIDERS: "integrations:providers",
  FIRM_SETTINGS: (firmId: string) => `firm:${firmId}:settings`,
  USER_PERMISSIONS: (userId: string) => `user:${userId}:permissions`,
  PROPERTY_STATS: (firmId: string) => `firm:${firmId}:property-stats`,
} as const;

// TTL values for different data types (in milliseconds)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute - for frequently changing data
  MEDIUM: 5 * 60 * 1000, // 5 minutes - default
  LONG: 30 * 60 * 1000, // 30 minutes - for stable data
  VERY_LONG: 60 * 60 * 1000, // 1 hour - for rarely changing data
} as const;

/**
 * Decorator for caching async function results
 */
export function cached(
  keyOrKeyFn: string | ((...args: unknown[]) => string),
  ttlMs: number = CACHE_TTL.MEDIUM,
) {
  return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const key = typeof keyOrKeyFn === "function" ? keyOrKeyFn(...args) : keyOrKeyFn;

      return appCache.getOrFetch(key, () => originalMethod.apply(this, args), ttlMs);
    };

    return descriptor;
  };
}

/**
 * Create a cached version of a function
 */
export function createCachedFunction<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyFn: (...args: Args) => string,
  ttlMs: number = CACHE_TTL.MEDIUM,
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    const key = keyFn(...args);
    return appCache.getOrFetch(key, () => fn(...args), ttlMs);
  };
}
