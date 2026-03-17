/**
 * Mock Treasury Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  TreasuryAdapter,
  TreasuryAccount,
  ACHTransfer,
  WireTransfer,
  BookTransfer,
  TreasuryTransaction,
  ListTreasuryAccountsRequest,
  ListTreasuryAccountsResponse,
  GetTreasuryAccountRequest,
  CreateACHTransferRequest,
  CreateWireTransferRequest,
  CreateBookTransferRequest,
  ListTreasuryTransactionsRequest,
  ListTreasuryTransactionsResponse,
} from './types.ts';

export class MockTreasuryAdapter implements TreasuryAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-treasury',
    name: 'Mock Treasury',
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

  async listAccounts(request: ListTreasuryAccountsRequest): Promise<ListTreasuryAccountsResponse> {
    const accounts: TreasuryAccount[] = [
      {
        accountId: 'trsry_mock_1',
        type: 'checking',
        name: 'Operating Account',
        accountNumberMasked: '****7821',
        routingNumber: '021000021',
        balanceCents: 15420000,
        availableBalanceCents: 15200000,
        holdAmountCents: 220000,
        status: 'active',
        currency: 'USD',
        createdAt: '2024-01-10T00:00:00Z',
        closedAt: null,
      },
      {
        accountId: 'trsry_mock_2',
        type: 'reserve',
        name: 'Reserve Account',
        accountNumberMasked: '****3456',
        routingNumber: '021000021',
        balanceCents: 50000000,
        availableBalanceCents: 50000000,
        holdAmountCents: 0,
        status: 'active',
        currency: 'USD',
        createdAt: '2024-01-10T00:00:00Z',
        closedAt: null,
      },
    ];

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { accounts: accounts.slice(offset, offset + limit), total: accounts.length };
  }

  async getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount> {
    const { accounts } = await this.listAccounts({ userId: request.userId, tenantId: request.tenantId });
    const account = accounts.find(a => a.accountId === request.accountId);
    if (!account) throw new Error(`Treasury account ${request.accountId} not found`);
    return account;
  }

  async createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer> {
    return {
      transferId: `ach_mock_${Date.now()}`,
      fromAccountId: request.transfer.fromAccountId,
      direction: request.transfer.direction,
      amountCents: request.transfer.amountCents,
      description: request.transfer.description,
      status: 'pending',
      returnReasonCode: null,
      effectiveDate: request.transfer.effectiveDate ?? null,
      settledAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer> {
    return {
      wireId: `wire_mock_${Date.now()}`,
      fromAccountId: request.transfer.fromAccountId,
      type: request.transfer.type,
      amountCents: request.transfer.amountCents,
      beneficiaryName: request.transfer.beneficiaryName,
      status: 'pending',
      imadNumber: null,
      omadNumber: null,
      submittedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer> {
    return {
      transferId: `book_mock_${Date.now()}`,
      fromAccountId: request.transfer.fromAccountId,
      toAccountId: request.transfer.toAccountId,
      amountCents: request.transfer.amountCents,
      description: request.transfer.description,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
  }

  async listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse> {
    const now = new Date();
    const transactions: TreasuryTransaction[] = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return {
        transactionId: `ttxn_mock_${i + 1}`,
        accountId: request.accountId ?? 'trsry_mock_1',
        type: i % 2 === 0 ? 'ach_credit' as const : 'wire_debit' as const,
        amountCents: i % 2 === 0 ? 500000 : -250000,
        description: i % 2 === 0 ? 'ACH Payment Received' : 'Wire Transfer Out',
        status: 'posted' as const,
        runningBalanceCents: 15420000 + (i * 100000),
        postedAt: date.toISOString(),
        createdAt: date.toISOString(),
      };
    });

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { transactions: transactions.slice(offset, offset + limit), total: transactions.length };
  }
}
