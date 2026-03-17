/**
 * Loan Origination Domain Handlers
 *
 * Gateway handlers for LoanVantage / loan origination operations.
 * Supports application creation/retrieval and document management.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { LoanOriginationAdapter } from '../../_shared/adapters/loan-origination/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<LoanOriginationAdapter> {
  const { adapter } = await resolveAdapter<LoanOriginationAdapter>('loan_origination', tenantId);
  return adapter;
}

// Default LoanVantage path params — tenants override via integration_config
function getPathParams(ctx: GatewayContext, params: Record<string, unknown>) {
  return {
    institutionId: (params.institutionId as string) ?? '',
    environmentId: (params.environmentId as string) ?? 'PROD',
    productId: (params.productId as string) ?? 'jha-loanvantage',
  };
}

// =============================================================================
// APPLICATION HANDLERS
// =============================================================================

/** Get a loan application by ID */
export async function getLoanApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { applicationId, institutionId: _institutionId, environmentId: _environmentId, productId: _productId } = ctx.params as Record<string, unknown>;
  const pathParams = getPathParams(ctx, ctx.params as Record<string, unknown>);

  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'applicationId is required' }, status: 400 };
  }

  try {
    const adapter = await getAdapter(ctx.firmId);
    const result = await adapter.getApplication({
      applicationId: applicationId as string,
      ...pathParams,
    });
    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get application';
    return { error: { code: 'LOS_ERROR', message }, status: 500 };
  }
}

/** Create a new loan application */
export async function createLoanApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as Record<string, unknown>;
  const pathParams = getPathParams(ctx, params);
  const { requestedAmountCents, termMonths, applicant, coApplicant, additionalFields } = params;

  if (!requestedAmountCents || !applicant) {
    return { error: { code: 'VALIDATION_ERROR', message: 'requestedAmountCents and applicant are required' }, status: 400 };
  }

  const app = applicant as Record<string, unknown>;
  if (!app.firstName || !app.lastName) {
    return { error: { code: 'VALIDATION_ERROR', message: 'applicant.firstName and applicant.lastName are required' }, status: 400 };
  }

  if ((requestedAmountCents as number) <= 0) {
    return { error: { code: 'VALIDATION_ERROR', message: 'requestedAmountCents must be positive' }, status: 400 };
  }

  try {
    const adapter = await getAdapter(ctx.firmId);
    const result = await adapter.createApplication({
      ...pathParams,
      requestedAmountCents: requestedAmountCents as number,
      termMonths: termMonths as number | undefined,
      applicant: {
        firstName: app.firstName as string,
        lastName: app.lastName as string,
        email: app.email as string | undefined,
        phone: app.phone as string | undefined,
      },
      coApplicant: coApplicant as CreateApplicationRequest['coApplicant'],
      additionalFields: additionalFields as Record<string, unknown> | undefined,
    });
    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create application';
    return { error: { code: 'LOS_ERROR', message }, status: 500 };
  }
}

// =============================================================================
// DOCUMENT HANDLERS
// =============================================================================

/** Get a document by ID */
export async function getLoanDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as Record<string, unknown>;
  const pathParams = getPathParams(ctx, params);
  const { documentId } = params;

  if (!documentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'documentId is required' }, status: 400 };
  }

  try {
    const adapter = await getAdapter(ctx.firmId);
    const result = await adapter.getDocument({
      documentId: documentId as string,
      ...pathParams,
    });
    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get document';
    return { error: { code: 'LOS_ERROR', message }, status: 500 };
  }
}

/** Create a new document record */
export async function createLoanDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as Record<string, unknown>;
  const pathParams = getPathParams(ctx, params);
  const {
    idDocument, documentTemplateType, documentEntityType,
    documentEntity, statementDate, dueDate, requestedDate, documentFile,
  } = params;

  if (documentTemplateType == null || !documentEntityType || !documentEntity) {
    return { error: { code: 'VALIDATION_ERROR', message: 'documentTemplateType, documentEntityType, and documentEntity are required' }, status: 400 };
  }

  const entity = documentEntity as Record<string, unknown>;
  if (!entity.id || !entity.context) {
    return { error: { code: 'VALIDATION_ERROR', message: 'documentEntity.id and documentEntity.context are required' }, status: 400 };
  }

  try {
    const adapter = await getAdapter(ctx.firmId);
    const result = await adapter.createDocument({
      ...pathParams,
      idDocument: idDocument as string | undefined,
      documentTemplateType: documentTemplateType as number,
      documentEntityType: documentEntityType as 'Party' | 'Loan',
      documentEntity: {
        id: entity.id as string,
        context: entity.context as 'Applicant' | 'Application',
      },
      statementDate: statementDate as string | undefined,
      dueDate: dueDate as string | undefined,
      requestedDate: requestedDate as string | undefined,
      documentFile: documentFile as { fileName: string; fileContent: string } | undefined,
    });
    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create document';
    return { error: { code: 'LOS_ERROR', message }, status: 500 };
  }
}

/** Update an existing document record */
export async function updateLoanDocument(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const params = ctx.params as Record<string, unknown>;
  const pathParams = getPathParams(ctx, params);
  const { documentId, documentFile, statementDate, dueDate } = params;

  if (!documentId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'documentId is required' }, status: 400 };
  }

  try {
    const adapter = await getAdapter(ctx.firmId);
    const result = await adapter.updateDocument({
      documentId: documentId as string,
      ...pathParams,
      documentFile: documentFile as { fileName: string; fileContent: string } | undefined,
      statementDate: statementDate as string | undefined,
      dueDate: dueDate as string | undefined,
    });
    return { data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update document';
    return { error: { code: 'LOS_ERROR', message }, status: 500 };
  }
}

// Type import needed for the handler function signature
import type { CreateApplicationRequest } from '../../_shared/adapters/loan-origination/types.ts';
