/**
 * Gateway Domain — Accounts, Transactions, Transfers, Beneficiaries
 */

import type { CallGatewayFn, Pagination } from './client';
import type {
  Account,
  Transaction,
  Transfer,
  Beneficiary,
} from '@/types';

export function createAccountsDomain(callGateway: CallGatewayFn) {
  return {
    accounts: {
      async list() {
        return callGateway<{ accounts: Account[] }>('accounts.list', {});
      },

      async get(id: string) {
        return callGateway<{ account: Account }>('accounts.get', { id });
      },

      async summary() {
        return callGateway<{
          totalBalanceCents: number;
          totalAvailableCents: number;
          accountCount: number;
          accounts: Account[];
        }>('accounts.summary', {});
      },
    },

    transactions: {
      async list(params: {
        accountId?: string;
        type?: string;
        status?: string;
        category?: string;
        fromDate?: string;
        toDate?: string;
        search?: string;
        limit?: number;
        offset?: number;
      } = {}) {
        return callGateway<{ transactions: Transaction[]; _pagination?: Pagination }>(
          'transactions.list', params
        );
      },

      async get(id: string) {
        return callGateway<{ transaction: Transaction }>('transactions.get', { id });
      },

      async search(query: string, params: { accountId?: string; limit?: number } = {}) {
        return callGateway<{ transactions: Transaction[] }>(
          'transactions.search', { query, ...params }
        );
      },
    },

    transfers: {
      async create(input: {
        fromAccountId: string;
        toAccountId?: string;
        toBeneficiaryId?: string;
        type: string;
        amountCents: number;
        memo?: string;
        scheduledDate?: string;
      }) {
        return callGateway<{ transfer: Transfer }>('transfers.create', input);
      },

      async schedule(input: {
        fromAccountId: string;
        toAccountId?: string;
        toBeneficiaryId?: string;
        type: string;
        amountCents: number;
        memo?: string;
        scheduledDate: string;
        recurringRule?: {
          frequency: string;
          endDate?: string;
        };
      }) {
        return callGateway<{ transfer: Transfer }>('transfers.schedule', input);
      },

      async cancel(id: string) {
        return callGateway<{ success: boolean }>('transfers.cancel', { id });
      },

      async list(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ transfers: Transfer[]; _pagination?: Pagination }>(
          'transfers.list', params
        );
      },
    },

    beneficiaries: {
      async list() {
        return callGateway<{ beneficiaries: Beneficiary[] }>('beneficiaries.list', {});
      },

      async create(input: {
        name: string;
        nickname?: string;
        accountNumber: string;
        routingNumber?: string;
        bankName?: string;
        type: string;
      }) {
        return callGateway<{ beneficiary: Beneficiary }>('beneficiaries.create', input);
      },

      async delete(id: string) {
        return callGateway<{ success: boolean }>('beneficiaries.delete', { id });
      },
    },
  };
}
