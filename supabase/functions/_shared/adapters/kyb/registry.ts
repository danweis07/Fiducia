import type { EnvProvider } from '../../platform/types.ts';
import type { KYBAdapter } from './types.ts';
import { MockKYBAdapter } from './mock-adapter.ts';
import { MiddeskKYBAdapter } from './middesk-adapter.ts';
import { PersonaKYBAdapter } from './persona-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createKYBAdapter(provider: string): KYBAdapter {
  switch (provider) {
    case 'middesk': return new MiddeskKYBAdapter();
    case 'persona': return new PersonaKYBAdapter();
    case 'mock':
    default: return new MockKYBAdapter();
  }
}

export function detectKYBProvider(env?: EnvProvider): string {
  if (getEnv('MIDDESK_API_KEY', env)) return 'middesk';
  if (getEnv('PERSONA_API_KEY', env)) return 'persona';
  return 'mock';
}
