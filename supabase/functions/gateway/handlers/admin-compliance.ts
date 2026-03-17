/**
 * Admin Compliance Handlers
 *
 * Gateway handlers for KYC reviews, AML alerts, and GDPR requests.
 * Provides admin-level oversight and status management for compliance workflows.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Caller must have 'owner' or 'admin' role in firm_users.
 * - NEVER log PII (customer names, document details) beyond what is necessary.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function requireAdminRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const { data: firmUser, error } = await ctx.db
    .from('firm_users')
    .select('role')
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !firmUser) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (firmUser.role !== 'owner' && firmUser.role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin or owner role required' }, status: 403 };
  }

  return null;
}

// =============================================================================
// KYC REVIEW HANDLERS
// =============================================================================

/**
 * admin.compliance.kycReviews — List pending KYC reviews
 *
 * Params:
 *   - status: string (optional) — Filter by status (default: all)
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 */
export async function listKycReviews(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const status = ctx.params.status as string | undefined;
  const limit = (ctx.params.limit as number) || 50;
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('compliance_reviews')
    .select('id, customer_name, submission_date, document_type, status, created_at, updated_at', { count: 'exact' })
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list KYC reviews' }, status: 500 };
  }

  return {
    data: {
      reviews: (data ?? []).map((row) => ({
        id: row.id,
        customerName: row.customer_name,
        submissionDate: row.submission_date,
        documentType: row.document_type,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (count ?? 0),
      },
    },
  };
}

/**
 * admin.compliance.approveKyc — Approve a KYC review
 *
 * Params:
 *   - reviewId: string (required) — ID of the review to approve
 */
export async function approveKyc(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const reviewId = ctx.params.reviewId as string;
  if (!reviewId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: reviewId' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('compliance_reviews')
    .update({ status: 'approved', reviewed_by: ctx.userId!, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('firm_id', ctx.firmId!)
    .select('id, customer_name, status, updated_at')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Review not found' }, status: 404 };
  }

  return {
    data: {
      review: {
        id: data.id,
        customerName: data.customer_name,
        status: data.status,
        updatedAt: data.updated_at,
      },
    },
  };
}

/**
 * admin.compliance.rejectKyc — Reject a KYC review
 *
 * Params:
 *   - reviewId: string (required) — ID of the review to reject
 */
export async function rejectKyc(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const reviewId = ctx.params.reviewId as string;
  if (!reviewId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: reviewId' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('compliance_reviews')
    .update({ status: 'rejected', reviewed_by: ctx.userId!, updated_at: new Date().toISOString() })
    .eq('id', reviewId)
    .eq('firm_id', ctx.firmId!)
    .select('id, customer_name, status, updated_at')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'Review not found' }, status: 404 };
  }

  return {
    data: {
      review: {
        id: data.id,
        customerName: data.customer_name,
        status: data.status,
        updatedAt: data.updated_at,
      },
    },
  };
}

// =============================================================================
// AML ALERT HANDLERS
// =============================================================================

/**
 * admin.compliance.amlAlerts — List AML alerts
 *
 * Params:
 *   - status: string (optional) — Filter by status
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 */
export async function listAmlAlerts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const status = ctx.params.status as string | undefined;
  const limit = (ctx.params.limit as number) || 50;
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('aml_alerts')
    .select('id, alert_type, severity, description, status, customer_id, created_at, updated_at', { count: 'exact' })
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list AML alerts' }, status: 500 };
  }

  return {
    data: {
      alerts: (data ?? []).map((row) => ({
        id: row.id,
        alertType: row.alert_type,
        severity: row.severity,
        description: row.description,
        status: row.status,
        customerId: row.customer_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (count ?? 0),
      },
    },
  };
}

/**
 * admin.compliance.updateAmlStatus — Update AML alert status
 *
 * Params:
 *   - alertId: string (required) — ID of the alert
 *   - status: string (required) — New status value
 */
export async function updateAmlStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const alertId = ctx.params.alertId as string;
  const newStatus = ctx.params.status as string;

  if (!alertId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: alertId' }, status: 400 };
  }
  if (!newStatus) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: status' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('aml_alerts')
    .update({ status: newStatus, reviewed_by: ctx.userId!, updated_at: new Date().toISOString() })
    .eq('id', alertId)
    .eq('firm_id', ctx.firmId!)
    .select('id, alert_type, status, updated_at')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'AML alert not found' }, status: 404 };
  }

  return {
    data: {
      alert: {
        id: data.id,
        alertType: data.alert_type,
        status: data.status,
        updatedAt: data.updated_at,
      },
    },
  };
}

// =============================================================================
// GDPR REQUEST HANDLERS
// =============================================================================

/**
 * admin.compliance.gdprRequests — List GDPR requests
 *
 * Params:
 *   - status: string (optional) — Filter by status
 *   - limit: number (optional, default 50)
 *   - offset: number (optional, default 0)
 */
export async function listGdprRequests(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const status = ctx.params.status as string | undefined;
  const limit = (ctx.params.limit as number) || 50;
  const offset = (ctx.params.offset as number) || 0;

  let query = ctx.db
    .from('gdpr_requests')
    .select('id, request_type, requester_email, description, status, created_at, updated_at', { count: 'exact' })
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list GDPR requests' }, status: 500 };
  }

  return {
    data: {
      requests: (data ?? []).map((row) => ({
        id: row.id,
        requestType: row.request_type,
        requesterEmail: row.requester_email,
        description: row.description,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    },
    meta: {
      pagination: {
        total: count ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (count ?? 0),
      },
    },
  };
}

/**
 * admin.compliance.updateGdprStatus — Update GDPR request status
 *
 * Params:
 *   - requestId: string (required) — ID of the GDPR request
 *   - status: string (required) — New status value
 */
export async function updateGdprStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const requestId = ctx.params.requestId as string;
  const newStatus = ctx.params.status as string;

  if (!requestId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: requestId' }, status: 400 };
  }
  if (!newStatus) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: status' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('gdpr_requests')
    .update({ status: newStatus, processed_by: ctx.userId!, updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('firm_id', ctx.firmId!)
    .select('id, request_type, status, updated_at')
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'GDPR request not found' }, status: 404 };
  }

  return {
    data: {
      request: {
        id: data.id,
        requestType: data.request_type,
        status: data.status,
        updatedAt: data.updated_at,
      },
    },
  };
}
