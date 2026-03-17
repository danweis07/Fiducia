import type { EnvProvider } from '../../platform/types.ts';
import type { InternationalBillPayAdapter } from './types.ts';
import { MockInternationalBillPayAdapter } from './mock-adapter.ts';
import { PipitGlobalAdapter } from './pipit-adapter.ts';
import { WisePlatformAdapter } from './wise-adapter.ts';
import { ConnectPayAdapter } from './connectpay-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createInternationalBillPayAdapter(provider: string): InternationalBillPayAdapter {
  switch (provider) {
    case 'pipit':
    case 'pipit_global': return new PipitGlobalAdapter();
    case 'wise':
    case 'wise_platform': return new WisePlatformAdapter();
    case 'connectpay': return new ConnectPayAdapter();
    case 'mock':
    default: return new MockInternationalBillPayAdapter();
  }
}

export function detectInternationalBillPayProvider(env?: EnvProvider): string {
  if (getEnv('PIPIT_API_KEY', env)) return 'pipit';
  if (getEnv('WISE_API_KEY', env)) return 'wise';
  if (getEnv('CONNECTPAY_API_KEY', env)) return 'connectpay';
  return 'mock';
}
