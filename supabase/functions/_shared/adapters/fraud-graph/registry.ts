import type { EnvProvider } from '../../platform/types.ts';
import type { FraudGraphAdapter } from './types.ts';
import { MockFraudGraphAdapter } from './mock-adapter.ts';
import { Neo4jFraudGraphAdapter } from './neo4j-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createFraudGraphAdapter(provider: string): FraudGraphAdapter {
  switch (provider) {
    case 'neo4j': return new Neo4jFraudGraphAdapter();
    case 'mock':
    default: return new MockFraudGraphAdapter();
  }
}

export function detectFraudGraphProvider(env?: EnvProvider): string {
  if (getEnv('NEO4J_URI', env)) return 'neo4j';
  return 'mock';
}
