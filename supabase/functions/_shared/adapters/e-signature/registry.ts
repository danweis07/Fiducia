/**
 * E-Signature Adapter Registry
 *
 * Factory + auto-detection for e-signature providers.
 * Supports DocuSign and PandaDoc with mock fallback.
 */

import type { EnvProvider } from '../../platform/types.ts';
import type { ESignatureAdapter } from './types.ts';
import { MockESignatureAdapter } from './mock-adapter.ts';
import { DocuSignESignatureAdapter } from './docusign-adapter.ts';
import { PandaDocESignatureAdapter } from './pandadoc-adapter.ts';

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

export function createESignatureAdapter(provider: string): ESignatureAdapter {
  switch (provider) {
    case 'docusign':
      return new DocuSignESignatureAdapter();
    case 'pandadoc':
      return new PandaDocESignatureAdapter();
    case 'mock':
    default:
      return new MockESignatureAdapter();
  }
}

export function detectESignatureProvider(env?: EnvProvider): string {
  if (getEnv('DOCUSIGN_ACCOUNT_ID', env)) return 'docusign';
  if (getEnv('PANDADOC_API_KEY', env)) return 'pandadoc';
  return 'mock';
}
