/**
 * Route Manifest — Feature & Region Requirements
 *
 * Documents which routes require which tenant features or regions.
 * Used for developer reference and can be consumed by admin tools
 * to show which routes are active for a given tenant configuration.
 *
 * Note: Runtime enforcement is handled by FeatureGate at render time.
 * This manifest provides a single source of truth for documentation
 * and tooling purposes.
 */

import type { TenantFeatures, TenantRegion } from "@/types/tenant";

export interface RouteManifestEntry {
  /** Route path */
  path: string;
  /** Human-readable label */
  label: string;
  /** Required feature(s) — ALL must be enabled */
  feature?: (keyof TenantFeatures)[];
  /** Required region(s) — tenant must be in ONE of these */
  region?: TenantRegion[];
  /** Route group for navigation */
  group: "core" | "payments" | "cards" | "international" | "compliance" | "settings" | "admin";
}

export const ROUTE_MANIFEST: RouteManifestEntry[] = [
  // ── Core (always available) ─────────────────────────────────────────
  { path: "/dashboard", label: "Dashboard", group: "core" },
  { path: "/accounts", label: "Accounts", group: "core" },
  { path: "/accounts/:id", label: "Account Detail", group: "core" },
  { path: "/notifications", label: "Notifications", group: "core" },
  { path: "/statements", label: "Statements", group: "core" },
  { path: "/settings", label: "Settings", group: "settings" },
  { path: "/messages", label: "Secure Messages", group: "core" },
  { path: "/disputes", label: "Disputes", group: "core" },
  { path: "/financial", label: "Financial Management", group: "core" },
  { path: "/document-vault", label: "Document Vault", group: "core" },
  { path: "/devices", label: "Device Management", group: "settings" },

  // ── Payments & Transfers ────────────────────────────────────────────
  { path: "/transfer", label: "Transfer", group: "payments" },
  { path: "/move-money", label: "Move Money", group: "payments" },
  { path: "/bills", label: "Bill Pay", feature: ["billPay"], group: "payments" },
  { path: "/p2p", label: "P2P Transfers", feature: ["p2p"], group: "payments" },
  { path: "/wire-transfer", label: "Wire Transfer", feature: ["wires"], group: "payments" },
  {
    path: "/direct-deposit",
    label: "Direct Deposit",
    feature: ["directDeposit"],
    group: "payments",
  },
  { path: "/stop-payments", label: "Stop Payments", group: "payments" },
  { path: "/standing-instructions", label: "Standing Instructions", group: "payments" },
  {
    path: "/alias-payments",
    label: "Alias Payments",
    feature: ["aliasPayments"],
    group: "payments",
  },

  // ── Cards ───────────────────────────────────────────────────────────
  { path: "/cards", label: "Cards", feature: ["cardControls"], group: "cards" },
  { path: "/card-services", label: "Card Services", feature: ["cardControls"], group: "cards" },
  { path: "/card-offers", label: "Card Offers", group: "cards" },

  // ── Deposits ────────────────────────────────────────────────────────
  { path: "/deposit", label: "Remote Deposit", feature: ["rdc"], group: "core" },
  { path: "/check-ordering", label: "Check Ordering", group: "core" },

  // ── Accounts ────────────────────────────────────────────────────────
  {
    path: "/linked-accounts",
    label: "Linked Accounts",
    feature: ["externalTransfers"],
    group: "core",
  },
  { path: "/joint-accounts", label: "Joint Accounts", group: "core" },
  { path: "/savings-goals", label: "Savings Goals", group: "core" },
  { path: "/overdraft", label: "Overdraft Settings", group: "settings" },
  { path: "/spending-alerts", label: "Spending Alerts", group: "settings" },

  // ── Loans ───────────────────────────────────────────────────────────
  { path: "/loans/:id", label: "Loan Detail", group: "core" },
  { path: "/apply-loan", label: "Loan Application", group: "core" },

  // ── International ───────────────────────────────────────────────────
  {
    path: "/international",
    label: "International Payments",
    feature: ["internationalPayments"],
    group: "international",
  },
  {
    path: "/multi-currency",
    label: "Multi-Currency Wallet",
    feature: ["multiCurrency"],
    group: "international",
  },
  { path: "/instant-payments", label: "Instant Payments", group: "international" },

  // ── Compliance & Regulation ─────────────────────────────────────────
  {
    path: "/connected-apps",
    label: "Open Banking Consents",
    feature: ["openBanking"],
    group: "compliance",
  },
  {
    path: "/consent-dashboard",
    label: "Consent Dashboard",
    feature: ["openBanking"],
    group: "compliance",
  },
  {
    path: "/sca",
    label: "SCA Management",
    feature: ["sca"],
    region: ["eu", "uk"],
    group: "compliance",
  },
  { path: "/kyc-aml", label: "KYC/AML Compliance", group: "compliance" },
  { path: "/international-kyc", label: "International eKYC", group: "compliance" },
  { path: "/regulatory", label: "Regulatory Dashboard", group: "compliance" },
  {
    path: "/open-finance",
    label: "Open Finance Hub",
    feature: ["openBanking"],
    group: "compliance",
  },

  // ── Business ────────────────────────────────────────────────────────
  { path: "/business", label: "Business Hub", group: "core" },
  { path: "/invoices", label: "Invoice Processor", group: "core" },
];

/**
 * Get routes that are active for a given set of features and region.
 */
export function getActiveRoutes(
  features: TenantFeatures,
  region: TenantRegion,
): RouteManifestEntry[] {
  return ROUTE_MANIFEST.filter((route) => {
    // Check feature requirements
    if (route.feature) {
      const allEnabled = route.feature.every((f) => features[f]);
      if (!allEnabled) return false;
    }
    // Check region requirements
    if (route.region) {
      if (!route.region.includes(region)) return false;
    }
    return true;
  });
}

/**
 * Get routes that would be UNLOCKED by enabling a specific feature.
 * Useful for showing what enabling a feature would add.
 */
export function getRoutesForFeature(feature: keyof TenantFeatures): RouteManifestEntry[] {
  return ROUTE_MANIFEST.filter((route) => route.feature?.includes(feature));
}
