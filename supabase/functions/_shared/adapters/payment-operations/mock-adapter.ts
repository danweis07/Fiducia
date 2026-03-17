/**
 * Mock Payment Operations Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  PaymentOperationsAdapter,
  PaymentOrder,
  Counterparty,
  ExpectedPayment,
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

export class MockPaymentOperationsAdapter implements PaymentOperationsAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-payment-operations',
    name: 'Mock Payment Operations',
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

  async createPaymentOrder(request: CreatePaymentOrderRequest): Promise<PaymentOrder> {
    return {
      paymentOrderId: `po_mock_${Date.now()}`,
      direction: request.order.direction,
      type: request.order.type,
      amountCents: request.order.amountCents,
      currency: request.order.currency ?? 'USD',
      description: request.order.description,
      status: 'pending_approval',
      priority: request.order.priority ?? 'normal',
      originatingAccountId: request.order.originatingAccountId,
      receivingAccountId: request.order.receivingAccountId ?? null,
      counterpartyId: request.order.counterpartyId ?? null,
      referenceNumbers: [],
      effectiveDate: request.order.effectiveDate ?? null,
      processAfterDate: null,
      metadata: request.order.metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async getPaymentOrder(request: GetPaymentOrderRequest): Promise<PaymentOrder> {
    return {
      paymentOrderId: request.paymentOrderId,
      direction: 'credit',
      type: 'ach',
      amountCents: 500000,
      currency: 'USD',
      description: 'Mock payment order',
      status: 'completed',
      priority: 'normal',
      originatingAccountId: 'acct_mock_1',
      receivingAccountId: null,
      counterpartyId: 'cp_mock_1',
      referenceNumbers: ['REF123'],
      effectiveDate: new Date().toISOString(),
      processAfterDate: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async listPaymentOrders(request: ListPaymentOrdersRequest): Promise<ListPaymentOrdersResponse> {
    const orders: PaymentOrder[] = Array.from({ length: 3 }, (_, i) => ({
      paymentOrderId: `po_mock_${i + 1}`,
      direction: i % 2 === 0 ? 'credit' as const : 'debit' as const,
      type: 'ach' as const,
      amountCents: (i + 1) * 250000,
      currency: 'USD',
      description: `Payment order #${i + 1}`,
      status: 'completed' as const,
      priority: 'normal' as const,
      originatingAccountId: 'acct_mock_1',
      receivingAccountId: null,
      counterpartyId: `cp_mock_${i + 1}`,
      referenceNumbers: [],
      effectiveDate: new Date().toISOString(),
      processAfterDate: null,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { orders: orders.slice(offset, offset + limit), total: orders.length };
  }

  async createCounterparty(request: CreateCounterpartyRequest): Promise<Counterparty> {
    return {
      counterpartyId: `cp_mock_${Date.now()}`,
      name: request.counterparty.name,
      type: request.counterparty.type,
      email: request.counterparty.email ?? null,
      accounts: request.counterparty.accounts,
      metadata: request.counterparty.metadata ?? {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  async listCounterparties(request: ListCounterpartiesRequest): Promise<ListCounterpartiesResponse> {
    const counterparties: Counterparty[] = [
      {
        counterpartyId: 'cp_mock_1',
        name: 'Acme Corp',
        type: 'business',
        email: 'payments@acme.example',
        accounts: [{ accountNumber: '1234567890', accountNumberMasked: '****7890', routingNumber: '021000021', accountType: 'checking' }],
        metadata: {},
        createdAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      },
    ];

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { counterparties: counterparties.slice(offset, offset + limit), total: counterparties.length };
  }

  async createExpectedPayment(request: CreateExpectedPaymentRequest): Promise<ExpectedPayment> {
    return {
      expectedPaymentId: `ep_mock_${Date.now()}`,
      amountLowerBoundCents: request.expectedPayment.amountLowerBoundCents,
      amountUpperBoundCents: request.expectedPayment.amountUpperBoundCents,
      direction: request.expectedPayment.direction,
      description: request.expectedPayment.description ?? null,
      status: 'unreconciled',
      counterpartyId: request.expectedPayment.counterpartyId ?? null,
      reconciledTransactionId: null,
      dateLowerBound: request.expectedPayment.dateLowerBound ?? null,
      dateUpperBound: request.expectedPayment.dateUpperBound ?? null,
      createdAt: new Date().toISOString(),
    };
  }

  async listExpectedPayments(request: ListExpectedPaymentsRequest): Promise<ListExpectedPaymentsResponse> {
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { expectedPayments: [].slice(offset, offset + limit), total: 0 };
  }
}
