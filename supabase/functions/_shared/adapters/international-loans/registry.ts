import type { EnvProvider } from '../../platform/types.ts';
import type { InternationalLoanOriginationAdapter } from './types.ts';
import { MockInternationalLoanOriginationAdapter } from './mock-adapter.ts';
import { FinastraLoanAdapter } from './finastra-adapter.ts';
import { NCinoLoanAdapter } from './ncino-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createInternationalLoanAdapter(provider: string): InternationalLoanOriginationAdapter {
  switch (provider) {
    case 'finastra': return new FinastraLoanAdapter();
    case 'ncino': return new NCinoLoanAdapter();
    case 'mock':
    default: return new MockInternationalLoanOriginationAdapter();
  }
}

export function detectInternationalLoanProvider(env?: EnvProvider): string {
  if (getEnv('FINASTRA_CLIENT_ID', env)) return 'finastra';
  if (getEnv('NCINO_API_KEY', env)) return 'ncino';
  return 'mock';
}
