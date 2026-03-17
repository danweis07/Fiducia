// TODO: Provisional integration — not yet validated in production.
/**
 * ConnectPay International Bill Pay Adapter
 *
 * Integrates with ConnectPay — an EU-focused payment infrastructure
 * provider specializing in SEPA and SEPA Instant bill payments. ConnectPay
 * supports real-time bill settlement across the Eurozone with native
 * IBAN-based routing and PSD2-compliant strong customer authentication.
 *
 * ConnectPay API: https://docs.connectpay.eu
 *
 * Configuration:
 *   CONNECTPAY_API_KEY — API key for authentication
 *   CONNECTPAY_BASE_URL — Base URL (default: https://api.connectpay.eu/v1)
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
// CONNECTPAY API RESPONSE TYPES
// =============================================================================

interface ConnectPayBiller {
  biller_id: string;
  name: string;
  country_iso: string;
  currency_iso: string;
  category: string;
  logo_uri: string | null;
  sepa_instant_eligible: boolean;
  cash_enabled: boolean;
  fields: Array<{
    key: string;
    label: string;
    data_type: string;
    mandatory: boolean;
    regex: string | null;
    description: string | null;
  }>;
  sla_hours: number;
}

interface ConnectPayBillerListResponse {
  data: ConnectPayBiller[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface ConnectPayPayment {
  id: string;
  biller_id: string;
  biller_name: string;
  biller_country: string;
  debit_currency: string;
  debit_amount_cents: number;
  credit_currency: string;
  credit_amount_cents: number;
  exchange_rate: number;
  fee_cents: number;
  fee_currency: string;
  rail: string;
  state: string;
  end_to_end_reference: string;
  creditor_reference: string;
  estimated_settlement: string;
  settled_at: string | null;
  created_at: string;
}

interface ConnectPayPaymentListResponse {
  data: ConnectPayPayment[];
  meta: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface ConnectPayCountry {
  iso_code: string;
  name: string;
  currency: string;
  biller_count: number;
  sepa_instant: boolean;
}

interface ConnectPayCountriesResponse {
  data: ConnectPayCountry[];
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapConnectPayCategory(category: string): InternationalBillerCategory {
  switch (category) {
    case 'UTILITIES': return 'utilities';
    case 'TELECOM': return 'telecom';
    case 'GOVERNMENT': return 'government';
    case 'EDUCATION': return 'education';
    case 'INSURANCE': return 'insurance';
    case 'RENT': return 'rent';
    case 'FINANCIAL': return 'financial_services';
    case 'HEALTHCARE': return 'healthcare';
    case 'SUBSCRIPTION': return 'subscription';
    default: return 'other';
  }
}

function mapConnectPayCategoryToApi(category: InternationalBillerCategory): string {
  switch (category) {
    case 'utilities': return 'UTILITIES';
    case 'telecom': return 'TELECOM';
    case 'government': return 'GOVERNMENT';
    case 'education': return 'EDUCATION';
    case 'insurance': return 'INSURANCE';
    case 'rent': return 'RENT';
    case 'financial_services': return 'FINANCIAL';
    case 'healthcare': return 'HEALTHCARE';
    case 'subscription': return 'SUBSCRIPTION';
    case 'other': return 'OTHER';
    default: return 'OTHER';
  }
}

function mapConnectPayFieldType(type: string): 'text' | 'number' | 'email' | 'phone' | 'account_number' | 'reference' {
  switch (type) {
    case 'string': return 'text';
    case 'integer': return 'number';
    case 'email': return 'email';
    case 'phone_number': return 'phone';
    case 'iban': return 'account_number';
    case 'reference': return 'reference';
    default: return 'text';
  }
}

function mapConnectPayState(state: string): InternationalBillPaymentStatus {
  switch (state) {
    case 'INITIATED': return 'pending';
    case 'ACCEPTED': return 'processing';
    case 'SETTLING': return 'processing';
    case 'DELIVERED': return 'delivered';
    case 'SETTLED': return 'paid';
    case 'REJECTED': return 'failed';
    case 'RETURNED': return 'refunded';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function mapConnectPayRail(rail: string): InternationalPaymentRail {
  switch (rail) {
    case 'SEPA_CT': return 'sepa';
    case 'SEPA_INST': return 'sepa_instant';
    case 'SWIFT': return 'swift';
    default: return 'sepa';
  }
}

function mapRailToConnectPayApi(rail: InternationalPaymentRail): string {
  switch (rail) {
    case 'sepa': return 'SEPA_CT';
    case 'sepa_instant': return 'SEPA_INST';
    case 'swift': return 'SWIFT';
    default: return 'SEPA_CT';
  }
}

function mapConnectPayBiller(biller: ConnectPayBiller): InternationalBiller {
  return {
    billerId: biller.biller_id,
    name: biller.name,
    country: biller.country_iso,
    currency: biller.currency_iso,
    category: mapConnectPayCategory(biller.category),
    logoUrl: biller.logo_uri ?? undefined,
    supportsInstantPayment: biller.sepa_instant_eligible,
    supportsCashPayment: biller.cash_enabled,
    requiredFields: biller.fields.map(f => ({
      name: f.key,
      label: f.label,
      type: mapConnectPayFieldType(f.data_type),
      required: f.mandatory,
      pattern: f.regex ?? undefined,
      helpText: f.description ?? undefined,
    })),
    processingTimeHours: biller.sla_hours,
  };
}

function mapConnectPayPayment(payment: ConnectPayPayment): InternationalBillPayment {
  return {
    paymentId: payment.id,
    billerId: payment.biller_id,
    billerName: payment.biller_name,
    billerCountry: payment.biller_country,
    fromCurrency: payment.debit_currency,
    fromAmountCents: payment.debit_amount_cents,
    toCurrency: payment.credit_currency,
    toAmountCents: payment.credit_amount_cents,
    exchangeRate: payment.exchange_rate,
    feeAmountCents: payment.fee_cents,
    feeCurrency: payment.fee_currency,
    rail: mapConnectPayRail(payment.rail),
    status: mapConnectPayState(payment.state),
    referenceNumber: payment.end_to_end_reference,
    accountReference: payment.creditor_reference,
    estimatedDelivery: payment.estimated_settlement,
    deliveredAt: payment.settled_at,
    createdAt: payment.created_at,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ConnectPayInternationalBillPayAdapter implements InternationalBillPayAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'connectpay',
    name: 'ConnectPay International Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('CONNECTPAY_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('CONNECTPAY_BASE_URL') ?? 'https://api.connectpay.eu/v1';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('ConnectPay adapter in sandbox mode — API key not configured');
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
      throw new Error(`ConnectPay API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/health');
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
    params.set('search', request.query);
    if (request.country) params.set('country_iso', request.country);
    if (request.category) params.set('category', mapConnectPayCategoryToApi(request.category));
    params.set('per_page', String(request.limit ?? 20));

    const response = await this.request<ConnectPayBillerListResponse>('GET', `/billers?${params.toString()}`);

    return {
      billers: response.data.map(mapConnectPayBiller),
      total: response.meta.total,
    };
  }

  async payBill(request: PayInternationalBillRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().payBill(request);
    }

    const body: Record<string, unknown> = {
      biller_id: request.billerId,
      debit_account_id: request.fromAccountId,
      debit_currency: request.fromCurrency,
      amount_cents: request.amountCents,
      creditor_reference: request.accountReference,
      idempotency_key: `${request.tenantId}_${request.userId}_${Date.now()}`,
    };

    if (request.referenceFields) body.additional_fields = request.referenceFields;
    if (request.rail) body.preferred_rail = mapRailToConnectPayApi(request.rail);

    const response = await this.request<ConnectPayPayment>('POST', '/payments', body);
    return mapConnectPayPayment(response);
  }

  async getPayment(request: GetInternationalBillPaymentRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getPayment(request);
    }

    const response = await this.request<ConnectPayPayment>('GET', `/payments/${request.paymentId}`);
    return mapConnectPayPayment(response);
  }

  async listPayments(request: ListInternationalBillPaymentsRequest): Promise<ListInternationalBillPaymentsResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().listPayments(request);
    }

    const params = new URLSearchParams();
    if (request.country) params.set('biller_country', request.country);
    if (request.status) params.set('state', request.status.toUpperCase());
    if (request.fromDate) params.set('created_from', request.fromDate);
    if (request.toDate) params.set('created_to', request.toDate);
    params.set('per_page', String(request.limit ?? 50));
    const page = Math.floor((request.offset ?? 0) / (request.limit ?? 50)) + 1;
    params.set('page', String(page));

    const response = await this.request<ConnectPayPaymentListResponse>('GET', `/payments?${params.toString()}`);

    return {
      payments: response.data.map(mapConnectPayPayment),
      total: response.meta.total,
    };
  }

  async getSupportedCountries(request: GetSupportedCountriesRequest): Promise<GetSupportedCountriesResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getSupportedCountries(request);
    }

    const response = await this.request<ConnectPayCountriesResponse>('GET', '/countries');

    return {
      countries: response.data.map(c => ({
        countryCode: c.iso_code,
        countryName: c.name,
        currency: c.currency,
        billerCount: c.biller_count,
        supportsInstant: c.sepa_instant,
      })),
    };
  }
}
