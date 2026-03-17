import type { EnvProvider } from '../../platform/types.ts';
import type { InstantPaymentAdapter } from './types.ts';
import { MockInstantPaymentAdapter } from './mock-adapter.ts';
import { FedNowAdapter } from './fednow-adapter.ts';
import { RTPAdapter } from './rtp-adapter.ts';
import { SEPAInstantAdapter } from './sepa-instant-adapter.ts';
import { PixAdapter } from './pix-adapter.ts';
import { UPIAdapter } from './upi-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createInstantPaymentAdapter(provider: string): InstantPaymentAdapter {
  switch (provider) {
    case 'fednow': return new FedNowAdapter();
    case 'rtp':
    case 'tch': return new RTPAdapter();
    case 'sepa_instant':
    case 'sepa': return new SEPAInstantAdapter();
    case 'pix': return new PixAdapter();
    case 'upi': return new UPIAdapter();
    case 'mock':
    default: return new MockInstantPaymentAdapter();
  }
}

export function detectInstantPaymentProvider(env?: EnvProvider): string {
  if (getEnv('FEDNOW_API_URL', env)) return 'fednow';
  if (getEnv('RTP_API_URL', env)) return 'rtp';
  if (getEnv('SEPA_INSTANT_API_URL', env)) return 'sepa_instant';
  if (getEnv('PIX_API_URL', env)) return 'pix';
  if (getEnv('UPI_API_URL', env)) return 'upi';
  return 'mock';
}
