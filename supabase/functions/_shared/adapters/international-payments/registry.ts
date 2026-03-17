import type { EnvProvider } from '../../platform/types.ts';
import type { InternationalPaymentsAdapter } from './types.ts';
import { MockInternationalPaymentsAdapter } from './mock-adapter.ts';
import { StripeInternationalAdapter } from './stripe-adapter.ts';
import { MarqetaInternationalAdapter } from './marqeta-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createInternationalPaymentsAdapter(provider: string): InternationalPaymentsAdapter {
  switch (provider) {
    case 'stripe':
    case 'stripe_international': return new StripeInternationalAdapter();
    case 'marqeta': return new MarqetaInternationalAdapter();
    case 'mock':
    default: return new MockInternationalPaymentsAdapter();
  }
}

export function detectInternationalPaymentsProvider(env?: EnvProvider): string {
  if (getEnv('STRIPE_SECRET_KEY', env)) return 'stripe_international';
  if (getEnv('MARQETA_APP_TOKEN', env)) return 'marqeta';
  return 'mock';
}
