/**
 * Node.js HTTP Server Adapter
 *
 * Wraps a platform-agnostic RequestHandler as a Node.js http.Server.
 * Works with Railway, Render, Fly.io, or any container-based deployment.
 *
 * Usage:
 *   import { serveNode } from './adapters/node-http.ts';
 *   import { createGatewayHandler } from '../gateway/core.ts';
 *   import { createNodeDeps } from './node-deps.ts';
 *
 *   const deps = createNodeDeps();
 *   const handler = createGatewayHandler(deps);
 *   serveNode(handler, { port: 3000 });
 *
 * NOTE: This file uses Node.js APIs and is NOT meant to run in Deno.
 * It's here as a reference implementation for when you deploy outside Supabase.
 */

import type { RequestHandler, ServerAdapter } from '../types.ts';

interface ServeOptions {
  port?: number;
  hostname?: string;
}

/**
 * Creates a Node.js HTTP server adapter.
 *
 * Implementation note: This uses the Fetch API-compatible Request/Response
 * which is available in Node 18+ via the `undici` global.
 * For Node 16, you'd need the `node-fetch` polyfill.
 */
export function createNodeHttpAdapter(options?: ServeOptions): ServerAdapter {
  return {
    serve(handler: RequestHandler): void {
      const port = options?.port ?? parseInt(
        typeof process !== 'undefined' ? (process.env.PORT ?? '3000') : '3000',
        10,
      );
      const hostname = options?.hostname ?? '0.0.0.0';

      // Dynamic import to avoid breaking Deno — this file is for Node only
      import('node:http').then(({ createServer }) => {
        const server = createServer(async (nodeReq, nodeRes) => {
          try {
            // Build standard Request from Node IncomingMessage
            const protocol = (nodeReq.headers['x-forwarded-proto'] as string) || 'http';
            const host = nodeReq.headers.host || `${hostname}:${port}`;
            const url = `${protocol}://${host}${nodeReq.url}`;

            const headers = new Headers();
            for (const [key, value] of Object.entries(nodeReq.headers)) {
              if (value) {
                headers.set(key, Array.isArray(value) ? value.join(', ') : value);
              }
            }

            // Read body for non-GET/HEAD
            let body: string | undefined;
            if (nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD') {
              const chunks: Buffer[] = [];
              for await (const chunk of nodeReq) {
                chunks.push(chunk as Buffer);
              }
              body = Buffer.concat(chunks).toString('utf-8');
            }

            const request = new Request(url, {
              method: nodeReq.method ?? 'GET',
              headers,
              body,
            });

            // Execute handler
            const response = await handler(request);

            // Write response
            nodeRes.statusCode = response.status;
            response.headers.forEach((value, key) => {
              nodeRes.setHeader(key, value);
            });
            nodeRes.end(await response.text());
          } catch (err) {
            console.error('Gateway error:', err);
            nodeRes.statusCode = 500;
            nodeRes.setHeader('Content-Type', 'application/json');
            nodeRes.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } }));
          }
        });

        server.listen(port, hostname, () => {
          console.warn(`Gateway listening on ${hostname}:${port}`);
        });
      });
    },
  };
}
