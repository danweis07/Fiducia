/**
 * Mifos X Core Banking Adapter
 *
 * Extends the Apache Fineract adapter with Mifos X community features
 * specifically designed for financial inclusion in India, Africa, and
 * other emerging markets.
 *
 * Mifos X adds:
 *   - Group/center lending (JLG — Joint Liability Group methodology)
 *   - Self Help Group (SHG) support (India)
 *   - Village savings & loan associations (VSLA — Africa)
 *   - Savings groups with mandatory contributions
 *   - Multi-currency with locale-aware formatting (INR, KES, NGN, UGX, TZS, GHS, ZAR)
 *   - Mobile money integration hooks (M-Pesa, MTN MoMo)
 *   - Aadhaar-based KYC references (India)
 *
 * Mifos Initiative: https://mifos.org/
 * Mifos X API: https://demo.mifos.io/api-docs/apiLive.htm
 * Community Hub: https://mifos.org/resources/knowledge-base/
 *
 * Configuration:
 *   FINERACT_BASE_URL — Mifos X instance URL (compatible with Fineract API)
 *   FINERACT_TENANT_ID — Tenant identifier (default: 'default')
 *   FINERACT_USERNAME — API username (default Mifos: 'mifos')
 *   FINERACT_PASSWORD — API password (default Mifos: 'password')
 *   MIFOS_GROUP_LENDING — Enable group/center lending features ('true'/'false')
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreAccount,
  CoreTransaction,
  ListAccountsRequest,
  ListAccountsResponse,
  ListTransactionsRequest,
  ListTransactionsResponse,
} from './types.ts';
import { FineractCoreBankingAdapter } from './fineract-adapter.ts';

// =============================================================================
// MIFOS-SPECIFIC API RESPONSE TYPES
// =============================================================================

interface MifosGroup {
  id: number;
  accountNo: string;
  name: string;
  externalId?: string;
  status: { id: number; code: string; value: string };
  activationDate?: number[];
  officeId: number;
  officeName: string;
  centerId?: number;
  centerName?: string;
  clientMembers?: Array<{ id: number; displayName: string }>;
}

interface _MifosCenter {
  id: number;
  accountNo: string;
  name: string;
  externalId?: string;
  status: { id: number; code: string; value: string };
  activationDate?: number[];
  officeId: number;
  officeName: string;
  groupMembers?: MifosGroup[];
}

interface MifosGroupAccount {
  id: number;
  accountNo: string;
  productName: string;
  shortProductName: string;
  status: { id: number; code: string; value: string };
  currency: { code: string; decimalPlaces: number };
  principal?: number;
  annualInterestRate?: number;
  summary?: {
    totalOutstanding?: number;
    principalOutstanding?: number;
    accountBalance?: number;
    availableBalance?: number;
  };
  loanType?: { id: number; code: string; value: string };
  timeline?: {
    submittedOnDate?: number[];
    actualDisbursementDate?: number[];
    closedOnDate?: number[];
  };
  activatedOnDate?: number[];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MifosCoreBankingAdapter extends FineractCoreBankingAdapter {
  private readonly groupLendingEnabled: boolean;

  override readonly config: AdapterConfig = {
    id: 'mifos',
    name: 'Mifos X Community Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    super();
    this.groupLendingEnabled = Deno.env.get('MIFOS_GROUP_LENDING') !== 'false';
  }

  /**
   * Extends Fineract listAccounts to also include group/JLG loan accounts
   * and savings group contributions visible to the member.
   */
  override async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    // Get standard individual accounts from Fineract
    const individualResult = await super.listAccounts(request);

    if (!this.groupLendingEnabled || this.sandbox) {
      return individualResult;
    }

    // Fetch group accounts for this member
    try {
      const groupAccounts = await this.fetchGroupAccounts(request.userId);
      const allAccounts = [...individualResult.accounts, ...groupAccounts];
      const limit = request.limit ?? 50;
      const offset = request.offset ?? 0;

      return {
        accounts: allAccounts.slice(offset, offset + limit),
        total: allAccounts.length,
      };
    } catch {
      // Group lending lookup failed — return individual accounts only
      return individualResult;
    }
  }

  /**
   * Extends Fineract listTransactions to include group loan repayment
   * transactions for the member's group accounts.
   */
  override async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    // Standard transactions from Fineract
    const result = await super.listTransactions(request);

    if (!this.groupLendingEnabled || this.sandbox || !request.accountId) {
      return result;
    }

    // If this is a group loan account, enrich transaction descriptions
    // with group context (e.g., "Group Repayment — Umoja SHG")
    try {
      const enriched = await this.enrichGroupTransactions(request.accountId, result.transactions);
      return { transactions: enriched, total: enriched.length };
    } catch {
      return result;
    }
  }

  /**
   * Fetch group/JLG loan and savings accounts visible to this member.
   * In Mifos group lending, a client belongs to a group which may belong
   * to a center. Group loans are disbursed at the group level but
   * repayment is tracked per individual member.
   */
  private async fetchGroupAccounts(userId: string): Promise<CoreAccount[]> {
    // Resolve clientId
    const clientId = await this.resolveClientId(userId);
    if (!clientId) return [];

    // Find groups this client belongs to
    const groups = await this.request<{ pageItems?: MifosGroup[] }>(
      'GET',
      `/groups?clientId=${clientId}&limit=50`,
    ).catch(() => ({ pageItems: [] }));

    const accounts: CoreAccount[] = [];
    const routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';

    for (const group of groups.pageItems ?? []) {
      // Fetch group savings and loan accounts
      const groupAccounts = await this.request<{
        savingsAccounts?: MifosGroupAccount[];
        loanAccounts?: MifosGroupAccount[];
      }>(
        'GET',
        `/groups/${group.id}/accounts`,
      ).catch(() => ({ savingsAccounts: [], loanAccounts: [] }));

      // Map group savings accounts
      for (const sa of groupAccounts.savingsAccounts ?? []) {
        const decimalPlaces = sa.currency?.decimalPlaces ?? 2;
        const multiplier = Math.pow(10, 2 - decimalPlaces);
        accounts.push({
          accountId: `grp-${group.id}-${sa.id}`,
          externalId: undefined,
          type: 'savings',
          nickname: `${group.name} — ${sa.shortProductName || sa.productName}`,
          accountNumberMasked: `****${sa.accountNo.slice(-4)}`,
          routingNumber,
          balanceCents: Math.round((sa.summary?.accountBalance ?? 0) * multiplier),
          availableBalanceCents: Math.round((sa.summary?.availableBalance ?? 0) * multiplier),
          status: sa.status.code.toLowerCase().includes('active') ? 'active' : 'pending',
          interestRateBps: 0,
          openedAt: sa.activatedOnDate
            ? new Date(sa.activatedOnDate[0], sa.activatedOnDate[1] - 1, sa.activatedOnDate[2]).toISOString()
            : new Date().toISOString(),
          closedAt: null,
        });
      }

      // Map group/JLG loan accounts
      for (const la of groupAccounts.loanAccounts ?? []) {
        const decimalPlaces = la.currency?.decimalPlaces ?? 2;
        const multiplier = Math.pow(10, 2 - decimalPlaces);
        const outstandingCents = Math.round((la.summary?.totalOutstanding ?? la.principal ?? 0) * multiplier);
        const loanTypeLabel = la.loanType?.value === 'JLG'
          ? 'JLG Loan'
          : la.loanType?.value === 'GROUP'
            ? 'Group Loan'
            : 'Loan';
        accounts.push({
          accountId: `grp-${group.id}-loan-${la.id}`,
          externalId: undefined,
          type: 'loan',
          nickname: `${group.name} — ${loanTypeLabel}: ${la.shortProductName || la.productName}`,
          accountNumberMasked: `****${la.accountNo.slice(-4)}`,
          routingNumber,
          balanceCents: -outstandingCents,
          availableBalanceCents: 0,
          status: la.status.code.toLowerCase().includes('active') ? 'active' : 'pending',
          interestRateBps: Math.round((la.annualInterestRate ?? 0) * 100),
          openedAt: la.timeline?.actualDisbursementDate
            ? new Date(la.timeline.actualDisbursementDate[0], la.timeline.actualDisbursementDate[1] - 1, la.timeline.actualDisbursementDate[2]).toISOString()
            : la.timeline?.submittedOnDate
              ? new Date(la.timeline.submittedOnDate[0], la.timeline.submittedOnDate[1] - 1, la.timeline.submittedOnDate[2]).toISOString()
              : new Date().toISOString(),
          closedAt: la.timeline?.closedOnDate
            ? new Date(la.timeline.closedOnDate[0], la.timeline.closedOnDate[1] - 1, la.timeline.closedOnDate[2]).toISOString()
            : null,
        });
      }
    }

    return accounts;
  }

  /**
   * Enrich group loan transactions with group/center context
   * so the UI can show "Group Repayment — Umoja SHG" instead of just "Repayment".
   */
  private async enrichGroupTransactions(
    accountId: string,
    transactions: CoreTransaction[],
  ): Promise<CoreTransaction[]> {
    // Only enrich group account transactions (prefixed with grp-)
    if (!accountId.startsWith('grp-')) {
      return transactions;
    }

    // Extract group ID from composite account ID
    const parts = accountId.split('-');
    if (parts.length < 3) return transactions;

    const groupId = parts[1];
    const group = await this.request<MifosGroup>(
      'GET',
      `/groups/${groupId}`,
    ).catch(() => null);

    if (!group) return transactions;

    const groupLabel = group.centerName
      ? `${group.name} (${group.centerName})`
      : group.name;

    return transactions.map(t => ({
      ...t,
      description: `${t.description} — ${groupLabel}`,
    }));
  }
}
