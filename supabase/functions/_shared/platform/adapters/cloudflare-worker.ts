/**
 * Cloudflare Workers Server Adapter
 *
 * Wraps a platform-agnostic RequestHandler as a Cloudflare Worker.
 * Cloudflare Workers natively use the standard Request/Response API,
 * so this adapter is minimal.
 *
 * Usage:
 *   import { createWorkerHandler } from './adapters/cloudflare-worker.ts';
 *   import { createGatewayHandler } from '../gateway/core.ts';
 *
 *   export default createWorkerHandler(async (env) => {
 *     const deps = createCloudfareDeps(env);
 *     return createGatewayHandler(deps);
 *   });
 */

import type { RequestHandler } from '../types.ts';

interface CloudflareEnv {
  [key: string]: string | undefined;
}

interface CloudflareExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

/**
 * Creates a Cloudflare Worker module export.
 * The factory receives the Cloudflare env bindings so you can
 * construct PlatformDeps with the correct secrets.
 */
export function createWorkerHandler(
  factory: (env: CloudflareEnv) => Promise<RequestHandler> | RequestHandler,
) {
  let cachedHandler: RequestHandler | null = null;
  let cachedEnvKey: string | null = null;

  return {
    async fetch(
      request: Request,
      env: CloudflareEnv,
      _ctx: CloudflareExecutionContext,
    ): Promise<Response> {
      // Lazily initialize (or re-initialize if env bindings change).
      // Compare by serialized key since CF Workers pass a new env object per request.
      const envKey = JSON.stringify(Object.keys(env).sort());
      if (!cachedHandler || cachedEnvKey !== envKey) {
        cachedHandler = await factory(env);
        cachedEnvKey = envKey;
      }

      return cachedHandler(request);
    },
  };
}
