import type { EnvProvider } from '../../platform/types.ts';
import type { CardIssuingAdapter } from './types.ts';
import { MockCardIssuingAdapter } from './mock-adapter.ts';
import { LithicCardIssuingAdapter } from './lithic-adapter.ts';
import { BrexCardIssuingAdapter } from './brex-adapter.ts';
import { RampCardIssuingAdapter } from './ramp-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createCardIssuingAdapter(provider: string): CardIssuingAdapter {
  switch (provider) {
    case 'lithic': return new LithicCardIssuingAdapter();
    case 'brex': return new BrexCardIssuingAdapter();
    case 'ramp': return new RampCardIssuingAdapter();
    case 'mock':
    default: return new MockCardIssuingAdapter();
  }
}

export function detectCardIssuingProvider(env?: EnvProvider): string {
  if (getEnv('LITHIC_API_KEY', env)) return 'lithic';
  if (getEnv('BREX_API_TOKEN', env)) return 'brex';
  if (getEnv('RAMP_CLIENT_ID', env)) return 'ramp';
  return 'mock';
}
