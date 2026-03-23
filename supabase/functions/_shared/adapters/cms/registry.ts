import type { EnvProvider } from '../../platform/types.ts';
import type { CMSAdapter } from './types.ts';
import { MockCMSAdapter } from './mock-adapter.ts';
import { StoryblokCMSAdapter } from './storyblok-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createCMSAdapter(provider: string): CMSAdapter {
  switch (provider) {
    case 'storyblok': return new StoryblokCMSAdapter();
    case 'mock':
    default: return new MockCMSAdapter();
  }
}

export function detectCMSProvider(env?: EnvProvider): string {
  if (getEnv('STORYBLOK_ACCESS_TOKEN', env)) return 'storyblok';
  return 'mock';
}
