/**
 * Adapter Registry
 *
 * Resolves the correct adapter implementation based on tenant configuration.
 * In project-per-tenant mode, each Supabase project has its own env vars
 * and firm_integrations table, so resolution is straightforward:
 *   1. Check firm_integrations table for an active provider
 *   2. Fall back to env var overrides (EXTERNAL_ACCOUNTS_PROVIDER, etc.)
 *   3. Default to mock adapter
 *
 * Each adapter domain owns its own factory and auto-detection logic in
 * its co-located `registry.ts`. This file is the thin orchestration layer.
 */

import type { BaseAdapter, AdapterDomain, AdapterResolution } from "./types.ts";
import type { EnvProvider } from "../platform/types.ts";
// KYC — global providers (used by per-domain registries)
// AML Screening
import type { AMLScreeningAdapter } from "./aml-screening/types.ts";
import { MockAMLScreeningAdapter } from "./aml-screening/mock-adapter.ts";
import { ComplyAdvantageAMLAdapter } from "./aml-screening/complyadvantage-adapter.ts";
import { LexisNexisAMLAdapter } from "./aml-screening/lexisnexis-adapter.ts";
// Global Clearing — cross-border BaaS
import type { GlobalClearingAdapter } from "./global-clearing/types.ts";
import { MockGlobalClearingAdapter } from "./global-clearing/mock-adapter.ts";
import { BankingCircleGlobalClearingAdapter } from "./global-clearing/banking-circle-adapter.ts";
import { ClearBankGlobalClearingAdapter } from "./global-clearing/clearbank-adapter.ts";
import { SolarisGlobalClearingAdapter } from "./global-clearing/solaris-adapter.ts";
import { AirwallexGlobalClearingAdapter } from "./global-clearing/airwallex-adapter.ts";
// Stablecoin Settlement
import type { StablecoinAdapter } from "./stablecoin/types.ts";
import { MockStablecoinAdapter } from "./stablecoin/mock-adapter.ts";
import { CircleStablecoinAdapter } from "./stablecoin/circle-adapter.ts";
import { PaxosStablecoinAdapter } from "./stablecoin/paxos-adapter.ts";
import { BVNKStablecoinAdapter } from "./stablecoin/bvnk-adapter.ts";
// Engagement Banking (PFM, insights, journeys)
import type { EngagementAdapter } from "./engagement/types.ts";
import { MockEngagementAdapter } from "./engagement/mock-adapter.ts";
import { BackbaseEngagementAdapter } from "./engagement/backbase-adapter.ts";
import { MenigaEngagementAdapter } from "./engagement/meniga-adapter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.10";

