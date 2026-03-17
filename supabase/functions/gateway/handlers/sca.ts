/**
 * Strong Customer Authentication (SCA) Handlers
 *
 * Gateway handlers for PSD2/PSD3 Strong Customer Authentication.
 * Supports challenge initiation, completion, and exemption checks.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { SCAAdapter } from '../../_shared/adapters/sca/types.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<SCAAdapter> {
  const { adapter } = await resolveAdapter<SCAAdapter>('sca', tenantId);
  return adapter;
}

/** Initiate an SCA challenge for a user action */
export async function initiateChallenge(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { action, preferredMethod, amountMinorUnits, currency, payeeName, payeeAccountIdentifier } = ctx.params as {
    action: string; preferredMethod?: string; amountMinorUnits?: number;
    currency?: string; payeeName?: string; payeeAccountIdentifier?: string;
  };

  if (!action) {
    return { error: { code: 'VALIDATION_ERROR', message: 'action is required' }, status: 400 };
  }

  const validActions = ['payment', 'login', 'beneficiary_add', 'card_activation', 'profile_change'];
  if (!validActions.includes(action)) {
    return { error: { code: 'VALIDATION_ERROR', message: `Invalid action. Must be one of: ${validActions.join(', ')}` }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.initiateChallenge({
    tenantId: ctx.firmId!,
    userId: ctx.userId!,
    action: action as never,
    preferredMethod: preferredMethod as never,
    amountMinorUnits,
    currency,
    payeeName,
    payeeAccountIdentifier,
  });

  return { data: result };
}

/** Complete an SCA challenge with authentication proof */
export async function completeChallenge(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { challengeId, authenticationProof } = ctx.params as { challengeId: string; authenticationProof: string };

  if (!challengeId || !authenticationProof) {
    return { error: { code: 'VALIDATION_ERROR', message: 'challengeId and authenticationProof are required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.completeChallenge({
    tenantId: ctx.firmId!,
    challengeId,
    authenticationProof,
  });

  return { data: result };
}

/** Check if an SCA exemption applies for a given transaction */
export async function checkExemption(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { exemptionType, amountMinorUnits, currency, payeeAccountIdentifier } = ctx.params as {
    exemptionType: string; amountMinorUnits?: number; currency?: string; payeeAccountIdentifier?: string;
  };

  if (!exemptionType) {
    return { error: { code: 'VALIDATION_ERROR', message: 'exemptionType is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.checkExemption({
    tenantId: ctx.firmId!,
    userId: ctx.userId!,
    exemptionType: exemptionType as never,
    amountMinorUnits,
    currency,
    payeeAccountIdentifier,
  });

  return { data: result };
}
