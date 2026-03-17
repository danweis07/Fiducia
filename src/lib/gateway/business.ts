/**
 * Gateway Domain — Invoice Processor, Cash Sweeps, Approvals, Treasury, Aggregator
 */

import type { CallGatewayFn } from './client';
import type {
  ParsedInvoice,
  CashSweepRule,
  SweepExecution,
  SweepSummary,
  ApprovalRequest,
  ApprovalPolicy,
  ApprovalSummary,
  TreasuryVault,
  TreasurySummary,
  AggregatorInstitution,
  AggregatorConnection,
  AggregatedAccount,
  AggregatedTransaction,
} from '@/types';

export function createBusinessDomain(callGateway: CallGatewayFn) {
  return {
    invoiceProcessor: {
      async analyze(params: { fileBase64: string; fileName: string; mimeType: string }) {
        return callGateway<{ invoice: ParsedInvoice; matchedPayees: { payeeId: string; name: string; confidence: number }[] }>('invoices.analyze', params);
      },
      async confirm(params: { invoiceId: string; accountId: string; scheduledDate: string }) {
        return callGateway<{ invoice: ParsedInvoice }>('invoices.confirm', params);
      },
      async list(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ invoices: ParsedInvoice[] }>('invoices.list', params);
      },
      async get(invoiceId: string) {
        return callGateway<{ invoice: ParsedInvoice }>('invoices.get', { invoiceId });
      },
      async cancel(invoiceId: string) {
        return callGateway<{ invoice: ParsedInvoice }>('invoices.cancel', { invoiceId });
      },
    },

    cashSweeps: {
      async listRules(params: { status?: string } = {}) {
        return callGateway<{ rules: CashSweepRule[] }>('sweeps.rules.list', params);
      },
      async createRule(params: {
        name: string;
        sourceAccountId: string;
        destinationAccountId: string;
        thresholdCents: number;
        targetBalanceCents?: number;
        direction: 'sweep_out' | 'sweep_in';
        frequency: 'daily' | 'weekly' | 'monthly' | 'realtime';
      }) {
        return callGateway<{ rule: CashSweepRule }>('sweeps.rules.create', params);
      },
      async updateRule(params: { ruleId: string; name?: string; thresholdCents?: number; targetBalanceCents?: number; frequency?: string; status?: string }) {
        return callGateway<{ rule: CashSweepRule }>('sweeps.rules.update', params);
      },
      async deleteRule(ruleId: string) {
        return callGateway<{ success: boolean }>('sweeps.rules.delete', { ruleId });
      },
      async toggleRule(ruleId: string, status: 'active' | 'paused') {
        return callGateway<{ rule: CashSweepRule }>('sweeps.rules.toggle', { ruleId, status });
      },
      async listExecutions(params: { ruleId?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ executions: SweepExecution[] }>('sweeps.executions.list', params);
      },
      async getSummary() {
        return callGateway<{ summary: SweepSummary }>('sweeps.summary', {});
      },
    },

    approvals: {
      async listRequests(params: { status?: string; limit?: number; offset?: number } = {}) {
        return callGateway<{ requests: ApprovalRequest[] }>('approvals.requests.list', params);
      },
      async getRequest(requestId: string) {
        return callGateway<{ request: ApprovalRequest }>('approvals.requests.get', { requestId });
      },
      async approve(params: { requestId: string; mfaToken?: string }) {
        return callGateway<{ request: ApprovalRequest }>('approvals.requests.approve', params);
      },
      async deny(params: { requestId: string; reason?: string }) {
        return callGateway<{ request: ApprovalRequest }>('approvals.requests.deny', params);
      },
      async cancel(requestId: string) {
        return callGateway<{ request: ApprovalRequest }>('approvals.requests.cancel', { requestId });
      },
      async listPolicies() {
        return callGateway<{ policies: ApprovalPolicy[] }>('approvals.policies.list', {});
      },
      async createPolicy(params: {
        name: string;
        actionType: string;
        thresholdCents: number;
        approverRoles: string[];
        autoExpireMinutes: number;
        notifyChannels: string[];
        requireMfa?: boolean;
      }) {
        return callGateway<{ policy: ApprovalPolicy }>('approvals.policies.create', params);
      },
      async updatePolicy(params: { policyId: string; name?: string; thresholdCents?: number; autoExpireMinutes?: number; notifyChannels?: string[]; isEnabled?: boolean }) {
        return callGateway<{ policy: ApprovalPolicy }>('approvals.policies.update', params);
      },
      async deletePolicy(policyId: string) {
        return callGateway<{ success: boolean }>('approvals.policies.delete', { policyId });
      },
      async getSummary() {
        return callGateway<{ summary: ApprovalSummary }>('approvals.summary', {});
      },
    },

    treasury: {
      async listVaults() {
        return callGateway<{ vaults: TreasuryVault[] }>('treasury.vaults.list', {});
      },
      async createVault(params: { name: string; linkedAccountId: string; providerName: string; initialDepositCents?: number }) {
        return callGateway<{ vault: TreasuryVault }>('treasury.vaults.create', params);
      },
      async closeVault(vaultId: string) {
        return callGateway<{ vault: TreasuryVault }>('treasury.vaults.close', { vaultId });
      },
      async getSummary() {
        return callGateway<{ summary: TreasurySummary }>('treasury.summary', {});
      },
    },

    aggregator: {
      async searchInstitutions(params: { query: string; countryCode?: string; limit?: number }) {
        return callGateway<{ institutions: AggregatorInstitution[]; totalCount: number }>(
          'aggregator.institutions.search', params,
        );
      },

      async createConnection(params: { institutionId: string; redirectUrl?: string; scopes?: string[] }) {
        return callGateway<{ connectionId: string; connectUrl: string; expiresAt: string }>(
          'aggregator.connections.create', params,
        );
      },

      async handleCallback(params: { connectionId: string; callbackParams?: Record<string, string> }) {
        return callGateway<{ connectionId: string; status: string; institutionName: string; accountCount: number }>(
          'aggregator.connections.callback', params,
        );
      },

      async listConnections() {
        return callGateway<{ connections: AggregatorConnection[] }>(
          'aggregator.connections.list', {},
        );
      },

      async refreshConnection(connectionId: string) {
        return callGateway<{ connectionId: string; status: string; lastSyncedAt: string }>(
          'aggregator.connections.refresh', { connectionId },
        );
      },

      async removeConnection(connectionId: string) {
        return callGateway<{ connectionId: string; removed: boolean }>(
          'aggregator.connections.remove', { connectionId },
        );
      },

      async listAccounts(connectionId?: string) {
        return callGateway<{ accounts: AggregatedAccount[] }>(
          'aggregator.accounts.list', connectionId ? { connectionId } : {},
        );
      },

      async listTransactions(params: { accountId: string; fromDate?: string; toDate?: string; limit?: number; offset?: number }) {
        return callGateway<{ transactions: AggregatedTransaction[]; totalCount: number; hasMore: boolean }>(
          'aggregator.transactions.list', params,
        );
      },
    },
  };
}
