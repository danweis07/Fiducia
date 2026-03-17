import type { EnvProvider } from '../../platform/types.ts';
import type { CardAdapter } from './types.ts';
import { MockCardAdapter } from './mock-adapter.ts';
import { JackHenryCardAdapter } from './jackhenry-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createCardAdapter(provider: string): CardAdapter {
  switch (provider) {
    case 'jackhenry':
    case 'jxchange': return new JackHenryCardAdapter();
    case 'mock':
    default: return new MockCardAdapter();
  }
}

export function detectCardProvider(env?: EnvProvider): string {
  if (getEnv('JXCHANGE_HOST', env)) return 'jackhenry';
  return 'mock';
}
