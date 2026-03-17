import type { EnvProvider } from '../../platform/types.ts';
import type { SCAAdapter } from './types.ts';
import { MockSCAAdapter } from './mock-adapter.ts';
import { TinkSCAAdapter } from './tink-adapter.ts';

export function createSCAAdapter(provider: string): SCAAdapter {
  switch (provider) {
    case 'tink':
      return new TinkSCAAdapter();
    case 'mock':
    default:
      return new MockSCAAdapter();
  }
}

export function detectSCAProvider(env?: EnvProvider): string {
  const get = (key: string) => env ? env.get(key) : Deno.env.get(key);
  try {
    if (get('TINK_CLIENT_ID')) return 'tink';
  } catch {
    // env access unavailable
  }
  return 'mock';
}
