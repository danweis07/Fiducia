/**
 * Platform Abstraction Types
 *
 * Defines platform-agnostic interfaces for environment access, database
 * operations, authentication, and the HTTP server entry point. This
 * decouples all business logic from Deno/Supabase-specific APIs so the
 * same gateway core can run on Supabase Edge Functions, AWS Lambda,
 * Cloudflare Workers, Railway (Node.js), or any other runtime.
 */

// =============================================================================
// ENVIRONMENT
// =============================================================================

/**
 * Platform-agnostic environment variable access.
 * Replaces direct calls to `Deno.env.get(...)`.
 */
export interface EnvProvider {
  get(key: string): string | undefined;
  getRequired(key: string): string;
}

// =============================================================================
// DATABASE
// =============================================================================

/**
 * Represents a single query builder chain.
 * Models the fluent Supabase PostgREST API, but is implementable
 * against any SQL/query engine (Prisma, Drizzle, Knex, raw pg, etc.).
 */
export interface QueryResult<T = Record<string, unknown>> {
  data: T[] | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export interface SingleResult<T = Record<string, unknown>> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

export interface QueryBuilder<T = Record<string, unknown>> {
  select(columns: string, options?: { count?: 'exact'; head?: boolean }): QueryBuilder<T>;
  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder<T>;
  update(values: Record<string, unknown>): QueryBuilder<T>;
  delete(): QueryBuilder<T>;
  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): QueryBuilder<T>;
  eq(column: string, value: unknown): QueryBuilder<T>;
  neq(column: string, value: unknown): QueryBuilder<T>;
  gt(column: string, value: unknown): QueryBuilder<T>;
  gte(column: string, value: unknown): QueryBuilder<T>;
  lt(column: string, value: unknown): QueryBuilder<T>;
  lte(column: string, value: unknown): QueryBuilder<T>;
  like(column: string, pattern: string): QueryBuilder<T>;
  ilike(column: string, pattern: string): QueryBuilder<T>;
  is(column: string, value: null | boolean): QueryBuilder<T>;
  in(column: string, values: unknown[]): QueryBuilder<T>;
  contains(column: string, value: unknown): QueryBuilder<T>;
  containedBy(column: string, value: unknown): QueryBuilder<T>;
  or(filters: string, options?: { referencedTable?: string }): QueryBuilder<T>;
  not(column: string, operator: string, value: unknown): QueryBuilder<T>;
  filter(column: string, operator: string, value: unknown): QueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T>;
  limit(count: number): QueryBuilder<T>;
  range(from: number, to: number): QueryBuilder<T>;
  single(): Promise<SingleResult<T>>;
  maybeSingle(): Promise<SingleResult<T>>;
  then: Promise<QueryResult<T>>['then'];
  /** Execute and return the result */
  execute(): Promise<QueryResult<T>>;
}

/**
 * Platform-agnostic database client.
 * Replaces direct `supabase.from(...)` calls throughout handlers.
 */
export interface DatabasePort {
  /** Start a query against a table */
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T>;

  /** Execute a raw RPC / stored procedure */
  rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<SingleResult<T>>;
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  role?: string;
  appMetadata?: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}

/**
 * Platform-agnostic auth port.
 * Replaces direct `supabase.auth.getUser(token)` calls.
 */
export interface AuthPort {
  /** Validate a bearer token and return the authenticated user */
  getUser(token: string): Promise<{ user: AuthUser | null; error: string | null }>;

  // --- Admin methods (optional — not all platforms support these) ---

  /** Create a new user account */
  createUser?(params: {
    email: string;
    password?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ user: AuthUser | null; error: string | null }>;

  /** Delete a user by ID */
  deleteUser?(userId: string): Promise<{ error: string | null }>;

  /** List users with optional filters */
  listUsers?(params?: {
    page?: number;
    perPage?: number;
  }): Promise<{ users: AuthUser[]; error: string | null }>;

  /** Update user metadata */
  updateUser?(userId: string, params: {
    email?: string;
    password?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ user: AuthUser | null; error: string | null }>;
}

// =============================================================================
// STORAGE (optional — for RDC images, document vault, etc.)
// =============================================================================

export interface StoragePort {
  upload(bucket: string, path: string, data: Uint8Array | Blob, options?: { contentType?: string; upsert?: boolean }): Promise<{ error: string | null }>;
  getPublicUrl(bucket: string, path: string): string;
  createSignedUrl(bucket: string, path: string, expiresIn: number): Promise<{ signedUrl: string | null; error: string | null }>;
  remove(bucket: string, paths: string[]): Promise<{ error: string | null }>;
}

// =============================================================================
// CACHE / RATE LIMITING
// =============================================================================

/**
 * Platform-agnostic cache port for distributed state.
 * Primary use: Redis-backed rate limiting that survives cold starts
 * and is shared across serverless instances.
 */
export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  /** Execute a Lua script (for atomic operations like token bucket). */
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
}

// =============================================================================
// PLATFORM DEPS — The dependency container
// =============================================================================

/**
 * The complete set of platform dependencies injected into the gateway core.
 * Every handler receives this instead of a raw Supabase client.
 */
export interface PlatformDeps {
  env: EnvProvider;
  db: DatabasePort;
  auth: AuthPort;
  storage?: StoragePort;
  /** Distributed cache (Redis). Used for rate limiting. Falls back to database if absent. */
  cache?: CachePort;
}

// =============================================================================
// GATEWAY CONTEXT (platform-agnostic)
// =============================================================================

/**
 * The new platform-agnostic gateway context.
 * Replaces the old GatewayContext that carried `supabase: SupabaseClient`.
 */
export interface PlatformGatewayContext {
  deps: PlatformDeps;
  params: Record<string, unknown>;
  userId?: string;
  firmId?: string;
}

// =============================================================================
// SERVER ADAPTER
// =============================================================================

/**
 * A platform-agnostic request handler function.
 * This is the "core controller" that each platform adapter wraps.
 */
export type RequestHandler = (request: Request) => Promise<Response>;

/**
 * Server adapter interface.
 * Each platform (Deno, Node/Express, Lambda, Cloudflare) implements
 * this to wire the RequestHandler into its native server model.
 */
export interface ServerAdapter {
  serve(handler: RequestHandler): void;
}