// Per-domain registries
import { createCoreBankingAdapter, detectCoreBankingProvider } from "./core-banking/registry.ts";
import { createRDCAdapter } from "./rdc/registry.ts";
import { createBillPayAdapter } from "./bill-pay/registry.ts";
import { createCardAdapter, detectCardProvider } from "./card/registry.ts";
import { createCardIssuingAdapter, detectCardIssuingProvider } from "./card-issuing/registry.ts";
import {
  createCardProvisioningAdapter,
  detectCardProvisioningProvider,
} from "./card-provisioning/registry.ts";
import { createCardOffersAdapter } from "./card-offers/registry.ts";
import { createExternalAccountAdapter } from "./external-accounts/registry.ts";
import { createLocationAdapter } from "./locations/registry.ts";
import { createFinancialDataAdapter } from "./financial-data/registry.ts";
import {
  createInstantPaymentAdapter,
  detectInstantPaymentProvider,
} from "./instant-payments/registry.ts";
import { createTreasuryAdapter, detectTreasuryProvider } from "./treasury/registry.ts";
import {
  createPaymentOperationsAdapter,
  detectPaymentOperationsProvider,
} from "./payment-operations/registry.ts";
import { createFraudAdapter, detectFraudProvider } from "./fraud/registry.ts";
import { createKYBAdapter, detectKYBProvider } from "./kyb/registry.ts";
import {
  createAccountOpeningAdapter,
  detectAccountOpeningProvider,
} from "./account-opening/registry.ts";
import {
  createLoanOriginationAdapter,
  detectLoanOriginationProvider,
} from "./loan-origination/registry.ts";
import {
  createDirectDepositAdapter,
  detectDirectDepositProvider,
} from "./direct-deposit/registry.ts";
import { createNotificationAdapter, detectNotificationProvider } from "./notifications/registry.ts";
import { createAIServicesAdapter, detectAIServicesProvider } from "./ai-services/registry.ts";
import { createAggregatorAdapter, detectAggregatorProvider } from "./aggregator/registry.ts";
import {
  createComplianceAuditAdapter,
  detectComplianceAuditProvider,
} from "./compliance-audit/registry.ts";
import {
  createInternationalPaymentsAdapter,
  detectInternationalPaymentsProvider,
} from "./international-payments/registry.ts";
import {
  createInternationalBillPayAdapter,
  detectInternationalBillPayProvider,
} from "./international-bill-pay/registry.ts";
import {
  createInternationalLoanAdapter,
  detectInternationalLoanProvider,
} from "./international-loans/registry.ts";
import { createBaaSAdapter, detectBaaSProvider } from "./baas/registry.ts";
import {
  createConfirmationOfPayeeAdapter,
  detectConfirmationOfPayeeProvider,
} from "./confirmation-of-payee/registry.ts";
import { createSCAAdapter, detectSCAProvider } from "./sca/registry.ts";
import {
  createMultiCurrencyAdapter,
  detectMultiCurrencyProvider,
} from "./multi-currency/registry.ts";
import {
  createAliasResolutionAdapter,
  detectAliasResolutionProvider,
} from "./alias-resolution/registry.ts";
import {
  createWireTransferAdapter as _createWireTransferAdapter,
  detectWireTransferProvider as _detectWireTransferProvider,
} from "./wire-transfers/registry.ts";

// =============================================================================
// PLATFORM-AGNOSTIC ENV ACCESS
// =============================================================================

/** Resolve env var using injected provider or Deno fallback */
function getEnv(key: string, env?: EnvProvider): string | undefined {
  if (env) return env.get(key);
  return Deno.env.get(key);
}

// =============================================================================
// TENANT CONFIG — resolves from DB then falls back to env vars
// =============================================================================

interface TenantAdapterConfig {
  domain: AdapterDomain;
  provider: string;
  config: Record<string, unknown>;
}

/** Maps adapter domains to integration_providers categories */
const _DOMAIN_TO_CATEGORY: Partial<Record<AdapterDomain, string>> = {
  external_accounts: "financial",
  locations: "financial",
  core_banking: "financial",
  rdc: "financial",
  bill_pay: "financial",
  card: "financial",
  card_provisioning: "financial",
  instant_payments: "financial",
  fraud: "financial",
  kyc: "financial",
  account_opening: "financial",
  loan_origination: "financial",
  financial_data: "financial",
  card_offers: "financial",
  aggregator: "financial",
  direct_deposit: "financial",
  treasury: "financial",
  payment_operations: "financial",
  card_issuing: "financial",
  kyb: "financial",
  international_payments: "financial",
  international_bill_pay: "financial",
  international_loans: "financial",
  baas: "financial",
  confirmation_of_payee: "financial",
  sca: "financial",
  multi_currency: "financial",
  alias_resolution: "financial",
  ai_services: "platform",
  notifications: "platform",
  compliance_audit: "platform",
  aml_screening: "financial",
  global_clearing: "financial",
  stablecoin: "financial",
  engagement: "platform",
};

