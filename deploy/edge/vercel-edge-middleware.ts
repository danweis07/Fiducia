/**
 * Vercel Edge Middleware
 *
 * Runs at the edge before requests hit the origin. Use for:
 * - Geo-based routing / tenant detection
 * - Security headers injection
 * - Bot protection
 * - Feature flag evaluation at the edge
 *
 * Deploy: place as `middleware.ts` in the project root when using Vercel.
 * Docs: https://vercel.com/docs/functions/edge-middleware
 */

import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|assets/).*)'],
};

export default function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // --- Security Headers ---
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self)'
  );

  // --- Tenant Detection (by hostname) ---
  const host = request.headers.get('host') ?? '';
  const tenantSlug = host.split('.')[0]; // e.g., "acme" from "acme.bankingplatform.com"

  if (tenantSlug && tenantSlug !== 'www' && tenantSlug !== 'app') {
    response.headers.set('x-tenant-slug', tenantSlug);
  }

  // --- Geo Header (for compliance / locale) ---
  const country = request.geo?.country ?? 'US';
  response.headers.set('x-user-country', country);

  return response;
}
