// TODO: Provisional integration — not yet validated in production.
/**
 * Marqeta International Payments Adapter
 *
 * Integrates with Marqeta's Just-in-Time (JIT) card issuing platform.
 * Marqeta specializes in programmable card issuing with real-time
 * transaction control at the point of swipe.
 *
 * Coverage: US, UK, Europe, APAC (Australia/Singapore)
 *
 * Best fit for the "Persona Engine" where you need to control exactly
 * how a card is funded in real-time via JIT funding webhooks.
 *
 * APIs used:
 *   - Cards: Virtual/physical card creation and management
 *   - JIT Funding: Real-time authorization decisions
 *   - Transactions: Transaction history and management
 *   - GPA (General Purpose Account): Funding source management
 *
 * Configuration:
 *   MARQETA_APP_TOKEN — Application token
 *   MARQETA_ACCESS_TOKEN — Access token for auth
 *   MARQETA_BASE_URL — Base URL (default: https://sandbox-api.marqeta.com/v3)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalPaymentsAdapter,
  InternationalPayment,
  FXQuote,
  GlobalIssuedCard,
  GlobalCardStatus,
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
  CountryCoverage,
} from './types.ts';

// =============================================================================
// MARQETA API RESPONSE TYPES
// =============================================================================

interface MarqetaCard {
  token: string;
  card_product_token: string;
  last_four: string;
  state: string;
  state_reason: string;
  fulfillment_status: string;
  instrument_type: string;
  pan: string;
  expiration: string;
  expiration_time: string;
  user_token: string;
  created_time: string;
  metadata: Record<string, string>;
}

interface _MarqetaTransaction {
  token: string;
  type: string;
  state: string;
  amount: number;
  currency_code: string;
  card_token: string;
  merchant: {
    name: string;
    city: string;
    country: string;
    mcc: string;
  };
  created_time: string;
  user_transaction_time: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapMarqetaCardStatus(state: string): GlobalCardStatus {
  switch (state) {
    case 'ACTIVE': return 'active';
    case 'SUSPENDED': return 'frozen';
    case 'TERMINATED': return 'cancelled';
    case 'UNACTIVATED': return 'pending';
    default: return 'inactive';
  }
}

const MARQETA_COVERAGE: CountryCoverage[] = [
  { countryCode: 'US', countryName: 'United States', region: 'us', currencyCode: 'USD', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
  { countryCode: 'GB', countryName: 'United Kingdom', region: 'uk', currencyCode: 'GBP', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
  { countryCode: 'DE', countryName: 'Germany', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
  { countryCode: 'FR', countryName: 'France', region: 'eu', currencyCode: 'EUR', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
  { countryCode: 'AU', countryName: 'Australia', region: 'apac', currencyCode: 'AUD', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
  { countryCode: 'SG', countryName: 'Singapore', region: 'apac', currencyCode: 'SGD', supportsPaymentAcceptance: false, supportsCardIssuing: true, supportsPayouts: false, localPaymentMethods: [] },
];

// =============================================================================
// ADAPTER
// =============================================================================

export class MarqetaInternationalAdapter implements InternationalPaymentsAdapter {
  private readonly appToken: string;
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'marqeta',
    name: 'Marqeta JIT Card Issuing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.appToken = Deno.env.get('MARQETA_APP_TOKEN') ?? '';
    this.accessToken = Deno.env.get('MARQETA_ACCESS_TOKEN') ?? '';
    this.baseUrl = Deno.env.get('MARQETA_BASE_URL') ?? 'https://sandbox-api.marqeta.com/v3';
    this.sandbox = !this.appToken || !this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Marqeta adapter in sandbox mode — credentials not configured');
    }

    const auth = btoa(`${this.appToken}:${this.accessToken}`);
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Marqeta API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/ping');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async getCoverage(request: GetCoverageRequest): Promise<GetCoverageResponse> {
    let countries = MARQETA_COVERAGE;
    if (request.region) {
      countries = countries.filter(c => c.region === request.region);
    }
    return { countries, total: countries.length };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    // Marqeta doesn't natively provide FX — delegate to mock for sandbox
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().getFXQuote(request);
  }

  async createPayment(request: CreatePaymentRequest): Promise<InternationalPayment> {
    // Marqeta is primarily a card issuing platform, not a payment rail
    // Delegate cross-border payments to mock/fallback
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().createPayment(request);
  }

  async getPayment(request: GetPaymentRequest): Promise<InternationalPayment> {
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().getPayment(request);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().listPayments(request);
  }

  async issueGlobalCard(request: IssueGlobalCardRequest): Promise<GlobalIssuedCard> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().issueGlobalCard(request);
    }

    const { card } = request;
    const response = await this.request<MarqetaCard>('POST', '/cards', {
      card_product_token: `cp_${card.country.toLowerCase()}_${card.currency.toLowerCase()}`,
      user_token: request.userId,
      metadata: {
        cardholder_name: card.cardholderName,
        country: card.country,
        currency: card.currency,
        ...card.metadata,
      },
    });

    const expParts = response.expiration.split('/');
    return {
      cardId: response.token,
      type: response.instrument_type === 'PHYSICAL_MSR' || response.instrument_type === 'PHYSICAL_ICC' ? 'physical' : 'virtual',
      status: mapMarqetaCardStatus(response.state),
      lastFour: response.last_four,
      cardholderName: card.cardholderName,
      currency: card.currency,
      country: card.country,
      spendLimitCents: card.spendLimitCents,
      spendLimitInterval: card.spendLimitInterval,
      totalSpentCents: 0,
      network: 'visa',
      expirationMonth: parseInt(expParts[0] ?? '12', 10),
      expirationYear: parseInt(expParts[1] ?? '2029', 10),
      metadata: response.metadata,
      createdAt: response.created_time,
    };
  }

  async listGlobalCards(request: ListGlobalCardsRequest): Promise<ListGlobalCardsResponse> {
    if (this.sandbox) {
      const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalPaymentsAdapter().listGlobalCards(request);
    }

    const limit = request.limit ?? 50;
    const response = await this.request<{ data: MarqetaCard[]; count: number }>('GET', `/cards/user/${request.userId}?count=${limit}`);

    return {
      cards: response.data.map(c => {
        const expParts = c.expiration.split('/');
        return {
          cardId: c.token,
          type: c.instrument_type === 'PHYSICAL_MSR' || c.instrument_type === 'PHYSICAL_ICC' ? 'physical' as const : 'virtual' as const,
          status: mapMarqetaCardStatus(c.state),
          lastFour: c.last_four,
          cardholderName: c.metadata.cardholder_name ?? '',
          currency: c.metadata.currency ?? 'USD',
          country: c.metadata.country ?? 'US',
          spendLimitCents: 0,
          spendLimitInterval: 'monthly' as const,
          totalSpentCents: 0,
          network: 'visa' as const,
          expirationMonth: parseInt(expParts[0] ?? '12', 10),
          expirationYear: parseInt(expParts[1] ?? '2029', 10),
          metadata: c.metadata,
          createdAt: c.created_time,
        };
      }),
      total: response.count,
    };
  }

  async createPayout(request: CreatePayoutRequest): Promise<Payout> {
    // Marqeta doesn't support direct payouts — delegate to mock
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().createPayout(request);
  }

  async listPayouts(request: ListPayoutsRequest): Promise<ListPayoutsResponse> {
    const { MockInternationalPaymentsAdapter } = await import('./mock-adapter.ts');
    return new MockInternationalPaymentsAdapter().listPayouts(request);
  }
}
