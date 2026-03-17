/**
 * Global Clearing Adapter Interface
 *
 * Defines the contract for cross-border clearing, multi-currency BaaS,
 * and international payment infrastructure providers.
 *
 * Providers: Banking Circle, ClearBank (UK), Solaris (EU), Airwallex
 *
 * These providers enable:
 *   - Multi-currency IBAN issuance (25+ currencies)
 *   - Direct access to local clearing rails (SEPA, Faster Payments, etc.)
 *   - Cross-border settlement without per-country licensing
 *   - FX conversion at interbank rates
 *
 * All monetary values are integer minor units (cents, pence, etc.).
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CURRENCY & ACCOUNT TYPES
// =============================================================================

/** Supported clearing rails */
export type ClearingRail =
  | 'sepa'              // Single Euro Payments Area
  | 'sepa_instant'      // SEPA Instant Credit Transfer
  | 'faster_payments'   // UK Faster Payments
  | 'bacs'              // UK BACS (batch)
  | 'chaps'             // UK CHAPS (high-value)
  | 'swift'             // SWIFT international wire
  | 'ach'               // US ACH
  | 'wire'              // US Fedwire
  | 'local';            // Provider-specific local rail

export type VirtualAccountStatus = 'active' | 'frozen' | 'closed' | 'pending_activation';

export interface VirtualAccount {
  /** Internal account ID */
  accountId: string;
  /** Provider-assigned external ID */
  externalId: string;
  /** IBAN (masked for logging: ****1234) */
  ibanMasked: string;
  /** BIC/SWIFT code */
  bic: string;
  /** Account holder name */
  holderName: string;
  /** ISO 4217 currency code */
  currency: string;
  /** Balance in minor units */
  balanceMinorUnits: number;
  /** Available balance in minor units */
  availableBalanceMinorUnits: number;
  /** Account status */
  status: VirtualAccountStatus;
  /** Country of the account (ISO 3166-1 alpha-2) */
  country: string;
  /** Available clearing rails */
  availableRails: ClearingRail[];
  /** Created timestamp (ISO 8601) */
  createdAt: string;
}

// =============================================================================
// FX TYPES
// =============================================================================

export interface FXQuote {
  /** Quote ID (use to execute conversion) */
  quoteId: string;
  /** Source currency (ISO 4217) */
  sourceCurrency: string;
  /** Target currency (ISO 4217) */
  targetCurrency: string;
  /** Exchange rate (source → target) */
  rate: number;
  /** Inverse rate (target → source) */
  inverseRate: number;
  /** Source amount in minor units */
  sourceAmountMinorUnits: number;
  /** Target amount in minor units */
  targetAmountMinorUnits: number;
  /** Fee in source currency minor units */
  feeMinorUnits: number;
  /** Quote expires at (ISO 8601) */
  expiresAt: string;
  /** Created at (ISO 8601) */
  createdAt: string;
}

