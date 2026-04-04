/**
 * Gateway Core — Platform-Agnostic Request Handler
 *
 * Contains ALL gateway business logic decoupled from Deno.serve / Supabase.
 * This module receives a PlatformDeps container and returns a standard
 * Request → Response handler that can be mounted on ANY runtime:
 *
 *   - Deno (Supabase Edge Functions): index.ts calls Deno.serve(handler)
 *   - AWS Lambda: lambda adapter wraps handler
 *   - Cloudflare Workers: worker adapter wraps handler
 *   - Node.js (Railway/Docker): node-http adapter wraps handler
 *
 * The key insight: business logic (routing, validation, middleware, auth
 * extraction, GraphQL execution) is all platform-agnostic. Only env access,
 * DB queries, and auth validation need platform adapters.
 */

import type { PlatformDeps, DatabasePort } from '../_shared/platform/types.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { routes } from './routes.ts';
import { validateParams, ValidationError } from './validation.ts';
import {
  generateRequestId,
  defaultMiddleware,
  runMiddleware,
  auditLog,
  logRequest,
  type MiddlewareContext,
} from './middleware.ts';
import { isGraphQLRequest, executeGraphQL, handleSchemaRequest } from './graphql.ts';
import { resolveLocale } from '../_shared/i18n/index.ts';
import type { SupportedLocale } from '../_shared/i18n/types.ts';

// Re-export types that handlers use (backward compat during migration)
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { SupabaseDatabaseAdapter as _SupabaseDatabaseAdapter } from '../_shared/platform/supabase-db.ts';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Legacy GatewayContext — preserved for backward compatibility.
 * Handlers that still use `ctx.supabase` get a working client via the
 * compatibility shim. New handlers should use `ctx.db` and `ctx.deps` instead.
 */
export interface GatewayContext {
  /** @deprecated Use ctx.db instead — direct Supabase access will be removed */
  supabase: SupabaseClient;
  /** Platform-agnostic database port */
  db: DatabasePort;
  /** Full platform dependencies */
  deps: PlatformDeps;
  params: Record<string, unknown>;
  userId?: string;
  firmId?: string;
  /** Resolved locale from Accept-Language header */
  locale: SupportedLocale;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GatewayResponse {
  data?: unknown;
  error?: { code: string; message: string; fieldErrors?: unknown };
  status?: number;
  meta?: { pagination?: Pagination };
}

export type Handler = (ctx: GatewayContext) => Promise<GatewayResponse>;

// =============================================================================
// AUTH EXTRACTION
// =============================================================================

async function extractAuth(
  req: Request,
  deps: PlatformDeps,
): Promise<{ userId?: string; firmId?: string }> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return {};

  const token = authHeader.slice(7);
  try {
    const { user, error } = await deps.auth.getUser(token);
    if (error || !user) return {};

    // Look up firm membership using the database port
    const { data: firmUser } = await deps.db
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    return {
      userId: user.id,
      firmId: (firmUser as Record<string, unknown> | null)?.firm_id as string | undefined,
    };
  } catch {
    return {};
  }
}

// =============================================================================
// CORE HANDLER FACTORY
// =============================================================================

/**
 * Creates the platform-agnostic gateway request handler.
 *
 * This is the "Universal Function Wrapper" — all business logic lives here.
 * Platform adapters (Deno.serve, Lambda, Workers) simply call this.
 */
