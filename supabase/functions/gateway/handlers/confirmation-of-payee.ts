/**
 * Confirmation of Payee (CoP) Handlers
 *
 * Gateway handlers for name-account verification before payment execution.
 * Prevents APP fraud by confirming the legal name of the account holder
 * before funds are sent (UK CoP, SEPA VoP, Pix DICT, UPI VPA).
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import { resolveAdapter } from '../../_shared/adapters/registry.ts';
import type { ConfirmationOfPayeeAdapter } from '../../_shared/adapters/confirmation-of-payee/types.ts';

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getAdapter(tenantId?: string): Promise<ConfirmationOfPayeeAdapter> {
  const { adapter } = await resolveAdapter<ConfirmationOfPayeeAdapter>('confirmation_of_payee', tenantId);
  return adapter;
}

/** Verify a payee's name against their account before sending a payment */
export async function verifyPayee(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { payeeName, iban, bic, sortCode, accountNumber, routingNumber, pixKey, pixKeyType, vpa, scheme } = ctx.params as {
    payeeName: string; iban?: string; bic?: string; sortCode?: string; accountNumber?: string;
    routingNumber?: string; pixKey?: string; pixKeyType?: string; vpa?: string; scheme?: string;
  };

  if (!payeeName) {
    return { error: { code: 'VALIDATION_ERROR', message: 'payeeName is required' }, status: 400 };
  }

  const hasIdentifier = iban || sortCode || accountNumber || pixKey || vpa;
  if (!hasIdentifier) {
    return { error: { code: 'VALIDATION_ERROR', message: 'At least one account identifier (iban, sortCode+accountNumber, pixKey, or vpa) is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.verifyPayee({
    tenantId: ctx.firmId!,
    scheme: scheme as never,
    payeeName,
    iban,
    bic,
    sortCode,
    accountNumber,
    routingNumber,
    pixKey,
    pixKeyType: pixKeyType as never,
    vpa,
  });

  return { data: result };
}

/** Get a previous CoP verification result */
export async function getVerification(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { verificationId } = ctx.params as { verificationId: string };
  if (!verificationId) {
    return { error: { code: 'VALIDATION_ERROR', message: 'verificationId is required' }, status: 400 };
  }

  const adapter = await getAdapter(ctx.firmId);
  const result = await adapter.getVerification({ tenantId: ctx.firmId!, verificationId });

  return { data: result };
}
