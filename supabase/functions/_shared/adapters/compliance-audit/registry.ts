import type { EnvProvider } from '../../platform/types.ts';
import type { ComplianceAuditAdapter } from './types.ts';
import { MockComplianceAuditAdapter } from './mock-adapter.ts';
import { VantaComplianceAuditAdapter } from './vanta-adapter.ts';
import { DrataComplianceAuditAdapter } from './drata-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createComplianceAuditAdapter(provider: string): ComplianceAuditAdapter {
  switch (provider) {
    case 'vanta': return new VantaComplianceAuditAdapter();
    case 'drata': return new DrataComplianceAuditAdapter();
    case 'mock':
    default: return new MockComplianceAuditAdapter();
  }
}

export function detectComplianceAuditProvider(env?: EnvProvider): string {
  if (getEnv('VANTA_API_TOKEN', env)) return 'vanta';
  if (getEnv('DRATA_API_KEY', env)) return 'drata';
  return 'mock';
}
