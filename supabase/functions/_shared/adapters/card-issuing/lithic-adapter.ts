// TODO: Provisional integration — not yet validated in production.
/**
 * Lithic Card Issuing Adapter
 *
 * Integrates with Lithic — a modern card issuing platform providing
 * virtual and physical card creation, spending controls, real-time
 * authorization, and transaction management via Visa/Mastercard networks.
 *
 * Lithic API: https://docs.lithic.com
 *
 * Configuration:
 *   LITHIC_API_KEY — API key for authentication
 *   LITHIC_BASE_URL — Base URL (default: https://api.lithic.com/v1)
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
  IssuedCardNetwork,
  SpendLimitInterval,
  CardTransactionType,
  CardTransactionStatus,
  DeclineReason,
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
// LITHIC API RESPONSE TYPES
// =============================================================================

interface LithicCard {
  token: string;
  type: string;
  state: string;
  last_four: string;
  pan: string;
  exp_month: string;
  exp_year: string;
  funding: { token: string; type: string };
  spend_limit: number;
  spend_limit_duration: string;
  memo: string | null;
  created: string;
  hostname: string;
}

interface LithicTransaction {
  token: string;
  card_token: string;
  result: string;
  amount: number;
  merchant: {
    descriptor: string;
    mcc: string;
    city: string;
    country: string;
  };
  status: string;
  events: Array<{ type: string; amount: number; created: string }>;
  created: string;
  settled_amount: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapLithicCardType(type: string): IssuedCardType {
  return type === 'PHYSICAL' ? 'physical' : 'virtual';
}

function mapLithicCardStatus(state: string): IssuedCardStatus {
  switch (state) {
    case 'OPEN': return 'active';
    case 'PAUSED': return 'paused';
    case 'CLOSED': return 'closed';
    case 'PENDING_FULFILLMENT': return 'pending_fulfillment';
    case 'PENDING_ACTIVATION': return 'pending_activation';
    default: return 'active';
  }
}

function mapLithicSpendDuration(duration: string): SpendLimitInterval {
  switch (duration) {
    case 'TRANSACTION': return 'transaction';
    case 'DAILY': return 'daily';
    case 'MONTHLY': return 'monthly';
    case 'ANNUALLY': return 'yearly';
    case 'FOREVER': return 'all_time';
    default: return 'monthly';
  }
}

function mapLithicToSpendDuration(interval: SpendLimitInterval): string {
  switch (interval) {
    case 'transaction': return 'TRANSACTION';
    case 'daily': return 'DAILY';
    case 'monthly': return 'MONTHLY';
    case 'yearly': return 'ANNUALLY';
    case 'all_time': return 'FOREVER';
    default: return 'MONTHLY';
  }
}

function mapLithicTransactionType(eventType: string): CardTransactionType {
  switch (eventType) {
    case 'AUTHORIZATION': return 'authorization';
    case 'CLEARING': return 'clearing';
    case 'RETURN': return 'refund';
    case 'VOID': return 'void';
    default: return 'authorization';
  }
}

function mapLithicTransactionStatus(result: string): CardTransactionStatus {
  switch (result) {
    case 'APPROVED': return 'pending';
    case 'DECLINED': return 'declined';
    default: return 'pending';
  }
}

function mapLithicDeclineReason(result: string): DeclineReason | null {
  if (result === 'APPROVED') return null;
  switch (result) {
    case 'CARD_PAUSED': return 'card_paused';
    case 'SPENDING_LIMIT': return 'spending_limit';
    case 'MERCHANT_BLOCKED': return 'merchant_blocked';
    case 'INSUFFICIENT_FUNDS': return 'insufficient_funds';
    default: return 'other';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class LithicCardIssuingAdapter implements CardIssuingAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'lithic',
    name: 'Lithic Card Issuing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('LITHIC_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('LITHIC_BASE_URL') ?? 'https://api.lithic.com/v1';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Lithic adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `api-key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Lithic API error (${res.status}): ${errBody}`);
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
    const response = await this.request<LithicCard>('POST', '/cards', {
      type: card.type === 'physical' ? 'PHYSICAL' : 'VIRTUAL',
      memo: card.memo,
      spend_limit: card.spendLimitCents,
      spend_limit_duration: mapLithicToSpendDuration(card.spendLimitInterval),
      shipping_address: card.shippingAddress ? {
        first_name: card.cardholderName.split(' ')[0],
        last_name: card.cardholderName.split(' ').slice(1).join(' '),
        address1: card.shippingAddress.line1,
        address2: card.shippingAddress.line2,
        city: card.shippingAddress.city,
        state: card.shippingAddress.state,
        postal_code: card.shippingAddress.postalCode,
        country: card.shippingAddress.country,
      } : undefined,
    });

    return {
      cardId: response.token,
      type: mapLithicCardType(response.type),
      status: mapLithicCardStatus(response.state),
      network: 'visa',
      lastFour: response.last_four,
      cardholderName: card.cardholderName,
      expirationMonth: parseInt(response.exp_month, 10),
      expirationYear: parseInt(response.exp_year, 10),
      fundingAccountId: response.funding.token,
      spendLimitCents: response.spend_limit,
      spendLimitInterval: mapLithicSpendDuration(response.spend_limit_duration),
      totalSpentCents: 0,
      memo: response.memo,
      metadata: card.metadata ?? {},
      createdAt: response.created,
      closedAt: null,
    };
  }

  async getCard(request: GetCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().getCard(request);
    }

    const response = await this.request<LithicCard>('GET', `/cards/${request.cardId}`);
    return {
      cardId: response.token,
      type: mapLithicCardType(response.type),
      status: mapLithicCardStatus(response.state),
      network: 'visa',
      lastFour: response.last_four,
      cardholderName: '',
      expirationMonth: parseInt(response.exp_month, 10),
      expirationYear: parseInt(response.exp_year, 10),
      fundingAccountId: response.funding.token,
      spendLimitCents: response.spend_limit,
      spendLimitInterval: mapLithicSpendDuration(response.spend_limit_duration),
      totalSpentCents: 0,
      memo: response.memo,
      metadata: {},
      createdAt: response.created,
      closedAt: null,
    };
  }

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().listCards(request);
    }

    const limit = request.limit ?? 50;
    let path = `/cards?page_size=${limit}`;
    if (request.status) {
      const stateMap: Record<string, string> = { active: 'OPEN', paused: 'PAUSED', closed: 'CLOSED' };
      if (stateMap[request.status]) path += `&state=${stateMap[request.status]}`;
    }

    const response = await this.request<{ data: LithicCard[]; total_entries: number }>('GET', path);
    return {
      cards: response.data.map(c => ({
        cardId: c.token,
        type: mapLithicCardType(c.type),
        status: mapLithicCardStatus(c.state),
        network: 'visa' as IssuedCardNetwork,
        lastFour: c.last_four,
        cardholderName: '',
        expirationMonth: parseInt(c.exp_month, 10),
        expirationYear: parseInt(c.exp_year, 10),
        fundingAccountId: c.funding.token,
        spendLimitCents: c.spend_limit,
        spendLimitInterval: mapLithicSpendDuration(c.spend_limit_duration),
        totalSpentCents: 0,
        memo: c.memo,
        metadata: {},
        createdAt: c.created,
        closedAt: null,
      })),
      total: response.total_entries,
    };
  }

  async updateCard(request: UpdateCardRequest): Promise<IssuedCard> {
    if (this.sandbox) {
      const { MockCardIssuingAdapter } = await import('./mock-adapter.ts');
      return new MockCardIssuingAdapter().updateCard(request);
    }

    const body: Record<string, unknown> = {};
    if (request.status) {
      const stateMap: Record<string, string> = { active: 'OPEN', paused: 'PAUSED', closed: 'CLOSED' };
      body.state = stateMap[request.status] ?? 'OPEN';
    }
    if (request.memo !== undefined) body.memo = request.memo;
    if (request.spendLimitCents !== undefined) body.spend_limit = request.spendLimitCents;
    if (request.spendLimitInterval) body.spend_limit_duration = mapLithicToSpendDuration(request.spendLimitInterval);

    const response = await this.request<LithicCard>('PATCH', `/cards/${request.cardId}`, body);
    return {
      cardId: response.token,
      type: mapLithicCardType(response.type),
      status: mapLithicCardStatus(response.state),
      network: 'visa',
      lastFour: response.last_four,
      cardholderName: '',
      expirationMonth: parseInt(response.exp_month, 10),
      expirationYear: parseInt(response.exp_year, 10),
      fundingAccountId: response.funding.token,
      spendLimitCents: response.spend_limit,
      spendLimitInterval: mapLithicSpendDuration(response.spend_limit_duration),
      totalSpentCents: 0,
      memo: response.memo,
      metadata: request.metadata ?? {},
      createdAt: response.created,
      closedAt: null,
    };
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
    if (request.cardId) path += `&card_token=${request.cardId}`;
    if (request.fromDate) path += `&begin=${request.fromDate}`;
    if (request.toDate) path += `&end=${request.toDate}`;

    const response = await this.request<{ data: LithicTransaction[]; total_entries: number }>('GET', path);

    return {
      transactions: response.data.map(t => ({
        transactionId: t.token,
        cardId: t.card_token,
        type: mapLithicTransactionType(t.events[0]?.type ?? 'AUTHORIZATION'),
        amountCents: Math.abs(t.amount),
        merchantName: t.merchant.descriptor || null,
        merchantCategory: null,
        merchantCategoryCode: t.merchant.mcc || null,
        merchantCity: t.merchant.city || null,
        merchantCountry: t.merchant.country || null,
        status: t.settled_amount > 0 ? 'settled' as CardTransactionStatus : mapLithicTransactionStatus(t.result),
        declineReason: mapLithicDeclineReason(t.result),
        authorizationCode: null,
        settledAt: null,
        createdAt: t.created,
      })),
      total: response.total_entries,
    };
  }
}