/** Maps adapter domains to env var overrides */
const DOMAIN_ENV_OVERRIDES: Partial<Record<AdapterDomain, string>> = {
  external_accounts: "EXTERNAL_ACCOUNTS_PROVIDER",
  locations: "LOCATIONS_PROVIDER",
  rdc: "RDC_PROVIDER",
  bill_pay: "BILL_PAY_PROVIDER",
  financial_data: "FINANCIAL_DATA_PROVIDER",
  card_offers: "CARD_OFFERS_PROVIDER",
  aggregator: "AGGREGATOR_PROVIDER",
  core_banking: "CORE_BANKING_PROVIDER",
  card: "CARD_PROVIDER",
  card_provisioning: "CARD_PROVISIONING_PROVIDER",
  account_opening: "ACCOUNT_OPENING_PROVIDER",
  loan_origination: "LOAN_ORIGINATION_PROVIDER",
  direct_deposit: "DIRECT_DEPOSIT_PROVIDER",
  instant_payments: "INSTANT_PAYMENTS_PROVIDER",
  fraud: "FRAUD_PROVIDER",
  treasury: "TREASURY_PROVIDER",
  payment_operations: "PAYMENT_OPERATIONS_PROVIDER",
  card_issuing: "CARD_ISSUING_PROVIDER",
  kyb: "KYB_PROVIDER",
  ai_services: "AI_SERVICES_PROVIDER",
  notifications: "NOTIFICATIONS_PROVIDER",
  compliance_audit: "COMPLIANCE_AUDIT_PROVIDER",
  international_payments: "INTERNATIONAL_PAYMENTS_PROVIDER",
  international_bill_pay: "INTERNATIONAL_BILL_PAY_PROVIDER",
  international_loans: "INTERNATIONAL_LOANS_PROVIDER",
  baas: "BAAS_PROVIDER",
  confirmation_of_payee: "COP_PROVIDER",
  sca: "SCA_PROVIDER",
  multi_currency: "MULTI_CURRENCY_PROVIDER",
  alias_resolution: "ALIAS_RESOLUTION_PROVIDER",
  aml_screening: "AML_SCREENING_PROVIDER",
  global_clearing: "GLOBAL_CLEARING_PROVIDER",
  stablecoin: "STABLECOIN_PROVIDER",
  engagement: "ENGAGEMENT_PROVIDER",
  e_signature: "E_SIGNATURE_PROVIDER",
};

/**
 * Resolve the tenant's adapter configuration for a given domain.
 *
 * Checks firm_integrations for an active provider matching this domain,
 * then falls back to environment variable overrides, then defaults to mock.
 */
async function getTenantAdapterConfig(
  tenantId: string | undefined,
  domain: AdapterDomain,
  env?: EnvProvider,
): Promise<TenantAdapterConfig | null> {
  // 1. Try DB lookup if we have a tenant context
  if (tenantId) {
    try {
      const supabaseUrl = getEnv("SUPABASE_URL", env);
      const supabaseKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", env);
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data } = await supabase
          .from("firm_integrations")
          .select("provider_id, config")
          .eq("firm_id", tenantId)
          .eq("status", "connected")
          .limit(1)
          .maybeSingle();

        if (data) {
          return {
            domain,
            provider: data.provider_id,
            config: (data.config as Record<string, unknown>) ?? {},
          };
        }
      }
    } catch {
      // DB lookup failed — fall through to env var
    }
  }

  // 2. Fall back to env var override
  const envKey = DOMAIN_ENV_OVERRIDES[domain];
  if (envKey) {
    const provider = getEnv(envKey, env) ?? "mock";
    return { domain, provider, config: {} };
  }

  // 3. Default
  return { domain, provider: "mock", config: {} };
}

// =============================================================================
// ADAPTER CREATION — delegates to per-domain registries
// =============================================================================

/**
 * Create an adapter for the given domain and provider.
 * If provider is 'mock' and the domain has auto-detection, the detect
 * function is called to infer the real provider from env vars.
 */
