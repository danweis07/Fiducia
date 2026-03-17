import type { EnvProvider } from '../../platform/types.ts';
import type { NotificationAdapter } from './types.ts';
import { MockNotificationAdapter } from './mock-adapter.ts';
import { BrazeNotificationAdapter } from './braze-adapter.ts';
import { TwilioNotificationAdapter } from './twilio-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createNotificationAdapter(provider: string): NotificationAdapter {
  switch (provider) {
    case 'braze': return new BrazeNotificationAdapter();
    case 'twilio': return new TwilioNotificationAdapter();
    case 'mock':
    default: return new MockNotificationAdapter();
  }
}

export function detectNotificationProvider(env?: EnvProvider): string {
  if (getEnv('BRAZE_API_KEY', env)) return 'braze';
  if (getEnv('TWILIO_ACCOUNT_SID', env)) return 'twilio';
  return 'mock';
}
