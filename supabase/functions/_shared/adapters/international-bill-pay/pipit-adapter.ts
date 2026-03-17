// TODO: Provisional integration — not yet validated in production.
/**
 * Pipit Global International Bill Pay Adapter
 *
 * Integrates with Pipit Global — the leading international bill payment
 * aggregator supporting 1,000+ billers across 46 countries with local
 * push-payment rails, cash collection networks, and real-time settlement.
 *
 * Pipit Global API: https://docs.pipit.global
 *
 * Configuration:
 *   PIPIT_API_KEY — API key for authentication
 *   PIPIT_BASE_URL — Base URL (default: https://api.pipit.global/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalBillPayAdapter,
  InternationalBiller,
  InternationalBillerCategory,
  InternationalBillPayment,
  InternationalBillPaymentStatus,
  InternationalPaymentRail,
  SearchInternationalBillersRequest,
  SearchInternationalBillersResponse,
  PayInternationalBillRequest,
  GetInternationalBillPaymentRequest,
  ListInternationalBillPaymentsRequest,
  ListInternationalBillPaymentsResponse,
  GetSupportedCountriesRequest,
  GetSupportedCountriesResponse,
} from './types.ts';

// =============================================================================
// PIPIT GLOBAL API RESPONSE TYPES
// =============================================================================

interface PipitBiller {
  id: string;
  display_name: string;
  country_code: string;
  currency_code: string;
  category: string;
  logo_url: string | null;
  instant_payment_supported: boolean;
  cash_payment_supported: boolean;
  required_fields: Array<{
    field_name: string;
    display_label: string;
    field_type: string;
    is_required: boolean;
    validation_regex: string | null;
    help_text: string | null;
  }>;
  estimated_processing_hours: number;
}

interface PipitBillerSearchResponse {
  billers: PipitBiller[];
  total_count: number;
  page: number;
  page_size: number;
}

interface PipitPayment {
  payment_id: string;
  biller_id: string;
  biller_name: string;
  biller_country: string;
  source_currency: string;
  source_amount_minor: number;
  destination_currency: string;
  destination_amount_minor: number;
  fx_rate: number;
  fee_amount_minor: number;
  fee_currency: string;
  payment_rail: string;
  status: string;
  reference_number: string;
  account_reference: string;
  estimated_delivery_at: string;
  delivered_at: string | null;
  created_at: string;
}

interface PipitPaymentListResponse {
  payments: PipitPayment[];
  total_count: number;
}

interface PipitCountry {
  country_code: string;
  country_name: string;
  currency_code: string;
  biller_count: number;
  instant_supported: boolean;
}

interface PipitCountriesResponse {
  countries: PipitCountry[];
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapPipitCategory(category: string): InternationalBillerCategory {
  switch (category) {
    case 'UTILITIES': return 'utilities';
    case 'TELECOM': return 'telecom';
    case 'GOVERNMENT': return 'government';
    case 'EDUCATION': return 'education';
    case 'INSURANCE': return 'insurance';
    case 'RENT': return 'rent';
    case 'FINANCIAL_SERVICES': return 'financial_services';
    case 'HEALTHCARE': return 'healthcare';
    case 'SUBSCRIPTION': return 'subscription';
    default: return 'other';
  }
}

function mapPipitFieldType(type: string): 'text' | 'number' | 'email' | 'phone' | 'account_number' | 'reference' {
  switch (type) {
    case 'TEXT': return 'text';
    case 'NUMERIC': return 'number';
    case 'EMAIL': return 'email';
    case 'PHONE': return 'phone';
    case 'ACCOUNT_NUMBER': return 'account_number';
    case 'REFERENCE': return 'reference';
    default: return 'text';
  }
}

function mapPipitPaymentStatus(status: string): InternationalBillPaymentStatus {
  switch (status) {
    case 'PENDING': return 'pending';
    case 'PROCESSING': return 'processing';
    case 'DELIVERED': return 'delivered';
    case 'PAID': return 'paid';
    case 'FAILED': return 'failed';
    case 'REFUNDED': return 'refunded';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function mapPipitPaymentRail(rail: string): InternationalPaymentRail {
  switch (rail) {
    case 'SEPA': return 'sepa';
    case 'SEPA_INSTANT': return 'sepa_instant';
    case 'FASTER_PAYMENTS': return 'faster_payments';
    case 'SWIFT': return 'swift';
    case 'LOCAL_PUSH': return 'local_push';
    case 'CASH_COLLECTION': return 'cash_collection';
    default: return 'local_push';
  }
}

function mapPipitRailToApi(rail: InternationalPaymentRail): string {
  switch (rail) {
    case 'sepa': return 'SEPA';
    case 'sepa_instant': return 'SEPA_INSTANT';
    case 'faster_payments': return 'FASTER_PAYMENTS';
    case 'swift': return 'SWIFT';
    case 'local_push': return 'LOCAL_PUSH';
    case 'cash_collection': return 'CASH_COLLECTION';
    default: return 'LOCAL_PUSH';
  }
}

function mapPipitCategoryToApi(category: InternationalBillerCategory): string {
  switch (category) {
    case 'utilities': return 'UTILITIES';
    case 'telecom': return 'TELECOM';
    case 'government': return 'GOVERNMENT';
    case 'education': return 'EDUCATION';
    case 'insurance': return 'INSURANCE';
    case 'rent': return 'RENT';
    case 'financial_services': return 'FINANCIAL_SERVICES';
    case 'healthcare': return 'HEALTHCARE';
    case 'subscription': return 'SUBSCRIPTION';
    case 'other': return 'OTHER';
    default: return 'OTHER';
  }
}

function mapPipitBiller(biller: PipitBiller): InternationalBiller {
  return {
    billerId: biller.id,
    name: biller.display_name,
    country: biller.country_code,
    currency: biller.currency_code,
    category: mapPipitCategory(biller.category),
    logoUrl: biller.logo_url ?? undefined,
    supportsInstantPayment: biller.instant_payment_supported,
    supportsCashPayment: biller.cash_payment_supported,
    requiredFields: biller.required_fields.map(f => ({
      name: f.field_name,
      label: f.display_label,
      type: mapPipitFieldType(f.field_type),
      required: f.is_required,
      pattern: f.validation_regex ?? undefined,
      helpText: f.help_text ?? undefined,
    })),
    processingTimeHours: biller.estimated_processing_hours,
  };
}

function mapPipitPayment(payment: PipitPayment): InternationalBillPayment {
  return {
    paymentId: payment.payment_id,
    billerId: payment.biller_id,
    billerName: payment.biller_name,
    billerCountry: payment.biller_country,
    fromCurrency: payment.source_currency,
    fromAmountCents: payment.source_amount_minor,
    toCurrency: payment.destination_currency,
    toAmountCents: payment.destination_amount_minor,
    exchangeRate: payment.fx_rate,
    feeAmountCents: payment.fee_amount_minor,
    feeCurrency: payment.fee_currency,
    rail: mapPipitPaymentRail(payment.payment_rail),
    status: mapPipitPaymentStatus(payment.status),
    referenceNumber: payment.reference_number,
    accountReference: payment.account_reference,
    estimatedDelivery: payment.estimated_delivery_at,
    deliveredAt: payment.delivered_at,
    createdAt: payment.created_at,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PipitInternationalBillPayAdapter implements InternationalBillPayAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'pipit_global',
    name: 'Pipit Global International Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('PIPIT_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('PIPIT_BASE_URL') ?? 'https://api.pipit.global/v1';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Pipit Global adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pipit Global API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/billers?limit=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async searchBillers(request: SearchInternationalBillersRequest): Promise<SearchInternationalBillersResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().searchBillers(request);
    }

    const params = new URLSearchParams();
    params.set('query', request.query);
    if (request.country) params.set('country_code', request.country);
    if (request.category) params.set('category', mapPipitCategoryToApi(request.category));
    params.set('page_size', String(request.limit ?? 20));

    const response = await this.request<PipitBillerSearchResponse>('GET', `/billers/search?${params.toString()}`);

    return {
      billers: response.billers.map(mapPipitBiller),
      total: response.total_count,
    };
  }

  async payBill(request: PayInternationalBillRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().payBill(request);
    }

    const body: Record<string, unknown> = {
      biller_id: request.billerId,
      source_account_id: request.fromAccountId,
      source_currency: request.fromCurrency,
      amount_minor: request.amountCents,
      account_reference: request.accountReference,
      idempotency_key: `${request.tenantId}_${request.userId}_${Date.now()}`,
    };

    if (request.referenceFields) body.reference_fields = request.referenceFields;
    if (request.rail) body.preferred_rail = mapPipitRailToApi(request.rail);

    const response = await this.request<PipitPayment>('POST', '/payments', body);
    return mapPipitPayment(response);
  }

  async getPayment(request: GetInternationalBillPaymentRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getPayment(request);
    }

    const response = await this.request<PipitPayment>('GET', `/payments/${request.paymentId}`);
    return mapPipitPayment(response);
  }

  async listPayments(request: ListInternationalBillPaymentsRequest): Promise<ListInternationalBillPaymentsResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().listPayments(request);
    }

    const params = new URLSearchParams();
    if (request.country) params.set('country_code', request.country);
    if (request.status) params.set('status', request.status.toUpperCase());
    if (request.fromDate) params.set('from_date', request.fromDate);
    if (request.toDate) params.set('to_date', request.toDate);
    params.set('limit', String(request.limit ?? 50));
    params.set('offset', String(request.offset ?? 0));

    const response = await this.request<PipitPaymentListResponse>('GET', `/payments?${params.toString()}`);

    return {
      payments: response.payments.map(mapPipitPayment),
      total: response.total_count,
    };
  }

  async getSupportedCountries(request: GetSupportedCountriesRequest): Promise<GetSupportedCountriesResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getSupportedCountries(request);
    }

    const response = await this.request<PipitCountriesResponse>('GET', '/countries');

    return {
      countries: response.countries.map(c => ({
        countryCode: c.country_code,
        countryName: c.country_name,
        currency: c.currency_code,
        billerCount: c.biller_count,
        supportsInstant: c.instant_supported,
      })),
    };
  }
}
