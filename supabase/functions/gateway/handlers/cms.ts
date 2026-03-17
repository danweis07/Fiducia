/**
 * CMS Domain Handlers
 *
 * Gateway handlers for content management: channels, content lifecycle,
 * content versioning, and API token management.
 *
 * IMPORTANT:
 * - All data is scoped by ctx.firmId for tenant isolation.
 * - NEVER log PII or token values.
 * - Raw API tokens are returned only once at creation time.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

function toChannel(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContent(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    title: row.title,
    slug: row.slug,
    contentType: row.content_type,
    body: row.body,
    summary: row.summary,
    channels: row.channels,
    status: row.status,
    version: row.version,
    authorId: row.author_id,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toContentVersion(row: Record<string, unknown>) {
  return {
    id: row.id,
    contentId: row.content_id,
    version: row.version,
    title: row.title,
    body: row.body,
    summary: row.summary,
    authorId: row.author_id,
    createdAt: row.created_at,
  };
}

function toApiToken(row: Record<string, unknown>) {
  return {
    id: row.id,
    firmId: row.firm_id,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    isRevoked: row.is_revoked,
    revokedAt: row.revoked_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

// =============================================================================
// CHANNELS
// =============================================================================

export async function listChannels(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('cms_channels')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('name', { ascending: true });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toChannel) };
}

export async function updateChannel(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing channel id' }, status: 400 };
  }

  // Build update payload mapping camelCase params to snake_case columns
  const payload: Record<string, unknown> = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.isActive !== undefined) payload.is_active = updates.isActive;
  payload.updated_at = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_channels')
    .update(payload)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }
  if (!data) {
    return { error: { code: 'NOT_FOUND', message: 'Channel not found' }, status: 404 };
  }

  return { data: toChannel(data) };
}

// =============================================================================
// CONTENT
// =============================================================================

export async function listContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    status,
    contentType,
    channel,
    limit = 20,
    offset = 0,
  } = ctx.params as Record<string, unknown>;

  const lim = Number(limit);
  const off = Number(offset);

  // Count query
  let countQuery = ctx.db
    .from('cms_content')
    .select('id', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId);

  if (status) countQuery = countQuery.eq('status', status);
  if (contentType) countQuery = countQuery.eq('content_type', contentType);
  if (channel) countQuery = countQuery.contains('channels', [channel]);

  const { count, error: countError } = await countQuery;
  if (countError) {
    return { error: { code: 'DB_ERROR', message: countError.message }, status: 500 };
  }

  // Data query
  let dataQuery = ctx.db
    .from('cms_content')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .order('updated_at', { ascending: false })
    .range(off, off + lim - 1);

  if (status) dataQuery = dataQuery.eq('status', status);
  if (contentType) dataQuery = dataQuery.eq('content_type', contentType);
  if (channel) dataQuery = dataQuery.contains('channels', [channel]);

  const { data, error } = await dataQuery;
  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return {
    data: (data ?? []).map(toContent),
    meta: { pagination: paginate(count ?? 0, lim, off) },
  };
}

export async function getContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing content id' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('cms_content')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  return { data: toContent(data) };
}

export async function createContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { title, slug, contentType, body, summary, channels } = ctx.params as Record<string, unknown>;
  if (!title || !contentType) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required fields: title, contentType' }, status: 400 };
  }

  const now = new Date().toISOString();
  const insertPayload = {
    firm_id: ctx.firmId,
    title,
    slug: slug ?? null,
    content_type: contentType,
    body: body ?? null,
    summary: summary ?? null,
    channels: channels ?? [],
    status: 'draft',
    version: 1,
    author_id: ctx.userId,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await ctx.db
    .from('cms_content')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Insert first version record
  const { error: versionError } = await ctx.db
    .from('cms_content_versions')
    .insert({
      content_id: data.id,
      version: 1,
      title: data.title,
      body: data.body,
      summary: data.summary,
      author_id: ctx.userId,
      created_at: now,
    });

  if (versionError) {
    // Log but don't fail the request — content was created successfully
    console.error(JSON.stringify({
      level: 'error',
      handler: 'cms.createContent',
      message: 'Failed to insert version record',
      error: versionError.message,
    }));
  }

  return { data: toContent(data) };
}

export async function updateContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id, ...updates } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing content id' }, status: 400 };
  }

  // Fetch current content to get the current version
  const { data: existing, error: fetchError } = await ctx.db
    .from('cms_content')
    .select('*')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchError || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  const newVersion = Number(existing.version) + 1;
  const now = new Date().toISOString();

  // Build update payload
  const payload: Record<string, unknown> = { updated_at: now, version: newVersion };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.slug !== undefined) payload.slug = updates.slug;
  if (updates.body !== undefined) payload.body = updates.body;
  if (updates.summary !== undefined) payload.summary = updates.summary;
  if (updates.channels !== undefined) payload.channels = updates.channels;
  if (updates.contentType !== undefined) payload.content_type = updates.contentType;

  const { data, error } = await ctx.db
    .from('cms_content')
    .update(payload)
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Insert version record
  const { error: versionError } = await ctx.db
    .from('cms_content_versions')
    .insert({
      content_id: data.id,
      version: newVersion,
      title: data.title,
      body: data.body,
      summary: data.summary,
      author_id: ctx.userId,
      created_at: now,
    });

  if (versionError) {
    console.error(JSON.stringify({
      level: 'error',
      handler: 'cms.updateContent',
      message: 'Failed to insert version record',
      error: versionError.message,
    }));
  }

  return { data: toContent(data) };
}

export async function deleteContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing content id' }, status: 400 };
  }

  // Only allow deletion of draft or archived content
  const { data: existing, error: fetchError } = await ctx.db
    .from('cms_content')
    .select('status')
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .single();

  if (fetchError || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  if (existing.status !== 'draft' && existing.status !== 'archived') {
    return {
      error: { code: 'BAD_REQUEST', message: 'Only draft or archived content can be deleted' },
      status: 400,
    };
  }

  const { error } = await ctx.db
    .from('cms_content')
    .delete()
    .eq('id', id)
    .eq('firm_id', ctx.firmId);

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: { success: true } };
}

export async function publishContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing content id' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_content')
    .update({ status: 'published', published_at: now, updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  return { data: toContent(data) };
}

export async function archiveContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing content id' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_content')
    .update({ status: 'archived', updated_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('*')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  return { data: toContent(data) };
}

// =============================================================================
// CONTENT VERSIONS
// =============================================================================

export async function getContentVersions(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { contentId } = ctx.params as Record<string, unknown>;
  if (!contentId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing contentId' }, status: 400 };
  }

  // Verify the content belongs to this firm
  const { data: content, error: contentError } = await ctx.db
    .from('cms_content')
    .select('id')
    .eq('id', contentId)
    .eq('firm_id', ctx.firmId)
    .single();

  if (contentError || !content) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  const { data, error } = await ctx.db
    .from('cms_content_versions')
    .select('*')
    .eq('content_id', contentId)
    .order('version', { ascending: false });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toContentVersion) };
}

// =============================================================================
// API TOKENS
// =============================================================================

export async function listTokens(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('cms_api_tokens')
    .select('id, firm_id, name, prefix, scopes, is_revoked, revoked_at, expires_at, last_used_at, created_by, created_at')
    .eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  return { data: (data ?? []).map(toApiToken) };
}

export async function createToken(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { name, scopes, expiresAt } = ctx.params as Record<string, unknown>;
  if (!name) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing token name' }, status: 400 };
  }

  // Generate random token with cms_ prefix
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawHex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const rawToken = `cms_${rawHex}`;
  const prefix = rawToken.slice(0, 8);

  // SHA-256 hash for storage
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_api_tokens')
    .insert({
      firm_id: ctx.firmId,
      name,
      prefix,
      token_hash: tokenHash,
      scopes: scopes ?? [],
      is_revoked: false,
      expires_at: expiresAt ?? null,
      created_by: ctx.userId,
      created_at: now,
    })
    .select('id, firm_id, name, prefix, scopes, is_revoked, revoked_at, expires_at, last_used_at, created_by, created_at')
    .single();

  if (error) {
    return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  }

  // Return the raw token once — it cannot be retrieved again
  return {
    data: {
      ...toApiToken(data),
      token: rawToken,
    },
  };
}

export async function revokeToken(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { id } = ctx.params as Record<string, unknown>;
  if (!id) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing token id' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_api_tokens')
    .update({ is_revoked: true, revoked_at: now })
    .eq('id', id)
    .eq('firm_id', ctx.firmId)
    .select('id, firm_id, name, prefix, scopes, is_revoked, revoked_at, expires_at, last_used_at, created_by, created_at')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Token not found' }, status: 404 };
  }

  return { data: toApiToken(data) };
}

// =============================================================================
// PUBLIC CONTENT (no auth required)
// =============================================================================

export async function getPublicContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const { slug } = ctx.params as Record<string, unknown>;
  if (!slug) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing slug' }, status: 400 };
  }

  const now = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('cms_content')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Content not found' }, status: 404 };
  }

  return { data: { content: toContent(data) } };
}

export async function listPublicContent(ctx: GatewayContext): Promise<GatewayResponse> {
  const { contentType, channel, limit: rawLimit, offset: rawOffset } = ctx.params as Record<string, unknown>;
  const limit = Math.min(Number(rawLimit) || 20, 100);
  const offset = Number(rawOffset) || 0;
  const now = new Date().toISOString();

  let query = ctx.db
    .from('cms_content')
    .select('*', { count: 'exact' })
    .eq('status', 'published')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (contentType) query = query.eq('content_type', contentType);
  if (channel) query = query.contains('channels', [channel]);

  const { data, count, error } = await query;

  if (error) {
    return { error: { code: 'INTERNAL', message: 'Failed to list content' }, status: 500 };
  }

  return {
    data: { content: (data ?? []).map(toContent) },
    meta: { pagination: paginate(count ?? 0, limit, offset) },
  };
}
