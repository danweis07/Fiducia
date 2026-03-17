/**
 * Mock Core Banking Adapter
 *
 * Returns synthetic data for development and testing.
 * Falls back to direct DB queries for backward compatibility.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreTransaction,
  CoreTransferResult,
  CoreCard,
  ListAccountsRequest,
  ListAccountsResponse,
  GetAccountRequest,
  ListTransactionsRequest,
  ListTransactionsResponse,
  CreateTransferRequest,
  ListCardsRequest,
  ListCardsResponse,
  LockCardRequest,
  SetCardLimitRequest,
} from './types.ts';

export class MockCoreBankingAdapter implements CoreBankingAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-core-banking',
    name: 'Mock Core Banking',
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

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    const accounts: CoreAccount[] = [
      {
        accountId: 'acct_mock_checking_1',
        type: 'checking',
        nickname: 'Primary Checking',
        accountNumberMasked: '****4521',
        routingNumber: '021000021',
        balanceCents: 542310,
        availableBalanceCents: 537810,
        status: 'active',
        interestRateBps: 10,
        openedAt: '2023-01-15T00:00:00Z',
        closedAt: null,
      },
      {
        accountId: 'acct_mock_savings_1',
        type: 'savings',
        nickname: 'Emergency Fund',
        accountNumberMasked: '****8903',
        routingNumber: '021000021',
        balanceCents: 2150000,
        availableBalanceCents: 2150000,
        status: 'active',
        interestRateBps: 425,
        openedAt: '2023-01-15T00:00:00Z',
        closedAt: null,
      },
    ];

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    const { accounts } = await this.listAccounts({ userId: request.userId, tenantId: request.tenantId });
    const account = accounts.find(a => a.accountId === request.accountId);
    if (!account) throw new Error(`Account ${request.accountId} not found`);
    return account;
  }

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    const now = new Date();
    const transactions: CoreTransaction[] = Array.from({ length: 10 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const isDebit = i % 3 !== 0;
      return {
        transactionId: `txn_mock_${i + 1}`,
        accountId: request.accountId ?? 'acct_mock_checking_1',
        type: isDebit ? 'debit' as const : 'credit' as const,
        amountCents: isDebit ? -(Math.floor(Math.random() * 15000) + 200) : Math.floor(Math.random() * 300000) + 50000,
        description: isDebit ? ['Grocery Store', 'Gas Station', 'Coffee Shop', 'Restaurant'][i % 4] : 'Direct Deposit',
        category: isDebit ? ['groceries', 'transportation', 'dining', 'dining'][i % 4] : 'income',
        status: 'posted',
        merchantName: isDebit ? ['Trader Joe\'s', 'Shell', 'Starbucks', 'Chipotle'][i % 4] : 'Employer Inc',
        merchantCategory: null,
        runningBalanceCents: 542310 + (i * 5000),
        postedAt: date.toISOString(),
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return {
      transactions: transactions.slice(offset, offset + limit),
      total: transactions.length,
    };
  }

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    return {
      transferId: `xfer_mock_${Date.now()}`,
      status: 'pending',
      fromAccountId: request.transfer.fromAccountId,
      toAccountId: request.transfer.toAccountId ?? null,
      amountCents: request.transfer.amountCents,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return {
      cards: [
        {
          cardId: 'card_mock_1',
          accountId: 'acct_mock_checking_1',
          type: 'debit',
          lastFour: '4521',
          cardholderName: 'JOHN DOE',
          status: 'active',
          dailyLimitCents: 250000,
          singleTransactionLimitCents: 100000,
          expirationDate: '12/27',
          isContactless: true,
          isVirtual: false,
        },
      ],
    };
  }

  async lockCard(request: LockCardRequest): Promise<CoreCard> {
    const { cards } = await this.listCards({ userId: request.userId, tenantId: request.tenantId });
    const card = cards.find(c => c.cardId === request.cardId);
    if (!card) throw new Error(`Card ${request.cardId} not found`);
    return { ...card, status: 'locked' };
  }

  async unlockCard(request: LockCardRequest): Promise<CoreCard> {
    const { cards } = await this.listCards({ userId: request.userId, tenantId: request.tenantId });
    const card = cards.find(c => c.cardId === request.cardId);
    if (!card) throw new Error(`Card ${request.cardId} not found`);
    return { ...card, status: 'active' };
  }

  async setCardLimit(request: SetCardLimitRequest): Promise<CoreCard> {
    const { cards } = await this.listCards({ userId: request.userId, tenantId: request.tenantId });
    const card = cards.find(c => c.cardId === request.cardId);
    if (!card) throw new Error(`Card ${request.cardId} not found`);
    return { ...card, dailyLimitCents: request.dailyLimitCents };
  }
}
