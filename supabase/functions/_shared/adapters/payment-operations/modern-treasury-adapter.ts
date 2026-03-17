// TODO: Provisional integration — not yet validated in production.
/**
 * Modern Treasury Payment Operations Adapter
 *
 * Integrates with Modern Treasury — a payment operations platform providing
 * multi-rail payment orchestration, counterparty management, reconciliation,
 * and ledger accounting.
 *
 * Modern Treasury API: https://docs.moderntreasury.com
 *
 * Configuration:
 *   MODERN_TREASURY_ORG_ID — Organization ID
 *   MODERN_TREASURY_API_KEY — API key
 *   MODERN_TREASURY_BASE_URL — Base URL (default: https://app.moderntreasury.com/api)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  PaymentOperationsAdapter,
  PaymentOrder,
  PaymentOrderStatus,
  PaymentOrderPriority,
  Counterparty,
  CounterpartyType,
  ExpectedPayment,
  ReconciliationStatus,
  CreatePaymentOrderRequest,
  GetPaymentOrderRequest,
  ListPaymentOrdersRequest,
  ListPaymentOrdersResponse,
  CreateCounterpartyRequest,
  ListCounterpartiesRequest,
  ListCounterpartiesResponse,
  CreateExpectedPaymentRequest,
  ListExpectedPaymentsRequest,
  ListExpectedPaymentsResponse,
} from './types.ts';

// =============================================================================
// MODERN TREASURY API RESPONSE TYPES
// =============================================================================

interface MTPaymentOrder {
  id: string;
  direction: string;
  type: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  priority: string;
  originating_account_id: string;
  receiving_account_id: string | null;
  counterparty_id: string | null;
  reference_numbers: Array<{ reference_number: string }>;
  effective_date: string | null;
  process_after: string | null;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface MTCounterparty {
  id: string;
  name: string;
  counterparty_type: string | null;
  email: string | null;
  accounts: Array<{
    account_details: Array<{ account_number: string; account_number_type: string }>;
    routing_details: Array<{ routing_number: string; routing_number_type: string }>;
    account_type: string | null;
  }>;
  metadata: Record<string, string>;
  created_at: string;
  updated_at: string;
}

interface MTExpectedPayment {
  id: string;
  amount_lower_bound: number;
  amount_upper_bound: number;
  direction: string;
  description: string | null;
  status: string;
  counterparty_id: string | null;
  transaction_id: string | null;
  date_lower_bound: string | null;
  date_upper_bound: string | null;
  created_at: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapMTStatus(status: string): PaymentOrderStatus {
  switch (status) {
    case 'pending_approval': return 'pending_approval';
    case 'approved': return 'approved';
    case 'processing': return 'processing';
    case 'sent': return 'sent';
    case 'completed': return 'completed';
    case 'returned': return 'returned';
    case 'failed': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'processing';
  }
}

function mapMTPriority(priority: string): PaymentOrderPriority {
  return priority === 'high' ? 'high' : 'normal';
}

function mapMTCounterpartyType(type: string | null): CounterpartyType {
  return type === 'individual' ? 'individual' : 'business';
}

function mapMTReconciliationStatus(status: string): ReconciliationStatus {
  switch (status) {
    case 'reconciled': return 'reconciled';
    case 'partially_reconciled': return 'partially_reconciled';
    default: return 'unreconciled';
  }
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return `****${accountNumber}`;
  return `****${accountNumber.slice(-4)}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ModernTreasuryAdapter implements PaymentOperationsAdapter {
  private readonly orgId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'modern_treasury',
    name: 'Modern Treasury',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.orgId = Deno.env.get('MODERN_TREASURY_ORG_ID') ?? '';
    this.apiKey = Deno.env.get('MODERN_TREASURY_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('MODERN_TREASURY_BASE_URL') ?? 'https://app.moderntreasury.com/api';
    this.sandbox = !this.orgId || !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Modern Treasury adapter in sandbox mode — credentials not configured');
    }

    const authHeader = btoa(`${this.orgId}:${this.apiKey}`);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Modern Treasury API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/ping');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async createPaymentOrder(request: CreatePaymentOrderRequest): Promise<PaymentOrder> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().createPaymentOrder(request);
    }

    const { order } = request;
    const response = await this.request<MTPaymentOrder>('POST', '/payment_orders', {
      direction: order.direction,
      type: order.type,
      amount: order.amountCents,
      currency: order.currency ?? 'USD',
      description: order.description,
      originating_account_id: order.originatingAccountId,
      counterparty_id: order.counterpartyId,
      receiving_account_id: order.receivingAccountId,
      priority: order.priority ?? 'normal',
      effective_date: order.effectiveDate,
      metadata: order.metadata ?? {},
    });

    return mapMTPaymentOrder(response);
  }

  async getPaymentOrder(request: GetPaymentOrderRequest): Promise<PaymentOrder> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().getPaymentOrder(request);
    }

    const response = await this.request<MTPaymentOrder>('GET', `/payment_orders/${request.paymentOrderId}`);
    return mapMTPaymentOrder(response);
  }

  async listPaymentOrders(request: ListPaymentOrdersRequest): Promise<ListPaymentOrdersResponse> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().listPaymentOrders(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/payment_orders?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`;
    if (request.status) path += `&status=${request.status}`;
    if (request.direction) path += `&direction=${request.direction}`;
    if (request.type) path += `&type=${request.type}`;

    const response = await this.request<MTPaymentOrder[]>('GET', path);
    return { orders: response.map(mapMTPaymentOrder), total: response.length };
  }

  async createCounterparty(request: CreateCounterpartyRequest): Promise<Counterparty> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().createCounterparty(request);
    }

    const { counterparty } = request;
    const response = await this.request<MTCounterparty>('POST', '/counterparties', {
      name: counterparty.name,
      email: counterparty.email,
      metadata: counterparty.metadata ?? {},
      accounts: counterparty.accounts.map(a => ({
        account_details: [{ account_number: a.accountNumber, account_number_type: 'other' }],
        routing_details: [{ routing_number: a.routingNumber, routing_number_type: 'aba' }],
        account_type: a.accountType,
      })),
    });

    return mapMTCounterparty(response);
  }

  async listCounterparties(request: ListCounterpartiesRequest): Promise<ListCounterpartiesResponse> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().listCounterparties(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    const response = await this.request<MTCounterparty[]>('GET', `/counterparties?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`);
    return { counterparties: response.map(mapMTCounterparty), total: response.length };
  }

  async createExpectedPayment(request: CreateExpectedPaymentRequest): Promise<ExpectedPayment> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().createExpectedPayment(request);
    }

    const { expectedPayment } = request;
    const response = await this.request<MTExpectedPayment>('POST', '/expected_payments', {
      amount_lower_bound: expectedPayment.amountLowerBoundCents,
      amount_upper_bound: expectedPayment.amountUpperBoundCents,
      direction: expectedPayment.direction,
      description: expectedPayment.description,
      counterparty_id: expectedPayment.counterpartyId,
      date_lower_bound: expectedPayment.dateLowerBound,
      date_upper_bound: expectedPayment.dateUpperBound,
    });

    return mapMTExpectedPayment(response);
  }

  async listExpectedPayments(request: ListExpectedPaymentsRequest): Promise<ListExpectedPaymentsResponse> {
    if (this.sandbox) {
      const { MockPaymentOperationsAdapter } = await import('./mock-adapter.ts');
      return new MockPaymentOperationsAdapter().listExpectedPayments(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/expected_payments?per_page=${limit}&page=${Math.floor(offset / limit) + 1}`;
    if (request.status) path += `&status=${request.status}`;

    const response = await this.request<MTExpectedPayment[]>('GET', path);
    return { expectedPayments: response.map(mapMTExpectedPayment), total: response.length };
  }
}

// =============================================================================
// SHARED MAPPERS
// =============================================================================

function mapMTPaymentOrder(po: MTPaymentOrder): PaymentOrder {
  return {
    paymentOrderId: po.id,
    direction: po.direction as 'credit' | 'debit',
    type: po.type as 'ach' | 'wire' | 'rtp' | 'check' | 'eft',
    amountCents: po.amount,
    currency: po.currency,
    description: po.description ?? '',
    status: mapMTStatus(po.status),
    priority: mapMTPriority(po.priority),
    originatingAccountId: po.originating_account_id,
    receivingAccountId: po.receiving_account_id,
    counterpartyId: po.counterparty_id,
    referenceNumbers: po.reference_numbers.map(r => r.reference_number),
    effectiveDate: po.effective_date,
    processAfterDate: po.process_after,
    metadata: po.metadata,
    createdAt: po.created_at,
    updatedAt: po.updated_at,
  };
}

function mapMTCounterparty(cp: MTCounterparty): Counterparty {
  return {
    counterpartyId: cp.id,
    name: cp.name,
    type: mapMTCounterpartyType(cp.counterparty_type),
    email: cp.email,
    accounts: cp.accounts.map(a => ({
      accountNumber: a.account_details[0]?.account_number ?? '',
      accountNumberMasked: maskAccountNumber(a.account_details[0]?.account_number ?? '0000'),
      routingNumber: a.routing_details[0]?.routing_number ?? '',
      accountType: (a.account_type as 'checking' | 'savings') ?? 'other',
    })),
    metadata: cp.metadata,
    createdAt: cp.created_at,
    updatedAt: cp.updated_at,
  };
}

function mapMTExpectedPayment(ep: MTExpectedPayment): ExpectedPayment {
  return {
    expectedPaymentId: ep.id,
    amountLowerBoundCents: ep.amount_lower_bound,
    amountUpperBoundCents: ep.amount_upper_bound,
    direction: ep.direction as 'credit' | 'debit',
    description: ep.description,
    status: mapMTReconciliationStatus(ep.status),
    counterpartyId: ep.counterparty_id,
    reconciledTransactionId: ep.transaction_id,
    dateLowerBound: ep.date_lower_bound,
    dateUpperBound: ep.date_upper_bound,
    createdAt: ep.created_at,
  };
}
