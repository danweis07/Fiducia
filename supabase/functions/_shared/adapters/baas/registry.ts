import type { EnvProvider } from '../../platform/types.ts';
import type { BaaSAdapter } from './types.ts';
import { MockBaaSAdapter } from './mock-adapter.ts';
import { SolarisAdapter } from './solaris-adapter.ts';
import { ClearBankAdapter } from './clearbank-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createBaaSAdapter(provider: string): BaaSAdapter {
  switch (provider) {
    case 'solaris':
    case 'solarisbank': return new SolarisAdapter();
    case 'clearbank': return new ClearBankAdapter();
    case 'mock':
    default: return new MockBaaSAdapter();
  }
}

export function detectBaaSProvider(env?: EnvProvider): string {
  if (getEnv('SOLARIS_API_KEY', env)) return 'solaris';
  if (getEnv('CLEARBANK_API_KEY', env)) return 'clearbank';
  return 'mock';
}
