// CORS headers for edge functions
// Restrict origins based on ALLOWED_ORIGINS env var (comma-separated).
// Falls back to '*' only when ALLOWED_ORIGINS is not set (development mode).

import type { EnvProvider } from './platform/types.ts';

/** Platform-agnostic env access with Deno fallback */
function getEnvVar(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  // Fallback to Deno.env for backward compatibility
  if (typeof Deno !== 'undefined' && Deno.env) return Deno.env.get(key);
  // Fallback to process.env for Node.js
  if (typeof process !== 'undefined' && process.env) return process.env[key];
  return undefined;
}

function getAllowedOrigins(env?: EnvProvider): string[] {
  const raw = getEnvVar('ALLOWED_ORIGINS', env) ?? '';
  if (!raw) return [];
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

function resolveOrigin(req: Request, env?: EnvProvider): string {
  const allowedOrigins = getAllowedOrigins(env);

  // Development fallback: if no origins configured, allow all
  if (allowedOrigins.length === 0) {
    return '*';
  }

  const requestOrigin = req.headers.get('Origin') ?? '';
  if (allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // If origin not in allow-list, return the first allowed origin
  // (browser will block the request due to mismatch)
  return allowedOrigins[0];
}

const baseHeaders: Record<string, string> = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function getCorsHeaders(req: Request, env?: EnvProvider): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': resolveOrigin(req, env),
    ...baseHeaders,
  };
}

// Backwards-compatible static export for code that does not have access
// to the request object. Uses wildcard (development-safe default).
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': getAllowedOrigins().length === 0 ? '*' : getAllowedOrigins()[0],
  ...baseHeaders,
};

export function handleCors(req: Request, env?: EnvProvider): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req, env) });
  }
  return null;
}

export function withCors(headers: Record<string, string>, req: Request, env?: EnvProvider): Record<string, string> {
  return { ...headers, ...getCorsHeaders(req, env) };
}

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Returns recommended security headers for all responses.
 * These complement CORS headers and should be merged into every response.
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=(self)',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  };
}

/**
 * Merges CORS + security headers into a Headers object.
 * Use this as a convenience for building Response headers.
 */
export function getAllResponseHeaders(req?: Request, env?: EnvProvider): Record<string, string> {
  const cors = req ? getCorsHeaders(req, env) : corsHeaders;
  return { ...cors, ...getSecurityHeaders() };
}
