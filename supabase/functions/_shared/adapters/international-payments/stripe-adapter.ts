// TODO: Provisional integration — not yet validated in production.
/**
 * Stripe International Payments Adapter
 *
 * Integrates with Stripe's global payment platform for cross-border
 * payments, FX, card issuing (Stripe Issuing), and payouts across 50+ countries.
 *
 * Stripe processes ~$1.9T annually (2026) and is a "Leader" in global payments.
 *
 * APIs used:
 *   - Payment Intents: Cross-border payment acceptance
 *   - Transfers & Payouts: International disbursements
 *   - Issuing: Global card issuing in 30+ countries
 *   - Balance Transactions: FX conversion
 *
 * Configuration:
 *   STRIPE_SECRET_KEY — Stripe secret key (same key as treasury adapter)
 *   STRIPE_BASE_URL — Base URL (default: https://api.stripe.com/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalPaymentsAdapter,
  InternationalPayment,
  InternationalPaymentStatus,
  FXQuote,
  GlobalIssuedCard,
  GlobalCardStatus,
  Payout,
  PayoutStatus,
  GetCoverageRequest,
  GetCoverageResponse,
  GetFXQuoteRequest,
  CreatePaymentRequest,
  GetPaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  IssueGlobalCardRequest,
  ListGlobalCardsRequest,
  ListGlobalCardsResponse,
  CreatePayoutRequest,
  ListPayoutsRequest,
  ListPayoutsResponse,
  CountryCoverage,
} from './types.ts';

// =============================================================================
// STRIPE API RESPONSE TYPES
// =============================================================================

interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  metadata: Record<string, string>;
  transfer_data?: { destination: string };
  created: number;
}

interface StripeIssuingCard {
  id: string;
  type: string;
  status: string;
  last4: string;
  brand: string;
  currency: string;
  exp_month: number;
  exp_year: number;
  cardholder: { name: string };
  spending_controls: {
    spending_limits: Array<{ amount: number; interval: string }>;
  };
  metadata: Record<string, string>;
  created: number;
}

interface StripePayout {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  destination: string;
  arrival_date: number;
  created: number;
}

interface StripeExchangeRate {
  id: string;
  rates: Record<string, number>;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapStripePaymentStatus(status: string): InternationalPaymentStatus {
  switch (status) {
    case 'succeeded': return 'completed';
    case 'processing': return 'processing';
    case 'requires_action':
    case 'requires_confirmation':
    case 'requires_payment_method': return 'requires_action';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

function mapStripeCardStatus(status: string): GlobalCardStatus {
  switch (status) {
    case 'active': return 'active';
    case 'inactive': return 'inactive';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

function mapStripePayoutStatus(status: string): PayoutStatus {
  switch (status) {
    case 'paid': return 'paid';
    case 'in_transit': return 'in_transit';
    case 'failed': return 'failed';
    case 'canceled': return 'cancelled';
    default: return 'pending';
  }
}

function epochToISO(epoch: number): string {
  return new Date(epoch * 1000).toISOString();
}

// Stripe-supported countries for issuing
const STRIPE_ISSUING_COUNTRIES: CountryCoverage[] = [
  { countryCode: 'US', countryName: 'United States', region: 'us', currencyCode: 'USD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['ach', 'wire'] },
  { countryCode: 'GB', countryName: 'United Kingdom', region: 'uk', currencyCode: 'GBP', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['bacs', 'faster_payments'] },
  { countryCode: 'DE', countryName: 'Germany', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['sepa', 'sepa_instant'] },
  { countryCode: 'FR', countryName: 'France', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['sepa'] },
  { countryCode: 'IE', countryName: 'Ireland', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['sepa'] },
  { countryCode: 'SG', countryName: 'Singapore', region: 'apac', currencyCode: 'SGD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['paynow'] },
  { countryCode: 'AU', countryName: 'Australia', region: 'apac', currencyCode: 'AUD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['becs'] },
  { countryCode: 'CA', countryName: 'Canada', region: 'us', currencyCode: 'CAD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['eft'] },
  { countryCode: 'JP', countryName: 'Japan', region: 'apac', currencyCode: 'JPY', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['zengin'] },
  { countryCode: 'BR', countryName: 'Brazil', region: 'latam', currencyCode: 'BRL', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['pix'] },
  { countryCode: 'MX', countryName: 'Mexico', region: 'latam', currencyCode: 'MXN', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['spei'] },
  { countryCode: 'IN', countryName: 'India', region: 'apac', currencyCode: 'INR', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['upi'] },
];

// =============================================================================
// ADAPTER
// =============================================================================

export class StripeInternationalAdapter implements InternationalPaymentsAdapter {
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'stripe_international',
    name: 'Stripe International Payments',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    this.baseUrl = Deno.env.get('STRIPE_BASE_URL') ?? 'https://api.stripe.com/v1';
    this.sandbox = !this.secretKey;
  }

  private async request<T>(method: string, path: string, body?: Record<string, string>): Promise<T> {
    if (this.sandbox) {
      throw new Error('Stripe International adapter in sandbox mode — secret key not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.secretKey}`,
    };

    let requestBody: string | undefined;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = new URLSearchParams(body).toString();
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: requestBody,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Stripe API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/balance');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async getCoverage(request: GetCoverageRequest): Promise<GetCoverageResponse> {
    let countries = STRIPE_ISSUING_COUNTRIES;
    if (request.region) {
      countries = countries.filter(c => c.region === request.region);
    }
    return { countries, total: countries.length };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().getFXQuote(request);
    }

    const rates = await this.request<StripeExchangeRate>('GET', `/exchange_rates/${request.fromCurrency.toLowerCase()}`);
    const rate = rates.rates[request.toCurrency.toLowerCase()] ?? 1;
    const fromAmount = request.fromAmountCents ?? 100000;
    const toAmount = Math.round(fromAmount * rate);
    const feeCents = Math.max(Math.round(fromAmount * 0.005), 100);

    return {
      quoteId: `fxq_stripe_${Date.now()}`,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
      exchangeRate: rate,
      inverseRate: 1 / rate,
      fromAmountCents: fromAmount,
      toAmountCents: toAmount,
      feeAmountCents: feeCents,
      feeCurrency: request.fromCurrency,
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    };
  }

  async createPayment(request: CreatePaymentRequest): Promise<InternationalPayment> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().createPayment(request);
    }

    const { payment } = request;
    const response = await this.request<StripePaymentIntent>('POST', '/payment_intents', {
      amount: String(payment.amountCents),
      currency: payment.fromCurrency.toLowerCase(),
      description: payment.reference ?? 'International payment',
      'metadata[beneficiary_name]': payment.beneficiaryName,
      'metadata[beneficiary_country]': payment.beneficiaryCountry,
      'metadata[to_currency]': payment.toCurrency,
      'metadata[from_account]': payment.fromAccountId,
      confirm: 'true',
      payment_method_types: 'card',
    });

    return {
      paymentId: response.id,
      fromAccountId: payment.fromAccountId,
      fromCurrency: payment.fromCurrency,
      fromAmountCents: response.amount,
      toCurrency: payment.toCurrency,
      toAmountCents: response.amount, // Will be converted
      exchangeRate: 1, // Set after conversion
      feeAmountCents: Math.round(response.amount * 0.005),
      feeCurrency: payment.fromCurrency,
      rail: payment.rail ?? 'swift',
      status: mapStripePaymentStatus(response.status),
      beneficiaryName: payment.beneficiaryName,
      beneficiaryCountry: payment.beneficiaryCountry,
      beneficiaryAccountMasked: `****${payment.beneficiaryAccountNumber.slice(-4)}`,
      swiftBic: payment.swiftBic,
      iban: payment.iban,
      reference: payment.reference,
      estimatedArrival: new Date(Date.now() + 2 * 86400000).toISOString(),
      completedAt: response.status === 'succeeded' ? epochToISO(response.created) : null,
      createdAt: epochToISO(response.created),
    };
  }

  async getPayment(request: GetPaymentRequest): Promise<InternationalPayment> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().getPayment(request);
    }

    const pi = await this.request<StripePaymentIntent>('GET', `/payment_intents/${request.paymentId}`);
    return {
      paymentId: pi.id,
      fromAccountId: pi.metadata.from_account ?? '',
      fromCurrency: pi.currency.toUpperCase(),
      fromAmountCents: pi.amount,
      toCurrency: (pi.metadata.to_currency ?? pi.currency).toUpperCase(),
      toAmountCents: pi.amount,
      exchangeRate: 1,
      feeAmountCents: Math.round(pi.amount * 0.005),
      feeCurrency: pi.currency.toUpperCase(),
      rail: 'swift',
      status: mapStripePaymentStatus(pi.status),
      beneficiaryName: pi.metadata.beneficiary_name ?? '',
      beneficiaryCountry: pi.metadata.beneficiary_country ?? '',
      beneficiaryAccountMasked: '****0000',
      reference: pi.description,
      estimatedArrival: new Date(pi.created * 1000 + 2 * 86400000).toISOString(),
      completedAt: pi.status === 'succeeded' ? epochToISO(pi.created) : null,
      createdAt: epochToISO(pi.created),
    };
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().listPayments(request);
    }

    const limit = request.limit ?? 50;
    let path = `/payment_intents?limit=${limit}`;
    if (request.fromDate) path += `&created[gte]=${Math.floor(new Date(request.fromDate).getTime() / 1000)}`;
    if (request.toDate) path += `&created[lte]=${Math.floor(new Date(request.toDate).getTime() / 1000)}`;

    const response = await this.request<{ data: StripePaymentIntent[] }>('GET', path);

    return {
      payments: response.data.map(pi => ({
        paymentId: pi.id,
        fromAccountId: pi.metadata.from_account ?? '',
        fromCurrency: pi.currency.toUpperCase(),
        fromAmountCents: pi.amount,
        toCurrency: (pi.metadata.to_currency ?? pi.currency).toUpperCase(),
        toAmountCents: pi.amount,
        exchangeRate: 1,
        feeAmountCents: Math.round(pi.amount * 0.005),
        feeCurrency: pi.currency.toUpperCase(),
        rail: 'swift' as const,
        status: mapStripePaymentStatus(pi.status),
        beneficiaryName: pi.metadata.beneficiary_name ?? '',
        beneficiaryCountry: pi.metadata.beneficiary_country ?? '',
        beneficiaryAccountMasked: '****0000',
        reference: pi.description,
        estimatedArrival: epochToISO(pi.created + 172800),
        completedAt: pi.status === 'succeeded' ? epochToISO(pi.created) : null,
        createdAt: epochToISO(pi.created),
      })),
      total: response.data.length,
    };
  }

  async issueGlobalCard(request: IssueGlobalCardRequest): Promise<GlobalIssuedCard> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().issueGlobalCard(request);
    }

    const { card } = request;
    const response = await this.request<StripeIssuingCard>('POST', '/issuing/cards', {
      type: card.type,
      currency: card.currency.toLowerCase(),
      'spending_controls[spending_limits][0][amount]': String(card.spendLimitCents),
      'spending_controls[spending_limits][0][interval]': card.spendLimitInterval,
      'metadata[country]': card.country,
      'metadata[cardholder_name]': card.cardholderName,
    });

    return {
      cardId: response.id,
      type: response.type === 'physical' ? 'physical' : 'virtual',
      status: mapStripeCardStatus(response.status),
      lastFour: response.last4,
      cardholderName: response.cardholder.name,
      currency: response.currency.toUpperCase(),
      country: card.country,
      spendLimitCents: response.spending_controls.spending_limits[0]?.amount ?? card.spendLimitCents,
      spendLimitInterval: card.spendLimitInterval,
      totalSpentCents: 0,
      network: response.brand === 'mastercard' ? 'mastercard' : 'visa',
      expirationMonth: response.exp_month,
      expirationYear: response.exp_year,
      metadata: response.metadata,
      createdAt: epochToISO(response.created),
    };
  }

  async listGlobalCards(request: ListGlobalCardsRequest): Promise<ListGlobalCardsResponse> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().listGlobalCards(request);
    }

    const limit = request.limit ?? 50;
    let path = `/issuing/cards?limit=${limit}`;
    if (request.status) {
      const statusMap: Record<string, string> = { active: 'active', inactive: 'inactive', cancelled: 'canceled' };
      if (statusMap[request.status]) path += `&status=${statusMap[request.status]}`;
    }

    const response = await this.request<{ data: StripeIssuingCard[] }>('GET', path);

    return {
      cards: response.data.map(c => ({
        cardId: c.id,
        type: c.type === 'physical' ? 'physical' as const : 'virtual' as const,
        status: mapStripeCardStatus(c.status),
        lastFour: c.last4,
        cardholderName: c.cardholder.name,
        currency: c.currency.toUpperCase(),
        country: c.metadata.country ?? 'US',
        spendLimitCents: c.spending_controls.spending_limits[0]?.amount ?? 0,
        spendLimitInterval: 'monthly' as const,
        totalSpentCents: 0,
        network: c.brand === 'mastercard' ? 'mastercard' as const : 'visa' as const,
        expirationMonth: c.exp_month,
        expirationYear: c.exp_year,
        metadata: c.metadata,
        createdAt: epochToISO(c.created),
      })),
      total: response.data.length,
    };
  }

  async createPayout(request: CreatePayoutRequest): Promise<Payout> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().createPayout(request);
    }

    const { payout } = request;
    const response = await this.request<StripePayout>('POST', '/payouts', {
      amount: String(payout.amountCents),
      currency: payout.destinationCurrency.toLowerCase(),
      description: payout.reference ?? `Payout to ${payout.recipientName}`,
      'metadata[recipient_name]': payout.recipientName,
      'metadata[destination_country]': payout.destinationCountry,
    });

    return {
      payoutId: response.id,
      destinationCountry: payout.destinationCountry,
      destinationCurrency: response.currency.toUpperCase(),
      amountCents: response.amount,
      feeAmountCents: Math.round(response.amount * 0.003),
      status: mapStripePayoutStatus(response.status),
      rail: payout.rail ?? 'local_rails',
      recipientName: payout.recipientName,
      recipientAccountMasked: `****${payout.recipientAccountNumber.slice(-4)}`,
      estimatedArrival: epochToISO(response.arrival_date),
      paidAt: response.status === 'paid' ? epochToISO(response.created) : null,
      createdAt: epochToISO(response.created),
    };
  }

  async listPayouts(request: ListPayoutsRequest): Promise<ListPayoutsResponse> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().listPayouts(request);
    }

    const limit = request.limit ?? 50;
    const path = `/payouts?limit=${limit}`;
    const response = await this.request<{ data: StripePayout[] }>('GET', path);

    return {
      payouts: response.data.map(p => ({
        payoutId: p.id,
        destinationCountry: '',
        destinationCurrency: p.currency.toUpperCase(),
        amountCents: p.amount,
        feeAmountCents: Math.round(p.amount * 0.003),
        status: mapStripePayoutStatus(p.status),
        rail: 'local_rails' as const,
        recipientName: p.description ?? 'Recipient',
        recipientAccountMasked: '****0000',
        estimatedArrival: epochToISO(p.arrival_date),
        paidAt: p.status === 'paid' ? epochToISO(p.created) : null,
        createdAt: epochToISO(p.created),
      })),
      total: response.data.length,
    };
  }
}
