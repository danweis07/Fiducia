import type { EnvProvider } from '../../platform/types.ts';
import type { FraudAdapter } from './types.ts';
import { MockFraudAdapter } from './mock-adapter.ts';
import { BioCatchAdapter } from './biocatch-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createFraudAdapter(provider: string): FraudAdapter {
  switch (provider) {
    case 'biocatch': return new BioCatchAdapter();
    case 'mock':
    default: return new MockFraudAdapter();
  }
}

export function detectFraudProvider(env?: EnvProvider): string {
  if (getEnv('BIOCATCH_API_URL', env)) return 'biocatch';
  return 'mock';
}
