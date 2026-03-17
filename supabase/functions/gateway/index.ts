/**
 * API Gateway Edge Function — Deno/Supabase Entry Point
 *
 * This is a thin platform adapter that wires the platform-agnostic gateway
 * core to Deno.serve(). All business logic lives in ./core.ts.
 *
 * To run this gateway on a different platform, create a new entry point
 * that uses a different adapter:
 *
 *   Lambda:     See _shared/platform/adapters/lambda.ts
 *   Workers:    See _shared/platform/adapters/cloudflare-worker.ts
 *   Node.js:    See _shared/platform/adapters/node-http.ts
 *
 * Request format:
 *   POST /gateway
 *   { "action": "properties.list", "params": { ... } }
 *
 * Response format:
 *   { "data": { ... }, "meta": { "pagination": { ... } } }
 *   { "error": { "code": "NOT_FOUND", "message": "..." } }
 */

import { createSupabaseDeps } from '../_shared/platform/supabase-deps.ts';
import { createGatewayHandler } from './core.ts';

// Re-export types so existing handler imports continue to work
export type { GatewayContext, GatewayResponse, Handler, Pagination } from './core.ts';

// =============================================================================
// DENO ENTRY POINT
// =============================================================================

// Initialize platform dependencies (Supabase-specific)
const deps = createSupabaseDeps();

// Create the platform-agnostic request handler
const handler = createGatewayHandler(deps);

// Mount on Deno.serve
Deno.serve(handler);
