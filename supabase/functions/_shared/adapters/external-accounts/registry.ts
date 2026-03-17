import type { EnvProvider } from '../../platform/types.ts';
import type { ExternalAccountAdapter } from './types.ts';
import { MockExternalAccountAdapter } from './mock-adapter.ts';
import { PlaidAdapter } from './plaid-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createExternalAccountAdapter(provider: string, env?: EnvProvider): ExternalAccountAdapter {
  switch (provider) {
    case 'plaid': {
      const clientId = getEnv('PLAID_CLIENT_ID', env) ?? '';
      const secret = getEnv('PLAID_SECRET', env) ?? '';
      return new PlaidAdapter(clientId, secret);
    }
    case 'mock':
    default: return new MockExternalAccountAdapter();
  }
}
