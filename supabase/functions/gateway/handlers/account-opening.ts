/**
 * Account Opening Handlers
 *
 * Gateway handlers for the new-account opening flow.
 * Delegates to the account-opening adapter resolved from the registry.
 *
 * IMPORTANT:
 * - NEVER log PII (SSN, DOB, full account numbers, email, phone).
 * - All monetary values are integer cents.
 * - Responses use masked applicant data from the adapter.
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

/** Structured JSON log entry — NEVER includes PII. */
function log(
  level: 'info' | 'warn' | 'error',
  handler: string,
  userId: string | undefined,
  extra: Record<string, unknown> = {}
): void {
  console.warn(JSON.stringify({
    level,
    handler,
    userId: userId ?? null,
    timestamp: new Date().toISOString(),
    ...extra,
  }));
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * Get account opening configuration (products, funding methods, etc.).
 * This is a public endpoint — no auth required.
 */
export async function getAccountOpeningConfig(ctx: GatewayContext): Promise<GatewayResponse> {
  try {
    const tenantId = ctx.firmId ?? 'default';

    // Resolve adapter from registry
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(tenantId);

    const config = await adapter.getConfig(tenantId);
    return { data: config };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch account opening config';
    return { error: { code: 'ACCOUNT_OPENING_CONFIG_ERROR', message }, status: 500 };
  }
}

/**
 * Create a new account opening application.
 * Requires auth. Submits applicant info for KYC evaluation.
 */
export async function createAccountOpeningApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId, userId } = ctx;

  // Validate required fields are present (without logging PII values)
  const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'ssn', 'address', 'citizenship'];
  for (const field of requiredFields) {
    if (!params[field]) {
      return { error: { code: 'VALIDATION_ERROR', message: `Missing required field: ${field}` }, status: 400 };
    }
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    const application = await adapter.createApplication(firmId!, params as never);

    // Audit log — NO PII
    log('info', 'account-opening.create', userId, {
      applicationId: application.id,
      tenantId: firmId,
      status: application.status,
    });

    return { data: application };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create application';
    log('error', 'account-opening.create', userId, { error: message });
    return { error: { code: 'ACCOUNT_OPENING_CREATE_ERROR', message }, status: 500 };
  }
}

/**
 * Get an existing application by ID.
 */
export async function getAccountOpeningApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId } = ctx;
  const applicationId = params.applicationId as string;

  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Missing applicationId' }, status: 400 };
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    const application = await adapter.getApplication(applicationId);
    return { data: application };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Application not found';
    return { error: { code: 'ACCOUNT_OPENING_GET_ERROR', message }, status: 404 };
  }
}

/**
 * Select products for an application.
 */
export async function selectAccountOpeningProducts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId } = ctx;
  const applicationId = params.applicationId as string;
  const productIds = params.productIds as string[];

  if (!applicationId || !productIds?.length) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Missing applicationId or productIds' }, status: 400 };
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    const application = await adapter.selectProducts(applicationId, productIds);
    return { data: application };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to select products';
    return { error: { code: 'ACCOUNT_OPENING_PRODUCTS_ERROR', message }, status: 500 };
  }
}

/**
 * Submit funding for an application.
 */
export async function submitAccountOpeningFunding(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId, userId } = ctx;
  const applicationId = params.applicationId as string;

  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Missing applicationId' }, status: 400 };
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    const funding = {
      method: params.method as string,
      amountCents: params.amountCents as number,
      sourceRoutingNumber: params.sourceRoutingNumber as string | undefined,
      sourceAccountNumber: params.sourceAccountNumber as string | undefined,
      cardToken: params.cardToken as string | undefined,
    };

    const application = await adapter.submitFunding(applicationId, funding as never);

    // Audit log — NO PII (no account numbers)
    log('info', 'account-opening.submitFunding', userId, {
      applicationId,
      tenantId: firmId,
      fundingMethod: funding.method,
      amountCents: funding.amountCents,
    });

    return { data: application };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit funding';
    log('error', 'account-opening.submitFunding', userId, { error: message });
    return { error: { code: 'ACCOUNT_OPENING_FUNDING_ERROR', message }, status: 500 };
  }
}

/**
 * Complete an application — triggers account creation.
 */
export async function completeAccountOpeningApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId, userId } = ctx;
  const applicationId = params.applicationId as string;

  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Missing applicationId' }, status: 400 };
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    const application = await adapter.completeApplication(applicationId);

    // Audit log — NO PII
    log('info', 'account-opening.complete', userId, {
      applicationId,
      tenantId: firmId,
      status: application.status,
      accountsCreated: application.createdAccounts?.length ?? 0,
    });

    return { data: application };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to complete application';
    log('error', 'account-opening.complete', userId, { error: message });
    return { error: { code: 'ACCOUNT_OPENING_COMPLETE_ERROR', message }, status: 500 };
  }
}

/**
 * Cancel an in-progress application.
 */
export async function cancelAccountOpeningApplication(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { params, firmId, userId } = ctx;
  const applicationId = params.applicationId as string;

  if (!applicationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Missing applicationId' }, status: 400 };
  }

  try {
    const { resolveAdapter } = await import('../../_shared/adapters/account-opening/registry.ts');
    const adapter = resolveAdapter(firmId!);

    await adapter.cancelApplication(applicationId);

    // Audit log — NO PII
    log('info', 'account-opening.cancel', userId, {
      applicationId,
      tenantId: firmId,
    });

    return { data: { success: true } };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to cancel application';
    log('error', 'account-opening.cancel', userId, { error: message });
    return { error: { code: 'ACCOUNT_OPENING_CANCEL_ERROR', message }, status: 500 };
  }
}
