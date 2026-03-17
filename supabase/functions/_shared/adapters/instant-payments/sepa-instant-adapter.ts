// TODO: Provisional integration — not yet validated in production.
/**
 * SEPA Instant Credit Transfer (SCT Inst) Adapter
 *
 * Integrates with the European Payments Council's SEPA Instant Credit
 * Transfer scheme for real-time Euro payments across 36 countries,
 * settling in under 10 seconds (24/7/365).
 *
 * Uses ISO 20022 pain.001 / pacs.008 messaging over the CSM (Clearing
 * and Settlement Mechanism) — typically EBA RT1 or TIPS.
 *
 * Requirements:
 *   - SEPA_INSTANT_API_URL: CSM / PSP gateway endpoint
 *   - SEPA_INSTANT_PARTICIPANT_BIC: Institution's SWIFT BIC
 *   - SEPA_INSTANT_API_KEY: API authentication credential
 *   - SEPA_INSTANT_IBAN: Institution's settlement IBAN
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
// SEPA INSTANT STATUS MAPPINGS (ISO 20022 pacs.002)
// =============================================================================

function mapSEPAStatus(sepaStatus: string): InstantPaymentStatus {
  switch (sepaStatus) {
    case 'ACCP': return 'accepted';
    case 'ACSC':
    case 'ACCC': return 'completed';
    case 'RJCT': return 'rejected';
    case 'PDNG':
    case 'ACTC': return 'pending';
    case 'RTRN': return 'returned';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SEPAInstantAdapter implements InstantPaymentAdapter {
  private readonly apiUrl: string;
  private readonly participantBIC: string;
  private readonly apiKey: string;
  private readonly settlementIBAN: string;

  readonly config: AdapterConfig = {
    id: 'sepa_instant',
    name: 'SEPA Instant Credit Transfer',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 10000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('SEPA_INSTANT_API_URL') ?? '';
    this.participantBIC = Deno.env.get('SEPA_INSTANT_PARTICIPANT_BIC') ?? '';
    this.apiKey = Deno.env.get('SEPA_INSTANT_API_KEY') ?? '';
    this.settlementIBAN = Deno.env.get('SEPA_INSTANT_IBAN') ?? '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'X-Participant-BIC': this.participantBIC,
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
        errorMessage: error instanceof Error ? error.message : 'SEPA Instant health check failed',
      };
    }
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const receiverIBAN = request.receiverIBAN ?? request.receiverAccountNumber;
    const receiverBIC = request.receiverBIC ?? '';

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
          Amt: {
            InstdAmt: {
              value: request.amountCents / 100,
              Ccy: request.currency ?? 'EUR',
            },
          },
          DbtrAgt: { FinInstnId: { BICFI: this.participantBIC } },
          DbtrAcct: { Id: { IBAN: this.settlementIBAN } },
          CdtrAgt: { FinInstnId: { BICFI: receiverBIC } },
          Cdtr: { Nm: request.receiverName },
          CdtrAcct: { Id: { IBAN: receiverIBAN } },
          RmtInf: { Ustrd: request.description },
          SvcLvl: { Cd: 'SEPA' },
          LclInstrm: { Cd: 'INST' },
        },
      },
    };

    const response = await fetch(`${this.apiUrl}/v1/instant-credit-transfers`, {
      method: 'POST',
      headers: { ...this.headers(), 'X-Idempotency-Key': request.idempotencyKey },
      body: JSON.stringify(iso20022Message),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`SEPA Instant payment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const payment: InstantPayment = {
      paymentId: result.paymentId ?? request.idempotencyKey,
      networkMessageId: result.messageId ?? null,
      rail: 'sepa_instant',
      direction: 'outbound',
      status: mapSEPAStatus(result.status ?? 'PDNG'),
      amountCents: request.amountCents,
      currency: request.currency ?? 'EUR',
      senderRoutingNumber: this.participantBIC,
      senderAccountMasked: `****${this.settlementIBAN.slice(-4)}`,
      senderName: '',
      receiverRoutingNumber: receiverBIC,
      receiverAccountMasked: `****${receiverIBAN.slice(-4)}`,
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
    const response = await fetch(`${this.apiUrl}/v1/instant-credit-transfers/${request.paymentId}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`SEPA Instant getPayment failed (${response.status})`);
    }

    const result = await response.json();
    return {
      paymentId: result.paymentId,
      networkMessageId: result.messageId ?? null,
      rail: 'sepa_instant',
      direction: result.direction ?? 'outbound',
      status: mapSEPAStatus(result.status),
      amountCents: Math.round((result.amount ?? 0) * 100),
      currency: result.currency ?? 'EUR',
      senderRoutingNumber: result.debtorBIC ?? '',
      senderAccountMasked: result.debtorIBANMasked ?? '',
      senderName: result.debtorName ?? '',
      receiverRoutingNumber: result.creditorBIC ?? '',
      receiverAccountMasked: result.creditorIBANMasked ?? '',
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

    const response = await fetch(`${this.apiUrl}/v1/instant-credit-transfers?${params}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`SEPA Instant listPayments failed (${response.status})`);
    }

    const result = await response.json();
    return {
      payments: (result.payments ?? []).map((p: Record<string, unknown>) => ({
        paymentId: p.paymentId as string,
        networkMessageId: (p.messageId as string) ?? null,
        rail: 'sepa_instant' as const,
        direction: (p.direction as string) ?? 'outbound',
        status: mapSEPAStatus(p.status as string),
        amountCents: Math.round((p.amount as number) * 100),
        currency: (p.currency as string) ?? 'EUR',
        senderRoutingNumber: (p.debtorBIC as string) ?? '',
        senderAccountMasked: (p.debtorIBANMasked as string) ?? '',
        senderName: (p.debtorName as string) ?? '',
        receiverRoutingNumber: (p.creditorBIC as string) ?? '',
        receiverAccountMasked: (p.creditorIBANMasked as string) ?? '',
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
    const iban = request.receiverIBAN ?? request.accountNumber;
    const bic = request.receiverBIC ?? request.routingNumber;

    const response = await fetch(`${this.apiUrl}/v1/participants/verify`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ iban, bic }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      return { eligible: false, availableRails: [], institutionName: null };
    }

    const result = await response.json();
    return {
      eligible: result.reachable === true,
      availableRails: result.reachable ? ['sepa_instant'] : [],
      institutionName: result.institutionName ?? null,
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const response = await fetch(`${this.apiUrl}/v1/request-to-pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        payerIBAN: request.payerAccountNumber,
        payerName: request.payerName,
        amount: request.amountCents / 100,
        currency: 'EUR',
        description: request.description,
        expiresAt: request.expiresAt,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`SEPA Instant RfP failed (${response.status})`);
    }

    const result = await response.json();
    const rfp: RequestForPayment = {
      rfpId: result.rfpId,
      rail: 'sepa_instant',
      status: 'pending',
      amountCents: request.amountCents,
      currency: 'EUR',
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
