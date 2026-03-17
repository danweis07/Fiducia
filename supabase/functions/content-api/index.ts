/**
 * Public Content API — Headless CMS endpoint
 *
 * Token-authenticated edge function that serves published content
 * to external CMS consumers. Validates API tokens with scope and
 * channel restrictions.
 *
 * Usage:
 *   GET /functions/v1/content-api?channel=web_portal&content_type=announcement
 *   Authorization: Bearer cms_xxxx_sk_live_...
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// SHA-256 hash
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Extract Bearer token
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing or invalid Authorization header. Use: Bearer <token>' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
  const rawToken = authHeader.slice(7);

  // Parse query params
  const url = new URL(req.url);
  const channel = url.searchParams.get('channel');
  const contentType = url.searchParams.get('content_type');
  const slug = url.searchParams.get('slug');
  const locale = url.searchParams.get('locale') || 'en';
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  const limit = Math.min(Number(limitParam) || 50, 100);
  const offset = Number(offsetParam) || 0;

  // Admin client for token validation (service role)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Validate token
  const tokenHash = await sha256(rawToken);
  const tokenPrefix = rawToken.slice(0, 8);

  const { data: tokenRecord, error: tokenError } = await supabase
    .from('cms_api_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('token_prefix', tokenPrefix)
    .eq('is_revoked', false)
    .single();

  if (tokenError || !tokenRecord) {
    return new Response(
      JSON.stringify({ error: 'Invalid or revoked API token' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check expiry
  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'Token has expired' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check scope — only 'read' scope can access this endpoint
  if (!tokenRecord.scopes.includes('read')) {
    return new Response(
      JSON.stringify({ error: 'Token does not have read scope' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check channel restriction
  if (channel && tokenRecord.allowed_channels && !tokenRecord.allowed_channels.includes(channel)) {
    return new Response(
      JSON.stringify({ error: `Token not authorized for channel: ${channel}` }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('cms_api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRecord.id)
    .then();

  // Build query — only return published content for the tenant
  let query = supabase
    .from('cms_content')
    .select('id, slug, title, body, content_type, status, channels, metadata, locale, published_at, expires_at, version, updated_at')
    .eq('firm_id', tokenRecord.firm_id)
    .eq('status', 'published')
    .eq('locale', locale)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by channel
  if (channel) {
    query = query.contains('channels', [channel]);
  }

  // Filter by content type
  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  // Filter by slug
  if (slug) {
    query = query.eq('slug', slug);
  }

  // Exclude expired content
  query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

  const { data: content, error: contentError, count } = await query;

  if (contentError) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch content' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Transform snake_case to camelCase for external consumers
  const items = (content || []).map((item: Record<string, unknown>) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    body: item.body,
    contentType: item.content_type,
    channels: item.channels,
    metadata: item.metadata,
    locale: item.locale,
    publishedAt: item.published_at,
    expiresAt: item.expires_at,
    version: item.version,
    updatedAt: item.updated_at,
  }));

  return new Response(
    JSON.stringify({
      data: items,
      pagination: {
        total: count ?? items.length,
        limit,
        offset,
        hasMore: items.length === limit,
      },
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    }
  );
});
