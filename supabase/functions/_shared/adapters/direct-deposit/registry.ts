import type { EnvProvider } from '../../platform/types.ts';
import type { DirectDepositAdapter } from './types.ts';
import { MockDirectDepositAdapter } from './mock-adapter.ts';
import { PinwheelDirectDepositAdapter } from './pinwheel-adapter.ts';
import { ArgyleDirectDepositAdapter } from './argyle-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createDirectDepositAdapter(provider: string): DirectDepositAdapter {
  switch (provider) {
    case 'pinwheel': return new PinwheelDirectDepositAdapter();
    case 'argyle': return new ArgyleDirectDepositAdapter();
    case 'mock':
    default: return new MockDirectDepositAdapter();
  }
}

export function detectDirectDepositProvider(env?: EnvProvider): string {
  if (getEnv('PINWHEEL_API_KEY', env)) return 'pinwheel';
  if (getEnv('ARGYLE_API_KEY', env)) return 'argyle';
  return 'mock';
}
