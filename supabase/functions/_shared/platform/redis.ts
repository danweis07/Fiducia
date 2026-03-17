/**
 * Upstash Redis REST Client
 *
 * Lightweight Redis client for Deno/edge environments using Upstash's REST API.
 * No npm packages required — just HTTP fetch.
 *
 * Requires env vars:
 *   UPSTASH_REDIS_REST_URL   — e.g. https://us1-xyz.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN — bearer token for auth
 */

import type { CachePort } from './types.ts';
import type { EnvProvider } from './types.ts';

// =============================================================================
// UPSTASH REST CLIENT
// =============================================================================

interface UpstashResponse {
  result: unknown;
  error?: string;
}

export class UpstashRedisClient implements CachePort {
  private readonly url: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
  }

  /**
   * Execute a single Redis command via the Upstash REST API.
   */
  async exec(command: string[]): Promise<unknown> {
    const resp = await fetch(`${this.url}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Upstash Redis error (${resp.status}): ${text}`);
    }

    const data = (await resp.json()) as UpstashResponse;
    if (data.error) {
      throw new Error(`Redis command error: ${data.error}`);
    }

    return data.result;
  }

  /**
   * Execute a pipeline of commands atomically.
   */
  async pipeline(commands: string[][]): Promise<unknown[]> {
    const resp = await fetch(`${this.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commands),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Upstash pipeline error (${resp.status}): ${text}`);
    }

    const data = (await resp.json()) as UpstashResponse[];
    return data.map((d) => {
      if (d.error) throw new Error(`Redis pipeline command error: ${d.error}`);
      return d.result;
    });
  }

  // -- CachePort implementation --

  async get(key: string): Promise<string | null> {
    const result = await this.exec(['GET', key]);
    return result as string | null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.exec(['SET', key, value, 'EX', String(ttlSeconds)]);
    } else {
      await this.exec(['SET', key, value]);
    }
  }

  async del(key: string): Promise<void> {
    await this.exec(['DEL', key]);
  }

  async incr(key: string): Promise<number> {
    const result = await this.exec(['INCR', key]);
    return result as number;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.exec(['EXPIRE', key, String(ttlSeconds)]);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    return this.exec(['EVAL', script, String(keys.length), ...keys, ...args]);
  }
}

// =============================================================================
// FACTORY
// =============================================================================

/**
 * Create an Upstash Redis client from environment variables.
 * Returns null if UPSTASH_REDIS_REST_URL is not configured.
 */
export function createRedisClient(env: EnvProvider): UpstashRedisClient | null {
  const url = env.get('UPSTASH_REDIS_REST_URL');
  const token = env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!url || !token) {
    console.warn(
      '[redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set. ' +
      'Rate limiting will fall back to in-memory buckets.',
    );
    return null;
  }

  return new UpstashRedisClient(url, token);
}
