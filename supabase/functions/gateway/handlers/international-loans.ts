/**
 * International Loan Origination Handlers
 *
 * Gateway handlers for global loan applications with multi-country
 * compliance and credit assessment. Backed by Finastra and nCino adapters.
 *
 * All monetary values are integer cents.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { InternationalLoanOriginationAdapter } from '../../_shared/adapters/international-loans/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<InternationalLoanOriginationAdapter> {
  const { adapter } = await resolveAdapter<InternationalLoanOriginationAdapter>('international_loans', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** Create an international loan application */
export async function createInternationalLoanApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country, currency, productType, requestedAmountCents, termMonths, applicant, additionalFields } = ctx.params as {
    country: string; currency: string; productType: string;
    requestedAmountCents: number; termMonths?: number;
    applicant: { firstName: string; lastName: string; email?: string; phone?: string; nationalId?: string };
    additionalFields?: Record<string, unknown>;
  };

  if (!country || !currency || !productType || !requestedAmountCents || !applicant) {
    return { error: { code: 'VALIDATION_ERROR', message: 'country, currency, productType, requestedAmountCents, and applicant are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createApplication({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    country,
    currency,
    productType,
    requestedAmountCents,
    termMonths,
    applicant,
    additionalFields,
  });

  return { data: result };
}

/** Get an international loan application */
export async function getInternationalLoanApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { applicationId } = ctx.params as { applicationId: string };
  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'applicationId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getApplication({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    applicationId,
  });

  return { data: result };
}

/** List international loan applications */
export async function listInternationalLoanApplications(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country, status, limit, offset } = ctx.params as {
    country?: string; status?: string; limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listApplications({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    country,
    status: status as never,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.applications,
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.total } },
  };
}

/** Get credit assessment for an application */
export async function getInternationalCreditAssessment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { applicationId } = ctx.params as { applicationId: string };
  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'applicationId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getCreditAssessment({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    applicationId,
  });

  return { data: result };
}

/** Get compliance checks for an application */
export async function getInternationalComplianceChecks(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { applicationId } = ctx.params as { applicationId: string };
  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'applicationId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getComplianceChecks({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    applicationId,
  });

  return { data: result };
}
