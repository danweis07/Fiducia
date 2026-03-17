/**
 * Mock Instant Payments Adapter
 *
 * Returns synthetic instant payment data for sandbox/testing when no
 * FedNow or RTP credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InstantPaymentAdapter,
  InstantPayment,
  RequestForPayment,
  SendPaymentRequest,
  SendPaymentResponse,
  GetPaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  CheckReceiverRequest,
  CheckReceiverResponse,
  SendRfPRequest,
  SendRfPResponse,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function mockPayment(overrides: Partial<InstantPayment> = {}): InstantPayment {
  return {
    paymentId: 'IP-MOCK-001',
    networkMessageId: 'FEDNOW-MSG-20260315-001',
    rail: 'fednow',
    direction: 'outbound',
    status: 'completed',
    amountCents: 25000,
    currency: 'USD',
    senderRoutingNumber: '021000021',
    senderAccountMasked: '****6789',
    senderName: 'JOHN Q MEMBER',
    receiverRoutingNumber: '071000013',
    receiverAccountMasked: '****4321',
    receiverName: 'JANE DOE',
    description: 'Rent payment March 2026',
    rejectionReason: null,
    rejectionDetail: null,
    createdAt: '2026-03-15T10:30:00Z',
    completedAt: '2026-03-15T10:30:04Z',
    ...overrides,
  };
}

function mockPayments(): InstantPayment[] {
  return [
    mockPayment(),
    mockPayment({
      paymentId: 'IP-MOCK-002',
      networkMessageId: 'RTP-MSG-20260314-001',
      rail: 'rtp',
      direction: 'inbound',
      amountCents: 150000,
      senderRoutingNumber: '071000013',
      senderAccountMasked: '****8765',
      senderName: 'ACME CORP',
      receiverRoutingNumber: '021000021',
      receiverAccountMasked: '****6789',
      receiverName: 'JOHN Q MEMBER',
      description: 'Payroll deposit',
      createdAt: '2026-03-14T08:00:00Z',
      completedAt: '2026-03-14T08:00:03Z',
    }),
    mockPayment({
      paymentId: 'IP-MOCK-003',
      networkMessageId: 'FEDNOW-MSG-20260313-001',
      rail: 'fednow',
      direction: 'outbound',
      status: 'rejected',
      amountCents: 500000,
      receiverName: 'UNKNOWN RECIPIENT',
      description: 'Wire transfer attempt',
      rejectionReason: 'invalid_account',
      rejectionDetail: 'Receiver account not found at receiving institution',
      createdAt: '2026-03-13T14:22:00Z',
      completedAt: null,
    }),
    mockPayment({
      paymentId: 'IP-MOCK-004',
      networkMessageId: 'SEPA-SCT-20260315-001',
      rail: 'sepa_instant',
      direction: 'outbound',
      amountCents: 75000,
      currency: 'EUR',
      senderRoutingNumber: 'DEUTDEFF',
      senderAccountMasked: '****4567',
      senderName: 'HANS MUELLER',
      receiverRoutingNumber: 'BNPAFRPP',
      receiverAccountMasked: '****8901',
      receiverName: 'MARIE DUPONT',
      description: 'Invoice payment EU-2026-042',
      createdAt: '2026-03-15T12:00:00Z',
      completedAt: '2026-03-15T12:00:07Z',
    }),
    mockPayment({
      paymentId: 'IP-MOCK-005',
      networkMessageId: 'PIX-E2E-20260315-001',
      rail: 'pix',
      direction: 'inbound',
      amountCents: 50000,
      currency: 'BRL',
      senderRoutingNumber: '00000000',
      senderAccountMasked: '****2345',
      senderName: 'JOAO SILVA',
      receiverRoutingNumber: '60701190',
      receiverAccountMasked: '****6789',
      receiverName: 'MARIA SANTOS',
      description: 'Pagamento aluguel',
      createdAt: '2026-03-15T09:15:00Z',
      completedAt: '2026-03-15T09:15:02Z',
    }),
    mockPayment({
      paymentId: 'IP-MOCK-006',
      networkMessageId: 'UPI-RRN-20260315-001',
      rail: 'upi',
      direction: 'outbound',
      amountCents: 200000,
      currency: 'INR',
      senderRoutingNumber: '',
      senderAccountMasked: '****7890',
      senderName: 'RAJESH KUMAR',
      receiverRoutingNumber: 'SBIN0001234',
      receiverAccountMasked: 'priya****@upi',
      receiverName: 'PRIYA SHARMA',
      description: 'Rent payment March',
      createdAt: '2026-03-15T06:30:00Z',
      completedAt: '2026-03-15T06:30:01Z',
    }),
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockInstantPaymentAdapter implements InstantPaymentAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-instant-payments',
    name: 'Mock Instant Payments Adapter',
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
      errorMessage: 'Running in sandbox mode',
    };
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const now = new Date().toISOString();
    const payment = mockPayment({
      paymentId: `IP-MOCK-${Date.now()}`,
      networkMessageId: `FEDNOW-MSG-${Date.now()}`,
      rail: request.preferredRail ?? 'fednow',
      direction: 'outbound',
      status: 'completed',
      amountCents: request.amountCents,
      currency: request.currency ?? 'USD',
      receiverRoutingNumber: request.receiverRoutingNumber,
      receiverAccountMasked: `****${request.receiverAccountNumber.slice(-4)}`,
      receiverName: request.receiverName,
      description: request.description,
      createdAt: now,
      completedAt: now,
    });
    return { payment };
  }

  async getPayment(request: GetPaymentRequest): Promise<InstantPayment> {
    const payments = mockPayments();
    return payments.find(p => p.paymentId === request.paymentId) ?? mockPayment({ paymentId: request.paymentId });
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    let payments = mockPayments();
    if (request.direction) payments = payments.filter(p => p.direction === request.direction);
    if (request.status) payments = payments.filter(p => p.status === request.status);
    if (request.startDate) payments = payments.filter(p => p.createdAt >= request.startDate!);
    if (request.endDate) payments = payments.filter(p => p.createdAt <= request.endDate!);
    const limit = request.limit ?? 50;
    return {
      payments: payments.slice(0, limit),
      total: payments.length,
      hasMore: payments.length > limit,
      nextCursor: null,
    };
  }

  async checkReceiver(_request: CheckReceiverRequest): Promise<CheckReceiverResponse> {
    return {
      eligible: true,
      availableRails: ['fednow', 'rtp', 'sepa_instant', 'pix', 'upi'],
      institutionName: 'Mock National Bank',
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const rfp: RequestForPayment = {
      rfpId: `RFP-MOCK-${Date.now()}`,
      rail: request.preferredRail ?? 'rtp',
      status: 'pending',
      amountCents: request.amountCents,
      currency: 'USD',
      requesterName: 'JOHN Q MEMBER',
      requesterAccountMasked: '****6789',
      payerName: request.payerName,
      description: request.description,
      expiresAt: request.expiresAt,
      createdAt: new Date().toISOString(),
      resultingPaymentId: null,
    };
    return { rfp };
  }
}
