/**
 * Regional Feature Profiles
 *
 * Pre-configured feature flag bundles for common deployment scenarios.
 * Tenants select a profile as a starting point, then override individually.
 */

import type { TenantFeatures, TenantRegion } from "@/types/tenant";

export type RegionalProfileId =
  | "us_credit_union"
  | "us_neobank"
  | "uk_neobank"
  | "eu_bank"
  | "africa_mobile"
  | "india_digital"
  | "latam_digital"
  | "mena_bank";

export interface RegionalProfile {
  id: RegionalProfileId;
  label: string;
  description: string;
  region: TenantRegion;
  defaultCurrency: string;
  features: TenantFeatures;
}

// ---------------------------------------------------------------------------
// Profile Definitions
// ---------------------------------------------------------------------------

const US_CREDIT_UNION: RegionalProfile = {
  id: "us_credit_union",
  label: "US Credit Union / Community Bank",
  description: "Regional CUs and community banks with RDC, bill pay, and card controls",
  region: "us",
  defaultCurrency: "USD",
  features: {
    rdc: true,
    billPay: true,
    p2p: false,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: true,
    directDeposit: true,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: false,
    amlScreening: false,
    instantPayments: false,
  },
};

const US_NEOBANK: RegionalProfile = {
  id: "us_neobank",
  label: "US Neobank",
  description: "Digital-first banks with P2P, mobile deposit, and direct deposit",
  region: "us",
  defaultCurrency: "USD",
  features: {
    rdc: true,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: true,
    directDeposit: true,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: false,
    amlScreening: false,
    instantPayments: false,
  },
};

const UK_NEOBANK: RegionalProfile = {
  id: "uk_neobank",
  label: "UK Neobank / Challenger",
  description: "UK challengers with Open Banking, SCA, Confirmation of Payee, and multi-currency",
  region: "uk",
  defaultCurrency: "GBP",
  features: {
    rdc: false,
    billPay: false,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: true,
    mobileDeposit: false,
    directDeposit: false,
    openBanking: true,
    sca: true,
    confirmationOfPayee: true,
    multiCurrency: true,
    internationalPayments: true,
    internationalBillPay: false,
    openBankingAggregation: true,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: true,
  },
};

const EU_BANK: RegionalProfile = {
  id: "eu_bank",
  label: "EU Bank / Neobank",
  description: "PSD2-compliant banks with SCA, Open Banking, multi-currency, and SEPA",
  region: "eu",
  defaultCurrency: "EUR",
  features: {
    rdc: false,
    billPay: false,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: true,
    mobileDeposit: false,
    directDeposit: false,
    openBanking: true,
    sca: true,
    confirmationOfPayee: false,
    multiCurrency: true,
    internationalPayments: true,
    internationalBillPay: false,
    openBankingAggregation: true,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: true,
  },
};

const AFRICA_MOBILE: RegionalProfile = {
  id: "africa_mobile",
  label: "Africa Mobile Banking",
  description: "Mobile-first banking with P2P, alias payments, and agent banking",
  region: "africa",
  defaultCurrency: "NGN",
  features: {
    rdc: false,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: true,
    directDeposit: false,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: false,
  },
};

const INDIA_DIGITAL: RegionalProfile = {
  id: "india_digital",
  label: "India Digital Bank",
  description: "Digital banking with UPI/alias payments, P2P, and AML screening",
  region: "apac",
  defaultCurrency: "INR",
  features: {
    rdc: false,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: false,
    directDeposit: false,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: false,
  },
};

const LATAM_DIGITAL: RegionalProfile = {
  id: "latam_digital",
  label: "LATAM Digital Bank",
  description: "Digital banking for Latin America with P2P and bill pay",
  region: "latam",
  defaultCurrency: "BRL",
  features: {
    rdc: false,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: false,
    mobileDeposit: false,
    directDeposit: false,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: false,
    internationalPayments: false,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: true,
    amlScreening: true,
    instantPayments: true,
  },
};

const MENA_BANK: RegionalProfile = {
  id: "mena_bank",
  label: "MENA Bank",
  description:
    "Banking for Middle East & North Africa with multi-currency and international payments",
  region: "mena",
  defaultCurrency: "AED",
  features: {
    rdc: false,
    billPay: true,
    p2p: true,
    cardControls: true,
    externalTransfers: true,
    wires: true,
    mobileDeposit: false,
    directDeposit: false,
    openBanking: false,
    sca: false,
    confirmationOfPayee: false,
    multiCurrency: true,
    internationalPayments: true,
    internationalBillPay: false,
    openBankingAggregation: false,
    aliasPayments: false,
    amlScreening: true,
    instantPayments: false,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const REGIONAL_PROFILES: RegionalProfile[] = [
  US_CREDIT_UNION,
  US_NEOBANK,
  UK_NEOBANK,
  EU_BANK,
  AFRICA_MOBILE,
  INDIA_DIGITAL,
  LATAM_DIGITAL,
  MENA_BANK,
];

/**
 * Get the default regional profile for a given region.
 * Returns the first profile matching the region.
 */
export function getRegionalDefaults(region: TenantRegion): RegionalProfile {
  const match = REGIONAL_PROFILES.find((p) => p.region === region);
  return match ?? US_CREDIT_UNION; // fallback to US CU
}

/**
 * Get a specific profile by ID.
 */
export function getProfileById(id: RegionalProfileId): RegionalProfile | undefined {
  return REGIONAL_PROFILES.find((p) => p.id === id);
}

/**
 * Get all profiles for a given region.
 */
export function getProfilesForRegion(region: TenantRegion): RegionalProfile[] {
  return REGIONAL_PROFILES.filter((p) => p.region === region);
}
