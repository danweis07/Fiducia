// TODO: Provisional integration — not yet validated in production.
/**
 * Ramp Card Issuing Adapter
 *
 * Integrates with Ramp — a corporate card and expense management platform
 * providing virtual and physical cards, spending policies, receipt matching,
 * and accounting integrations.
 *
 * Ramp API: https://docs.ramp.com/developer-api
 *
 * Configuration:
 *   RAMP_CLIENT_ID — OAuth client ID
 *   RAMP_CLIENT_SECRET — OAuth client secret
 *   RAMP_BASE_URL — Base URL (default: https://api.ramp.com/developer/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardIssuingAdapter,
  IssuedCard,
  IssuedCardType,
  IssuedCardStatus,
  SpendLimitInterval,
  CardTransactionStatus,
  CreateCardRequest,
  GetCardRequest,
  ListCardsRequest,
  ListCardsResponse,
  UpdateCardRequest,
  UpdateSpendingControlsRequest,
  ListCardTransactionsRequest,
  ListCardTransactionsResponse,
} from './types.ts';

// =============================================================================
// RAMP API RESPONSE TYPES
// =============================================================================

interface RampCard {
  id: string;
  display_name: string;
  last_four: string;
  cardholder_id: string;
  cardholder_name: string;
  card_program_id: string;
  is_physical: boolean;
  state: string;
  spending_restrictions: {
    amount: number;
    interval: string;
    categories: number[];
    blocked_categories: number[];
    transaction_amount_limit: number | null;
  };
  created_at: string;
  updated_at: string;
}

interface RampTransaction {
  id: string;
  card_id: string;
  amount: number;
  currency_code: string;
  merchant_id: string;
  merchant_descriptor: string;
  merchant_category_code: string;
  merchant_category_code_description: string;
  state: string;
  sk_category_id: number | null;
  sk_category_name: string | null;
  user_transaction_time: string;
  settled_at: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapRampCardStatus(state: string): IssuedCardStatus {
  switch (state) {
    case 'ACTIVE': return 'active';
    case 'SUSPENDED': return 'paused';
    case 'TERMINATED': return 'closed';
    case 'UNACTIVATED': return 'pending_activation';
    default: return 'active';
  }
}

function mapRampSpendInterval(interval: string): SpendLimitInterval {
  switch (interval) {
    case 'DAILY': return 'daily';
    case 'WEEKLY': return 'weekly';
    case 'MONTHLY': return 'monthly';
    case 'YEARLY': return 'yearly';
    case 'TOTAL': return 'all_time';
    default: return 'monthly';
  }
}

function mapRampToSpendInterval(interval: SpendLimitInterval): string {
  switch (interval) {
    case 'daily': return 'DAILY';
    case 'weekly': return 'WEEKLY';
    case 'monthly': return 'MONTHLY';
    case 'yearly': return 'YEARLY';
    case 'all_time': return 'TOTAL';
    case 'transaction': return 'TOTAL';
    default: return 'MONTHLY';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class RampCardIssuingAdapter implements CardIssuingAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  readonly config: AdapterConfig = {
    id: 'ramp',
    name: 'Ramp Card Issuing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.clientId = Deno.env.get('RAMP_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('RAMP_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('RAMP_BASE_URL') ?? 'https://api.ramp.com/developer/v1';
    this.sandbox = !this.clientId || !this.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const res = await fetch('https://api.ramp.com/developer/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'cards:read cards:write transactions:read',
      }),
    });

    if (!res.ok) throw new Error(`Ramp auth failed (${res.status})`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Ramp adapter in sandbox mode — credentials not configured');
    }

    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Ramp API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/cards?page_size=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async createCard(request: CreateCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().createCard(request);
    }

    const { card } = request;
    const response = await this.request<RampCard>('POST', '/cards', {
      display_name: card.memo ?? card.cardholderName,
      is_physical: card.type === 'physical',
      is_temporary: false,
      spending_restrictions: {
        amount: card.spendLimitCents,
        interval: mapRampToSpendInterval(card.spendLimitInterval),
      },
      fulfillment: card.type === 'physical' && card.shippingAddress ? {
        shipping: {
          recipient_first_name: card.cardholderName.split(' ')[0],
          recipient_last_name: card.cardholderName.split(' ').slice(1).join(' ') || card.cardholderName,
          address_1: card.shippingAddress.line1,
          city: card.shippingAddress.city,
          state: card.shippingAddress.state,
          postal_code: card.shippingAddress.postalCode,
          country: card.shippingAddress.country,
        },
      } : undefined,
    });

    return mapRampCard(response, card.fundingAccountId);
  }

  async getCard(request: GetCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().getCard(request);
    }

    const response = await this.request<RampCard>('GET', `/cards/${request.cardId}`);
    return mapRampCard(response, '');
  }

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().listCards(request);
    }

    const limit = request.limit ?? 50;
    const response = await this.request<{ data: RampCard[] }>('GET', `/cards?page_size=${limit}`);

    return {
      cards: response.data.map(c => mapRampCard(c, '')),
      total: response.data.length,
    };
  }

  async updateCard(request: UpdateCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().updateCard(request);
    }

    if (request.status === 'paused') {
      await this.request('POST', `/cards/${request.cardId}/deactivate`, {});
    } else if (request.status === 'closed') {
      await this.request('POST', `/cards/${request.cardId}/terminate`, {});
    } else if (request.status === 'active') {
      await this.request('POST', `/cards/${request.cardId}/reactivate`, {});
    }

    if (request.spendLimitCents !== undefined) {
      await this.request('PATCH', `/cards/${request.cardId}`, {
        spending_restrictions: {
          amount: request.spendLimitCents,
          ...(request.spendLimitInterval && { interval: mapRampToSpendInterval(request.spendLimitInterval) }),
        },
      });
    }

    return this.getCard({ userId: request.userId, tenantId: request.tenantId, cardId: request.cardId });
  }

  async updateSpendingControls(request: UpdateSpendingControlsRequest): Promise<IssuedCard> {
    return this.updateCard({
      userId: request.userId,
      tenantId: request.tenantId,
      cardId: request.cardId,
      spendLimitCents: request.controls.spendLimitCents,
      spendLimitInterval: request.controls.spendLimitInterval,
    });
  }

  async listTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().listTransactions(request);
    }

    const limit = request.limit ?? 50;
    let path = `/transactions?page_size=${limit}`;
    if (request.cardId) path += `&card_id=${request.cardId}`;
    if (request.fromDate) path += `&from_date=${request.fromDate}`;
    if (request.toDate) path += `&to_date=${request.toDate}`;

    const response = await this.request<{ data: RampTransaction[] }>('GET', path);

    return {
      transactions: response.data.map(t => ({
        transactionId: t.id,
        cardId: t.card_id,
        type: 'clearing' as const,
        amountCents: Math.round(Math.abs(t.amount) * 100),
        merchantName: t.merchant_descriptor || null,
        merchantCategory: t.sk_category_name,
        merchantCategoryCode: t.merchant_category_code || null,
        merchantCity: null,
        merchantCountry: null,
        status: (t.settled_at ? 'settled' : 'pending') as CardTransactionStatus,
        declineReason: null,
        authorizationCode: null,
        settledAt: t.settled_at,
        createdAt: t.user_transaction_time,
      })),
      total: response.data.length,
    };
  }
}

function mapRampCard(c: RampCard, fundingAccountId: string): IssuedCard {
  return {
    cardId: c.id,
    type: c.is_physical ? 'physical' as IssuedCardType : 'virtual' as IssuedCardType,
    status: mapRampCardStatus(c.state),
    network: 'visa',
    lastFour: c.last_four,
    cardholderName: c.cardholder_name,
    expirationMonth: 0,
    expirationYear: 0,
    fundingAccountId,
    spendLimitCents: c.spending_restrictions.amount,
    spendLimitInterval: mapRampSpendInterval(c.spending_restrictions.interval),
    totalSpentCents: 0,
    memo: c.display_name,
    metadata: {},
    createdAt: c.created_at,
    closedAt: c.state === 'TERMINATED' ? c.updated_at : null,
  };
}
