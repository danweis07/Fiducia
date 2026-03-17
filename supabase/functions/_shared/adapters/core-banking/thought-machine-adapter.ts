// TODO: Provisional integration — not yet validated in production.
/**
 * Thought Machine Vault Core Banking Adapter
 *
 * Integrates with Thought Machine Vault — a cloud-native, smart-contract-based
 * core banking engine used by Tier-1 banks (Lloyds, Standard Chartered, etc.)
 * for high-performance ledger operations. Vault models all financial products
 * as configurable smart contracts.
 *
 * Thought Machine Vault API: https://docs.thoughtmachine.net/vault-core/latest/
 *
 * Configuration:
 *   THOUGHT_MACHINE_BASE_URL — Core API URL (e.g., https://vault.example.com/v1)
 *   THOUGHT_MACHINE_AUTH_TOKEN — Bearer token for API authentication
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CoreBankingAdapter,
  CoreAccount,
  CoreAccountType,
  CoreAccountStatus,
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

// =============================================================================
// THOUGHT MACHINE VAULT API TYPES
// =============================================================================

interface VaultAccount {
  id: string;
  name: string;
  product_id: string;
  product_version_id: string;
  status: string;
  opening_timestamp: string;
  closing_timestamp?: string;
  stakeholder_ids: string[];
  instance_param_vals: Record<string, string>;
  derived_instance_param_vals?: Record<string, string>;
  details?: Record<string, string>;
}

interface VaultBalance {
  id: string;
  account_id: string;
  account_address: string;
  phase: string;
  asset: string;
  denomination: string;
  amount: string;
  value_timestamp: string;
  total_debit: string;
  total_credit: string;
}

interface VaultBalancesResponse {
  balances: VaultBalance[];
}

interface VaultPosting {
  id: string;
  account_id: string;
  amount: string;
  denomination: string;
  asset: string;
  phase: string;
  credit: boolean;
  value_timestamp: string;
  booking_timestamp: string;
  instruction_id?: string;
  posting_instruction_batch_id: string;
  type: string;
}

interface VaultPostingsResponse {
  postings: VaultPosting[];
  next_page_token?: string;
}

interface VaultPostingInstructionBatchResponse {
  id: string;
  create_timestamp: string;
  status: string;
  posting_instructions: Array<{
    id: string;
    type: string;
    status: string;
  }>;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskAccountId(id: string): string {
  if (id.length <= 4) return `****${id}`;
  return `****${id.slice(-4)}`;
}

function mapVaultAccountType(productId: string): CoreAccountType {
  const lower = productId.toLowerCase();
  if (lower.includes('checking') || lower.includes('current') || lower.includes('casa')) return 'checking';
  if (lower.includes('money_market') || lower.includes('mm')) return 'money_market';
  if (lower.includes('cd') || lower.includes('fixed') || lower.includes('term_deposit')) return 'cd';
  return 'savings';
}

function mapVaultAccountStatus(status: string): CoreAccountStatus {
  switch (status.toUpperCase()) {
    case 'ACCOUNT_STATUS_OPEN':
      return 'active';
    case 'ACCOUNT_STATUS_PENDING':
    case 'ACCOUNT_STATUS_PENDING_CLOSURE':
      return 'pending';
    case 'ACCOUNT_STATUS_CLOSED':
      return 'closed';
    case 'ACCOUNT_STATUS_SUSPENDED':
      return 'frozen';
    default:
      return 'active';
  }
}

function parseVaultAmount(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

function extractBalances(balances: VaultBalance[]): { totalCents: number; availableCents: number } {
  let totalCents = 0;
  let availableCents = 0;

  for (const bal of balances) {
    const cents = parseVaultAmount(bal.amount);
    if (bal.phase === 'POSTING_PHASE_COMMITTED') {
      totalCents += cents;
      availableCents += cents;
    } else if (bal.phase === 'POSTING_PHASE_PENDING_OUTGOING') {
      availableCents -= Math.abs(cents);
    }
  }

  return { totalCents, availableCents };
}

function mapVaultPostingType(posting: VaultPosting): CoreTransaction['type'] {
  const type = posting.type.toLowerCase();
  if (type.includes('transfer')) return 'transfer';
  if (type.includes('fee')) return 'fee';
  if (type.includes('interest')) return 'interest';
  return posting.credit ? 'credit' : 'debit';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ThoughtMachineCoreBankingAdapter implements CoreBankingAdapter {
  private readonly baseUrl: string;
  private readonly authToken: string;
  private readonly routingNumber: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'thought_machine',
    name: 'Thought Machine Vault Core Banking',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('THOUGHT_MACHINE_BASE_URL') ?? '';
    this.authToken = Deno.env.get('THOUGHT_MACHINE_AUTH_TOKEN') ?? '';
    this.routingNumber = Deno.env.get('INSTITUTION_ROUTING_NUMBER') ?? '021000021';
    this.sandbox = !this.baseUrl || !this.authToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Thought Machine adapter in sandbox mode — credentials not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Thought Machine API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

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
      await this.request('GET', '/v1/health');
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

  async listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().listAccounts(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Vault uses stakeholder-based account lookup
    const response = await this.request<{ accounts: VaultAccount[] }>(
      'GET',
      `/v1/accounts?stakeholder_id=${request.userId}&page_size=${limit + offset}`,
    );

    const vaultAccounts = response.accounts ?? [];

    // Fetch balances for each account
    const accounts: CoreAccount[] = await Promise.all(
      vaultAccounts.map(async (va) => {
        let totalCents = 0;
        let availableCents = 0;

        try {
          const balancesResp = await this.request<VaultBalancesResponse>(
            'GET',
            `/v1/balances/live?account_ids=${va.id}`,
          );
          const extracted = extractBalances(balancesResp.balances ?? []);
          totalCents = extracted.totalCents;
          availableCents = extracted.availableCents;
        } catch {
          // Balance fetch failed — return zero balances
        }

        const interestRate = va.instance_param_vals?.['interest_rate']
          ?? va.derived_instance_param_vals?.['interest_rate']
          ?? '0';

        return {
          accountId: va.id,
          externalId: va.id,
          type: mapVaultAccountType(va.product_id),
          nickname: va.name || va.product_id,
          accountNumberMasked: maskAccountId(va.id),
          routingNumber: this.routingNumber,
          balanceCents: totalCents,
          availableBalanceCents: availableCents,
          status: mapVaultAccountStatus(va.status),
          interestRateBps: Math.round(parseFloat(interestRate) * 10000),
          openedAt: va.opening_timestamp,
          closedAt: va.closing_timestamp ?? null,
        };
      }),
    );

    return {
      accounts: accounts.slice(offset, offset + limit),
      total: accounts.length,
    };
  }

  async getAccount(request: GetAccountRequest): Promise<CoreAccount> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().getAccount(request);
    }

    const va = await this.request<VaultAccount>(
      'GET',
      `/v1/accounts/${request.accountId}`,
    );

    let totalCents = 0;
    let availableCents = 0;

    try {
      const balancesResp = await this.request<VaultBalancesResponse>(
        'GET',
        `/v1/balances/live?account_ids=${request.accountId}`,
      );
      const extracted = extractBalances(balancesResp.balances ?? []);
      totalCents = extracted.totalCents;
      availableCents = extracted.availableCents;
    } catch {
      // Balance fetch failed — return zero balances
    }

    const interestRate = va.instance_param_vals?.['interest_rate']
      ?? va.derived_instance_param_vals?.['interest_rate']
      ?? '0';

    return {
      accountId: va.id,
      externalId: va.id,
      type: mapVaultAccountType(va.product_id),
      nickname: va.name || va.product_id,
      accountNumberMasked: maskAccountId(va.id),
      routingNumber: this.routingNumber,
      balanceCents: totalCents,
      availableBalanceCents: availableCents,
      status: mapVaultAccountStatus(va.status),
      interestRateBps: Math.round(parseFloat(interestRate) * 10000),
      openedAt: va.opening_timestamp,
      closedAt: va.closing_timestamp ?? null,
    };
  }

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
    const params = new URLSearchParams({
      account_ids: accountId,
      page_size: String(limit),
    });

    if (request.fromDate) params.set('value_timestamp_from', request.fromDate);
    if (request.toDate) params.set('value_timestamp_to', request.toDate);

    const response = await this.request<VaultPostingsResponse>(
      'GET',
      `/v1/postings?${params.toString()}`,
    );

    const transactions: CoreTransaction[] = (response.postings ?? []).map(p => ({
      transactionId: p.id,
      accountId,
      type: mapVaultPostingType(p),
      amountCents: parseVaultAmount(p.amount),
      description: p.type,
      category: null,
      status: p.phase === 'POSTING_PHASE_COMMITTED' ? 'posted' as const : 'pending' as const,
      merchantName: null,
      merchantCategory: null,
      runningBalanceCents: null,
      postedAt: p.booking_timestamp,
      createdAt: p.value_timestamp,
    }));

    return {
      transactions,
      total: transactions.length,
    };
  }

  async createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult> {
    if (this.sandbox) {
      const { MockCoreBankingAdapter } = await import('./mock-adapter.ts');
      return new MockCoreBankingAdapter().createTransfer(request);
    }

    const { transfer } = request;

    // Vault uses Posting Instruction Batches for transfers
    const response = await this.request<VaultPostingInstructionBatchResponse>(
      'POST',
      '/v1/posting-instruction-batches:asyncCreate',
      {
        request_id: crypto.randomUUID(),
        posting_instructions: [
          {
            client_transaction_id: crypto.randomUUID(),
            transfer: {
              amount: String(transfer.amountCents / 100),
              denomination: 'USD',
              debtor_target_account: {
                account_id: transfer.fromAccountId,
              },
              creditor_target_account: {
                account_id: transfer.toAccountId,
              },
            },
            instruction_details: {
              description: transfer.memo ?? 'Transfer',
            },
          },
        ],
        batch_details: {},
      },
    );

    return {
      transferId: response.id,
      status: response.status === 'POSTING_INSTRUCTION_BATCH_STATUS_ACCEPTED' ? 'completed' : 'pending',
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId ?? null,
      amountCents: transfer.amountCents,
      processedAt: response.status === 'POSTING_INSTRUCTION_BATCH_STATUS_ACCEPTED' ? new Date().toISOString() : null,
      createdAt: response.create_timestamp ?? new Date().toISOString(),
    };
  }

  async listCards(_request: ListCardsRequest): Promise<ListCardsResponse> {
    // Thought Machine Vault does not natively manage cards — use a separate card adapter.
    return { cards: [] };
  }

  async lockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Thought Machine Vault — use card domain adapter');
  }

  async unlockCard(_request: LockCardRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Thought Machine Vault — use card domain adapter');
  }

  async setCardLimit(_request: SetCardLimitRequest): Promise<CoreCard> {
    throw new Error('Card management not supported by Thought Machine Vault — use card domain adapter');
  }
}
