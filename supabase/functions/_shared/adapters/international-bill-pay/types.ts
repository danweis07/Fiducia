/**
 * International Bill Pay Adapter Interface
 *
 * Defines the contract for cross-border bill payment services.
 * Unlike US bill pay (ACH-based), international markets use
 * push payments and specialized cross-border aggregators.
 *
 * Providers:
 *   - Pipit Global: 1,000+ billers across 46 countries
 *   - Wise Platform: FX-optimized bank transfers for bill settlement
 *   - ConnectPay: EU-focused SEPA (Instant) bill pay infrastructure
 *
 * All monetary values are integer minor currency units (cents, pence, etc.).
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// INTERNATIONAL BILLER TYPES
// =============================================================================

export type InternationalBillerCategory =
  | 'utilities'
  | 'telecom'
  | 'government'
  | 'education'
  | 'insurance'
  | 'rent'
  | 'financial_services'
  | 'healthcare'
  | 'subscription'
  | 'other';

export interface InternationalBiller {
  billerId: string;
  name: string;
  country: string;
  currency: string;
  category: InternationalBillerCategory;
  logoUrl?: string;
  supportsInstantPayment: boolean;
  supportsCashPayment: boolean;
  requiredFields: InternationalBillerField[];
  processingTimeHours: number;
}

export interface InternationalBillerField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'phone' | 'account_number' | 'reference';
  required: boolean;
  pattern?: string;
  helpText?: string;
}

// =============================================================================
// INTERNATIONAL BILL PAYMENT TYPES
// =============================================================================

export type InternationalBillPaymentStatus =
  | 'pending'
  | 'processing'
  | 'delivered'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled';

export type InternationalPaymentRail =
  | 'sepa'
  | 'sepa_instant'
  | 'faster_payments'
  | 'swift'
  | 'local_push'
  | 'cash_collection';

export interface InternationalBillPayment {
  paymentId: string;
  billerId: string;
  billerName: string;
  billerCountry: string;
  fromCurrency: string;
  fromAmountCents: number;
  toCurrency: string;
  toAmountCents: number;
  exchangeRate: number;
  feeAmountCents: number;
  feeCurrency: string;
  rail: InternationalPaymentRail;
  status: InternationalBillPaymentStatus;
  referenceNumber: string;
  accountReference: string;
  estimatedDelivery: string;
  deliveredAt: string | null;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface SearchInternationalBillersRequest {
  query: string;
  country?: string;
  category?: InternationalBillerCategory;
  limit?: number;
}

export interface SearchInternationalBillersResponse {
  billers: InternationalBiller[];
  total: number;
}

export interface PayInternationalBillRequest {
  userId: string;
  tenantId: string;
  billerId: string;
  fromAccountId: string;
  fromCurrency: string;
  amountCents: number;
  accountReference: string;
  referenceFields?: Record<string, string>;
  rail?: InternationalPaymentRail;
}

export interface GetInternationalBillPaymentRequest {
  userId: string;
  tenantId: string;
  paymentId: string;
}

export interface ListInternationalBillPaymentsRequest {
  userId: string;
  tenantId: string;
  country?: string;
  status?: InternationalBillPaymentStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListInternationalBillPaymentsResponse {
  payments: InternationalBillPayment[];
  total: number;
}

export interface GetSupportedCountriesRequest {
  userId: string;
  tenantId: string;
}

export interface GetSupportedCountriesResponse {
  countries: Array<{
    countryCode: string;
    countryName: string;
    currency: string;
    billerCount: number;
    supportsInstant: boolean;
  }>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface InternationalBillPayAdapter extends BaseAdapter {
  /** Search international billers across supported countries */
  searchBillers(request: SearchInternationalBillersRequest): Promise<SearchInternationalBillersResponse>;

  /** Pay an international bill */
  payBill(request: PayInternationalBillRequest): Promise<InternationalBillPayment>;

  /** Get payment details */
  getPayment(request: GetInternationalBillPaymentRequest): Promise<InternationalBillPayment>;

  /** List international bill payments */
  listPayments(request: ListInternationalBillPaymentsRequest): Promise<ListInternationalBillPaymentsResponse>;

  /** Get supported countries and biller counts */
  getSupportedCountries(request: GetSupportedCountriesRequest): Promise<GetSupportedCountriesResponse>;
}
