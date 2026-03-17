// TODO: Provisional integration — not yet validated in production.
/**
 * UPI (Unified Payments Interface) Adapter — India
 *
 * Integrates with NPCI's UPI system for real-time INR payments.
 * UPI processes billions of mobile interbank payments monthly and is
 * the primary instant payment rail in India's digital economy.
 *
 * Supports:
 *   - VPA (Virtual Payment Address) based payments
 *   - Account + IFSC based payments
 *   - Collect requests (Request for Payment)
 *   - Transaction status inquiry
 *
 * Requirements:
 *   - UPI_API_URL: PSP (Payment Service Provider) API endpoint
 *   - UPI_API_KEY: API authentication key
 *   - UPI_PSP_ID: PSP identifier (e.g., registered with NPCI)
 *   - UPI_MERCHANT_VPA: Institution's UPI VPA handle
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
// UPI STATUS MAPPINGS
// =============================================================================

function mapUPIStatus(upiStatus: string): InstantPaymentStatus {
  switch (upiStatus) {
    case 'SUCCESS':
    case 'COMPLETED': return 'completed';
    case 'PENDING':
    case 'INITIATED':
    case 'DEEMED': return 'pending';
    case 'FAILURE':
    case 'FAILED': return 'rejected';
    case 'EXPIRED': return 'failed';
    case 'REFUND':
    case 'REVERSED': return 'returned';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class UPIAdapter implements InstantPaymentAdapter {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly pspId: string;
  private readonly merchantVPA: string;

  readonly config: AdapterConfig = {
    id: 'upi',
    name: 'UPI Instant Payments (India)',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 30000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('UPI_API_URL') ?? '';
    this.apiKey = Deno.env.get('UPI_API_KEY') ?? '';
    this.pspId = Deno.env.get('UPI_PSP_ID') ?? '';
    this.merchantVPA = Deno.env.get('UPI_MERCHANT_VPA') ?? '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-PSP-Id': this.pspId,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${this.apiUrl}/v1/health`, {
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
        errorMessage: error instanceof Error ? error.message : 'UPI health check failed',
      };
    }
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const receiverVPA = request.receiverVPA ?? '';
    const receiverIFSC = request.receiverIFSC ?? request.receiverRoutingNumber;

    const upiPayload: Record<string, unknown> = {
      txnId: request.idempotencyKey,
      payerVpa: this.merchantVPA,
      payerAccount: request.sourceAccountId,
      payeeName: request.receiverName,
      amount: (request.amountCents / 100).toFixed(2),
      currency: request.currency ?? 'INR',
      note: request.description,
    };

    if (receiverVPA) {
      upiPayload.payeeVpa = receiverVPA;
    } else {
      upiPayload.payeeAccount = request.receiverAccountNumber;
      upiPayload.payeeIFSC = receiverIFSC;
    }

    const response = await fetch(`${this.apiUrl}/v1/pay`, {
      method: 'POST',
      headers: { ...this.headers(), 'X-Idempotency-Key': request.idempotencyKey },
      body: JSON.stringify(upiPayload),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`UPI payment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const payment: InstantPayment = {
      paymentId: result.txnId ?? request.idempotencyKey,
      networkMessageId: result.rrn ?? result.npciTxnId ?? null,
      rail: 'upi',
      direction: 'outbound',
      status: mapUPIStatus(result.status ?? 'PENDING'),
      amountCents: request.amountCents,
      currency: request.currency ?? 'INR',
      senderRoutingNumber: '',
      senderAccountMasked: `****${request.sourceAccountId.slice(-4)}`,
      senderName: '',
      receiverRoutingNumber: receiverIFSC,
      receiverAccountMasked: receiverVPA
        ? `${receiverVPA.split('@')[0].slice(0, -4)}****@${receiverVPA.split('@')[1] ?? ''}`
        : `****${request.receiverAccountNumber.slice(-4)}`,
      receiverName: request.receiverName,
      description: request.description,
      rejectionReason: null,
      rejectionDetail: null,
      createdAt: new Date().toISOString(),
      completedAt: result.status === 'SUCCESS' ? new Date().toISOString() : null,
    };

    return { payment };
  }

  async getPayment(request: GetPaymentRequest): Promise<InstantPayment> {
    const response = await fetch(`${this.apiUrl}/v1/transactions/${request.paymentId}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`UPI getPayment failed (${response.status})`);
    }

    const result = await response.json();
    return {
      paymentId: result.txnId,
      networkMessageId: result.rrn ?? result.npciTxnId ?? null,
      rail: 'upi',
      direction: result.type === 'CREDIT' ? 'inbound' : 'outbound',
      status: mapUPIStatus(result.status),
      amountCents: Math.round(parseFloat(result.amount ?? '0') * 100),
      currency: result.currency ?? 'INR',
      senderRoutingNumber: result.payerIFSC ?? '',
      senderAccountMasked: result.payerAccountMasked ?? result.payerVpa ?? '',
      senderName: result.payerName ?? '',
      receiverRoutingNumber: result.payeeIFSC ?? '',
      receiverAccountMasked: result.payeeAccountMasked ?? result.payeeVpa ?? '',
      receiverName: result.payeeName ?? '',
      description: result.note ?? '',
      rejectionReason: result.errorCode ?? null,
      rejectionDetail: result.errorMessage ?? null,
      createdAt: result.createdAt ?? new Date().toISOString(),
      completedAt: result.completedAt ?? null,
    };
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    if (request.accountId) params.set('accountId', request.accountId);
    if (request.direction) params.set('type', request.direction === 'inbound' ? 'CREDIT' : 'DEBIT');
    if (request.status) params.set('status', request.status.toUpperCase());
    if (request.startDate) params.set('startDate', request.startDate);
    if (request.endDate) params.set('endDate', request.endDate);
    if (request.limit) params.set('limit', String(request.limit));
    if (request.cursor) params.set('offset', request.cursor);

    const response = await fetch(`${this.apiUrl}/v1/transactions?${params}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`UPI listPayments failed (${response.status})`);
    }

    const result = await response.json();
    return {
      payments: (result.transactions ?? []).map((p: Record<string, unknown>) => ({
        paymentId: p.txnId as string,
        networkMessageId: (p.rrn as string) ?? (p.npciTxnId as string) ?? null,
        rail: 'upi' as const,
        direction: p.type === 'CREDIT' ? 'inbound' : 'outbound',
        status: mapUPIStatus(p.status as string),
        amountCents: Math.round(parseFloat((p.amount as string) ?? '0') * 100),
        currency: (p.currency as string) ?? 'INR',
        senderRoutingNumber: (p.payerIFSC as string) ?? '',
        senderAccountMasked: (p.payerAccountMasked as string) ?? (p.payerVpa as string) ?? '',
        senderName: (p.payerName as string) ?? '',
        receiverRoutingNumber: (p.payeeIFSC as string) ?? '',
        receiverAccountMasked: (p.payeeAccountMasked as string) ?? (p.payeeVpa as string) ?? '',
        receiverName: (p.payeeName as string) ?? '',
        description: (p.note as string) ?? '',
        rejectionReason: (p.errorCode as string) ?? null,
        rejectionDetail: (p.errorMessage as string) ?? null,
        createdAt: p.createdAt as string,
        completedAt: (p.completedAt as string) ?? null,
      })),
      total: result.total ?? 0,
      hasMore: result.hasMore ?? false,
      nextCursor: result.nextOffset ?? null,
    };
  }

  async checkReceiver(request: CheckReceiverRequest): Promise<CheckReceiverResponse> {
    const vpa = request.receiverVPA ?? request.accountNumber;

    const response = await fetch(`${this.apiUrl}/v1/vpa/verify`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ vpa }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      return { eligible: false, availableRails: [], institutionName: null };
    }

    const result = await response.json();
    return {
      eligible: result.valid === true,
      availableRails: result.valid ? ['upi'] : [],
      institutionName: result.pspName ?? null,
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const response = await fetch(`${this.apiUrl}/v1/collect`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        payerVpa: request.payerAccountNumber,
        payerName: request.payerName,
        payeeVpa: this.merchantVPA,
        amount: (request.amountCents / 100).toFixed(2),
        currency: 'INR',
        note: request.description,
        expiresAt: request.expiresAt,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`UPI collect request failed (${response.status})`);
    }

    const result = await response.json();
    const rfp: RequestForPayment = {
      rfpId: result.txnId ?? result.collectId,
      rail: 'upi',
      status: 'pending',
      amountCents: request.amountCents,
      currency: 'INR',
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
