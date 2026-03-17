// TODO: Provisional integration — not yet validated in production.
/**
 * Brex Card Issuing Adapter
 *
 * Integrates with Brex — a corporate card and spend management platform
 * providing virtual and physical cards, spending controls, and real-time
 * expense tracking for businesses.
 *
 * Brex API: https://developer.brex.com
 *
 * Configuration:
 *   BREX_API_TOKEN — API token for authentication
 *   BREX_BASE_URL — Base URL (default: https://platform.brexapis.com)
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
// BREX API RESPONSE TYPES
// =============================================================================

interface BrexCard {
  id: string;
  owner: { type: string; user_id: string };
  status: string;
  last_four: string;
  card_name: string;
  card_type: string;
  limit_type: string;
  spend_controls: {
    spend_limit: { amount: number; currency: string };
    spend_duration: string;
    lock_after_date: string | null;
  };
  billing_address: { line1: string; city: string; state: string; postal_code: string; country: string } | null;
  mailing_address: { line1: string; city: string; state: string; postal_code: string; country: string } | null;
  metadata: Record<string, string> | null;
}

interface BrexTransaction {
  id: string;
  card_id: string;
  amount: { amount: number; currency: string };
  merchant: {
    raw_descriptor: string;
    mcc: string;
    city: string | null;
    country: string | null;
  };
  initiated_at_date: string;
  posted_at_date: string | null;
  type: string;
  card_metadata: Record<string, string> | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapBrexCardType(cardType: string): IssuedCardType {
  return cardType === 'PHYSICAL' ? 'physical' : 'virtual';
}

function mapBrexCardStatus(status: string): IssuedCardStatus {
  switch (status) {
    case 'ACTIVE': return 'active';
    case 'LOCKED': return 'paused';
    case 'TERMINATED': return 'closed';
    case 'SHIPPED': return 'pending_activation';
    default: return 'active';
  }
}

function mapBrexSpendDuration(duration: string): SpendLimitInterval {
  switch (duration) {
    case 'ONE_TIME': return 'all_time';
    case 'DAILY': return 'daily';
    case 'WEEKLY': return 'weekly';
    case 'MONTHLY': return 'monthly';
    case 'YEARLY': return 'yearly';
    default: return 'monthly';
  }
}

function mapBrexToSpendDuration(interval: SpendLimitInterval): string {
  switch (interval) {
    case 'all_time': return 'ONE_TIME';
    case 'daily': return 'DAILY';
    case 'weekly': return 'WEEKLY';
    case 'monthly': return 'MONTHLY';
    case 'yearly': return 'YEARLY';
    case 'transaction': return 'ONE_TIME';
    default: return 'MONTHLY';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class BrexCardIssuingAdapter implements CardIssuingAdapter {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'brex',
    name: 'Brex Card Issuing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiToken = Deno.env.get('BREX_API_TOKEN') ?? '';
    this.baseUrl = Deno.env.get('BREX_BASE_URL') ?? 'https://platform.brexapis.com';
    this.sandbox = !this.apiToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Brex adapter in sandbox mode — API token not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Brex API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/v2/cards?limit=1');
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
    const response = await this.request<BrexCard>('POST', '/v2/cards', {
      owner: { type: 'USER', user_id: request.userId },
      card_name: card.memo ?? card.cardholderName,
      card_type: card.type === 'physical' ? 'PHYSICAL' : 'VIRTUAL',
      spend_controls: {
        spend_limit: { amount: card.spendLimitCents, currency: 'USD' },
        spend_duration: mapBrexToSpendDuration(card.spendLimitInterval),
      },
      mailing_address: card.shippingAddress ? {
        line1: card.shippingAddress.line1,
        city: card.shippingAddress.city,
        state: card.shippingAddress.state,
        postal_code: card.shippingAddress.postalCode,
        country: card.shippingAddress.country,
      } : undefined,
      metadata: card.metadata,
    });

    return mapBrexCard(response, card.cardholderName, card.fundingAccountId);
  }

  async getCard(request: GetCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().getCard(request);
    }

    const response = await this.request<BrexCard>('GET', `/v2/cards/${request.cardId}`);
    return mapBrexCard(response, '', '');
  }

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().listCards(request);
    }

    const limit = request.limit ?? 50;
    const response = await this.request<{ items: BrexCard[] }>('GET', `/v2/cards?limit=${limit}&user_id=${request.userId}`);

    return {
      cards: response.items.map(c => mapBrexCard(c, '', '')),
      total: response.items.length,
    };
  }

  async updateCard(request: UpdateCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().updateCard(request);
    }

    if (request.status === 'paused') {
      await this.request('POST', `/v2/cards/${request.cardId}/lock`, {});
    } else if (request.status === 'active') {
      await this.request('POST', `/v2/cards/${request.cardId}/unlock`, {});
    } else if (request.status === 'closed') {
      await this.request('POST', `/v2/cards/${request.cardId}/terminate`, {});
    }

    if (request.spendLimitCents !== undefined || request.spendLimitInterval) {
      const body: Record<string, unknown> = {};
      if (request.spendLimitCents !== undefined) {
        body.spend_controls = {
          spend_limit: { amount: request.spendLimitCents, currency: 'USD' },
          ...(request.spendLimitInterval && { spend_duration: mapBrexToSpendDuration(request.spendLimitInterval) }),
        };
      }
      await this.request('PUT', `/v2/cards/${request.cardId}`, body);
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
    let path = `/v2/transactions/card/primary?limit=${limit}`;
    if (request.fromDate) path += `&posted_at_start=${request.fromDate}`;

    const response = await this.request<{ items: BrexTransaction[] }>('GET', path);

    const filtered = request.cardId
      ? response.items.filter(t => t.card_id === request.cardId)
      : response.items;

    return {
      transactions: filtered.map(t => ({
        transactionId: t.id,
        cardId: t.card_id,
        type: 'clearing' as const,
        amountCents: Math.abs(t.amount.amount),
        merchantName: t.merchant.raw_descriptor || null,
        merchantCategory: null,
        merchantCategoryCode: t.merchant.mcc || null,
        merchantCity: t.merchant.city,
        merchantCountry: t.merchant.country,
        status: (t.posted_at_date ? 'settled' : 'pending') as CardTransactionStatus,
        declineReason: null,
        authorizationCode: null,
        settledAt: t.posted_at_date,
        createdAt: t.initiated_at_date,
      })),
      total: filtered.length,
    };
  }
}

function mapBrexCard(c: BrexCard, cardholderName: string, fundingAccountId: string): IssuedCard {
  return {
    cardId: c.id,
    type: mapBrexCardType(c.card_type),
    status: mapBrexCardStatus(c.status),
    network: 'mastercard',
    lastFour: c.last_four,
    cardholderName: cardholderName || c.card_name,
    expirationMonth: 0,
    expirationYear: 0,
    fundingAccountId,
    spendLimitCents: c.spend_controls.spend_limit.amount,
    spendLimitInterval: mapBrexSpendDuration(c.spend_controls.spend_duration),
    totalSpentCents: 0,
    memo: c.card_name,
    metadata: c.metadata ?? {},
    createdAt: new Date().toISOString(),
    closedAt: c.status === 'TERMINATED' ? new Date().toISOString() : null,
  };
}
