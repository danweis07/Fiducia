// TODO: Provisional integration — not yet validated in production.
/**
 * RTP (Real-Time Payments) Adapter
 *
 * Integrates with The Clearing House (TCH) Real-Time Payments network
 * for instant credit transfers and Request for Payment.
 *
 * Requirements:
 *   - RTP_API_URL: TCH RTP API endpoint
 *   - RTP_PARTICIPANT_ID: RTP participant identifier
 *   - RTP_API_KEY: API authentication key
 *   - RTP_ROUTING_NUMBER: Institution routing number
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InstantPaymentAdapter,
  InstantPayment,
  InstantPaymentStatus,
  SendPaymentRequest,
  SendPaymentResponse,
  GetPaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  CheckReceiverRequest,
  CheckReceiverResponse,
  SendRfPRequest,
  SendRfPResponse,
  RequestForPayment,
} from './types.ts';

// =============================================================================
// RTP STATUS MAPPINGS
// =============================================================================

function mapRTPStatus(rtpStatus: string): InstantPaymentStatus {
  switch (rtpStatus) {
    case 'ACCEPTED': return 'accepted';
    case 'COMPLETED':
    case 'SETTLED': return 'completed';
    case 'REJECTED': return 'rejected';
    case 'PENDING': return 'pending';
    case 'RETURNED': return 'returned';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class RTPAdapter implements InstantPaymentAdapter {
  private readonly apiUrl: string;
  private readonly participantId: string;
  private readonly apiKey: string;
  private readonly routingNumber: string;

  readonly config: AdapterConfig = {
    id: 'rtp',
    name: 'TCH Real-Time Payments',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('RTP_API_URL') ?? '';
    this.participantId = Deno.env.get('RTP_PARTICIPANT_ID') ?? '';
    this.apiKey = Deno.env.get('RTP_API_KEY') ?? '';
    this.routingNumber = Deno.env.get('RTP_ROUTING_NUMBER') ?? '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Participant-Id': this.participantId,
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      return {
        adapterId: this.config.id,
        healthy: response.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'RTP health check failed',
      };
    }
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const response = await fetch(`${this.apiUrl}/v1/credits`, {
      method: 'POST',
      headers: { ...this.headers(), 'X-Idempotency-Key': request.idempotencyKey },
      body: JSON.stringify({
        endToEndId: request.idempotencyKey,
        amount: request.amountCents,
        currency: request.currency ?? 'USD',
        debtorRouting: this.routingNumber,
        debtorAccount: request.sourceAccountId,
        creditorRouting: request.receiverRoutingNumber,
        creditorAccount: request.receiverAccountNumber,
        creditorName: request.receiverName,
        remittanceInfo: request.description,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`RTP payment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const payment: InstantPayment = {
      paymentId: result.paymentId ?? request.idempotencyKey,
      networkMessageId: result.messageId ?? null,
      rail: 'rtp',
      direction: 'outbound',
      status: mapRTPStatus(result.status ?? 'PENDING'),
      amountCents: request.amountCents,
      currency: request.currency ?? 'USD',
      senderRoutingNumber: this.routingNumber,
      senderAccountMasked: `****${request.sourceAccountId.slice(-4)}`,
      senderName: '',
      receiverRoutingNumber: request.receiverRoutingNumber,
      receiverAccountMasked: `****${request.receiverAccountNumber.slice(-4)}`,
      receiverName: request.receiverName,
      description: request.description,
      rejectionReason: null,
      rejectionDetail: null,
      createdAt: new Date().toISOString(),
      completedAt: result.status === 'COMPLETED' ? new Date().toISOString() : null,
    };
    return { payment };
  }

  async getPayment(request: GetPaymentRequest): Promise<InstantPayment> {
    const response = await fetch(`${this.apiUrl}/v1/credits/${request.paymentId}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`RTP getPayment failed (${response.status})`);
    }

    const result = await response.json();
    return {
      paymentId: result.paymentId,
      networkMessageId: result.messageId ?? null,
      rail: 'rtp',
      direction: result.direction ?? 'outbound',
      status: mapRTPStatus(result.status),
      amountCents: result.amount,
      currency: result.currency ?? 'USD',
      senderRoutingNumber: result.debtorRouting ?? '',
      senderAccountMasked: result.debtorAccountMasked ?? '',
      senderName: result.debtorName ?? '',
      receiverRoutingNumber: result.creditorRouting ?? '',
      receiverAccountMasked: result.creditorAccountMasked ?? '',
      receiverName: result.creditorName ?? '',
      description: result.remittanceInfo ?? '',
      rejectionReason: result.rejectionReason ?? null,
      rejectionDetail: result.rejectionDetail ?? null,
      createdAt: result.createdAt,
      completedAt: result.completedAt ?? null,
    };
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    if (request.accountId) params.set('accountId', request.accountId);
    if (request.direction) params.set('direction', request.direction);
    if (request.status) params.set('status', request.status);
    if (request.startDate) params.set('startDate', request.startDate);
    if (request.endDate) params.set('endDate', request.endDate);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.cursor) params.set('cursor', request.cursor);

    const response = await fetch(`${this.apiUrl}/v1/credits?${params}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`RTP listPayments failed (${response.status})`);
    }

    const result = await response.json();
    return {
      payments: (result.payments ?? []).map((p: Record<string, unknown>) => ({
        paymentId: p.paymentId as string,
        networkMessageId: (p.messageId as string) ?? null,
        rail: 'rtp' as const,
        direction: (p.direction as string) ?? 'outbound',
        status: mapRTPStatus(p.status as string),
        amountCents: p.amount as number,
        currency: (p.currency as string) ?? 'USD',
        senderRoutingNumber: (p.debtorRouting as string) ?? '',
        senderAccountMasked: (p.debtorAccountMasked as string) ?? '',
        senderName: (p.debtorName as string) ?? '',
        receiverRoutingNumber: (p.creditorRouting as string) ?? '',
        receiverAccountMasked: (p.creditorAccountMasked as string) ?? '',
        receiverName: (p.creditorName as string) ?? '',
        description: (p.remittanceInfo as string) ?? '',
        rejectionReason: (p.rejectionReason as string) ?? null,
        rejectionDetail: (p.rejectionDetail as string) ?? null,
        createdAt: p.createdAt as string,
        completedAt: (p.completedAt as string) ?? null,
      })),
      total: result.total ?? 0,
      hasMore: result.hasMore ?? false,
      nextCursor: result.nextCursor ?? null,
    };
  }

  async checkReceiver(request: CheckReceiverRequest): Promise<CheckReceiverResponse> {
    const response = await fetch(`${this.apiUrl}/v1/participants/${request.routingNumber}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      return { eligible: false, availableRails: [], institutionName: null };
    }

    const result = await response.json();
    return {
      eligible: result.active === true,
      availableRails: result.active ? ['rtp'] : [],
      institutionName: result.participantName ?? null,
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const response = await fetch(`${this.apiUrl}/v1/rfp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        payerRouting: request.payerRoutingNumber,
        payerAccount: request.payerAccountNumber,
        payerName: request.payerName,
        amount: request.amountCents,
        description: request.description,
        expiresAt: request.expiresAt,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`RTP RfP failed (${response.status})`);
    }

    const result = await response.json();
    const rfp: RequestForPayment = {
      rfpId: result.rfpId,
      rail: 'rtp',
      status: 'pending',
      amountCents: request.amountCents,
      currency: 'USD',
      requesterName: '',
      requesterAccountMasked: '',
      payerName: request.payerName,
      description: request.description,
      expiresAt: request.expiresAt,
      createdAt: new Date().toISOString(),
      resultingPaymentId: null,
    };
    return { rfp };
  }
}
