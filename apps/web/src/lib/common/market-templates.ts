/**
 * Market Configuration Templates
 *
 * Pre-built configuration profiles for common banking markets.
 * Developers can select a template when onboarding a new tenant
 * to pre-fill features, compliance settings, currency, timezone,
 * and supported languages for their target market.
 *
 * Usage:
 *   import { MARKET_TEMPLATES, getTemplateForMarket } from '@/lib/common/market-templates';
 *   const template = getTemplateForMarket('uk', 'GB');
 */

import type { TenantFeatures, ComplianceSettings, TenantRegion } from "@/types/tenant";

export interface MarketTemplate {
  /** Human-readable label */
  label: string;
  /** Region code */
  region: TenantRegion;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** ISO 4217 currency code */
  currency: string;
  /** IANA timezone */
  timezone: string;
  /** Feature flags to enable for this market */
  features: TenantFeatures;
  /** Compliance settings for this regulatory environment */
  compliance: ComplianceSettings;
  /** Languages relevant to this market */
  supportedLanguages: string[];
}

// =============================================================================
// SHARED FEATURE PRESETS
// =============================================================================

const CORE_FEATURES: TenantFeatures = {
  rdc: false,
  billPay: false,
  p2p: false,
  cardControls: false,
  externalTransfers: false,
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
  aliasPayments: false,
  amlScreening: false,
};

// =============================================================================
// MARKET TEMPLATES
// =============================================================================

export const MARKET_TEMPLATES: MarketTemplate[] = [
  // ── US ──────────────────────────────────────────────────────────────────
  {
    label: "US Credit Union",
    region: "us",
    country: "US",
    currency: "USD",
    timezone: "America/New_York",
    features: {
      ...CORE_FEATURES,
      rdc: true,
      billPay: true,
      cardControls: true,
      externalTransfers: true,
      mobileDeposit: true,
      directDeposit: true,
      p2p: true,
    },
    compliance: {
      dataRetentionYears: 7,
      kycRequired: true,
      mfaRequired: false,
      mfaThresholdCents: 50000,
      dataResidencyRegion: "us",
      sessionTimeoutMinutes: 15,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["en", "es"],
  },
  {
    label: "US Community Bank",
    region: "us",
    country: "US",
    currency: "USD",
    timezone: "America/New_York",
    features: {
      ...CORE_FEATURES,
      rdc: true,
      billPay: true,
      cardControls: true,
      externalTransfers: true,
      wires: true,
      mobileDeposit: true,
      directDeposit: true,
      p2p: true,
      amlScreening: true,
    },
    compliance: {
      dataRetentionYears: 7,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 100000,
      dataResidencyRegion: "us",
      sessionTimeoutMinutes: 15,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["en", "es"],
  },

  // ── UK ──────────────────────────────────────────────────────────────────
  {
    label: "UK Digital Bank",
    region: "uk",
    country: "GB",
    currency: "GBP",
    timezone: "Europe/London",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      openBanking: true,
      sca: true,
      confirmationOfPayee: true,
      openBankingAggregation: true,
      amlScreening: true,
      internationalPayments: true,
      multiCurrency: true,
    },
    compliance: {
      dataRetentionYears: 6,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0, // SCA on all payments (PSD2)
      dataResidencyRegion: "uk",
      sessionTimeoutMinutes: 5,
      sessionGraceMinutes: 1,
    },
    supportedLanguages: ["en", "cy"],
  },

  // ── EU ──────────────────────────────────────────────────────────────────
  {
    label: "EU Neobank (SEPA)",
    region: "eu",
    country: "DE",
    currency: "EUR",
    timezone: "Europe/Berlin",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      openBanking: true,
      sca: true,
      openBankingAggregation: true,
      amlScreening: true,
      internationalPayments: true,
      multiCurrency: true,
      aliasPayments: true,
    },
    compliance: {
      dataRetentionYears: 10,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0, // PSD2 SCA
      dataResidencyRegion: "eu",
      sessionTimeoutMinutes: 5,
      sessionGraceMinutes: 1,
    },
    supportedLanguages: ["de", "en", "fr", "es", "it", "nl", "pt"],
  },

  // ── LATAM: Brazil ───────────────────────────────────────────────────────
  {
    label: "Brazil Digital Bank (PIX)",
    region: "latam",
    country: "BR",
    currency: "BRL",
    timezone: "America/Sao_Paulo",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      billPay: true,
      aliasPayments: true, // PIX
      amlScreening: true,
      openBanking: true,
      openBankingAggregation: true,
      internationalPayments: true,
    },
    compliance: {
      dataRetentionYears: 5,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0,
      dataResidencyRegion: "latam",
      sessionTimeoutMinutes: 10,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["pt-BR", "en"],
  },

  // ── APAC ────────────────────────────────────────────────────────────────
  {
    label: "APAC Digital Bank",
    region: "apac",
    country: "SG",
    currency: "SGD",
    timezone: "Asia/Singapore",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      billPay: true,
      p2p: true,
      amlScreening: true,
      internationalPayments: true,
      multiCurrency: true,
      aliasPayments: true,
    },
    compliance: {
      dataRetentionYears: 7,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0,
      dataResidencyRegion: "apac",
      sessionTimeoutMinutes: 10,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["en", "zh", "ms", "ta"],
  },

  // ── MENA ────────────────────────────────────────────────────────────────
  {
    label: "MENA Digital Bank",
    region: "mena",
    country: "AE",
    currency: "AED",
    timezone: "Asia/Dubai",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      wires: true,
      billPay: true,
      amlScreening: true,
      internationalPayments: true,
      multiCurrency: true,
    },
    compliance: {
      dataRetentionYears: 10,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0,
      dataResidencyRegion: "mena",
      sessionTimeoutMinutes: 10,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["ar", "en"],
  },

  // ── Africa ──────────────────────────────────────────────────────────────
  {
    label: "Africa Mobile-First Bank",
    region: "africa",
    country: "NG",
    currency: "NGN",
    timezone: "Africa/Lagos",
    features: {
      ...CORE_FEATURES,
      cardControls: true,
      externalTransfers: true,
      billPay: true,
      p2p: true,
      aliasPayments: true,
      amlScreening: true,
      mobileDeposit: true,
    },
    compliance: {
      dataRetentionYears: 7,
      kycRequired: true,
      mfaRequired: true,
      mfaThresholdCents: 0,
      dataResidencyRegion: "africa",
      sessionTimeoutMinutes: 10,
      sessionGraceMinutes: 2,
    },
    supportedLanguages: ["en", "fr", "yo", "ha"],
  },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Get the first template matching a region and optional country.
 */
export function getTemplateForMarket(
  region: TenantRegion,
  country?: string,
): MarketTemplate | undefined {
  if (country) {
    const exact = MARKET_TEMPLATES.find((t) => t.region === region && t.country === country);
    if (exact) return exact;
  }
  return MARKET_TEMPLATES.find((t) => t.region === region);
}

/**
 * Get all templates for a given region.
 */
export function getTemplatesForRegion(region: TenantRegion): MarketTemplate[] {
  return MARKET_TEMPLATES.filter((t) => t.region === region);
}

/**
 * List all unique regions that have templates.
 */
export function getAvailableRegions(): TenantRegion[] {
  return [...new Set(MARKET_TEMPLATES.map((t) => t.region))];
}
