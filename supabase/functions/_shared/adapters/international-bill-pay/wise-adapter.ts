// TODO: Provisional integration — not yet validated in production.
/**
 * Wise Platform International Bill Pay Adapter
 *
 * Integrates with Wise (formerly TransferWise) Platform API — an
 * FX-optimized cross-border transfer service used for international
 * bill settlement. Wise provides mid-market exchange rates with
 * transparent fees across 80+ countries.
 *
 * Wise Platform API: https://docs.wise.com/api-docs
 *
 * Configuration:
 *   WISE_API_KEY — API token for authentication
 *   WISE_BASE_URL — Base URL (default: https://api.transferwise.com/v3)
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
// WISE API RESPONSE TYPES
// =============================================================================

interface WiseRecipient {
  id: number;
  profile: number;
  accountHolderName: string;
  type: string;
  country: string;
  currency: string;
  details: Record<string, string>;
  isActive: boolean;
}

interface WiseQuote {
  id: string;
  sourceCurrency: string;
  targetCurrency: string;
  sourceAmount: number;
  targetAmount: number;
  rate: number;
  fee: number;
  feeCurrency: string;
  deliveryEstimate: string;
  rateType: string;
  createdTime: string;
  expirationTime: string;
}

interface WiseTransfer {
  id: number;
  user: number;
  targetAccount: number;
  quoteUuid: string;
  status: string;
  reference: string;
  rate: number;
  sourceCurrency: string;
  sourceValue: number;
  targetCurrency: string;
  targetValue: number;
  customerTransactionId: string;
  details: {
    reference: string;
  };
  hasActiveIssues: boolean;
  created: string;
}

interface WiseFundingRequiredDetails {
  type: string;
  status: string;
  errorCode: string | null;
}

interface WiseTransferStatus {
  id: number;
  status: string;
  deliveryEstimate: string | null;
  created: string;
  completed: string | null;
}

interface WiseCurrencyRoute {
  sourceCountry: string;
  targetCountry: string;
  sourceCurrency: string;
  targetCurrency: string;
  payIn: string;
  payOut: string;
}

interface WiseBillerMapping {
  biller_id: string;
  recipient_type: string;
  display_name: string;
  country: string;
  currency: string;
  category: string;
  required_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    pattern: string | null;
    help_text: string | null;
  }>;
  supports_instant: boolean;
  processing_hours: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapWiseCategory(category: string): InternationalBillerCategory {
  switch (category) {
    case 'utilities': return 'utilities';
    case 'telecom': return 'telecom';
    case 'government': return 'government';
    case 'education': return 'education';
    case 'insurance': return 'insurance';
    case 'rent': return 'rent';
    case 'financial_services': return 'financial_services';
    case 'healthcare': return 'healthcare';
    case 'subscription': return 'subscription';
    default: return 'other';
  }
}

function mapWiseFieldType(type: string): 'text' | 'number' | 'email' | 'phone' | 'account_number' | 'reference' {
  switch (type) {
    case 'text': return 'text';
    case 'number': return 'number';
    case 'email': return 'email';
    case 'phone': return 'phone';
    case 'account': return 'account_number';
    case 'reference': return 'reference';
    default: return 'text';
  }
}

function mapWiseTransferStatus(status: string): InternationalBillPaymentStatus {
  switch (status) {
    case 'incoming_payment_waiting': return 'pending';
    case 'incoming_payment_initiated': return 'pending';
    case 'processing': return 'processing';
    case 'funds_converted': return 'processing';
    case 'outgoing_payment_sent': return 'delivered';
    case 'bounced_back': return 'failed';
    case 'funds_refunded': return 'refunded';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapWisePaymentRail(targetCountry: string): InternationalPaymentRail {
  switch (targetCountry) {
    case 'GB': return 'faster_payments';
    case 'DE':
    case 'FR':
    case 'IT':
    case 'ES':
    case 'NL':
    case 'BE':
    case 'AT':
    case 'IE':
    case 'PT':
    case 'FI':
      return 'sepa';
    default: return 'local_push';
  }
}

/**
 * Converts a major-unit decimal amount to integer minor units (cents).
 * Wise API uses major units (e.g. 150.00), our domain uses minor units (15000).
 */
function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

function mapWiseBillerToDomain(mapping: WiseBillerMapping): InternationalBiller {
  return {
    billerId: mapping.biller_id,
    name: mapping.display_name,
    country: mapping.country,
    currency: mapping.currency,
    category: mapWiseCategory(mapping.category),
    supportsInstantPayment: mapping.supports_instant,
    supportsCashPayment: false,
    requiredFields: mapping.required_fields.map(f => ({
      name: f.name,
      label: f.label,
      type: mapWiseFieldType(f.type),
      required: f.required,
      pattern: f.pattern ?? undefined,
      helpText: f.help_text ?? undefined,
    })),
    processingTimeHours: mapping.processing_hours,
  };
}

