import type { EnvProvider } from '../../platform/types.ts';
import type { AliasResolutionAdapter } from './types.ts';
import { MockAliasResolutionAdapter } from './mock-adapter.ts';
import { PlaidAliasResolutionAdapter } from './plaid-adapter.ts';

export function createAliasResolutionAdapter(provider: string): AliasResolutionAdapter {
  switch (provider) {
    case 'plaid':
      return new PlaidAliasResolutionAdapter();
    case 'mock':
    default:
      return new MockAliasResolutionAdapter();
  }
}

export function detectAliasResolutionProvider(env?: EnvProvider): string {
  const get = (key: string) => env ? env.get(key) : Deno.env.get(key);
  try {
    if (get('PLAID_CLIENT_ID') && get('PLAID_SECRET')) return 'plaid';
  } catch {
    // env access unavailable
  }
  return 'mock';
}
