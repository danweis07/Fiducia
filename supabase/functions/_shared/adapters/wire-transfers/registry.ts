/**
 * Wire Transfer Adapter Registry
 *
 * Resolves the appropriate wire transfer adapter based on wire type,
 * environment variables, or explicit provider selection.
 *
 * Resolution:
 *   1. Explicit provider name → create that adapter
 *   2. FEDWIRE_BASE_URL set → FedWire (domestic)
 *   3. SWIFT_BASE_URL set → SWIFT gpi (international)
 *   4. Default → Mock adapter
 */

import type { WireTransferAdapter } from './types.ts';
import { MockWireTransferAdapter } from './mock-adapter.ts';
import { FedWireAdapter } from './fedwire-adapter.ts';
import { SwiftGpiAdapter } from './swift-adapter.ts';

type EnvProvider = { get(key: string): string | undefined };

function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

/**
 * Create a wire transfer adapter by explicit provider name.
 */
export function createWireTransferAdapter(provider: string): WireTransferAdapter {
  switch (provider) {
    case 'fedwire': return new FedWireAdapter();
    case 'swift': return new SwiftGpiAdapter();
    case 'mock':
    default: return new MockWireTransferAdapter();
  }
}

/**
 * Auto-detect the best wire transfer adapter for a given wire type.
 *
 * - For domestic wires: prefers FedWire if configured
 * - For international wires: prefers SWIFT if configured
 * - Falls back to mock for either
 */
export function detectWireTransferProvider(
  wireType: 'domestic' | 'international',
  env?: EnvProvider,
): string {
  // Check explicit WIRE_PROVIDER override first
  const explicit = getEnv('WIRE_PROVIDER', env);
  if (explicit && explicit !== 'mock') return explicit;

  if (wireType === 'domestic') {
    if (getEnv('FEDWIRE_BASE_URL', env)) return 'fedwire';
  }

  if (wireType === 'international') {
    if (getEnv('SWIFT_BASE_URL', env) || getEnv('SWIFT_BIC', env)) return 'swift';
  }

  return 'mock';
}
