/**
 * Environment Provider Implementations
 *
 * Platform-specific env var access. Handlers and middleware use
 * `deps.env.get(...)` instead of `Deno.env.get(...)` directly.
 */

import type { EnvProvider } from './types.ts';

// =============================================================================
// DENO ENVIRONMENT PROVIDER (Supabase Edge Functions)
// =============================================================================

export class DenoEnvProvider implements EnvProvider {
  get(key: string): string | undefined {
    return Deno.env.get(key);
  }

  getRequired(key: string): string {
    const value = Deno.env.get(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}

// =============================================================================
// NODE.JS ENVIRONMENT PROVIDER (Lambda, Railway, Docker)
// =============================================================================

export class NodeEnvProvider implements EnvProvider {
  get(key: string): string | undefined {
    return typeof process !== 'undefined' ? process.env[key] : undefined;
  }

  getRequired(key: string): string {
    const value = this.get(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}

// =============================================================================
// STATIC ENVIRONMENT PROVIDER (testing / embedded)
// =============================================================================

export class StaticEnvProvider implements EnvProvider {
  constructor(private readonly vars: Record<string, string>) {}

  get(key: string): string | undefined {
    return this.vars[key];
  }

  getRequired(key: string): string {
    const value = this.vars[key];
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}
