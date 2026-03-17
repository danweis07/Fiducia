/**
 * International Payments Adapter Interface
 *
 * Defines the contract for cross-border payment processing and
 * global card issuing services. Supports multiple providers:
 *   - Stripe (global payments, 50+ countries, card issuing in 30+)
 *   - Marqeta (JIT card issuing, US/UK/EU/APAC)
 *
 * All monetary values are integer cents (or minor currency units).
 * Account numbers and card PANs are always masked in responses.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// SUPPORTED COUNTRIES & CURRENCIES
// =============================================================================

export type SupportedRegion = 'us' | 'eu' | 'uk' | 'apac' | 'latam' | 'mena' | 'africa';

export interface CountryCoverage {
  countryCode: string;
  countryName: string;
  region: SupportedRegion;
  currencyCode: string;
  supportsPaymentAcceptance: boolean;
  supportsCardIssuing: boolean;
  supportsPayouts: boolean;
  localPaymentMethods: string[];
}

// =============================================================================
// INTERNATIONAL PAYMENT TYPES
// =============================================================================

export type InternationalPaymentStatus =
  | 'pending'
  | 'processing'
  | 'requires_action'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PaymentRail =
  | 'swift'
  | 'sepa'
  | 'sepa_instant'
  | 'faster_payments'
  | 'ach'
  | 'wire'
  | 'local_rails'
  | 'card';

export interface InternationalPayment {
  paymentId: string;
  externalId?: string;
  fromAccountId: string;
  fromCurrency: string;
  fromAmountCents: number;
  toCurrency: string;
  toAmountCents: number;
  exchangeRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  rail: PaymentRail;
  status: InternationalPaymentStatus;
  beneficiaryName: string;
  beneficiaryCountry: string;
  beneficiaryAccountMasked: string;
  swiftBic?: string;
  iban?: string;
  reference?: string;
  estimatedArrival?: string;
  completedAt: string | null;
  createdAt: string;
}

// =============================================================================
// FX QUOTE TYPES
// =============================================================================

export interface FXQuote {
  quoteId: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  inverseRate: number;
  fromAmountCents: number;
  toAmountCents: number;
  feeAmountCents: number;
  feeCurrency: string;
  expiresAt: string;
}

// =============================================================================
// GLOBAL CARD ISSUING (Stripe Issuing / Marqeta JIT)
// =============================================================================

export type GlobalCardStatus = 'active' | 'inactive' | 'frozen' | 'cancelled' | 'pending';
export type GlobalCardType = 'virtual' | 'physical';

export interface GlobalIssuedCard {
  cardId: string;
  externalId?: string;
  type: GlobalCardType;
  status: GlobalCardStatus;
  lastFour: string;
  cardholderName: string;
  currency: string;
  country: string;
  spendLimitCents: number;
  spendLimitInterval: 'per_authorization' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  totalSpentCents: number;
  network: 'visa' | 'mastercard';
  expirationMonth: number;
  expirationYear: number;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface JITFundingDecision {
  transactionId: string;
  cardId: string;
  merchantName: string;
  merchantCountry: string;
  merchantCategoryCode: string;
  requestedAmountCents: number;
  requestedCurrency: string;
  approved: boolean;
  fundingSourceId?: string;
  declineReason?: string;
  respondedAt: string;
}

// =============================================================================
// PAYOUT TYPES
// =============================================================================

export type PayoutStatus = 'pending' | 'in_transit' | 'paid' | 'failed' | 'cancelled';

export interface Payout {
  payoutId: string;
  destinationCountry: string;
  destinationCurrency: string;
  amountCents: number;
  feeAmountCents: number;
  status: PayoutStatus;
  rail: PaymentRail;
  recipientName: string;
  recipientAccountMasked: string;
  estimatedArrival: string;
  paidAt: string | null;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface GetCoverageRequest {
  userId: string;
  tenantId: string;
  region?: SupportedRegion;
}

export interface GetCoverageResponse {
  countries: CountryCoverage[];
  total: number;
}

export interface GetFXQuoteRequest {
  userId: string;
  tenantId: string;
  fromCurrency: string;
  toCurrency: string;
  fromAmountCents?: number;
  toAmountCents?: number;
}

export interface CreatePaymentRequest {
  userId: string;
  tenantId: string;
  payment: {
    fromAccountId: string;
    fromCurrency: string;
    toCurrency: string;
    amountCents: number;
    rail?: PaymentRail;
    beneficiaryName: string;
    beneficiaryCountry: string;
    beneficiaryAccountNumber: string;
    swiftBic?: string;
    iban?: string;
    reference?: string;
    quoteId?: string;
  };
}

export interface GetPaymentRequest {
  userId: string;
  tenantId: string;
  paymentId: string;
}

export interface ListPaymentsRequest {
  userId: string;
  tenantId: string;
  status?: InternationalPaymentStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentsResponse {
  payments: InternationalPayment[];
  total: number;
}

export interface IssueGlobalCardRequest {
  userId: string;
  tenantId: string;
  card: {
    type: GlobalCardType;
    cardholderName: string;
    currency: string;
    country: string;
    spendLimitCents: number;
    spendLimitInterval: GlobalIssuedCard['spendLimitInterval'];
    metadata?: Record<string, string>;
  };
}

export interface ListGlobalCardsRequest {
  userId: string;
  tenantId: string;
  status?: GlobalCardStatus;
  country?: string;
  limit?: number;
  offset?: number;
}

export interface ListGlobalCardsResponse {
  cards: GlobalIssuedCard[];
  total: number;
}

export interface CreatePayoutRequest {
  userId: string;
  tenantId: string;
  payout: {
    destinationCountry: string;
    destinationCurrency: string;
    amountCents: number;
    rail?: PaymentRail;
    recipientName: string;
    recipientAccountNumber: string;
    recipientBankCode?: string;
    reference?: string;
  };
}

export interface ListPayoutsRequest {
  userId: string;
  tenantId: string;
  status?: PayoutStatus;
  limit?: number;
  offset?: number;
}

export interface ListPayoutsResponse {
  payouts: Payout[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface InternationalPaymentsAdapter extends BaseAdapter {
  /** Get supported country coverage */
  getCoverage(request: GetCoverageRequest): Promise<GetCoverageResponse>;

  /** Get a real-time FX quote */
  getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote>;

  /** Create an international payment */
  createPayment(request: CreatePaymentRequest): Promise<InternationalPayment>;

  /** Get payment details */
  getPayment(request: GetPaymentRequest): Promise<InternationalPayment>;

  /** List international payments */
  listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse>;

  /** Issue a global card (Stripe Issuing / Marqeta) */
  issueGlobalCard(request: IssueGlobalCardRequest): Promise<GlobalIssuedCard>;

  /** List global issued cards */
  listGlobalCards(request: ListGlobalCardsRequest): Promise<ListGlobalCardsResponse>;

  /** Create a payout to an international recipient */
  createPayout(request: CreatePayoutRequest): Promise<Payout>;

  /** List payouts */
  listPayouts(request: ListPayoutsRequest): Promise<ListPayoutsResponse>;
}
