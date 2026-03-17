// TODO: Provisional integration — not yet validated in production.
/**
 * CU*Answers CU*BASE Core Banking Adapter
 *
 * Integrates with the CU*Answers It's Me 247 API — a REST API providing
 * member management, account services, and transaction history for credit
 * unions running the CU*BASE core platform. Serves 200+ credit unions.
 *
 * API Documentation: https://api-qa.cuanswers.com/docs/
 * Base URL (QA): https://api-qa.cuanswers.com/api
 * Base URL (Prod): https://api.cuanswers.com/api
 *
 * Configuration:
 *   CUANSWERS_BASE_URL — API base URL
 *   CUANSWERS_APP_KEY — APP Key for authentication
 *   CUANSWERS_CREDIT_UNION_ID — Credit Union ID (format: CUXXXXX)
 *   INSTITUTION_ROUTING_NUMBER — Routing/ABA number for the institution
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
  CoreTransaction,
  CoreTransactionType,
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

// =============================================================================
// CU*ANSWERS API RESPONSE TYPES
// =============================================================================

interface _CUAnswersMemberResponse {
  data: {
    account_base: string;
    organization_name: string;
    first_name: string;
    last_name: string;
    middle_initial: string;
    membership_type: 'individual' | 'organization';
    email_address: string;
    address_line_1: string;
    address_line_2: string;
    zip_code: string;
    state: string;
    ssn_tin: string;
    date_opened: string;
    routing_number: string;
  };
}

interface CUAnswersAccountSummary {
  account_type: Record<string, unknown>;
  name: string;
  current_balance: number;
  account_description: string;
  last_transaction_date: string;
  available_balance: number;
  close_date: string;
  account_id: string;
  micr_account_number: string;
  account_base: string;
  account_suffix: string;
}

interface CUAnswersAccountsResponse {
  data: CUAnswersAccountSummary[];
}

interface CUAnswersTransaction {
  id: number;
  status: string;
  comment: string;
  description: string;
  activity_date: string;
  post_date: string;
  effective_date: string;
  amount: number;
  balance: number;
  transaction_code: string;
  withdrawal_or_deposit: Record<string, unknown>;
}

interface CUAnswersTransactionsResponse {
  data: CUAnswersTransaction[];
  _pagination: {
    prev: string;
    next: string;
  };
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountNumber(accountNo: string): string {
  if (accountNo.length <= 4) return `****${accountNo}`;
  return `****${accountNo.slice(-4)}`;
}

function mapAccountType(description: string): CoreAccountType {
  const lower = description.toLowerCase();
  if (lower.includes('checking') || lower.includes('share draft')) return 'checking';
  if (lower.includes('money market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('cd') || lower.includes('certificate')) return 'cd';
  return 'savings';
}

function mapTransactionType(tx: CUAnswersTransaction): CoreTransactionType {
  // CU*Answers uses withdrawal_or_deposit to indicate direction
  const wod = tx.withdrawal_or_deposit;
  const isWithdrawal = wod && (String(Object.values(wod)[0] ?? '').toLowerCase().includes('withdrawal'));

  const descLower = tx.description.toLowerCase();
  if (descLower.includes('transfer')) return 'transfer';
  if (descLower.includes('deposit') || descLower.includes('rdc')) return 'deposit';
  if (descLower.includes('fee') || descLower.includes('charge')) return 'fee';
  if (descLower.includes('interest') || descLower.includes('dividend')) return 'interest';
  if (descLower.includes('bill pay')) return 'bill_payment';
  if (descLower.includes('withdrawal') || isWithdrawal) return 'withdrawal';

  return isWithdrawal ? 'debit' : 'credit';
}

/**
 * Convert dollar amount to integer cents.
 * CU*Answers API returns monetary values as dollar floats.
 */
