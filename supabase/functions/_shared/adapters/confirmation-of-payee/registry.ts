import type { EnvProvider } from '../../platform/types.ts';
import type { ConfirmationOfPayeeAdapter } from './types.ts';
import { MockConfirmationOfPayeeAdapter } from './mock-adapter.ts';
import { PayUKConfirmationOfPayeeAdapter } from './payuk-adapter.ts';

export function createConfirmationOfPayeeAdapter(provider: string): ConfirmationOfPayeeAdapter {
  switch (provider) {
    case 'payuk':
      return new PayUKConfirmationOfPayeeAdapter();
    case 'mock':
    default:
      return new MockConfirmationOfPayeeAdapter();
  }
}

export function detectConfirmationOfPayeeProvider(env?: EnvProvider): string {
  const get = (key: string) => env ? env.get(key) : Deno.env.get(key);
  try {
    if (get('PAYUK_CLIENT_ID')) return 'payuk';
  } catch {
    // env access unavailable
  }
  return 'mock';
}
