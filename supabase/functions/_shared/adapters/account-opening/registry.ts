import type { DatabasePort, EnvProvider } from '../../platform/types.ts';
import type { AccountOpeningAdapter } from './types.ts';
import type { KYCAdapter } from '../kyc/types.ts';
import { MockAccountOpeningAdapter } from './mock-adapter.ts';
import { CUAnswersAccountOpeningAdapter } from './cuanswers-adapter.ts';
import { BuiltinAccountOpeningAdapter } from './builtin-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

/**
 * Create an account opening adapter by provider name.
 *
 * The 'builtin' provider requires additional dependencies (db, kycAdapter)
 * because it persists to the database and integrates KYC inline.
 * Use createBuiltinAccountOpeningAdapter() for the full-featured version.
 */
export function createAccountOpeningAdapter(provider: string): AccountOpeningAdapter {
  switch (provider) {
    case 'cuanswers':
    case 'cubase': return new CUAnswersAccountOpeningAdapter();
    case 'builtin':
      throw new Error(
        'The builtin adapter requires dependencies. Use createBuiltinAccountOpeningAdapter() instead.',
      );
    case 'mock':
    default: return new MockAccountOpeningAdapter();
  }
}

/**
 * Create the built-in account opening adapter with all dependencies.
 * This is the recommended adapter for institutions that want a complete
 * self-hosted account opening flow with KYC/AML integration.
 */
export function createBuiltinAccountOpeningAdapter(deps: {
  db: DatabasePort;
  env: EnvProvider;
  kycAdapter: KYCAdapter;
  fraudAdapter?: ConstructorParameters<typeof BuiltinAccountOpeningAdapter>[0]['fraudAdapter'];
}): BuiltinAccountOpeningAdapter {
  return new BuiltinAccountOpeningAdapter(deps);
}

export function detectAccountOpeningProvider(env?: EnvProvider): string {
  if (getEnv('CUANSWERS_APP_KEY', env)) return 'cuanswers';
  if (getEnv('BUILTIN_ACCOUNT_OPENING', env) === 'true') return 'builtin';
  return 'mock';
}

/** Resolve the account opening adapter (convenience for handlers). */
export function resolveAdapter(tenantId: string, env?: EnvProvider): AccountOpeningAdapter {
  const provider = getEnv('ACCOUNT_OPENING_PROVIDER', env)
    ?? detectAccountOpeningProvider(env);
  return createAccountOpeningAdapter(provider);
}
