/**
 * Configuration Types
 *
 * Backend-driven UI capabilities and tenant theming.
 */

// =============================================================================
// BACKEND-DRIVEN UI CAPABILITIES
// =============================================================================

export interface BankingCapabilities {
  rdc: { enabled: boolean; provider: string | null; maxAmountCents: number };
  billPay: { enabled: boolean; provider: string | null };
  p2p: { enabled: boolean; provider: string | null };
  cardControls: { enabled: boolean };
  externalTransfers: { enabled: boolean };
  wires: { enabled: boolean; cutoffTime: string | null };
  mobileDeposit: { enabled: boolean };
}

export interface TenantTheme {
  tenantName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  faviconUrl: string | null;
}