export function createGatewayHandler(deps: PlatformDeps): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    // CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // GraphQL schema introspection (GET ?graphql)
    const schemaResponse = handleSchemaRequest(req);
    if (schemaResponse) return schemaResponse;

    // Only accept POST
    if (req.method !== 'POST') {
      return jsonResponse(
        { error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST' } },
        405,
      );
    }

    const requestId = generateRequestId();
    const requestStart = performance.now();

    try {
      // Parse request body
      const body = await req.json();

      // Extract auth context
      const auth = await extractAuth(req, deps);

      // Build the raw Supabase client reference for backward compat
      // (handlers that still use ctx.supabase during migration)
      const rawClient = getRawSupabaseClient(deps.db);

      // =========================================================================
      // GRAPHQL MODE
      // =========================================================================
      if (isGraphQLRequest(req, body)) {
        const ctx: GatewayContext = {
          supabase: rawClient,
          db: deps.db,
          deps,
          params: {},
          userId: auth.userId,
          firmId: auth.firmId,
          locale: resolveLocale(req),
        };

        const gqlResult = await executeGraphQL(
          body as { query: string; variables?: Record<string, unknown> },
          ctx,
        );
        const durationMs = Math.round(performance.now() - requestStart);

        console.warn(JSON.stringify({
          level: 'info',
          type: 'gateway_graphql',
          request_id: requestId,
          duration_ms: durationMs,
          user_id: auth.userId ?? null,
          timestamp: new Date().toISOString(),
        }));

        return jsonResponse(
          { ...gqlResult, meta: { requestId, timing: { durationMs } } },
          200,
          requestId,
        );
      }

      // =========================================================================
      // RPC MODE (existing action-based protocol)
      // =========================================================================
      const { action, params = {} } = body as { action?: string; params?: Record<string, unknown> };

      if (!action || typeof action !== 'string') {
        return jsonResponse(
          { error: { code: 'BAD_REQUEST', message: 'Missing or invalid "action" field' } },
          400,
          requestId,
        );
      }

      // Find handler
      const handler = routes[action];
      if (!handler) {
        return jsonResponse(
          { error: { code: 'NOT_FOUND', message: `Unknown action: ${action}` } },
          404,
          requestId,
        );
      }

      // Validate params
      let validatedParams: Record<string, unknown>;
      try {
        validatedParams = validateParams(action, params);
      } catch (err: unknown) {
        if (err instanceof ValidationError) {
          return jsonResponse(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: err.message,
                fieldErrors: err.fieldErrors,
              },
            },
            400,
            requestId,
          );
        }
        throw err;
      }

      // Build context (with both legacy supabase and new db/deps)
      const ctx: GatewayContext = {
        supabase: rawClient,
        db: deps.db,
        deps,
        params: validatedParams,
        userId: auth.userId,
        firmId: auth.firmId,
        locale: resolveLocale(req),
      };

      // Run middleware pipeline (IP filter → size check → rate limit)
      const mctx: MiddlewareContext = {
        req,
        action,
        ctx,
        requestId,
        startTime: requestStart,
        meta: {},
      };

      const middlewareResult = await runMiddleware(defaultMiddleware, mctx);
      if (middlewareResult) {
        logRequest(mctx, middlewareResult, Math.round(performance.now() - requestStart));
        return jsonResponse(
          { error: middlewareResult.error },
          middlewareResult.status ?? 429,
          requestId,
        );
      }

      // Execute handler with timing
      const handlerStart = performance.now();
      const result = await handler(ctx);
      const durationMs = Math.round(performance.now() - handlerStart);
      const totalDurationMs = Math.round(performance.now() - requestStart);

      // Post-handler middleware: audit log (fire-and-forget)
      auditLog(mctx, result);

      // Build response
      const status = result.status ?? (result.error ? 400 : 200);
      const responseBody: Record<string, unknown> = {};

      if (result.error) {
        responseBody.error = result.error;
      } else {
        responseBody.data = result.data;
      }

      // Merge handler meta with timing + middleware meta
      const meta: Record<string, unknown> = {
        ...(result.meta ?? {}),
        requestId,
        timing: { handlerMs: durationMs, totalMs: totalDurationMs },
        ...(mctx.meta.rateLimit ? { rateLimit: mctx.meta.rateLimit } : {}),
      };
      responseBody.meta = meta;

      // Structured request log
      logRequest(mctx, result, totalDurationMs);

      return jsonResponse(responseBody, status, requestId);
    } catch (err: unknown) {
      console.error('Gateway error:', err, 'requestId:', requestId);
      return jsonResponse(
        { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
        500,
        requestId,
      );
    }
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function jsonResponse(body: unknown, status: number, requestId?: string): Response {
  const headers: Record<string, string> = {
    ...corsHeaders,
    'Content-Type': 'application/json',
  };
  if (requestId) {
    headers['X-Request-Id'] = requestId;
  }
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Extract the raw SupabaseClient from a DatabasePort for backward compatibility.
 * During migration, handlers that still use ctx.supabase need the raw client.
 * Once all handlers are migrated to ctx.db, this can be removed.
 */
function getRawSupabaseClient(db: DatabasePort): SupabaseClient {
  // The SupabaseDatabaseAdapter exposes .rawClient for migration purposes
  if ('rawClient' in db && db.rawClient) {
    return db.rawClient as SupabaseClient;
  }
  // If using a non-Supabase adapter, return a proxy that throws helpful errors.
  // Uses recursive proxy so nested access (e.g. ctx.supabase.auth.admin) is also caught.
  const unavailableMsg = (path: string) =>
    `ctx.supabase.${path} is not available on this platform. ` +
    `Migrate this handler to use ctx.db instead.`;

  const createTrap = (path: string): ProxyHandler<Record<string, unknown>> => ({
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined;
      const fullPath = path ? `${path}.${String(prop)}` : String(prop);
      // Return a callable proxy so both property access and function calls throw
      return new Proxy(() => { throw new Error(unavailableMsg(fullPath)); }, {
        get: createTrap(fullPath).get!,
        apply() { throw new Error(unavailableMsg(fullPath)); },
      });
    },
  });

  return new Proxy({} as SupabaseClient, createTrap(''));
}
