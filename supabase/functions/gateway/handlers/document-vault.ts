/**
 * Document Vault Handlers
 */
import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

// =============================================================================
// LIST VAULT DOCUMENTS
// =============================================================================

export async function listVaultDocuments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const limit = Math.min((ctx.params.limit as number) || 20, 100);
  const offset = (ctx.params.offset as number) || 0;
  const category = ctx.params.category as string | undefined;

  let countQuery = ctx.db
    .from('vault_documents')
    .select('*', { count: 'exact', head: true })
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false);

  let dataQuery = ctx.db
    .from('vault_documents')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    countQuery = countQuery.eq('category', category);
    dataQuery = dataQuery.eq('category', category);
  }

  const { count } = await countQuery;
  const { data: rows, error } = await dataQuery;

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const total = count ?? 0;
  return {
    data: { documents: (rows ?? []).map(toDocument) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

// =============================================================================
// UPLOAD DOCUMENT (returns presigned upload URL)
// =============================================================================

export async function uploadDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const name = ctx.params.name as string;
  const category = ctx.params.category as string;
  if (!name || !category) {
    return { error: { code: 'INVALID_PARAMS', message: 'name and category required' }, status: 400 };
  }

  const now = new Date().toISOString();
  const storagePath = `vault/${ctx.firmId}/${ctx.userId}/${crypto.randomUUID()}`;

  const payload = {
    firm_id: ctx.firmId,
    user_id: ctx.userId,
    name,
    category,
    description: ctx.params.description ?? null,
    tags: ctx.params.tags ?? [],
    storage_path: storagePath,
    mime_type: (ctx.params.mimeType as string) ?? 'application/octet-stream',
    file_size_bytes: (ctx.params.fileSizeBytes as number) ?? 0,
    is_deleted: false,
    uploaded_at: now,
    updated_at: now,
  };

  const { data: row, error } = await ctx.db
    .from('vault_documents')
    .insert(payload)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  // Generate presigned upload URL
  const { data: signedUrl } = await ctx.supabase.storage
    .from('documents')
    .createSignedUploadUrl(storagePath);

  return {
    data: {
      document: toDocument(row),
      uploadUrl: signedUrl?.signedUrl ?? null,
    },
    status: 201,
  };
}

// =============================================================================
// GET VAULT DOCUMENT
// =============================================================================

export async function getVaultDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const documentId = ctx.params.documentId as string;
  if (!documentId) return { error: { code: 'INVALID_PARAMS', message: 'documentId required' }, status: 400 };

  const { data: row, error } = await ctx.db
    .from('vault_documents')
    .select('*')
    .eq('id', documentId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .single();

  if (error) return { error: { code: 'NOT_FOUND', message: 'Document not found' }, status: 404 };

  // Generate temporary download URL
  const storagePath = row.storage_path as string;
  const { data: signedUrl } = await ctx.supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);

  const doc = toDocument(row);
  doc.downloadUrl = signedUrl?.signedUrl ?? null;

  return { data: { document: doc } };
}

// =============================================================================
// UPDATE VAULT DOCUMENT
// =============================================================================

export async function updateVaultDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const documentId = ctx.params.documentId as string;
  if (!documentId) return { error: { code: 'INVALID_PARAMS', message: 'documentId required' }, status: 400 };

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (ctx.params.name !== undefined) updates.name = ctx.params.name;
  if (ctx.params.category !== undefined) updates.category = ctx.params.category;
  if (ctx.params.description !== undefined) updates.description = ctx.params.description;
  if (ctx.params.tags !== undefined) updates.tags = ctx.params.tags;

  const { data: row, error } = await ctx.db
    .from('vault_documents')
    .update(updates)
    .eq('id', documentId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .select('*')
    .single();

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { document: toDocument(row) } };
}

// =============================================================================
// DELETE VAULT DOCUMENT (soft-delete)
// =============================================================================

export async function deleteVaultDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const documentId = ctx.params.documentId as string;
  if (!documentId) return { error: { code: 'INVALID_PARAMS', message: 'documentId required' }, status: 400 };

  const { error } = await ctx.db
    .from('vault_documents')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { success: true } };
}

// =============================================================================
// GET VAULT SUMMARY
// =============================================================================

export async function getVaultSummary(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data: rows, error } = await ctx.db
    .from('vault_documents')
    .select('category, file_size_bytes')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };

  const docs = rows ?? [];
  const byCategory: Record<string, number> = {};
  let totalSizeBytes = 0;

  for (const doc of docs) {
    const cat = doc.category as string;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    totalSizeBytes += (doc.file_size_bytes as number) || 0;
  }

  return {
    data: {
      summary: {
        totalDocuments: docs.length,
        totalSizeBytes,
        byCategory,
      },
    },
  };
}

// =============================================================================
// SEARCH VAULT DOCUMENTS
// =============================================================================

export async function searchVaultDocuments(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const query = ctx.params.query as string;
  const category = ctx.params.category as string | undefined;
  const tags = ctx.params.tags as string[] | undefined;

  let dbQuery = ctx.db
    .from('vault_documents')
    .select('*')
    .eq('firm_id', ctx.firmId)
    .eq('user_id', ctx.userId)
    .eq('is_deleted', false)
    .order('uploaded_at', { ascending: false });

  if (query) {
    dbQuery = dbQuery.ilike('name', `%${query}%`);
  }
  if (category) {
    dbQuery = dbQuery.eq('category', category);
  }
  if (tags && tags.length > 0) {
    dbQuery = dbQuery.overlaps('tags', tags);
  }

  const { data: rows, error } = await dbQuery.limit(50);

  if (error) return { error: { code: 'DB_ERROR', message: error.message }, status: 500 };
  return { data: { documents: (rows ?? []).map(toDocument) } };
}

// =============================================================================
// MAPPERS
// =============================================================================

function toDocument(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description ?? null,
    tags: row.tags ?? [],
    mimeType: row.mime_type ?? 'application/octet-stream',
    fileSizeBytes: row.file_size_bytes ?? 0,
    downloadUrl: null as string | null,
    uploadedAt: row.uploaded_at,
    updatedAt: row.updated_at,
  };
}
