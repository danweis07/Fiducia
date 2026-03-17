import type { EnvProvider } from '../../platform/types.ts';
import type { AggregatorAdapter } from './types.ts';
import { MockAggregatorAdapter } from './mock-adapter.ts';
import { SaltEdgeAdapter } from './salt-edge-adapter.ts';
import { AkoyaAdapter } from './akoya-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createAggregatorAdapter(provider: string, env?: EnvProvider): AggregatorAdapter {
  switch (provider) {
    case 'salt_edge': {
      const appId = getEnv('SALT_EDGE_APP_ID', env) ?? '';
      const secret = getEnv('SALT_EDGE_SECRET', env) ?? '';
      return new SaltEdgeAdapter(appId, secret);
    }
    case 'akoya': {
      const clientId = getEnv('AKOYA_CLIENT_ID', env) ?? '';
      const clientSecret = getEnv('AKOYA_CLIENT_SECRET', env) ?? '';
      return new AkoyaAdapter(clientId, clientSecret);
    }
    case 'mock':
    default: return new MockAggregatorAdapter();
  }
}

export function detectAggregatorProvider(env?: EnvProvider): string {
  if (getEnv('SALT_EDGE_APP_ID', env)) return 'salt_edge';
  if (getEnv('AKOYA_CLIENT_ID', env)) return 'akoya';
  return 'mock';
}
