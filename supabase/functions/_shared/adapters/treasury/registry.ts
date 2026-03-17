import type { EnvProvider } from '../../platform/types.ts';
import type { TreasuryAdapter } from './types.ts';
import { MockTreasuryAdapter } from './mock-adapter.ts';
import { ColumnTreasuryAdapter } from './column-adapter.ts';
import { IncreaseTreasuryAdapter } from './increase-adapter.ts';
import { MercuryTreasuryAdapter } from './mercury-adapter.ts';
import { StripeTreasuryAdapter } from './stripe-treasury-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createTreasuryAdapter(provider: string): TreasuryAdapter {
  switch (provider) {
    case 'column': return new ColumnTreasuryAdapter();
    case 'increase': return new IncreaseTreasuryAdapter();
    case 'mercury': return new MercuryTreasuryAdapter();
    case 'stripe_treasury':
    case 'stripe': return new StripeTreasuryAdapter();
    case 'mock':
    default: return new MockTreasuryAdapter();
  }
}

export function detectTreasuryProvider(env?: EnvProvider): string {
  if (getEnv('COLUMN_API_KEY', env)) return 'column';
  if (getEnv('INCREASE_API_KEY', env)) return 'increase';
  if (getEnv('MERCURY_API_TOKEN', env)) return 'mercury';
  if (getEnv('STRIPE_SECRET_KEY', env)) return 'stripe_treasury';
  return 'mock';
}