export type FXConversionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface FXConversion {
  /** Conversion ID */
  conversionId: string;
  /** Quote ID used */
  quoteId: string;
  /** Source currency */
  sourceCurrency: string;
  /** Target currency */
  targetCurrency: string;
  /** Rate applied */
  rate: number;
  /** Source amount in minor units */
  sourceAmountMinorUnits: number;
  /** Target amount in minor units */
  targetAmountMinorUnits: number;
  /** Fee charged in source minor units */
  feeMinorUnits: number;
  /** Status */
  status: FXConversionStatus;
  /** Completed at (ISO 8601) */
  completedAt: string | null;
  /** Created at (ISO 8601) */
  createdAt: string;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export type CrossBorderPaymentStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'returned'
  | 'cancelled';

export interface CrossBorderPayment {
  /** Payment ID */
  paymentId: string;
  /** Source account ID */
  sourceAccountId: string;
  /** Source currency */
  sourceCurrency: string;
  /** Source amount in minor units */
  sourceAmountMinorUnits: number;
  /** Beneficiary name */
  beneficiaryName: string;
  /** Beneficiary IBAN (masked) */
  beneficiaryIbanMasked: string;
  /** Beneficiary BIC */
  beneficiaryBic: string;
  /** Beneficiary country (ISO 3166-1 alpha-2) */
  beneficiaryCountry: string;
  /** Target currency */
  targetCurrency: string;
  /** Target amount in minor units (after FX) */
  targetAmountMinorUnits: number;
  /** FX rate applied (null if same currency) */
  fxRate: number | null;
  /** Fee in source minor units */
  feeMinorUnits: number;
  /** Rail used */
  rail: ClearingRail;
  /** Payment reference */
  reference: string;
  /** Status */
  status: CrossBorderPaymentStatus;
  /** Status reason (for failures/returns) */
  statusReason: string | null;
  /** Created at (ISO 8601) */
  createdAt: string;
  /** Completed at (ISO 8601) */
  completedAt: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreateVirtualAccountRequest {
  tenantId: string;
  userId: string;
  /** ISO 4217 currency */
  currency: string;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** Account holder name */
  holderName: string;
}

export interface ListVirtualAccountsRequest {
  tenantId: string;
  userId: string;
  currency?: string;
  status?: VirtualAccountStatus;
  limit?: number;
  offset?: number;
}

export interface ListVirtualAccountsResponse {
  accounts: VirtualAccount[];
  total: number;
}

export interface GetFXQuoteRequest {
  tenantId: string;
  sourceCurrency: string;
  targetCurrency: string;
  /** Amount in source currency minor units */
  sourceAmountMinorUnits: number;
}

export interface ExecuteFXConversionRequest {
  tenantId: string;
  userId: string;
  /** Quote ID from getFXQuote */
  quoteId: string;
  /** Source account ID */
  sourceAccountId: string;
  /** Target account ID (must be in target currency) */
  targetAccountId: string;
}

export interface SendCrossBorderPaymentRequest {
  tenantId: string;
  userId: string;
  /** Source account ID */
  sourceAccountId: string;
  /** Beneficiary name */
  beneficiaryName: string;
  /** Beneficiary IBAN (transmitted securely, never logged) */
  beneficiaryIban: string;
  /** Beneficiary BIC */
  beneficiaryBic: string;
  /** Beneficiary country */
  beneficiaryCountry: string;
  /** Amount in source currency minor units */
  amountMinorUnits: number;
  /** Target currency (if different from source, FX applies) */
  targetCurrency?: string;
  /** Payment reference */
  reference: string;
  /** Preferred rail (null = auto-select) */
  preferredRail?: ClearingRail | null;
  /** Idempotency key */
  idempotencyKey: string;
}

export interface GetPaymentRequest {
  tenantId: string;
  paymentId: string;
}

export interface ListPaymentsRequest {
  tenantId: string;
  userId: string;
  sourceAccountId?: string;
  status?: CrossBorderPaymentStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentsResponse {
  payments: CrossBorderPayment[];
  total: number;
}

export interface ListSupportedCurrenciesResponse {
  currencies: Array<{
    code: string;
    name: string;
    minorUnits: number;
    availableRails: ClearingRail[];
  }>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Global Clearing adapter — abstracts cross-border clearing and multi-currency
 * BaaS infrastructure.
 *
 * Implementations handle provider-specific APIs (Banking Circle, ClearBank,
 * Solaris, Airwallex) while exposing a uniform interface for virtual account
 * management, FX, and cross-border payments.
 */
export interface GlobalClearingAdapter extends BaseAdapter {
  /** Create a virtual account (IBAN) in a given currency/country */
  createVirtualAccount(request: CreateVirtualAccountRequest): Promise<VirtualAccount>;

  /** List virtual accounts for a tenant */
  listVirtualAccounts(request: ListVirtualAccountsRequest): Promise<ListVirtualAccountsResponse>;

  /** Get an FX quote for a currency pair */
  getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote>;

  /** Execute an FX conversion using a quote */
  executeFXConversion(request: ExecuteFXConversionRequest): Promise<FXConversion>;

  /** Send a cross-border payment */
  sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment>;

  /** Get payment status */
  getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment>;

  /** List payments */
  listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse>;

  /** List supported currencies and rails */
  listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse>;
}