function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class CUAnswersCoreBankingAdapter implements CoreBankingAdapter {
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly creditUnionId: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'cuanswers',
    name: 'CU*Answers CU*BASE Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('CUANSWERS_BASE_URL') ?? '';
    this.appKey = Deno.env.get('CUANSWERS_APP_KEY') ?? '';
    this.creditUnionId = Deno.env.get('CUANSWERS_CREDIT_UNION_ID') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.appKey || !this.creditUnionId;
  }

  // ---------------------------------------------------------------------------
  // HTTP client
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    options?: { body?: unknown; headers?: Record<string, string> },
  ): Promise<T> {
    if (this.sandbox) {
      throw new Error('CU*Answers adapter in sandbox mode — credentials not configured');
    }

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'APP-KEY': this.appKey,
      ...options?.headers,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`CU*Answers API error (${res.status}): ${errBody}`);
    }

    // Some endpoints return 204 with no body
    if (res.status === 204) return undefined as T;

    return res.json();
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      // Check CU availability via stand-in status endpoint
      await this.request('GET', `/credit_unions/${this.creditUnionId}/available`);
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // List accounts
  // ---------------------------------------------------------------------------

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    // CU*Answers uses the member_id (encrypted) to fetch accounts
    // The userId from our system maps to the CU*Answers member_id
    const response = await this.request<CUAnswersAccountsResponse>(
      'GET',
      `/credit_unions/${this.creditUnionId}/membership/members/${request.userId}/accounts`,
    );

    const accounts: CoreAccount[] = (response.data ?? []).map(a => ({
      accountId: a.account_id,
      externalId: `${a.account_base}-${a.account_suffix}`,
      type: mapAccountType(a.account_description),
      nickname: a.account_description || null,
      accountNumberMasked: maskAccountNumber(a.micr_account_number || `${a.account_base}${a.account_suffix}`),
      routingNumber: this.routingNumber,
      balanceCents: dollarsToCents(a.current_balance),
      availableBalanceCents: dollarsToCents(a.available_balance),
      status: a.close_date ? 'closed' : 'active',
      interestRateBps: 0, // CU*Answers accounts endpoint doesn't return rate; would need product lookup
      openedAt: new Date().toISOString(), // Not available from accounts summary
      closedAt: a.close_date || null,
    }));

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Get single account
  // ---------------------------------------------------------------------------

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    // Fetch all accounts and find the matching one
    const { accounts } = await this.listAccounts({
      userId: request.userId,
      tenantId: request.tenantId,
    });

    const account = accounts.find(a => a.accountId === request.accountId);
    if (!account) {
      throw new Error(`Account ${request.accountId} not found`);
    }

    return account;
  }

  // ---------------------------------------------------------------------------
  // List transactions
  // ---------------------------------------------------------------------------

  async listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listTransactions(request);
    }

    const accountId = request.accountId;
    if (!accountId) {
      return { transactions: [], total: 0 };
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    const response = await this.request<CUAnswersTransactionsResponse>(
      'GET',
      `/credit_unions/${this.creditUnionId}/membership/members/${request.userId}/accounts/${accountId}/transactions?limit=${limit}&offset=${offset}`,
    );

    const transactions: CoreTransaction[] = (response.data ?? []).map(t => ({
      transactionId: String(t.id),
      accountId,
      type: mapTransactionType(t),
      amountCents: dollarsToCents(Math.abs(t.amount)),
      description: t.description || t.comment || 'Transaction',
      category: null,
      status: t.status === 'active' ? 'posted' as const : 'pending' as const,
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: dollarsToCents(t.balance),
      postedAt: t.post_date || null,
      createdAt: t.activity_date || t.effective_date || new Date().toISOString(),
    }));

    // Apply client-side filters
    let filtered = transactions;
    if (request.type) {
      filtered = filtered.filter(t => t.type === request.type);
    }
    if (request.status) {
      filtered = filtered.filter(t => t.status === request.status);
    }
    if (request.fromDate) {
      filtered = filtered.filter(t => t.createdAt >= request.fromDate!);
    }
    if (request.toDate) {
      filtered = filtered.filter(t => t.createdAt <= request.toDate!);
    }
    if (request.search) {
      const searchLower = request.search.toLowerCase();
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchLower)
      );
    }

    return {
      transactions: filtered,
      total: filtered.length,
    };
  }

  // ---------------------------------------------------------------------------
  // Create transfer
  // ---------------------------------------------------------------------------

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    // CU*Answers doesn't expose a direct transfer API in the public docs.
    // Internal transfers would typically go through the core's transaction
    // processing. For now, we create a tracker entry to record the request
    // and return a pending status. A production deployment would integrate
    // with CU*BASE's internal transfer mechanisms.
    const { transfer } = request;

    const trackerId = `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create a tracker entry to audit the transfer request
    try {
      await this.request(
        'POST',
        `/credit_unions/${this.creditUnionId}/membership/members/${transfer.fromAccountId}/trackers`,
        {
          body: {
            created_employee_id: 'OB', // Open Banking
            tracker_type: 'XF', // Transfer
            tracker_status: 'A',
            reference: trackerId.slice(0, 15),
            contact_employee_id: 'OB',
            memo_type: 'XF',
            person_contacted: 'Digital Banking',
            follow_up_date: new Date().toISOString().split('T')[0],
            follow_up_assigned_to: 'OB',
            follow_up_created_by: 'OB',
            follow_up_need_group: 0,
            follow_up_task_number: 0,
            conversation_text: `Transfer ${dollarsToCents(transfer.amountCents) / 100} from ${transfer.fromAccountId} to ${transfer.toAccountId ?? transfer.toBeneficiaryId ?? 'external'}. Memo: ${transfer.memo ?? 'N/A'}`,
          },
        },
      );
    } catch {
      // Tracker creation is best-effort for audit; don't fail the transfer
    }

    return {
      transferId: trackerId,
      status: 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Card management — CU*Answers does not expose card APIs
  // ---------------------------------------------------------------------------

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by CU*Answers API — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by CU*Answers API — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by CU*Answers API — use card domain adapter');
  }
}
