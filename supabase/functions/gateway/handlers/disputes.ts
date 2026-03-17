/**
 * Transaction Disputes (Reg E) Domain Handlers
 *
 * Gateway handlers for filing and managing transaction disputes
 * per Regulation E requirements. Covers: filing disputes, listing,
 * detail view, document uploads, cancellation, and timeline tracking.
 *
 * Reg E deadlines:
 * - Provisional credit: 10 business days from filing
 * - Investigation: 45 calendar days (90 for POS/foreign/new accounts)
 *
 * All monetary values are integer cents. Never log PII.
 */

import type { GatewayContext, GatewayResponse, Pagination } from '../core.ts';
import { tSync } from '../../_shared/i18n/index.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: tSync(ctx.locale, 'AUTH_REQUIRED', 'message') }, status: 401 };
  }
  return null;
}

function paginate(total: number, limit: number, offset: number): Pagination {
  return { total, limit, offset, hasMore: offset + limit < total };
}

const VALID_REASONS = [
  'unauthorized', 'duplicate', 'incorrect_amount',
  'merchandise_not_received', 'service_not_rendered', 'other',
] as const;

const VALID_DOCUMENT_TYPES = ['receipt', 'correspondence', 'screenshot', 'other'] as const;

/**
 * Calculate provisional credit deadline: 10 business days from filing.
 * Skips weekends (Sat/Sun). Does not account for federal holidays.
 */
function addBusinessDays(from: Date, days: number): string {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result.toISOString();
}

/**
 * Calculate investigation deadline per Reg E:
 * - Standard: 45 calendar days
 * - Extended (POS / foreign / new accounts): 90 calendar days
 */
