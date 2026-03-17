/**
 * KYC Identity Verification Handlers
 *
 * Gateway handlers for submitting and checking KYC evaluations
 * via Alloy or mock adapter.
 *
 * IMPORTANT: SSN is NEVER logged or returned in responses.
 * All PII is stripped from error messages.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type {
  KYCAdapter,
  KYCApplicant,
  KYCRefreshConfig,
  RefreshTrigger,
} from '../../_shared/adapters/kyc/types.ts';
import { maskSSN } from '../../_shared/adapters/kyc/types.ts';
import { AlloyKYCAdapter } from '../../_shared/adapters/kyc/alloy-adapter.ts';
import { MockKYCAdapter } from '../../_shared/adapters/kyc/mock-adapter.ts';

// =============================================================================
// ADAPTER REGISTRY
// =============================================================================

async function getKYCAdapter(): Promise<KYCAdapter> {
  const provider = Deno.env.get('KYC_PROVIDER') ?? 'auto';

  switch (provider) {
    case 'lexisnexis': {
      const mod = await import('../../_shared/adapters/kyc/lexisnexis-adapter.ts');
      return new mod.LexisNexisKYCAdapter();
    }
    case 'alloy': {
      return new AlloyKYCAdapter();
    }
    case 'auto':
    default: {
      const useMock = Deno.env.get('USE_MOCK_KYC') === 'true'
        || !Deno.env.get('ALLOY_API_TOKEN');
      if (useMock) {
        return new MockKYCAdapter();
      }
      return new AlloyKYCAdapter();
    }
  }
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * kyc.evaluate — Submit a KYC identity evaluation
 *
 * Params (all required):
 *   - firstName, lastName, email, phone, dateOfBirth, ssn
 *   - address: { line1, city, state, zip, line2? }
 *
 * Response NEVER includes the raw SSN — only masked (last 4).
 */
export async function evaluateKYC(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;

  // Validate required fields
  const required = ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'ssn', 'address'];
  for (const field of required) {
    if (!params[field]) {
      return {
        error: { code: 'BAD_REQUEST', message: `Missing required field: ${field}` },
        status: 400,
      };
    }
  }

  const address = params.address as Record<string, string>;
  if (!address.line1 || !address.city || !address.state || !address.zip) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Address must include line1, city, state, and zip' },
      status: 400,
    };
  }

  const applicant: KYCApplicant = {
    firstName: params.firstName as string,
    lastName: params.lastName as string,
    email: params.email as string,
    phone: params.phone as string,
    dateOfBirth: params.dateOfBirth as string,
    ssn: params.ssn as string,
    address: {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      zip: address.zip,
    },
  };

  // Log the request WITHOUT PII
  console.warn(JSON.stringify({
    level: 'info',
    handler: 'kyc.evaluate',
    userId: ctx.userId ?? null,
    ssnMasked: maskSSN(applicant.ssn),
    timestamp: new Date().toISOString(),
  }));

  const adapter = await getKYCAdapter();
  const result = await adapter.createEvaluation(applicant);

  return {
    data: {
      evaluation: {
        ...result,
        // Confirm SSN is masked in response (belt-and-suspenders)
        ssnMasked: maskSSN(applicant.ssn),
      },
      adapter: adapter.name,
    },
  };
}

/**
 * kyc.status — Check KYC evaluation status
 *
 * Params:
 *   - token: string (required) — evaluation token from kyc.evaluate
 */
export async function getKYCStatus(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const token = params.token as string;

  if (!token) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Evaluation token is required' },
      status: 400,
    };
  }

  const adapter = await getKYCAdapter();
  const result = await adapter.getEvaluation(token);

  return {
    data: {
      evaluation: result,
      adapter: adapter.name,
    },
  };
}

// =============================================================================
// PERPETUAL KYC HANDLERS
// =============================================================================

/**
 * kyc.refresh — Refresh an existing KYC evaluation (perpetual KYC)
 *
 * Params:
 *   - token: string (required) — evaluation token to refresh
 *   - intervalHours: number (default 720 = 30 days)
 *   - triggers: RefreshTrigger[] (default ['scheduled'])
 *   - riskThreshold: number (0-100, default 75)
 *   - autoDenyOnHighRisk: boolean (default false)
 */
export async function refreshKYC(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const token = params.token as string;

  if (!token) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Evaluation token is required' },
      status: 400,
    };
  }

  const adapter = await getKYCAdapter();

  if (!adapter.refreshEvaluation) {
    return {
      error: { code: 'NOT_SUPPORTED', message: `Adapter "${adapter.name}" does not support perpetual KYC refresh` },
      status: 400,
    };
  }

  const config: KYCRefreshConfig = {
    intervalHours: (params.intervalHours as number) ?? 720,
    triggers: (params.triggers as RefreshTrigger[]) ?? ['scheduled'],
    riskThreshold: (params.riskThreshold as number) ?? 75,
    autoDenyOnHighRisk: (params.autoDenyOnHighRisk as boolean) ?? false,
  };

  console.warn(JSON.stringify({
    level: 'info',
    handler: 'kyc.refresh',
    evaluationToken: token,
    userId: ctx.userId ?? null,
    timestamp: new Date().toISOString(),
  }));

  const result = await adapter.refreshEvaluation(token, config);

  return {
    data: {
      refresh: result,
      adapter: adapter.name,
    },
  };
}

/**
 * kyc.configureRefresh — Set up automatic refresh for an evaluation
 *
 * Params:
 *   - token: string (required) — evaluation token
 *   - intervalHours: number (default 720)
 *   - triggers: RefreshTrigger[] (default ['scheduled'])
 *   - riskThreshold: number (default 75)
 *   - autoDenyOnHighRisk: boolean (default false)
 */
export async function configureKYCRefresh(ctx: GatewayContext): Promise<GatewayResponse> {
  const { params } = ctx;
  const token = params.token as string;

  if (!token) {
    return {
      error: { code: 'BAD_REQUEST', message: 'Evaluation token is required' },
      status: 400,
    };
  }

  const adapter = await getKYCAdapter();

  if (!adapter.configureRefresh) {
    return {
      error: { code: 'NOT_SUPPORTED', message: `Adapter "${adapter.name}" does not support perpetual KYC configuration` },
      status: 400,
    };
  }

  const config: KYCRefreshConfig = {
    intervalHours: (params.intervalHours as number) ?? 720,
    triggers: (params.triggers as RefreshTrigger[]) ?? ['scheduled'],
    riskThreshold: (params.riskThreshold as number) ?? 75,
    autoDenyOnHighRisk: (params.autoDenyOnHighRisk as boolean) ?? false,
  };

  const result = await adapter.configureRefresh(token, config);

  return {
    data: {
      ...result,
      adapter: adapter.name,
    },
  };
}
