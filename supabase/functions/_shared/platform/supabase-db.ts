/**
 * Supabase Database Adapter
 *
 * Implements DatabasePort by delegating to supabase-js.
 * This is the default adapter for Supabase Edge Functions.
 * Alternative implementations (e.g., PrismaDbAdapter, DrizzleDbAdapter)
 * can be swapped in for other platforms.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { DatabasePort, QueryBuilder, QueryResult, SingleResult } from './types.ts';

// =============================================================================
// SUPABASE QUERY BUILDER WRAPPER
// =============================================================================

/**
 * Wraps a Supabase PostgREST query builder to conform to the
 * platform-agnostic QueryBuilder interface.
 */
class SupabaseQueryBuilder<T = Record<string, unknown>> implements QueryBuilder<T> {
  private query: ReturnType<SupabaseClient['from']>;

  constructor(query: ReturnType<SupabaseClient['from']>) {
    this.query = query;
  }

  select(columns: string, options?: { count?: 'exact'; head?: boolean }): QueryBuilder<T> {
    this.query = this.query.select(columns, options);
    return this;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): QueryBuilder<T> {
    this.query = this.query.insert(values);
    return this;
  }

  update(values: Record<string, unknown>): QueryBuilder<T> {
    this.query = this.query.update(values);
    return this;
  }

  delete(): QueryBuilder<T> {
    this.query = this.query.delete();
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }): QueryBuilder<T> {
    this.query = this.query.upsert(values, options);
    return this;
  }

  eq(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.eq(column, value);
    return this;
  }

  neq(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.neq(column, value);
    return this;
  }

  gt(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.gt(column, value);
    return this;
  }

  gte(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.gte(column, value);
    return this;
  }

  lt(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.lt(column, value);
    return this;
  }

  lte(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.lte(column, value);
    return this;
  }

  like(column: string, pattern: string): QueryBuilder<T> {
    this.query = this.query.like(column, pattern);
    return this;
  }

  ilike(column: string, pattern: string): QueryBuilder<T> {
    this.query = this.query.ilike(column, pattern);
    return this;
  }

  is(column: string, value: null | boolean): QueryBuilder<T> {
    this.query = this.query.is(column, value);
    return this;
  }

  in(column: string, values: unknown[]): QueryBuilder<T> {
    this.query = this.query.in(column, values);
    return this;
  }

  contains(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.contains(column, value);
    return this;
  }

  containedBy(column: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.containedBy(column, value);
    return this;
  }

  or(filters: string, options?: { referencedTable?: string }): QueryBuilder<T> {
    this.query = this.query.or(filters, options);
    return this;
  }

  not(column: string, operator: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.not(column, operator, value);
    return this;
  }

  filter(column: string, operator: string, value: unknown): QueryBuilder<T> {
    this.query = this.query.filter(column, operator, value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): QueryBuilder<T> {
    this.query = this.query.order(column, options);
    return this;
  }

  limit(count: number): QueryBuilder<T> {
    this.query = this.query.limit(count);
    return this;
  }

  range(from: number, to: number): QueryBuilder<T> {
    this.query = this.query.range(from, to);
    return this;
  }

  async single(): Promise<SingleResult<T>> {
    const result = await this.query.single();
    return { data: result.data as T | null, error: result.error };
  }

  async maybeSingle(): Promise<SingleResult<T>> {
    const result = await this.query.maybeSingle();
    return { data: result.data as T | null, error: result.error };
  }

  async execute(): Promise<QueryResult<T>> {
    const result = await this.query;
    return {
      data: result.data as T[] | null,
      error: result.error,
      count: result.count ?? null,
    };
  }

  // Implement thenable so `await builder` works (backward compat with existing handler patterns)
  get then(): Promise<QueryResult<T>>['then'] {
    const promise = this.execute();
    return promise.then.bind(promise);
  }
}

// =============================================================================
// SUPABASE DATABASE PORT
// =============================================================================

export class SupabaseDatabaseAdapter implements DatabasePort {
  private client: SupabaseClient;

  constructor(client: SupabaseClient);
  constructor(url: string, serviceRoleKey: string);
  constructor(urlOrClient: string | SupabaseClient, serviceRoleKey?: string) {
    if (typeof urlOrClient === 'string') {
      this.client = createClient(urlOrClient, serviceRoleKey!);
    } else {
      this.client = urlOrClient;
    }
  }

  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new SupabaseQueryBuilder<T>(this.client.from(table));
  }

  async rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<SingleResult<T>> {
    const result = await this.client.rpc(fn, params);
    return { data: result.data as T | null, error: result.error };
  }

  /** Expose the underlying client for code that still needs raw Supabase access during migration */
  get rawClient(): SupabaseClient {
    return this.client;
  }
}
