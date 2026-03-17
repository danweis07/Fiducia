/**
 * Banking-as-a-Service (BaaS) Partner Handlers
 *
 * Gateway handlers for BaaS partner integration providing banking
 * license infrastructure, virtual IBANs, and local payment rails.
 * Backed by Solaris (EU) and ClearBank (UK) adapters.
 *
 * All monetary values are integer cents.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { BaaSAdapter } from '../../_shared/adapters/baas/types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<BaaSAdapter> {
  const { adapter } = await resolveAdapter<BaaSAdapter>('baas', tenantId);
  return adapter;
}

// =============================================================================
// HANDLERS
// =============================================================================

/** List BaaS accounts (virtual IBANs, local accounts) */
export async function listBaaSAccounts(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country, status, limit, offset } = ctx.params as {
    country?: string; status?: string; limit?: number; offset?: number;
  };

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.listAccounts({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    country,
    status: status as never,
    limit: limit ?? 50,
    offset: offset ?? 0,
  });

  return {
    data: result.accounts,
    meta: { pagination: { total: result.total, limit: limit ?? 50, offset: offset ?? 0, hasMore: (offset ?? 0) + (limit ?? 50) < result.total } },
  };
}

/** Create a BaaS account */
export async function createBaaSAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { country, currency, accountType, accountHolderName } = ctx.params as {
    country: string; currency: string; accountType: string; accountHolderName: string;
  };

  if (!country || !currency || !accountType || !accountHolderName) {
    return { error: { code: 'VALIDATION_ERROR', message: 'country, currency, accountType, and accountHolderName are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.createAccount({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    country,
    currency,
    accountType: accountType as never,
    accountHolderName,
  });

  return { data: result };
}

/** Get a BaaS account */
export async function getBaaSAccount(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { accountId } = ctx.params as { accountId: string };
  if (!accountId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'accountId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getAccount({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    accountId,
  });

  return { data: result };
}

/** Initiate a BaaS payment via local rails */
export async function initiateBaaSPayment(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { fromAccountId, toIban, toSortCode, toAccountNumber, amountCents, currency, rail, reference } = ctx.params as {
    fromAccountId: string; toIban?: string; toSortCode?: string;
    toAccountNumber?: string; amountCents: number; currency: string;
    rail?: string; reference?: string;
  };

  if (!fromAccountId || !amountCents || !currency) {
    return { error: { code: 'VALIDATION_ERROR', message: 'fromAccountId, amountCents, and currency are required' }, status: 400 };
  }

  if (!toIban && (!toSortCode || !toAccountNumber)) {
    return { error: { code: 'VALIDATION_ERROR', message: 'Either toIban or toSortCode+toAccountNumber are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.initiatePayment({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
    fromAccountId,
    toIban,
    toSortCode,
    toAccountNumber,
    amountCents,
    currency,
    rail: rail as never,
    reference,
  });

  return { data: result };
}

/** Get KYC status for a BaaS user */
export async function getBaaSKYCStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getKYCStatus({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}

/** Get BaaS compliance status */
export async function getBaaSComplianceStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getComplianceStatus({
    userId: ctx.userId!,
    tenantId: ctx.firmId!,
  });

  return { data: result };
}
