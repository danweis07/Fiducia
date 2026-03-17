import type { EnvProvider } from '../../platform/types.ts';
import type { LoanOriginationAdapter } from './types.ts';
import { MockLoanOriginationAdapter } from './mock-adapter.ts';
import { LoanVantageAdapter } from './loanvantage-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createLoanOriginationAdapter(provider: string): LoanOriginationAdapter {
  switch (provider) {
    case 'loanvantage': return new LoanVantageAdapter();
    case 'mock':
    default: return new MockLoanOriginationAdapter();
  }
}

export function detectLoanOriginationProvider(env?: EnvProvider): string {
  if (getEnv('LOANVANTAGE_PRODUCT_CREDENTIAL', env)) return 'loanvantage';
  return 'mock';
}
