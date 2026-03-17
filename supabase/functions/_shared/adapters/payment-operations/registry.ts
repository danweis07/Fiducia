import type { EnvProvider } from '../../platform/types.ts';
import type { PaymentOperationsAdapter } from './types.ts';
import { MockPaymentOperationsAdapter } from './mock-adapter.ts';
import { ModernTreasuryAdapter } from './modern-treasury-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createPaymentOperationsAdapter(provider: string): PaymentOperationsAdapter {
  switch (provider) {
    case 'modern_treasury': return new ModernTreasuryAdapter();
    case 'mock':
    default: return new MockPaymentOperationsAdapter();
  }
}

export function detectPaymentOperationsProvider(env?: EnvProvider): string {
  if (getEnv('MODERN_TREASURY_API_KEY', env)) return 'modern_treasury';
  return 'mock';
}
