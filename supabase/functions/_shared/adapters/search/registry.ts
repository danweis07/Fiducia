import type { EnvProvider } from '../../platform/types.ts';
import type { SearchAdapter } from './types.ts';
import { MockSearchAdapter } from './mock-adapter.ts';
import { AlgoliaSearchAdapter } from './algolia-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createSearchAdapter(provider: string): SearchAdapter {
  switch (provider) {
    case 'algolia': return new AlgoliaSearchAdapter();
    case 'mock':
    default: return new MockSearchAdapter();
  }
}

export function detectSearchProvider(env?: EnvProvider): string {
  if (getEnv('ALGOLIA_APP_ID', env)) return 'algolia';
  return 'mock';
}
