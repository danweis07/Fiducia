/**
 * Platform Abstraction Module
 *
 * Public API for the platform-agnostic abstraction layer.
 * Import from this module to get types, env providers, and dep factories.
 */

// Types
export type {
  EnvProvider,
  DatabasePort,
  QueryBuilder,
  QueryResult,
  SingleResult,
  AuthPort,
  AuthUser,
  StoragePort,
  CachePort,
  PlatformDeps,
  PlatformGatewayContext,
  RequestHandler,
  ServerAdapter,
} from './types.ts';

// Environment providers
export { DenoEnvProvider, NodeEnvProvider, StaticEnvProvider } from './env.ts';

// Supabase adapters
export { SupabaseDatabaseAdapter } from './supabase-db.ts';
export { SupabaseAuthAdapter } from './supabase-auth.ts';
export { SupabaseStorageAdapter } from './supabase-storage.ts';

// Redis / cache
export { UpstashRedisClient, createRedisClient } from './redis.ts';

// Dependency factories
export { createSupabaseDeps } from './supabase-deps.ts';
