// TODO: Provisional integration — not yet validated in production.
/**
 * Stripe Treasury Adapter
 *
 * Integrates with Stripe Treasury — Stripe's embedded banking product
 * providing financial accounts, money movement (ACH, wires), and
 * real-time balance management through Stripe's partner banks.
 *
 * Stripe Treasury API: https://stripe.com/docs/treasury
 *
 * Configuration:
 *   STRIPE_SECRET_KEY — Stripe secret key
 *   STRIPE_BASE_URL — Base URL (default: https://api.stripe.com/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  TreasuryAdapter,
  TreasuryAccount,
  TreasuryAccountStatus,
  ACHTransfer,
  ACHStatus,
  WireTransfer,
  WireStatus,
  BookTransfer,
  TreasuryTransactionType,
  ListTreasuryAccountsRequest,
  ListTreasuryAccountsResponse,
  GetTreasuryAccountRequest,
  CreateACHTransferRequest,
  CreateWireTransferRequest,
  CreateBookTransferRequest,
  ListTreasuryTransactionsRequest,
  ListTreasuryTransactionsResponse,
} from './types.ts';

// =============================================================================
// STRIPE TREASURY API RESPONSE TYPES
// =============================================================================

interface StripeFinancialAccount {
  id: string;
  object: string;
  active_features: string[];
  balance: {
    cash: { usd: number };
    inbound_pending: { usd: number };
    outbound_pending: { usd: number };
  };
  financial_addresses: Array<{
    type: string;
    aba?: { account_number_last4: string; routing_number: string };
  }>;
  status: string;
  supported_currencies: string[];
  created: number;
  metadata: Record<string, string>;
}

interface StripeOutboundTransfer {
  id: string;
  amount: number;
  currency: string;
  financial_account: string;
  destination_payment_method_details: {
    type: string;
    us_bank_account?: { routing_number: string; last4: string };
  };
  status: string;
  status_transitions: {
    posted_at: number | null;
    failed_at: number | null;
    canceled_at: number | null;
    returned_at: number | null;
  };
  description: string;
  created: number;
}

interface StripeOutboundPayment {
  id: string;
  amount: number;
  currency: string;
  financial_account: string;
  status: string;
  description: string | null;
  end_user_details: { present: boolean };
  created: number;
}

interface StripeTreasuryTransaction {
  id: string;
  amount: number;
  currency: string;
  financial_account: string;
  flow: string;
  flow_type: string;
  status: string;
  description: string;
  balance_impact: { cash: number; inbound_pending: number; outbound_pending: number };
  created: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapStripeAccountStatus(status: string): TreasuryAccountStatus {
  switch (status) {
    case 'open': return 'active';
    case 'closed': return 'closed';
    default: return 'pending_approval';
  }
}

function mapStripeTransferStatus(status: string): ACHStatus {
  switch (status) {
    case 'processing': return 'processing';
    case 'posted': return 'settled';
    case 'failed': return 'failed';
    case 'canceled': return 'cancelled';
    case 'returned': return 'returned';
    default: return 'pending';
  }
}

function mapStripeWireStatus(status: string): WireStatus {
  switch (status) {
    case 'processing': return 'submitted';
    case 'posted': return 'completed';
    case 'failed': return 'failed';
    case 'canceled': return 'failed';
    case 'returned': return 'reversed';
    default: return 'pending';
  }
}

function mapStripeFlowType(flowType: string): TreasuryTransactionType {
  switch (flowType) {
    case 'outbound_transfer': return 'ach_debit';
    case 'inbound_transfer': return 'ach_credit';
    case 'outbound_payment': return 'wire_debit';
    case 'received_credit': return 'wire_credit';
    case 'credit_reversal': return 'adjustment';
    case 'debit_reversal': return 'adjustment';
    default: return 'adjustment';
  }
}

function epochToISO(epoch: number): string {
  return new Date(epoch * 1000).toISOString();
}

// =============================================================================
// ADAPTER
// =============================================================================

export class StripeTreasuryAdapter implements TreasuryAdapter {
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'stripe_treasury',
    name: 'Stripe Treasury',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.secretKey = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
    this.baseUrl = Deno.env.get('STRIPE_BASE_URL') ?? 'https://api.stripe.com/v1';
    this.sandbox = !this.secretKey;
  }

  private async request<T>(method: string, path: string, body?: Record<string, string>): Promise<T> {
    if (this.sandbox) {
      throw new Error('Stripe Treasury adapter in sandbox mode — secret key not configured');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.secretKey}`,
    };

    let requestBody: string | undefined;
    if (body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      requestBody = new URLSearchParams(body).toString();
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: requestBody,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Stripe Treasury API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/treasury/financial_accounts?limit=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async listAccounts(request: ListTreasuryAccountsRequest): Promise<ListTreasuryAccountsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listAccounts(request);
    }

    const limit = request.limit ?? 50;
    const response = await this.request<{ data: StripeFinancialAccount[] }>('GET', `/treasury/financial_accounts?limit=${limit}`);

    const accounts: TreasuryAccount[] = response.data.map(fa => {
      const abaAddress = fa.financial_addresses.find(a => a.type === 'aba');
      return {
        accountId: fa.id,
        type: 'treasury' as const,
        name: fa.metadata.name ?? `Financial Account ${fa.id.slice(-4)}`,
        accountNumberMasked: abaAddress?.aba ? `****${abaAddress.aba.account_number_last4}` : '****0000',
        routingNumber: abaAddress?.aba?.routing_number ?? '000000000',
        balanceCents: fa.balance.cash.usd,
        availableBalanceCents: fa.balance.cash.usd,
        holdAmountCents: fa.balance.outbound_pending.usd,
        status: mapStripeAccountStatus(fa.status),
        currency: 'USD',
        createdAt: epochToISO(fa.created),
        closedAt: null,
      };
    });

    return { accounts, total: accounts.length };
  }

  async getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().getAccount(request);
    }

    const fa = await this.request<StripeFinancialAccount>('GET', `/treasury/financial_accounts/${request.accountId}`);
    const abaAddress = fa.financial_addresses.find(a => a.type === 'aba');

    return {
      accountId: fa.id,
      type: 'treasury',
      name: fa.metadata.name ?? `Financial Account ${fa.id.slice(-4)}`,
      accountNumberMasked: abaAddress?.aba ? `****${abaAddress.aba.account_number_last4}` : '****0000',
      routingNumber: abaAddress?.aba?.routing_number ?? '000000000',
      balanceCents: fa.balance.cash.usd,
      availableBalanceCents: fa.balance.cash.usd,
      holdAmountCents: fa.balance.outbound_pending.usd,
      status: mapStripeAccountStatus(fa.status),
      currency: 'USD',
      createdAt: epochToISO(fa.created),
      closedAt: null,
    };
  }

  async createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createACHTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<StripeOutboundTransfer>('POST', '/treasury/outbound_transfers', {
      financial_account: transfer.fromAccountId,
      amount: String(transfer.amountCents),
      currency: 'usd',
      description: transfer.description,
      'destination_payment_method_data[type]': 'us_bank_account',
      'destination_payment_method_data[us_bank_account][routing_number]': transfer.toRoutingNumber,
      'destination_payment_method_data[us_bank_account][account_number]': transfer.toAccountNumber,
    });

    return {
      transferId: response.id,
      fromAccountId: response.financial_account,
      direction: transfer.direction,
      amountCents: response.amount,
      description: response.description,
      status: mapStripeTransferStatus(response.status),
      returnReasonCode: null,
      effectiveDate: response.status_transitions.posted_at ? epochToISO(response.status_transitions.posted_at) : null,
      settledAt: response.status_transitions.posted_at ? epochToISO(response.status_transitions.posted_at) : null,
      createdAt: epochToISO(response.created),
    };
  }

  async createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createWireTransfer(request);
    }

    const { transfer } = request;
    const response = await this.request<StripeOutboundPayment>('POST', '/treasury/outbound_payments', {
      financial_account: transfer.fromAccountId,
      amount: String(transfer.amountCents),
      currency: 'usd',
      description: transfer.memo ?? 'Wire transfer',
      'destination_payment_method_data[type]': 'us_bank_account',
      'destination_payment_method_data[us_bank_account][routing_number]': transfer.beneficiaryRoutingNumber,
      'destination_payment_method_data[us_bank_account][account_number]': transfer.beneficiaryAccountNumber,
    });

    return {
      wireId: response.id,
      fromAccountId: response.financial_account,
      type: transfer.type,
      amountCents: response.amount,
      beneficiaryName: transfer.beneficiaryName,
      status: mapStripeWireStatus(response.status),
      imadNumber: null,
      omadNumber: null,
      submittedAt: null,
      completedAt: null,
      createdAt: epochToISO(response.created),
    };
  }

  async createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().createBookTransfer(request);
    }

    // Stripe Treasury doesn't have a dedicated book transfer — use ReceivedCredit simulation in test mode
    // In production, use outbound_transfers between own financial accounts
    const { transfer } = request;
    const response = await this.request<StripeOutboundTransfer>('POST', '/treasury/outbound_transfers', {
      financial_account: transfer.fromAccountId,
      amount: String(transfer.amountCents),
      currency: 'usd',
      description: transfer.description,
      destination_payment_method: transfer.toAccountId,
    });

    return {
      transferId: response.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amountCents: transfer.amountCents,
      description: transfer.description,
      status: response.status === 'posted' ? 'completed' : response.status === 'failed' ? 'failed' : 'pending',
      createdAt: epochToISO(response.created),
    };
  }

  async listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse> {
    if (this.sandbox) {
      const { MockTreasuryAdapter } = await import('./mock-adapter.ts');
      return new MockTreasuryAdapter().listTransactions(request);
    }

    const limit = request.limit ?? 50;
    let path = `/treasury/transactions?limit=${limit}`;
    if (request.accountId) path += `&financial_account=${request.accountId}`;

    const response = await this.request<{ data: StripeTreasuryTransaction[] }>('GET', path);

    return {
      transactions: response.data.map(t => ({
        transactionId: t.id,
        accountId: t.financial_account,
        type: mapStripeFlowType(t.flow_type),
        amountCents: t.amount,
        description: t.description,
        status: t.status === 'posted' ? 'posted' as const : t.status === 'void' ? 'reversed' as const : 'pending' as const,
        runningBalanceCents: null,
        postedAt: epochToISO(t.created),
        createdAt: epochToISO(t.created),
      })),
      total: response.data.length,
    };
  }
}
