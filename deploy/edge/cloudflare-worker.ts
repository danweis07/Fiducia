/**
 * Cloudflare Workers Adapter
 *
 * Edge worker that runs in front of the static SPA for:
 * - Tenant detection by hostname
 * - Security headers injection
 * - Geo-routing and compliance checks
 * - Edge-side caching of public API responses
 *
 * Deploy: `npx wrangler deploy deploy/edge/cloudflare-worker.ts`
 * Or integrate with Cloudflare Pages Functions.
 */

export interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  ASSETS: Fetcher; // Cloudflare Pages static assets binding
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Serve static assets directly
    if (
      url.pathname.startsWith('/assets/') ||
      url.pathname === '/favicon.ico'
    ) {
      const assetResponse = await env.ASSETS.fetch(request);
      const response = new Response(assetResponse.body, assetResponse);
      response.headers.set(
        'Cache-Control',
        'public, max-age=31536000, immutable'
      );
      return response;
    }

    // Fetch the SPA shell for all other routes
    const assetResponse = await env.ASSETS.fetch(
      new Request(new URL('/index.html', url.origin), request)
    );
    const response = new Response(assetResponse.body, assetResponse);

    // --- Security Headers ---
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    );
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(self)'
    );

    // --- Tenant Detection ---
    const host = request.headers.get('host') ?? '';
    const tenantSlug = host.split('.')[0];
    if (tenantSlug && tenantSlug !== 'www' && tenantSlug !== 'app') {
      response.headers.set('x-tenant-slug', tenantSlug);
    }

    // --- Geo Header ---
    const country =
      (request as unknown as { cf?: { country?: string } }).cf?.country ?? 'US';
    response.headers.set('x-user-country', country);

    return response;
  },
} satisfies ExportedHandler<Env>;
