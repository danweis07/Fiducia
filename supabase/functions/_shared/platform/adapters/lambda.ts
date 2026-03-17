/**
 * AWS Lambda Server Adapter
 *
 * Wraps a platform-agnostic RequestHandler as an AWS Lambda handler.
 * Uses API Gateway v2 (HTTP API) payload format.
 *
 * Usage:
 *   import { createLambdaHandler } from './adapters/lambda.ts';
 *   import { createGatewayHandler } from '../gateway/core.ts';
 *   import { createNodeDeps } from './node-deps.ts';
 *
 *   const deps = createNodeDeps();
 *   const handler = createGatewayHandler(deps);
 *   export const lambdaHandler = createLambdaHandler(handler);
 */

import type { RequestHandler } from '../types.ts';

// AWS API Gateway v2 types (inline to avoid external dependency)
interface APIGatewayProxyEventV2 {
  version: string;
  routeKey: string;
  rawPath: string;
  rawQueryString: string;
  headers: Record<string, string | undefined>;
  requestContext: {
    http: { method: string; path: string; sourceIp: string };
    requestId: string;
  };
  body?: string;
  isBase64Encoded: boolean;
}

interface APIGatewayProxyResultV2 {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
}

/**
 * Converts an API Gateway v2 event into a standard Request,
 * passes it to the handler, and converts the Response back.
 */
export function createLambdaHandler(handler: RequestHandler) {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    // Build a standard Request from the Lambda event
    const url = `https://${event.headers?.host ?? 'localhost'}${event.rawPath}${event.rawQueryString ? '?' + event.rawQueryString : ''}`;
    const method = event.requestContext.http.method;

    const headers = new Headers();
    for (const [key, value] of Object.entries(event.headers)) {
      if (value) headers.set(key, value);
    }

    // Inject source IP as x-forwarded-for if not present
    if (!headers.has('x-forwarded-for')) {
      headers.set('x-forwarded-for', event.requestContext.http.sourceIp);
    }

    const body = event.body
      ? event.isBase64Encoded
        ? Uint8Array.from(atob(event.body), (c) => c.charCodeAt(0))
        : event.body
      : undefined;

    const request = new Request(url, {
      method,
      headers,
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
    });

    // Execute the platform-agnostic handler
    let response: Response;
    try {
      response = await handler(request);
    } catch (err) {
      console.error('Lambda handler error:', err);
      const message = err instanceof Error ? err.message : 'Internal server error';
      response = new Response(
        JSON.stringify({ error: { code: 'INTERNAL_ERROR', message } }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Convert Response back to Lambda format
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = await response.text();

    return {
      statusCode: response.status,
      headers: responseHeaders,
      body: responseBody,
      isBase64Encoded: false,
    };
  };
}