function addCalendarDays(from: Date, days: number): string {
  const result = new Date(from);
  result.setDate(result.getDate() + days);
  return result.toISOString();
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * File a new transaction dispute.
 * Creates the dispute record, sets Reg E deadlines, and inserts the initial
 * timeline event.
 */
export async function fileDispute(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const {
    transactionId, reason, description, contactPhone, contactEmail,
  } = ctx.params as {
    transactionId: string;
    reason: string;
    description: string;
    contactPhone?: string;
    contactEmail?: string;
  };

  // Validate required fields
  if (!transactionId || !reason || !description) {
    return {
      error: { code: 'VALIDATION_ERROR', message: 'transactionId, reason, and description are required' },
      status: 400,
    };
  }

  if (!VALID_REASONS.includes(reason as typeof VALID_REASONS[number])) {
    return {
      error: { code: 'VALIDATION_ERROR', message: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}` },
      status: 400,
    };
  }

  // Fetch the disputed transaction to get amount / merchant / date
  const { data: transaction, error: txError } = await ctx.db
    .from('transactions')
    .select('id, amount_cents, merchant_name, posted_at, created_at, account_id')
    .eq('id', transactionId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (txError || !transaction) {
    return {
      error: { code: 'NOT_FOUND', message: 'Transaction not found' },
      status: 404,
    };
  }

  // Verify the transaction belongs to the user
  const { data: account } = await ctx.db
    .from('accounts')
    .select('id')
    .eq('id', transaction.account_id)
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (!account) {
    return {
      error: { code: 'FORBIDDEN', message: 'Transaction does not belong to this user' },
      status: 403,
    };
  }

  // Check for existing dispute on same transaction
  const { data: existing } = await ctx.db
    .from('disputes')
    .select('id')
    .eq('transaction_id', transactionId)
    .eq('user_id', ctx.userId!)
    .not('status', 'eq', 'cancelled')
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      error: { code: 'CONFLICT', message: 'A dispute already exists for this transaction' },
      status: 409,
    };
  }

  const now = new Date();
  const provisionalCreditDeadline = addBusinessDays(now, 10);
  // Standard 45-day investigation deadline (90 for POS/foreign/new accounts —
  // the backend could refine this based on transaction type, but we default to 45)
  const investigationDeadline = addCalendarDays(now, 45);

  const disputeRow = {
    firm_id: ctx.firmId!,
    user_id: ctx.userId!,
    transaction_id: transactionId,
    transaction_amount_cents: Math.abs(transaction.amount_cents),
    transaction_date: transaction.posted_at || transaction.created_at,
    merchant_name: transaction.merchant_name || 'Unknown Merchant',
    reason,
    description,
    status: 'pending',
    provisional_credit_amount_cents: null,
    provisional_credit_date: null,
    provisional_credit_deadline: provisionalCreditDeadline,
    investigation_deadline: investigationDeadline,
    contact_phone: contactPhone || null,
    contact_email: contactEmail || null,
    resolved_at: null,
    resolution: null,
  };

  const { data: dispute, error: insertError } = await ctx.db
    .from('disputes')
    .insert(disputeRow)
    .select('*')
    .single();

  if (insertError || !dispute) {
    console.error('Failed to create dispute:', insertError?.message);
    return {
      error: { code: 'INTERNAL_ERROR', message: 'Failed to file dispute' },
      status: 500,
    };
  }

  // Insert initial timeline event
  await ctx.db
    .from('dispute_timeline_events')
    .insert({
      dispute_id: dispute.id,
      event_type: 'filed',
      description: `Dispute filed: ${reason.replace(/_/g, ' ')}`,
      created_by: ctx.userId!,
    });

  // Log action without PII
  console.warn(JSON.stringify({
    level: 'info',
    type: 'dispute_filed',
    dispute_id: dispute.id,
    reason,
    firm_id: ctx.firmId,
  }));

  return {
    data: {
      dispute: mapDisputeRow(dispute),
    },
  };
}

/**
 * List disputes for the authenticated user with optional status filter
 * and pagination.
 */
export async function listDisputes(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { status, limit: rawLimit, offset: rawOffset } = ctx.params as {
    status?: string;
    limit?: number;
    offset?: number;
  };

  const limit = rawLimit ?? 20;
  const offset = rawOffset ?? 0;

  let query = ctx.db
    .from('disputes')
    .select('*', { count: 'exact' })
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: disputes, error, count } = await query;

  if (error) {
    console.error('Failed to list disputes:', error.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list disputes' }, status: 500 };
  }

  const total = count ?? 0;

  return {
    data: { disputes: (disputes || []).map(mapDisputeRow) },
    meta: { pagination: paginate(total, limit, offset) },
  };
}

/**
 * Get a single dispute with full details including timeline events.
 */
export async function getDispute(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { disputeId } = ctx.params as { disputeId: string };

  if (!disputeId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'disputeId is required' }, status: 400 };
  }

  const { data: dispute, error } = await ctx.db
    .from('disputes')
    .select('*')
    .eq('id', disputeId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (error || !dispute) {
    return { error: { code: 'NOT_FOUND', message: 'Dispute not found' }, status: 404 };
  }

  // Fetch timeline events
  const { data: timeline } = await ctx.db
    .from('dispute_timeline_events')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });

  // Fetch documents
  const { data: documents } = await ctx.db
    .from('dispute_documents')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: false });

  return {
    data: {
      dispute: mapDisputeRow(dispute),
      timeline: (timeline || []).map(mapTimelineRow),
      documents: (documents || []).map(mapDocumentRow),
    },
  };
}

/**
 * Add supporting documentation to a dispute.
 */
export async function addDisputeDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { disputeId, documentType, description, fileName } = ctx.params as {
    disputeId: string;
    documentType: string;
    description: string;
    fileName: string;
  };

  if (!disputeId || !documentType || !description || !fileName) {
    return {
      error: { code: 'VALIDATION_ERROR', message: 'disputeId, documentType, description, and fileName are required' },
      status: 400,
    };
  }

  if (!VALID_DOCUMENT_TYPES.includes(documentType as typeof VALID_DOCUMENT_TYPES[number])) {
    return {
      error: { code: 'VALIDATION_ERROR', message: `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}` },
      status: 400,
    };
  }

  // Verify dispute belongs to user
  const { data: dispute } = await ctx.db
    .from('disputes')
    .select('id, status')
    .eq('id', disputeId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (!dispute) {
    return { error: { code: 'NOT_FOUND', message: 'Dispute not found' }, status: 404 };
  }

  if (dispute.status === 'cancelled' || dispute.status === 'resolved_favor_customer' || dispute.status === 'resolved_favor_merchant') {
    return {
      error: { code: 'CONFLICT', message: 'Cannot add documents to a resolved or cancelled dispute' },
      status: 409,
    };
  }

  const { data: document, error } = await ctx.db
    .from('dispute_documents')
    .insert({
      dispute_id: disputeId,
      document_type: documentType,
      description,
      file_name: fileName,
      uploaded_by: ctx.userId!,
    })
    .select('*')
    .single();

  if (error || !document) {
    console.error('Failed to add document:', error?.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to add document' }, status: 500 };
  }

  // Timeline event
  await ctx.db
    .from('dispute_timeline_events')
    .insert({
      dispute_id: disputeId,
      event_type: 'document_added',
      description: `Supporting document added: ${documentType.replace(/_/g, ' ')}`,
      created_by: ctx.userId!,
    });

  return { data: { document: mapDocumentRow(document) } };
}

/**
 * Cancel a pending dispute.
 */
export async function cancelDispute(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { disputeId, reason } = ctx.params as { disputeId: string; reason: string };

  if (!disputeId || !reason) {
    return { error: { code: 'VALIDATION_ERROR', message: 'disputeId and reason are required' }, status: 400 };
  }

  // Verify dispute belongs to user and is cancellable
  const { data: dispute } = await ctx.db
    .from('disputes')
    .select('id, status')
    .eq('id', disputeId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (!dispute) {
    return { error: { code: 'NOT_FOUND', message: 'Dispute not found' }, status: 404 };
  }

  if (dispute.status !== 'pending' && dispute.status !== 'under_review') {
    return {
      error: { code: 'CONFLICT', message: 'Only pending or under-review disputes can be cancelled' },
      status: 409,
    };
  }

  const { error: updateError } = await ctx.db
    .from('disputes')
    .update({
      status: 'cancelled',
      resolved_at: new Date().toISOString(),
      resolution: reason,
    })
    .eq('id', disputeId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!);

  if (updateError) {
    console.error('Failed to cancel dispute:', updateError.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel dispute' }, status: 500 };
  }

  // Timeline event
  await ctx.db
    .from('dispute_timeline_events')
    .insert({
      dispute_id: disputeId,
      event_type: 'cancelled',
      description: `Dispute cancelled by member`,
      created_by: ctx.userId!,
    });

  console.warn(JSON.stringify({
    level: 'info',
    type: 'dispute_cancelled',
    dispute_id: disputeId,
    firm_id: ctx.firmId,
  }));

  return { data: { success: true } };
}

/**
 * Get the timeline / audit trail for a dispute.
 */
export async function getDisputeTimeline(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { disputeId } = ctx.params as { disputeId: string };

  if (!disputeId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'disputeId is required' }, status: 400 };
  }

  // Verify dispute belongs to user
  const { data: dispute } = await ctx.db
    .from('disputes')
    .select('id')
    .eq('id', disputeId)
    .eq('firm_id', ctx.firmId!)
    .eq('user_id', ctx.userId!)
    .single();

  if (!dispute) {
    return { error: { code: 'NOT_FOUND', message: 'Dispute not found' }, status: 404 };
  }

  const { data: events, error } = await ctx.db
    .from('dispute_timeline_events')
    .select('*')
    .eq('dispute_id', disputeId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline' }, status: 500 };
  }

  return {
    data: { events: (events || []).map(mapTimelineRow) },
  };
}

// =============================================================================
// ROW MAPPERS (snake_case → camelCase)
// =============================================================================

function mapDisputeRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    transactionAmountCents: row.transaction_amount_cents,
    transactionDate: row.transaction_date,
    merchantName: row.merchant_name,
    reason: row.reason,
    description: row.description,
    status: row.status,
    provisionalCreditAmountCents: row.provisional_credit_amount_cents ?? null,
    provisionalCreditDate: row.provisional_credit_date ?? null,
    provisionalCreditDeadline: row.provisional_credit_deadline,
    investigationDeadline: row.investigation_deadline,
    resolvedAt: row.resolved_at ?? null,
    resolution: row.resolution ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTimelineRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    disputeId: row.dispute_id,
    eventType: row.event_type,
    description: row.description,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
  };
}

function mapDocumentRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    disputeId: row.dispute_id,
    documentType: row.document_type,
    description: row.description,
    fileName: row.file_name,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}
