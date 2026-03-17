/**
 * Node.js Platform Dependencies Factory
 *
 * Creates PlatformDeps for Node.js-based deployments (Railway, Render, Fly.io,
 * AWS Lambda). Uses environment variables from process.env and provides
 * placeholder ports for database and auth that must be configured per deployment.
 *
 * Usage:
 *   import { createNodeDeps } from './node-deps.ts';
 *   const deps = createNodeDeps({ dbUrl: process.env.DATABASE_URL });
 */

import type { PlatformDeps, EnvProvider, DatabasePort, AuthPort } from '../types.ts';

interface NodeDepsOptions {
  /** Override the database port (required for production) */
  db?: DatabasePort;
  /** Override the auth port (required for production) */
  auth?: AuthPort;
  /** Custom env provider (defaults to process.env) */
  env?: EnvProvider;
}

/**
 * Creates a PlatformDeps instance for Node.js environments.
 *
 * In production, pass in real db and auth implementations.
 * Without overrides, stubs are provided that throw helpful errors.
 */
export function createNodeDeps(options?: NodeDepsOptions): PlatformDeps {
  const env: EnvProvider = options?.env ?? {
    get(key: string): string | undefined {
      return typeof process !== 'undefined' ? process.env[key] : undefined;
    },
    getRequired(key: string): string {
      const value = typeof process !== 'undefined' ? process.env[key] : undefined;
      if (!value) throw new Error(`Missing required environment variable: ${key}`);
      return value;
    },
  };

  const db: DatabasePort = options?.db ?? {
    from() {
      throw new Error(
        'DatabasePort not configured. Pass a db implementation to createNodeDeps().',
      );
    },
    async rpc() {
      throw new Error(
        'DatabasePort not configured. Pass a db implementation to createNodeDeps().',
      );
    },
  };

  const auth: AuthPort = options?.auth ?? {
    async getUser() {
      throw new Error(
        'AuthPort not configured. Pass an auth implementation to createNodeDeps().',
      );
    },
  };

  return { env, db, auth };
}
