/**
 * International Features Registry
 *
 * Lists all feature modules that are considered "international" and can be
 * excluded from builds targeting domestic-only institutions.
 *
 * Usage:
 *   - Set VITE_EXCLUDE_INTERNATIONAL=true to hide international features from the UI
 *   - International routes are conditionally included in bankingRoutes.tsx
 *   - International adapters are excluded when ADAPTERS env var doesn't include them
 */

export const INTERNATIONAL_PAGES = [
  "InternationalPayments",
  "InternationalEKYC",
  "MultiCurrencyWallet",
  "GlobalPayments",
  "OpenBankingConsents",
  "OpenFinanceHub",
  "ConsentDashboard",
  "SCAManagement",
] as const;

export const INTERNATIONAL_FEATURES = [
  "internationalPayments",
  "internationalBillPay",
  "multiCurrency",
  "openBanking",
  "sca",
  "confirmationOfPayee",
  "openBankingAggregation",
  "aliasPayments",
  "amlScreening",
] as const;

/**
 * Check if international features are excluded from the build.
 */
export function isInternationalExcluded(): boolean {
  return import.meta.env.VITE_EXCLUDE_INTERNATIONAL === "true";
}