function createAdapter(domain: AdapterDomain, provider: string, env?: EnvProvider): BaseAdapter {
  switch (domain) {
    case "core_banking": {
      const p = provider !== "mock" ? provider : detectCoreBankingProvider(env);
      return createCoreBankingAdapter(p);
    }
    case "external_accounts":
      return createExternalAccountAdapter(provider, env);
    case "locations":
      return createLocationAdapter(provider);
    case "rdc":
      return createRDCAdapter(provider);
    case "bill_pay":
      return createBillPayAdapter(provider);
    case "financial_data":
      return createFinancialDataAdapter(provider);
    case "card": {
      const p = provider !== "mock" ? provider : detectCardProvider(env);
      return createCardAdapter(p);
    }
    case "card_offers":
      return createCardOffersAdapter(provider);
    case "card_issuing": {
      const p = provider !== "mock" ? provider : detectCardIssuingProvider(env);
      return createCardIssuingAdapter(p);
    }
    case "card_provisioning": {
      const p = provider !== "mock" ? provider : detectCardProvisioningProvider(env);
      return createCardProvisioningAdapter(p);
    }
    case "account_opening": {
      const p = provider !== "mock" ? provider : detectAccountOpeningProvider(env);
      return createAccountOpeningAdapter(p);
    }
    case "loan_origination": {
      const p = provider !== "mock" ? provider : detectLoanOriginationProvider(env);
      return createLoanOriginationAdapter(p);
    }
    case "notifications": {
      const p = provider !== "mock" ? provider : detectNotificationProvider(env);
      return createNotificationAdapter(p);
    }
    case "direct_deposit": {
      const p = provider !== "mock" ? provider : detectDirectDepositProvider(env);
      return createDirectDepositAdapter(p);
    }
    case "instant_payments": {
      const p = provider !== "mock" ? provider : detectInstantPaymentProvider(env);
      return createInstantPaymentAdapter(p);
    }
    case "fraud": {
      const p = provider !== "mock" ? provider : detectFraudProvider(env);
      return createFraudAdapter(p);
    }
    case "treasury": {
      const p = provider !== "mock" ? provider : detectTreasuryProvider(env);
      return createTreasuryAdapter(p);
    }
    case "payment_operations": {
      const p = provider !== "mock" ? provider : detectPaymentOperationsProvider(env);
      return createPaymentOperationsAdapter(p);
    }
    case "kyb": {
      const p = provider !== "mock" ? provider : detectKYBProvider(env);
      return createKYBAdapter(p);
    }
    case "ai_services": {
      const p = provider !== "mock" ? provider : detectAIServicesProvider(env);
      return createAIServicesAdapter(p);
    }
    case "aggregator": {
      const p = provider !== "mock" ? provider : detectAggregatorProvider(env);
      return createAggregatorAdapter(p, env);
    }
    case "compliance_audit": {
      const p = provider !== "mock" ? provider : detectComplianceAuditProvider(env);
      return createComplianceAuditAdapter(p);
    }
    case "international_payments": {
      const p = provider !== "mock" ? provider : detectInternationalPaymentsProvider(env);
      return createInternationalPaymentsAdapter(p);
    }
    case "international_bill_pay": {
      const p = provider !== "mock" ? provider : detectInternationalBillPayProvider(env);
      return createInternationalBillPayAdapter(p);
    }
    case "international_loans": {
      const p = provider !== "mock" ? provider : detectInternationalLoanProvider(env);
      return createInternationalLoanAdapter(p);
    }
    case "baas": {
      const p = provider !== "mock" ? provider : detectBaaSProvider(env);
      return createBaaSAdapter(p);
    }
    case "confirmation_of_payee": {
      const p = provider !== "mock" ? provider : detectConfirmationOfPayeeProvider(env);
      return createConfirmationOfPayeeAdapter(p);
    }
    case "sca": {
      const p = provider !== "mock" ? provider : detectSCAProvider(env);
      return createSCAAdapter(p);
    }
    case "multi_currency": {
      const p = provider !== "mock" ? provider : detectMultiCurrencyProvider(env);
      return createMultiCurrencyAdapter(p);
    }
    case "alias_resolution": {
      const p = provider !== "mock" ? provider : detectAliasResolutionProvider(env);
      return createAliasResolutionAdapter(p);
    }
    case "aml_screening": {
      const p = provider !== "mock" ? provider : detectAMLScreeningProvider(env);
      return createAMLScreeningAdapter(p);
    }
    case "global_clearing": {
      const p = provider !== "mock" ? provider : detectGlobalClearingProvider(env);
      return createGlobalClearingAdapter(p);
    }
    case "stablecoin": {
      const p = provider !== "mock" ? provider : detectStablecoinProvider(env);
      return createStablecoinAdapter(p);
    }
    case "engagement": {
      const p = provider !== "mock" ? provider : detectEngagementProvider(env);
      return createEngagementAdapter(p);
    }
    default:
      throw new Error(`No adapter factory registered for domain: ${domain}`);
  }
}

