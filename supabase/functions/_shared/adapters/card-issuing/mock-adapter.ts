/**
 * Mock Card Issuing Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardIssuingAdapter,
  IssuedCard,
  CardTransaction,
  CreateCardRequest,
  GetCardRequest,
  ListCardsRequest,
  ListCardsResponse,
  UpdateCardRequest,
  UpdateSpendingControlsRequest,
  ListCardTransactionsRequest,
  ListCardTransactionsResponse,
} from './types.ts';

export class MockCardIssuingAdapter implements CardIssuingAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-card-issuing',
    name: 'Mock Card Issuing',
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

  async createCard(request: CreateCardRequest): Promise<IssuedCard> {
    return {
      cardId: `card_mock_${Date.now()}`,
      type: request.card.type,
      status: request.card.type === 'virtual' ? 'active' : 'pending_fulfillment',
      network: 'visa',
      lastFour: String(Math.floor(1000 + Math.random() * 9000)),
      cardholderName: request.card.cardholderName,
      expirationMonth: 12,
      expirationYear: 2028,
      fundingAccountId: request.card.fundingAccountId,
      spendLimitCents: request.card.spendLimitCents,
      spendLimitInterval: request.card.spendLimitInterval,
      totalSpentCents: 0,
      memo: request.card.memo ?? null,
      metadata: request.card.metadata ?? {},
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
  }

  async getCard(request: GetCardRequest): Promise<IssuedCard> {
    const { cards } = await this.listCards({ userId: request.userId, tenantId: request.tenantId });
    const card = cards.find(c => c.cardId === request.cardId);
    if (!card) throw new Error(`Card ${request.cardId} not found`);
    return card;
  }

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    const cards: IssuedCard[] = [
      {
        cardId: 'card_mock_virtual_1',
        type: 'virtual',
        status: 'active',
        network: 'visa',
        lastFour: '9012',
        cardholderName: 'JOHN DOE',
        expirationMonth: 12,
        expirationYear: 2028,
        fundingAccountId: 'acct_mock_1',
        spendLimitCents: 500000,
        spendLimitInterval: 'monthly',
        totalSpentCents: 125000,
        memo: 'SaaS Subscriptions',
        metadata: {},
        createdAt: '2024-03-01T00:00:00Z',
        closedAt: null,
      },
      {
        cardId: 'card_mock_physical_1',
        type: 'physical',
        status: 'active',
        network: 'mastercard',
        lastFour: '3456',
        cardholderName: 'JOHN DOE',
        expirationMonth: 6,
        expirationYear: 2027,
        fundingAccountId: 'acct_mock_1',
        spendLimitCents: 1000000,
        spendLimitInterval: 'monthly',
        totalSpentCents: 342500,
        memo: 'Travel Card',
        metadata: {},
        createdAt: '2024-01-15T00:00:00Z',
        closedAt: null,
      },
    ];

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { cards: cards.slice(offset, offset + limit), total: cards.length };
  }

  async updateCard(request: UpdateCardRequest): Promise<IssuedCard> {
    const card = await this.getCard({ userId: request.userId, tenantId: request.tenantId, cardId: request.cardId });
    return {
      ...card,
      status: request.status ?? card.status,
      memo: request.memo ?? card.memo,
      spendLimitCents: request.spendLimitCents ?? card.spendLimitCents,
      spendLimitInterval: request.spendLimitInterval ?? card.spendLimitInterval,
      metadata: request.metadata ?? card.metadata,
    };
  }

  async updateSpendingControls(request: UpdateSpendingControlsRequest): Promise<IssuedCard> {
    const card = await this.getCard({ userId: request.userId, tenantId: request.tenantId, cardId: request.cardId });
    return {
      ...card,
      spendLimitCents: request.controls.spendLimitCents ?? card.spendLimitCents,
      spendLimitInterval: request.controls.spendLimitInterval ?? card.spendLimitInterval,
    };
  }

  async listTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse> {
    const now = new Date();
    const transactions: CardTransaction[] = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return {
        transactionId: `ctxn_mock_${i + 1}`,
        cardId: request.cardId ?? 'card_mock_virtual_1',
        type: 'clearing' as const,
        amountCents: (i + 1) * 2500,
        merchantName: ['Amazon', 'Uber', 'Slack', 'GitHub', 'AWS'][i],
        merchantCategory: 'technology',
        merchantCategoryCode: '5734',
        merchantCity: 'San Francisco',
        merchantCountry: 'US',
        status: 'settled' as const,
        declineReason: null,
        authorizationCode: `AUTH${i}`,
        settledAt: date.toISOString(),
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { transactions: transactions.slice(offset, offset + limit), total: transactions.length };
  }
}
