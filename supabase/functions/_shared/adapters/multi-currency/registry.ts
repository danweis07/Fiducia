import type { EnvProvider } from '../../platform/types.ts';
import type { MultiCurrencyAdapter } from './types.ts';
import { MockMultiCurrencyAdapter } from './mock-adapter.ts';
import { CurrencyCloudMultiCurrencyAdapter } from './currencycloud-adapter.ts';

export function createMultiCurrencyAdapter(provider: string): MultiCurrencyAdapter {
  switch (provider) {
    case 'currencycloud':
      return new CurrencyCloudMultiCurrencyAdapter();
    case 'mock':
    default:
      return new MockMultiCurrencyAdapter();
  }
}

export function detectMultiCurrencyProvider(env?: EnvProvider): string {
  const get = (key: string) => env ? env.get(key) : Deno.env.get(key);
  try {
    if (get('CURRENCYCLOUD_API_KEY')) return 'currencycloud';
  } catch {
    // env access unavailable
  }
  return 'mock';
}
