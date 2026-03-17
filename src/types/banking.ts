/**
 * Banking Platform Domain Types — Barrel Re-export
 *
 * This file re-exports all domain-specific type modules for backward compatibility.
 * Import from '@/types/banking' or '@/types' continues to work as before.
 *
 * All monetary values are stored as integer cents to avoid floating-point issues.
 *
 * Data Classification Levels:
 *   - public: Safe to display without restriction
 *   - internal: Visible to authenticated users within tenant
 *   - confidential: Requires specific permission to access
 *   - restricted: PII — encrypted at rest, masked in API responses
 */

export * from './tenant';
export * from './accounts';
export * from './transactions';
export * from './transfers';
export * from './bills';
export * from './cards';
export * from './rdc';
export * from './notifications';
export * from './config';
export * from './audit';
export * from './compliance';
export * from './statements';
export * from './member';
export * from './loans';
export * from './charges';
export * from './standing-instructions';
export * from './integrations';
export * from './financial-data';
export * from './offers';
export * from './messaging';
export * from './checks';
export * from './direct-deposit';
export * from './disputes';
export * from './wires';
export * from './stop-payments';
export * from './p2p';
export * from './goals';
export * from './devices';
export * from './overdraft';
export * from './spending-alerts';
export * from './vault';
export * from './joint-accounts';
export * from './open-banking';
export * from './business';
export * from './aggregator';
export * from './international';
export * from './instant-payments';