// -- Detect functions for global vendor domains --

function detectAMLScreeningProvider(env?: EnvProvider): string {
  if (getEnv("COMPLYADVANTAGE_API_KEY", env)) return "complyadvantage";
  if (getEnv("LEXISNEXIS_API_KEY", env)) return "lexisnexis";
  return "mock";
}

function detectGlobalClearingProvider(env?: EnvProvider): string {
  if (getEnv("BANKING_CIRCLE_CLIENT_ID", env)) return "banking_circle";
  if (getEnv("CLEARBANK_API_KEY", env)) return "clearbank";
  if (getEnv("SOLARIS_CLIENT_ID", env)) return "solaris";
  if (getEnv("AIRWALLEX_API_KEY", env)) return "airwallex";
  return "mock";
}

function detectStablecoinProvider(env?: EnvProvider): string {
  if (getEnv("CIRCLE_API_KEY", env)) return "circle";
  if (getEnv("PAXOS_CLIENT_ID", env)) return "paxos";
  if (getEnv("BVNK_API_KEY", env)) return "bvnk";
  return "mock";
}

function detectEngagementProvider(env?: EnvProvider): string {
  if (getEnv("BACKBASE_CLIENT_ID", env)) return "backbase";
  if (getEnv("MENIGA_API_KEY", env)) return "meniga";
  return "mock";
}

function createAMLScreeningAdapter(provider: string): AMLScreeningAdapter {
  switch (provider) {
    case "complyadvantage":
      return new ComplyAdvantageAMLAdapter();
    case "lexisnexis":
      return new LexisNexisAMLAdapter();
    case "mock":
    default:
      return new MockAMLScreeningAdapter();
  }
}

function createGlobalClearingAdapter(provider: string): GlobalClearingAdapter {
  switch (provider) {
    case "banking_circle":
    case "bankingcircle":
      return new BankingCircleGlobalClearingAdapter();
    case "clearbank":
      return new ClearBankGlobalClearingAdapter();
    case "solaris":
    case "solarisbank":
      return new SolarisGlobalClearingAdapter();
    case "airwallex":
      return new AirwallexGlobalClearingAdapter();
    case "mock":
    default:
      return new MockGlobalClearingAdapter();
  }
}

function createStablecoinAdapter(provider: string): StablecoinAdapter {
  switch (provider) {
    case "circle":
    case "usdc":
      return new CircleStablecoinAdapter();
    case "paxos":
    case "usdp":
      return new PaxosStablecoinAdapter();
    case "bvnk":
      return new BVNKStablecoinAdapter();
    case "mock":
    default:
      return new MockStablecoinAdapter();
  }
}

