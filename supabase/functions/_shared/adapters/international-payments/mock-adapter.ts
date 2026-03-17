/**
 * Mock International Payments Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalPaymentsAdapter,
  CountryCoverage,
  InternationalPayment,
  FXQuote,
  GlobalIssuedCard,
  Payout,
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
} from './types.ts';

const MOCK_COUNTRIES: CountryCoverage[] = [
  { countryCode: 'US', countryName: 'United States', region: 'us', currencyCode: 'USD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['ach', 'wire'] },
  { countryCode: 'GB', countryName: 'United Kingdom', region: 'uk', currencyCode: 'GBP', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['faster_payments', 'bacs'] },
  { countryCode: 'DE', countryName: 'Germany', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['sepa', 'sepa_instant'] },
  { countryCode: 'FR', countryName: 'France', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['sepa', 'sepa_instant'] },
  { countryCode: 'SG', countryName: 'Singapore', region: 'apac', currencyCode: 'SGD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['paynow'] },
  { countryCode: 'AU', countryName: 'Australia', region: 'apac', currencyCode: 'AUD', supportsPaymentAcceptance: true, supportsCardIssuing: true, supportsPayouts: true, localPaymentMethods: ['npp'] },
  { countryCode: 'JP', countryName: 'Japan', region: 'apac', currencyCode: 'JPY', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['zengin'] },
  { countryCode: 'BR', countryName: 'Brazil', region: 'latam', currencyCode: 'BRL', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['pix'] },
  { countryCode: 'MX', countryName: 'Mexico', region: 'latam', currencyCode: 'MXN', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['spei'] },
  { countryCode: 'IN', countryName: 'India', region: 'apac', currencyCode: 'INR', supportsPaymentAcceptance: true, supportsCardIssuing: false, supportsPayouts: true, localPaymentMethods: ['upi', 'imps'] },
];

const MOCK_FX_RATES: Record<string, number> = {
  'USD_EUR': 0.92, 'EUR_USD': 1.087, 'USD_GBP': 0.79, 'GBP_USD': 1.266,
  'USD_JPY': 149.5, 'JPY_USD': 0.00669, 'USD_SGD': 1.34, 'SGD_USD': 0.746,
  'USD_AUD': 1.53, 'AUD_USD': 0.654, 'USD_BRL': 4.97, 'BRL_USD': 0.201,
  'USD_MXN': 17.15, 'MXN_USD': 0.0583, 'USD_INR': 83.12, 'INR_USD': 0.01203,
  'EUR_GBP': 0.858, 'GBP_EUR': 1.166,
};

export class MockInternationalPaymentsAdapter implements InternationalPaymentsAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-international-payments',
    name: 'Mock International Payments',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async getCoverage(request: GetCoverageRequest): Promise<GetCoverageResponse> {
    let countries = MOCK_COUNTRIES;
    if (request.region) {
      countries = countries.filter(c => c.region === request.region);
    }
    return { countries, total: countries.length };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    const key = `${request.fromCurrency}_${request.toCurrency}`;
    const rate = MOCK_FX_RATES[key] ?? 1.0;
    const fromAmount = request.fromAmountCents ?? 100000;
    const toAmount = request.toAmountCents ?? Math.round(fromAmount * rate);
    const feeCents = Math.max(Math.round(fromAmount * 0.005), 100);

    return {
      quoteId: `fxq_mock_${Date.now()}`,
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
    const { payment } = request;
    const key = `${payment.fromCurrency}_${payment.toCurrency}`;
    const rate = MOCK_FX_RATES[key] ?? 1.0;
    const toAmount = Math.round(payment.amountCents * rate);
    const feeCents = Math.max(Math.round(payment.amountCents * 0.005), 100);

    return {
      paymentId: `intl_mock_${Date.now()}`,
      fromAccountId: payment.fromAccountId,
      fromCurrency: payment.fromCurrency,
      fromAmountCents: payment.amountCents,
      toCurrency: payment.toCurrency,
      toAmountCents: toAmount,
      exchangeRate: rate,
      feeAmountCents: feeCents,
      feeCurrency: payment.fromCurrency,
      rail: payment.rail ?? 'swift',
      status: 'processing',
      beneficiaryName: payment.beneficiaryName,
      beneficiaryCountry: payment.beneficiaryCountry,
      beneficiaryAccountMasked: `****${payment.beneficiaryAccountNumber.slice(-4)}`,
      swiftBic: payment.swiftBic,
      iban: payment.iban,
      reference: payment.reference,
      estimatedArrival: new Date(Date.now() + 2 * 86400000).toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async getPayment(request: GetPaymentRequest): Promise<InternationalPayment> {
    return {
      paymentId: request.paymentId,
      fromAccountId: 'acct_mock_1',
      fromCurrency: 'USD',
      fromAmountCents: 500000,
      toCurrency: 'EUR',
      toAmountCents: 460000,
      exchangeRate: 0.92,
      feeAmountCents: 2500,
      feeCurrency: 'USD',
      rail: 'swift',
      status: 'completed',
      beneficiaryName: 'Hans Mueller',
      beneficiaryCountry: 'DE',
      beneficiaryAccountMasked: '****7890',
      swiftBic: 'DEUTDEFF',
      reference: 'INV-2026-001',
      estimatedArrival: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    };
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const now = new Date();
    const payments: InternationalPayment[] = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 3);
      const statuses: InternationalPayment['status'][] = ['completed', 'processing', 'completed', 'pending', 'completed'];
      const currencies = ['EUR', 'GBP', 'JPY', 'SGD', 'AUD'];
      const names = ['Hans Mueller', 'James Smith', 'Tanaka Yuki', 'Chen Wei', 'Sarah Brown'];
      const countries = ['DE', 'GB', 'JP', 'SG', 'AU'];
      return {
        paymentId: `intl_mock_${i + 1}`,
        fromAccountId: 'acct_mock_1',
        fromCurrency: 'USD',
        fromAmountCents: (i + 1) * 250000,
        toCurrency: currencies[i],
        toAmountCents: Math.round((i + 1) * 250000 * (MOCK_FX_RATES[`USD_${currencies[i]}`] ?? 1)),
        exchangeRate: MOCK_FX_RATES[`USD_${currencies[i]}`] ?? 1,
        feeAmountCents: Math.max((i + 1) * 1250, 100),
        feeCurrency: 'USD',
        rail: 'swift' as const,
        status: statuses[i],
        beneficiaryName: names[i],
        beneficiaryCountry: countries[i],
        beneficiaryAccountMasked: `****${1000 + i}`,
        reference: `PAY-${2026}-${100 + i}`,
        estimatedArrival: new Date(date.getTime() + 2 * 86400000).toISOString(),
        completedAt: statuses[i] === 'completed' ? date.toISOString() : null,
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { payments: payments.slice(offset, offset + limit), total: payments.length };
  }

  async issueGlobalCard(request: IssueGlobalCardRequest): Promise<GlobalIssuedCard> {
    const { card } = request;
    return {
      cardId: `gcard_mock_${Date.now()}`,
      type: card.type,
      status: card.type === 'virtual' ? 'active' : 'pending',
      lastFour: String(Math.floor(1000 + Math.random() * 9000)),
      cardholderName: card.cardholderName,
      currency: card.currency,
      country: card.country,
      spendLimitCents: card.spendLimitCents,
      spendLimitInterval: card.spendLimitInterval,
      totalSpentCents: 0,
      network: 'visa',
      expirationMonth: 12,
      expirationYear: 2029,
      metadata: card.metadata ?? {},
      createdAt: new Date().toISOString(),
    };
  }

  async listGlobalCards(request: ListGlobalCardsRequest): Promise<ListGlobalCardsResponse> {
    const cards: GlobalIssuedCard[] = [
      {
        cardId: 'gcard_mock_1',
        type: 'virtual',
        status: 'active',
        lastFour: '4521',
        cardholderName: 'JOHN DOE',
        currency: 'EUR',
        country: 'DE',
        spendLimitCents: 1000000,
        spendLimitInterval: 'monthly',
        totalSpentCents: 234500,
        network: 'visa',
        expirationMonth: 6,
        expirationYear: 2029,
        metadata: {},
        createdAt: '2026-01-15T00:00:00Z',
      },
      {
        cardId: 'gcard_mock_2',
        type: 'physical',
        status: 'active',
        lastFour: '8734',
        cardholderName: 'JOHN DOE',
        currency: 'GBP',
        country: 'GB',
        spendLimitCents: 500000,
        spendLimitInterval: 'monthly',
        totalSpentCents: 156200,
        network: 'mastercard',
        expirationMonth: 3,
        expirationYear: 2028,
        metadata: {},
        createdAt: '2025-11-01T00:00:00Z',
      },
    ];

    let filtered = cards;
    if (request.status) filtered = filtered.filter(c => c.status === request.status);
    if (request.country) filtered = filtered.filter(c => c.country === request.country);

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { cards: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async createPayout(request: CreatePayoutRequest): Promise<Payout> {
    const { payout } = request;
    const feeCents = Math.max(Math.round(payout.amountCents * 0.003), 50);
    return {
      payoutId: `po_mock_${Date.now()}`,
      destinationCountry: payout.destinationCountry,
      destinationCurrency: payout.destinationCurrency,
      amountCents: payout.amountCents,
      feeAmountCents: feeCents,
      status: 'pending',
      rail: payout.rail ?? 'local_rails',
      recipientName: payout.recipientName,
      recipientAccountMasked: `****${payout.recipientAccountNumber.slice(-4)}`,
      estimatedArrival: new Date(Date.now() + 86400000).toISOString(),
      paidAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async listPayouts(request: ListPayoutsRequest): Promise<ListPayoutsResponse> {
    const now = new Date();
    const payouts: Payout[] = Array.from({ length: 3 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i * 5);
      return {
        payoutId: `po_mock_${i + 1}`,
        destinationCountry: ['GB', 'DE', 'SG'][i],
        destinationCurrency: ['GBP', 'EUR', 'SGD'][i],
        amountCents: (i + 1) * 100000,
        feeAmountCents: (i + 1) * 300,
        status: i === 0 ? 'in_transit' as const : 'paid' as const,
        rail: 'local_rails' as const,
        recipientName: ['James Smith', 'Hans Mueller', 'Chen Wei'][i],
        recipientAccountMasked: `****${2000 + i}`,
        estimatedArrival: new Date(date.getTime() + 86400000).toISOString(),
        paidAt: i > 0 ? date.toISOString() : null,
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { payouts: payouts.slice(offset, offset + limit), total: payouts.length };
  }
}
