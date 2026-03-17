import type { EnvProvider } from '../../platform/types.ts';
import type { AIServicesAdapter } from './types.ts';
import { MockAIServicesAdapter } from './mock-adapter.ts';
import { MultiProviderAIAdapter } from './multi-provider-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createAIServicesAdapter(provider: string): AIServicesAdapter {
  switch (provider) {
    case 'multi_provider': return new MultiProviderAIAdapter();
    case 'mock':
    default: return new MockAIServicesAdapter();
  }
}

export function detectAIServicesProvider(env?: EnvProvider): string {
  if (getEnv('GOOGLE_AI_API_KEY', env) || getEnv('ANTHROPIC_API_KEY', env) || getEnv('OPENAI_API_KEY', env)) return 'multi_provider';
  return 'mock';
}