function createEngagementAdapter(provider: string): EngagementAdapter {
  switch (provider) {
    case "backbase":
      return new BackbaseEngagementAdapter();
    case "meniga":
      return new MenigaEngagementAdapter();
    case "mock":
    default:
      return new MockEngagementAdapter();
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Resolve the adapter for a given domain and tenant.
 */
export async function resolveAdapter<T extends BaseAdapter>(
  domain: AdapterDomain,
  tenantId?: string,
  env?: EnvProvider,
): Promise<AdapterResolution<T>> {
  const tenantConfig = await getTenantAdapterConfig(tenantId, domain, env);
  const provider = tenantConfig?.provider ?? "mock";

  const adapter = createAdapter(domain, provider, env);

  const validationStatus = getAdapterValidationStatus(domain, provider);

  return {
    adapter: adapter as T,
    provider,
    domain,
    validationStatus,
  };
}

// =============================================================================
// ADAPTER VALIDATION STATUS
// =============================================================================

/**
 * Production validation status for each adapter implementation.
 *
 * - validated:    Tested against real provider APIs in staging/production
 * - provisional:  Implements the interface but not yet validated with real APIs
 * - stub:         Structural placeholder — methods throw or return hardcoded data
 * - mock:         Test/demo adapter with synthetic data (always considered validated)
 */
export type ValidationStatus = "validated" | "provisional" | "stub" | "mock";

/**
 * Validation metadata for all registered adapters.
 * Key format: "{domain}/{provider}" (e.g., "core_banking/fineract")
 */
export const ADAPTER_VALIDATION_STATUS: Record<string, ValidationStatus> = {
  // -- Core Banking --
  "core_banking/mock": "mock",
  "core_banking/fineract": "provisional",
  "core_banking/mifos": "provisional",
  "core_banking/cuanswers": "provisional",
  "core_banking/symitar": "provisional",
  "core_banking/fiserv": "provisional",
  "core_banking/keystone": "provisional",
  "core_banking/fis": "provisional",
  "core_banking/flex": "provisional",
  "core_banking/mambu": "provisional",
  "core_banking/thought_machine": "provisional",
  "core_banking/pismo": "provisional",
  "core_banking/temenos": "provisional",
  "core_banking/flexcube": "provisional",
  "core_banking/finacle": "provisional",

  // -- RDC --
  "rdc/mock": "mock",
  "rdc/synctera": "provisional",
  "rdc/unit": "provisional",
  "rdc/mitek": "provisional",
  "rdc/cuanswers": "provisional",
  "rdc/jackhenry": "provisional",

  // -- Bill Pay --
  "bill_pay/mock": "mock",
  "bill_pay/fiserv": "provisional",
  "bill_pay/fis": "provisional",
  "bill_pay/jha": "provisional",

  // -- Card --
  "card/mock": "mock",
  "card/jackhenry": "provisional",

  // -- Card Provisioning --
  "card_provisioning/mock": "mock",
  "card_provisioning/jack_henry": "provisional",

  // -- Card Issuing --
  "card_issuing/mock": "mock",
  "card_issuing/lithic": "provisional",
  "card_issuing/brex": "provisional",
  "card_issuing/ramp": "provisional",

  // -- Card Offers --
  "card_offers/mock": "mock",
  "card_offers/cardlytics": "provisional",
  "card_offers/dosh": "provisional",

  // -- External Accounts --
  "external_accounts/mock": "mock",
  "external_accounts/plaid": "provisional",

  // -- Financial Data --
  "financial_data/mock": "mock",
  "financial_data/mx": "provisional",

  // -- Locations --
  "locations/mock": "mock",
  "locations/overpass": "provisional",

  // -- AI Services --
  "ai_services/mock": "mock",
  "ai_services/multi_provider": "provisional",

  // -- Account Opening --
  "account_opening/mock": "mock",
  "account_opening/builtin": "provisional",
  "account_opening/cuanswers": "provisional",

  // -- Loan Origination --
  "loan_origination/mock": "mock",
  "loan_origination/loanvantage": "provisional",

  // -- Notifications --
  "notifications/mock": "mock",
  "notifications/braze": "provisional",
  "notifications/twilio": "provisional",

  // -- Direct Deposit --
  "direct_deposit/mock": "mock",
  "direct_deposit/pinwheel": "provisional",
  "direct_deposit/argyle": "provisional",

  // -- Instant Payments --
  "instant_payments/mock": "mock",
  "instant_payments/fednow": "provisional",
  "instant_payments/rtp": "provisional",
  "instant_payments/sepa_instant": "provisional",
  "instant_payments/pix": "provisional",
  "instant_payments/upi": "provisional",

  // -- Fraud --
  "fraud/mock": "mock",
  "fraud/biocatch": "provisional",

  // -- Treasury --
  "treasury/mock": "mock",
  "treasury/column": "provisional",
  "treasury/increase": "provisional",
  "treasury/mercury": "provisional",
  "treasury/stripe_treasury": "provisional",

  // -- Payment Operations --
  "payment_operations/mock": "mock",
  "payment_operations/modern_treasury": "provisional",

  // -- KYB --
  "kyb/mock": "mock",
  "kyb/middesk": "provisional",
  "kyb/persona": "provisional",

  // -- Compliance Audit --
  "compliance_audit/mock": "mock",
  "compliance_audit/vanta": "provisional",
  "compliance_audit/drata": "provisional",

  // -- Aggregator --
  "aggregator/mock": "mock",
  "aggregator/salt_edge": "provisional",
  "aggregator/akoya": "provisional",

  // -- International Payments --
  "international_payments/mock": "mock",
  "international_payments/stripe": "provisional",
  "international_payments/marqeta": "provisional",

  // -- International Bill Pay --
  "international_bill_pay/mock": "mock",
  "international_bill_pay/pipit": "provisional",
  "international_bill_pay/wise": "provisional",
  "international_bill_pay/connectpay": "provisional",

  // -- International Loans --
  "international_loans/mock": "mock",
  "international_loans/finastra": "provisional",
  "international_loans/ncino": "provisional",

  // -- BaaS --
  "baas/mock": "mock",
  "baas/solaris": "provisional",
  "baas/clearbank": "provisional",

  // -- Confirmation of Payee --
  "confirmation_of_payee/mock": "mock",
  "confirmation_of_payee/payuk": "provisional",

  // -- SCA --
  "sca/mock": "mock",
  "sca/tink": "provisional",

  // -- Multi-Currency --
  "multi_currency/mock": "mock",
  "multi_currency/currencycloud": "provisional",

  // -- Alias Resolution --
  "alias_resolution/mock": "mock",
  "alias_resolution/plaid": "provisional",

  // -- AML Screening --
  "aml_screening/mock": "mock",
  "aml_screening/complyadvantage": "provisional",
  "aml_screening/lexisnexis": "provisional",

  // -- Global Clearing --
  "global_clearing/mock": "mock",
  "global_clearing/banking_circle": "provisional",
  "global_clearing/clearbank": "provisional",
  "global_clearing/solaris": "provisional",
  "global_clearing/airwallex": "provisional",

  // -- Stablecoin --
  "stablecoin/mock": "mock",
  "stablecoin/circle": "provisional",
  "stablecoin/paxos": "provisional",
  "stablecoin/bvnk": "provisional",

  // -- Wire Transfers --
  "wire_transfers/mock": "mock",
  "wire_transfers/fedwire": "provisional",
  "wire_transfers/swift": "provisional",

  // -- Engagement --
  "engagement/mock": "mock",
  "engagement/backbase": "provisional",
  "engagement/meniga": "provisional",

  // -- E-Signature --
  "e_signature/mock": "mock",
  "e_signature/docusign": "provisional",
  "e_signature/pandadoc": "provisional",
};

/**
 * Look up the validation status for an adapter.
 * Returns 'mock' for unknown adapters (assumes mock/fallback).
 */
export function getAdapterValidationStatus(domain: string, provider: string): ValidationStatus {
  const key = `${domain}/${provider}`;
  return ADAPTER_VALIDATION_STATUS[key] ?? "mock";
}

/**
 * Get all adapters with a specific validation status.
 */
export function getAdaptersByStatus(status: ValidationStatus): string[] {
  return Object.entries(ADAPTER_VALIDATION_STATUS)
    .filter(([, s]) => s === status)
    .map(([key]) => key);
}

/**
 * Summary of adapter validation statuses for monitoring/admin.
 */
export function getValidationSummary(): Record<ValidationStatus, number> {
  const summary: Record<ValidationStatus, number> = {
    validated: 0,
    provisional: 0,
    stub: 0,
    mock: 0,
  };
  for (const status of Object.values(ADAPTER_VALIDATION_STATUS)) {
    summary[status]++;
  }
  return summary;
}
