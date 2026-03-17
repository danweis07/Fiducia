import type { EnvProvider } from '../../platform/types.ts';
import type { CardProvisioningAdapter } from './types.ts';
import { MockCardProvisioningAdapter } from './mock-adapter.ts';
import { JackHenryCardProvisioningAdapter } from './jack-henry-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createCardProvisioningAdapter(provider: string): CardProvisioningAdapter {
  switch (provider) {
    case 'jack_henry':
    case 'jxchange': return new JackHenryCardProvisioningAdapter();
    case 'mock':
    default: return new MockCardProvisioningAdapter();
  }
}

export function detectCardProvisioningProvider(env?: EnvProvider): string {
  if (getEnv('JACK_HENRY_JXCHANGE_URL', env)) return 'jack_henry';
  return 'mock';
}
