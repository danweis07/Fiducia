// TODO: Provisional integration — not yet validated in production.
/**
 * FedNow Instant Payments Adapter
 *
 * Integrates with the Federal Reserve's FedNow Service for real-time
 * payment processing using ISO 20022 messaging.
 *
 * Requirements:
 *   - FEDNOW_PARTICIPANT_ID: FedNow participant identifier
 *   - FEDNOW_API_URL: FedNow Service API endpoint
 *   - FEDNOW_CERT_PATH: Path to participant TLS certificate
 *   - FEDNOW_ROUTING_NUMBER: Institution routing number
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
// FEDNOW ISO 20022 TYPE MAPPINGS
// =============================================================================

/** Maps FedNow transaction status codes to our canonical status */
function mapFedNowStatus(fedNowStatus: string): InstantPaymentStatus {
  switch (fedNowStatus) {
    case 'ACCP': return 'accepted';
    case 'ACSC': return 'completed';
    case 'RJCT': return 'rejected';
    case 'PDNG': return 'pending';
    case 'RTRN': return 'returned';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FedNowAdapter implements InstantPaymentAdapter {
  private readonly apiUrl: string;
  private readonly participantId: string;
  private readonly routingNumber: string;

  readonly config: AdapterConfig = {
    id: 'fednow',
    name: 'FedNow Instant Payments',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 15000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('FEDNOW_API_URL') ?? '';
    this.participantId = Deno.env.get('FEDNOW_PARTICIPANT_ID') ?? '';
    this.routingNumber = Deno.env.get('FEDNOW_ROUTING_NUMBER') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        headers: { 'X-Participant-Id': this.participantId },
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
        errorMessage: error instanceof Error ? error.message : 'FedNow health check failed',
      };
    }
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const iso20022Message = {
      FIToFICstmrCdtTrf: {
        GrpHdr: {
          MsgId: request.idempotencyKey,
          CreDtTm: new Date().toISOString(),
          NbOfTxs: '1',
          SttlmInf: { SttlmMtd: 'CLRG' },
        },
        CdtTrfTxInf: {
          PmtId: { EndToEndId: request.idempotencyKey },
          Amt: { InstdAmt: { value: request.amountCents / 100, Ccy: request.currency ?? 'USD' } },
          DbtrAgt: { FinInstnId: { ClrSysMmbId: { MmbId: this.routingNumber } } },
          CdtrAgt: { FinInstnId: { ClrSysMmbId: { MmbId: request.receiverRoutingNumber } } },
          Cdtr: { Nm: request.receiverName },
          CdtrAcct: { Id: { Othr: { Id: request.receiverAccountNumber } } },
          RmtInf: { Ustrd: request.description },
        },
      },
    };

    const response = await fetch(`${this.apiUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Participant-Id': this.participantId,
        'X-Idempotency-Key': request.idempotencyKey,
      },
      body: JSON.stringify(iso20022Message),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`FedNow payment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const payment: InstantPayment = {
      paymentId: result.paymentId ?? request.idempotencyKey,
      networkMessageId: result.messageId ?? null,
      rail: 'fednow',
      direction: 'outbound',
      status: mapFedNowStatus(result.status ?? 'PDNG'),
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
      completedAt: result.status === 'ACSC' ? new Date().toISOString() : null,
    };

    return { payment };
  }

  async getPayment(request: GetPaymentRequest): Promise<InstantPayment> {
    const response = await fetch(`${this.apiUrl}/payments/${request.paymentId}`, {
      method: 'GET',
      headers: { 'X-Participant-Id': this.participantId },
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`FedNow getPayment failed (${response.status})`);
    }

    const result = await response.json();
    return {
      paymentId: result.paymentId,
      networkMessageId: result.messageId ?? null,
      rail: 'fednow',
      direction: result.direction ?? 'outbound',
      status: mapFedNowStatus(result.status),
      amountCents: Math.round(result.amount * 100),
      currency: result.currency ?? 'USD',
      senderRoutingNumber: result.senderRouting ?? '',
      senderAccountMasked: result.senderAccountMasked ?? '',
      senderName: result.senderName ?? '',
      receiverRoutingNumber: result.receiverRouting ?? '',
      receiverAccountMasked: result.receiverAccountMasked ?? '',
      receiverName: result.receiverName ?? '',
      description: result.description ?? '',
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

    const response = await fetch(`${this.apiUrl}/payments?${params}`, {
      method: 'GET',
      headers: { 'X-Participant-Id': this.participantId },
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`FedNow listPayments failed (${response.status})`);
    }

    const result = await response.json();
    return {
      payments: (result.payments ?? []).map((p: Record<string, unknown>) => ({
        paymentId: p.paymentId as string,
        networkMessageId: (p.messageId as string) ?? null,
        rail: 'fednow' as const,
        direction: (p.direction as string) ?? 'outbound',
        status: mapFedNowStatus(p.status as string),
        amountCents: Math.round((p.amount as number) * 100),
        currency: (p.currency as string) ?? 'USD',
        senderRoutingNumber: (p.senderRouting as string) ?? '',
        senderAccountMasked: (p.senderAccountMasked as string) ?? '',
        senderName: (p.senderName as string) ?? '',
        receiverRoutingNumber: (p.receiverRouting as string) ?? '',
        receiverAccountMasked: (p.receiverAccountMasked as string) ?? '',
        receiverName: (p.receiverName as string) ?? '',
        description: (p.description as string) ?? '',
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
    const response = await fetch(`${this.apiUrl}/participants/${request.routingNumber}`, {
      method: 'GET',
      headers: { 'X-Participant-Id': this.participantId },
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      return { eligible: false, availableRails: [], institutionName: null };
    }

    const result = await response.json();
    return {
      eligible: result.active === true,
      availableRails: result.active ? ['fednow'] : [],
      institutionName: result.institutionName ?? null,
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const response = await fetch(`${this.apiUrl}/rfp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Participant-Id': this.participantId,
      },
      body: JSON.stringify({
        payerRouting: request.payerRoutingNumber,
        payerAccount: request.payerAccountNumber,
        payerName: request.payerName,
        amount: request.amountCents / 100,
        description: request.description,
        expiresAt: request.expiresAt,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`FedNow RfP failed (${response.status})`);
    }

    const result = await response.json();
    const rfp: RequestForPayment = {
      rfpId: result.rfpId,
      rail: 'fednow',
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
