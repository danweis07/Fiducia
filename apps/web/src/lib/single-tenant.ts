/**
 * Single-Tenant Mode Utilities
 *
 * When VITE_SINGLE_TENANT=true, the platform operates as a single-tenant
 * deployment. This module provides configuration and context helpers that
 * bypass multi-tenant DB lookups, allowing a credit union or community bank
 * to run Fiducia without the full multi-tenant control plane.
 *
 * Environment variables:
 *   VITE_SINGLE_TENANT    — "true" to enable single-tenant mode
 *   VITE_TENANT_ID        — Tenant UUID (default: "default")
 *   VITE_TENANT_NAME      — Institution display name
 *   VITE_SUBSCRIPTION_TIER — Subscription tier (default: "enterprise")
 *   VITE_TENANT_REGION    — Region code (default: "us")
 *   VITE_TENANT_COUNTRY   — ISO country code (default: "US")
 *   VITE_DEFAULT_CURRENCY — ISO currency code (default: "USD")
 *   VITE_FEATURES         — Comma-separated feature flags to enable
 */

import type {
  TenantFeatures,
  TenantContext,
  TenantUserRole,
  SubscriptionTier,
  TenantRegion,
} from "@/types";
import { getRolePermissions } from "@/types";

// =============================================================================
// MODE DETECTION
// =============================================================================

/** Whether the app is running in single-tenant mode */
export const SINGLE_TENANT_MODE = import.meta.env.VITE_SINGLE_TENANT === "true";

// =============================================================================
// STATIC CONFIG (from environment)
// =============================================================================

export const SINGLE_TENANT_CONFIG = {
  tenantId: import.meta.env.VITE_TENANT_ID || "default",
  tenantName: import.meta.env.VITE_TENANT_NAME || "My Institution",
  subscriptionTier: (import.meta.env.VITE_SUBSCRIPTION_TIER || "enterprise") as SubscriptionTier,
  region: (import.meta.env.VITE_TENANT_REGION || "us") as TenantRegion,
  country: import.meta.env.VITE_TENANT_COUNTRY || "US",
  defaultCurrency: import.meta.env.VITE_DEFAULT_CURRENCY || "USD",
} as const;

// =============================================================================
// FEATURE FLAGS
// =============================================================================

/** All features that can be toggled per tenant. */
const ALL_FEATURE_KEYS: (keyof TenantFeatures)[] = [
  "rdc",
  "billPay",
  "p2p",
  "cardControls",
  "externalTransfers",
  "wires",
  "mobileDeposit",
  "directDeposit",
  "openBanking",
  "sca",
  "confirmationOfPayee",
  "multiCurrency",
  "internationalPayments",
  "internationalBillPay",
  "openBankingAggregation",
  "aliasPayments",
  "amlScreening",
  "instantPayments",
];

/** Enterprise tier defaults — all core US features enabled. */
const ENTERPRISE_DEFAULTS: TenantFeatures = {
  rdc: true,
  billPay: true,
  p2p: true,
  cardControls: true,
  externalTransfers: true,
  wires: true,
  mobileDeposit: true,
  directDeposit: true,
  openBanking: true,
  sca: false,
  confirmationOfPayee: false,
  multiCurrency: false,
  internationalPayments: false,
  internationalBillPay: false,
  openBankingAggregation: false,
  aliasPayments: false,
  amlScreening: true,
  instantPayments: true,
};

/**
 * Build the feature flags for single-tenant mode.
 *
 * If VITE_FEATURES is set (comma-separated list), only those features are
 * enabled. If not set, use enterprise defaults.
 *
 * Features can be set via env var: VITE_FEATURES=rdc,billPay,cardControls
 */
export function getSingleTenantFeatures(): TenantFeatures {
  const envFeatures = import.meta.env.VITE_FEATURES;

  if (!envFeatures) {
    return { ...ENTERPRISE_DEFAULTS };
  }

  const enabledList = envFeatures
    .split(",")
    .map((f: string) => f.trim())
    .filter(Boolean);

  const enabledSet = new Set(enabledList);

  // Start with all disabled, then enable the ones from env
  const features: Record<string, boolean> = {};
  for (const key of ALL_FEATURE_KEYS) {
    features[key] = enabledSet.has(key);
  }

  return features as unknown as TenantFeatures;
}

// =============================================================================
// TENANT CONTEXT (skip DB lookup)
// =============================================================================

/**
 * Returns a complete TenantContext without any database queries.
 * Used when SINGLE_TENANT_MODE is true to eliminate the firm_users
 * and firms table lookups on every page load.
 *
 * @param userId   - The authenticated user's ID
 * @param userRole - The user's role (from user_metadata or default "owner")
 */
export function getSingleTenantContext(
  userId: string,
  userRole: TenantUserRole = "owner",
): TenantContext {
  const features = getSingleTenantFeatures();
  const permissions = getRolePermissions(userRole);

  return {
    tenantId: SINGLE_TENANT_CONFIG.tenantId,
    tenantName: SINGLE_TENANT_CONFIG.tenantName,
    userId,
    userRole,
    displayName: "Admin",
    permissions,
    subscriptionTier: SINGLE_TENANT_CONFIG.subscriptionTier,
    features,
    region: SINGLE_TENANT_CONFIG.region,
    country: SINGLE_TENANT_CONFIG.country,
    defaultCurrency: SINGLE_TENANT_CONFIG.defaultCurrency,
    sessionTimeoutMinutes: 15,
    sessionGraceMinutes: 2,
  };
}
