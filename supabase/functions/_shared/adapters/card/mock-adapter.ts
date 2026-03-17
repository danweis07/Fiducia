/**
 * Mock Card Adapter
 *
 * Returns synthetic card data for sandbox/testing when no
 * card processor credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardAdapter,
  Card,
  CardStatus,
  CardTransaction,
  ListCardsRequest,
  ListCardsResponse,
  GetCardRequest,
  LockCardRequest,
  UnlockCardRequest,
  SetCardLimitRequest,
  ListCardTransactionsRequest,
  ListCardTransactionsResponse,
  ActivateCardRequest,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function mockCards(customerId: string): Card[] {
  return [
    {
      cardNumberMasked: '****4521',
      cardSuffix: '1',
      type: 'debit',
      status: 'active',
      productCode: 'VIS-PLAT',
      productDescription: 'Visa Platinum Debit',
      embossedName: 'JOHN Q MEMBER',
      secondaryEmbossedName: null,
      customerId,
      expirationDate: '2027-12-31',
      originalIssueDate: '2023-06-15',
      lastActivityDate: '2026-03-14',
      atmDailyLimitCents: 50000,
      posDailyLimitCents: 250000,
      foreignTransactionsAllowed: true,
      digitalWalletAllowed: true,
      invalidPinAttempts: 0,
    },
    {
      cardNumberMasked: '****8903',
      cardSuffix: '1',
      type: 'atm',
      status: 'active',
      productCode: 'ATM-STD',
      productDescription: 'Standard ATM Card',
      embossedName: 'JOHN Q MEMBER',
      secondaryEmbossedName: null,
      customerId,
      expirationDate: '2026-09-30',
      originalIssueDate: '2022-09-01',
      lastActivityDate: '2026-03-10',
      atmDailyLimitCents: 30000,
      posDailyLimitCents: null,
      foreignTransactionsAllowed: false,
      digitalWalletAllowed: false,
      invalidPinAttempts: 0,
    },
  ];
}

function mockTransactions(cardNumberMasked: string): CardTransaction[] {
  return [
    {
      transactionId: 'TXN-001',
      cardNumberMasked,
      type: 'pos',
      status: 'settled',
      amountCents: 4299,
      merchantName: 'WALMART SUPERCENTER',
      merchantCategoryCode: '5411',
      transactionDate: '2026-03-14T14:32:00Z',
      settlementDate: '2026-03-15T06:00:00Z',
      description: 'POS Purchase - WALMART SUPERCENTER',
      isRecurring: false,
    },
    {
      transactionId: 'TXN-002',
      cardNumberMasked,
      type: 'atm_withdrawal',
      status: 'settled',
      amountCents: 10000,
      merchantName: null,
      merchantCategoryCode: '6011',
      transactionDate: '2026-03-13T09:15:00Z',
      settlementDate: '2026-03-13T09:15:00Z',
      description: 'ATM Withdrawal - Branch ATM #2041',
      isRecurring: false,
    },
    {
      transactionId: 'TXN-003',
      cardNumberMasked,
      type: 'pos',
      status: 'settled',
      amountCents: 1499,
      merchantName: 'NETFLIX.COM',
      merchantCategoryCode: '4899',
      transactionDate: '2026-03-01T00:00:00Z',
      settlementDate: '2026-03-02T06:00:00Z',
      description: 'Recurring - NETFLIX.COM',
      isRecurring: true,
    },
    {
      transactionId: 'TXN-004',
      cardNumberMasked,
      type: 'pos',
      status: 'declined',
      amountCents: 75000,
      merchantName: 'BEST BUY #1234',
      merchantCategoryCode: '5732',
      transactionDate: '2026-02-28T16:45:00Z',
      settlementDate: null,
      description: 'POS Purchase DECLINED - BEST BUY #1234',
      isRecurring: false,
    },
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockCardAdapter implements CardAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-card',
    name: 'Mock Card Adapter',
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
      errorMessage: 'Running in sandbox mode',
    };
  }

  async listCards(request: ListCardsRequest): Promise<ListCardsResponse> {
    let cards = mockCards(request.customerId);
    if (request.status) {
      cards = cards.filter(c => c.status === request.status);
    }
    return { cards, total: cards.length };
  }

  async getCard(request: GetCardRequest): Promise<Card> {
    const cards = mockCards('mock-customer');
    const masked = `****${request.cardNumber.slice(-4)}`;
    const card = cards.find(c => c.cardNumberMasked === masked);
    if (card) return card;
    return { ...cards[0], cardNumberMasked: masked };
  }

  async lockCard(request: LockCardRequest): Promise<Card> {
    const card = await this.getCard({ tenantId: request.tenantId, cardNumber: request.cardNumber });
    const status: CardStatus = request.reason === 'fraud_suspected' ? 'warm_card' : 'hot_card';
    return { ...card, status };
  }

  async unlockCard(request: UnlockCardRequest): Promise<Card> {
    const card = await this.getCard({ tenantId: request.tenantId, cardNumber: request.cardNumber });
    return { ...card, status: 'active' };
  }

  async setCardLimit(request: SetCardLimitRequest): Promise<Card> {
    const card = await this.getCard({ tenantId: request.tenantId, cardNumber: request.cardNumber });
    return {
      ...card,
      atmDailyLimitCents: request.atmDailyLimitCents ?? card.atmDailyLimitCents,
      posDailyLimitCents: request.posDailyLimitCents ?? card.posDailyLimitCents,
    };
  }

  async listCardTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse> {
    const masked = `****${request.cardNumber.slice(-4)}`;
    let transactions = mockTransactions(masked);
    if (request.startDate) transactions = transactions.filter(t => t.transactionDate >= request.startDate!);
    if (request.endDate) transactions = transactions.filter(t => t.transactionDate <= request.endDate!);
    const limit = request.limit ?? 50;
    return {
      transactions: transactions.slice(0, limit),
      total: transactions.length,
      hasMore: transactions.length > limit,
    };
  }

  async activateCard(request: ActivateCardRequest): Promise<Card> {
    const card = await this.getCard({ tenantId: request.tenantId, cardNumber: request.cardNumber });
    return { ...card, status: 'active' };
  }
}