function mapWiseTransferToPayment(
  transfer: WiseTransfer,
  billerName: string,
  billerCountry: string,
  feeCents: number,
  feeCurrency: string,
  rail: InternationalPaymentRail,
  estimatedDelivery: string,
  deliveredAt: string | null,
): InternationalBillPayment {
  return {
    paymentId: String(transfer.id),
    billerId: String(transfer.targetAccount),
    billerName,
    billerCountry,
    fromCurrency: transfer.sourceCurrency,
    fromAmountCents: toMinorUnits(transfer.sourceValue),
    toCurrency: transfer.targetCurrency,
    toAmountCents: toMinorUnits(transfer.targetValue),
    exchangeRate: transfer.rate,
    feeAmountCents: feeCents,
    feeCurrency,
    rail,
    status: mapWiseTransferStatus(transfer.status),
    referenceNumber: transfer.customerTransactionId,
    accountReference: transfer.details.reference,
    estimatedDelivery,
    deliveredAt,
    createdAt: transfer.created,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class WiseInternationalBillPayAdapter implements InternationalBillPayAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'wise_platform',
    name: 'Wise Platform International Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('WISE_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('WISE_BASE_URL') ?? 'https://api.transferwise.com/v3';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Wise adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Wise API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/profiles');
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

    // Wise doesn't have a native biller directory — we query our internal biller
    // mapping table that maps Wise recipient types to biller identifiers.
    const params = new URLSearchParams();
    params.set('query', request.query);
    if (request.country) params.set('country', request.country);
    if (request.category) params.set('category', request.category);
    params.set('limit', String(request.limit ?? 20));

    const response = await this.request<{ billers: WiseBillerMapping[]; total: number }>(
      'GET',
      `/bill-pay/billers?${params.toString()}`,
    );

    return {
      billers: response.billers.map(mapWiseBillerToDomain),
      total: response.total,
    };
  }

  async payBill(request: PayInternationalBillRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().payBill(request);
    }

    // Step 1: Create a quote for the transfer
    const quote = await this.request<WiseQuote>('POST', '/quotes', {
      sourceCurrency: request.fromCurrency,
      targetCurrency: request.fromCurrency, // Will be resolved from biller config
      sourceAmount: request.amountCents / 100,
      payOut: 'BANK_TRANSFER',
    });

    // Step 2: Create the transfer using the quote
    const transfer = await this.request<WiseTransfer>('POST', '/transfers', {
      targetAccount: parseInt(request.billerId, 10),
      quoteUuid: quote.id,
      customerTransactionId: `${request.tenantId}_${request.userId}_${Date.now()}`,
      details: {
        reference: request.accountReference,
        ...request.referenceFields,
      },
    });

    // Step 3: Fund the transfer
    await this.request<WiseFundingRequiredDetails>('POST', `/transfers/${transfer.id}/payments`, {
      type: 'BALANCE',
    });

    return mapWiseTransferToPayment(
      transfer,
      '', // billerName resolved asynchronously
      '', // billerCountry resolved asynchronously
      toMinorUnits(quote.fee),
      quote.feeCurrency,
      mapWisePaymentRail(quote.targetCurrency),
      quote.deliveryEstimate,
      null,
    );
  }

  async getPayment(request: GetInternationalBillPaymentRequest): Promise<InternationalBillPayment> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getPayment(request);
    }

    const transfer = await this.request<WiseTransfer>('GET', `/transfers/${request.paymentId}`);
    const status = await this.request<WiseTransferStatus>('GET', `/transfers/${request.paymentId}/status`);

    // Fetch the recipient to get biller details
    const recipient = await this.request<WiseRecipient>('GET', `/accounts/${transfer.targetAccount}`);

    return mapWiseTransferToPayment(
      transfer,
      recipient.accountHolderName,
      recipient.country,
      0, // Fee not available on individual transfer retrieval
      transfer.sourceCurrency,
      mapWisePaymentRail(recipient.country),
      status.deliveryEstimate ?? new Date().toISOString(),
      status.completed,
    );
  }

  async listPayments(request: ListInternationalBillPaymentsRequest): Promise<ListInternationalBillPaymentsResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().listPayments(request);
    }

    const params = new URLSearchParams();
    params.set('limit', String(request.limit ?? 50));
    params.set('offset', String(request.offset ?? 0));
    if (request.status) params.set('status', request.status);
    if (request.fromDate) params.set('createdDateStart', request.fromDate);
    if (request.toDate) params.set('createdDateEnd', request.toDate);

    const response = await this.request<{ transfers: WiseTransfer[]; total: number }>(
      'GET',
      `/transfers?${params.toString()}`,
    );

    const payments: InternationalBillPayment[] = response.transfers.map(t =>
      mapWiseTransferToPayment(
        t,
        '', // billerName not available in list endpoint
        '', // billerCountry not available in list endpoint
        0,
        t.sourceCurrency,
        mapWisePaymentRail(t.targetCurrency),
        new Date().toISOString(),
        null,
      ),
    );

    return { payments, total: response.total };
  }

  async getSupportedCountries(request: GetSupportedCountriesRequest): Promise<GetSupportedCountriesResponse> {
    if (this.sandbox) {
      const { MockInternationalBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalBillPayAdapter().getSupportedCountries(request);
    }

    const routes = await this.request<WiseCurrencyRoute[]>('GET', '/currency-routes');

    // Aggregate routes into unique target countries
    const countryMap = new Map<string, { code: string; currency: string; count: number; instant: boolean }>();
    for (const route of routes) {
      const existing = countryMap.get(route.targetCountry);
      if (existing) {
        existing.count++;
        if (route.payOut === 'INSTANT') existing.instant = true;
      } else {
        countryMap.set(route.targetCountry, {
          code: route.targetCountry,
          currency: route.targetCurrency,
          count: 1,
          instant: route.payOut === 'INSTANT',
        });
      }
    }

    return {
      countries: Array.from(countryMap.values()).map(c => ({
        countryCode: c.code,
        countryName: c.code, // Wise API returns codes; display names resolved upstream
        currency: c.currency,
        billerCount: c.count,
        supportsInstant: c.instant,
      })),
    };
  }
}
