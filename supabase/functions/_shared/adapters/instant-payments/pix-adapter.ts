// TODO: Provisional integration — not yet validated in production.
/**
 * Pix Instant Payments Adapter (Brazil)
 *
 * Integrates with the Banco Central do Brasil Pix API for real-time
 * BRL payments. Pix is a 24/7/365 instant payment rail that reaches
 * over 70% of the Brazilian population. Supports payments via:
 *   - Pix keys (CPF/CNPJ, email, phone, EVP/random key)
 *   - Manual entry (ISPB + account)
 *   - QR codes (static and dynamic)
 *
 * Requirements:
 *   - PIX_API_URL: PSP (Payment Service Provider) API endpoint
 *   - PIX_CLIENT_ID: OAuth2 client ID for mTLS authentication
 *   - PIX_CLIENT_SECRET: OAuth2 client secret
 *   - PIX_CERT_PATH: Path to mTLS client certificate (.pem)
 *   - PIX_ISPB: Institution's ISPB code (8 digits)
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
// PIX STATUS MAPPINGS
// =============================================================================

function mapPixStatus(pixStatus: string): InstantPaymentStatus {
  switch (pixStatus) {
    case 'ATIVA':
    case 'CONCLUIDA': return 'completed';
    case 'EM_PROCESSAMENTO': return 'pending';
    case 'NAO_REALIZADO':
    case 'REJEITADA': return 'rejected';
    case 'DEVOLVIDA': return 'returned';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PixAdapter implements InstantPaymentAdapter {
  private readonly apiUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly ispb: string;

  readonly config: AdapterConfig = {
    id: 'pix',
    name: 'Pix Instant Payments (Brazil)',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 10000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('PIX_API_URL') ?? '';
    this.clientId = Deno.env.get('PIX_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('PIX_CLIENT_SECRET') ?? '';
    this.ispb = Deno.env.get('PIX_ISPB') ?? '';
  }

  private headers(accessToken: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    };
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.apiUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'pix.write pix.read',
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Pix OAuth token request failed (${response.status})`);
    }

    const result = await response.json();
    return result.access_token;
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.apiUrl}/v2/health`, {
        method: 'GET',
        headers: this.headers(token),
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
        errorMessage: error instanceof Error ? error.message : 'Pix health check failed',
      };
    }
  }

  async sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse> {
    const token = await this.getAccessToken();
    const pixKey = request.pixKey ?? request.receiverAccountNumber;

    const pixPayload: Record<string, unknown> = {
      valor: {
        original: (request.amountCents / 100).toFixed(2),
      },
      chave: pixKey,
      devedor: {
        nome: request.receiverName,
      },
      infoAdicionais: [
        { nome: 'Descricao', valor: request.description },
      ],
    };

    if (request.pixKeyType) {
      pixPayload.tipoChave = request.pixKeyType;
    }

    const response = await fetch(`${this.apiUrl}/v2/pix`, {
      method: 'POST',
      headers: {
        ...this.headers(token),
        'X-Idempotency-Key': request.idempotencyKey,
      },
      body: JSON.stringify(pixPayload),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Pix payment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const payment: InstantPayment = {
      paymentId: result.endToEndId ?? request.idempotencyKey,
      networkMessageId: result.endToEndId ?? null,
      rail: 'pix',
      direction: 'outbound',
      status: mapPixStatus(result.status ?? 'EM_PROCESSAMENTO'),
      amountCents: request.amountCents,
      currency: request.currency ?? 'BRL',
      senderRoutingNumber: this.ispb,
      senderAccountMasked: `****${request.sourceAccountId.slice(-4)}`,
      senderName: '',
      receiverRoutingNumber: result.ispbDestinatario ?? '',
      receiverAccountMasked: `****${pixKey.slice(-4)}`,
      receiverName: request.receiverName,
      description: request.description,
      rejectionReason: null,
      rejectionDetail: null,
      createdAt: new Date().toISOString(),
      completedAt: result.status === 'CONCLUIDA' ? new Date().toISOString() : null,
    };

    return { payment };
  }

  async getPayment(request: GetPaymentRequest): Promise<InstantPayment> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.apiUrl}/v2/pix/${request.paymentId}`, {
      method: 'GET',
      headers: this.headers(token),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Pix getPayment failed (${response.status})`);
    }

    const result = await response.json();
    return {
      paymentId: result.endToEndId,
      networkMessageId: result.endToEndId ?? null,
      rail: 'pix',
      direction: result.tipo === 'RECEBIMENTO' ? 'inbound' : 'outbound',
      status: mapPixStatus(result.status),
      amountCents: Math.round(parseFloat(result.valor?.original ?? '0') * 100),
      currency: 'BRL',
      senderRoutingNumber: result.ispbOrigem ?? '',
      senderAccountMasked: result.contaOrigemMasked ?? '',
      senderName: result.nomeOrigem ?? '',
      receiverRoutingNumber: result.ispbDestino ?? '',
      receiverAccountMasked: result.contaDestinoMasked ?? '',
      receiverName: result.nomeDestino ?? '',
      description: result.infoPagador ?? '',
      rejectionReason: result.motivoRejeicao ?? null,
      rejectionDetail: result.detalheRejeicao ?? null,
      createdAt: result.horario ?? new Date().toISOString(),
      completedAt: result.horarioConclusao ?? null,
    };
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams();
    if (request.startDate) params.set('inicio', request.startDate);
    if (request.endDate) params.set('fim', request.endDate);
    if (request.limit) params.set('paginacao.itensPorPagina', String(request.limit));
    if (request.cursor) params.set('paginacao.paginaAtual', request.cursor);

    const response = await fetch(`${this.apiUrl}/v2/pix?${params}`, {
      method: 'GET',
      headers: this.headers(token),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Pix listPayments failed (${response.status})`);
    }

    const result = await response.json();
    const pixList = result.pix ?? [];
    return {
      payments: pixList.map((p: Record<string, unknown>) => ({
        paymentId: p.endToEndId as string,
        networkMessageId: (p.endToEndId as string) ?? null,
        rail: 'pix' as const,
        direction: p.tipo === 'RECEBIMENTO' ? 'inbound' : 'outbound',
        status: mapPixStatus(p.status as string),
        amountCents: Math.round(parseFloat(((p.valor as Record<string, unknown>)?.original as string) ?? '0') * 100),
        currency: 'BRL',
        senderRoutingNumber: (p.ispbOrigem as string) ?? '',
        senderAccountMasked: (p.contaOrigemMasked as string) ?? '',
        senderName: (p.nomeOrigem as string) ?? '',
        receiverRoutingNumber: (p.ispbDestino as string) ?? '',
        receiverAccountMasked: (p.contaDestinoMasked as string) ?? '',
        receiverName: (p.nomeDestino as string) ?? '',
        description: (p.infoPagador as string) ?? '',
        rejectionReason: (p.motivoRejeicao as string) ?? null,
        rejectionDetail: (p.detalheRejeicao as string) ?? null,
        createdAt: p.horario as string,
        completedAt: (p.horarioConclusao as string) ?? null,
      })),
      total: result.parametros?.paginacao?.quantidadeTotalRegistros ?? pixList.length,
      hasMore: result.parametros?.paginacao?.quantidadeDePaginas > (parseInt(request.cursor ?? '0') + 1),
      nextCursor: result.parametros?.paginacao?.quantidadeDePaginas > (parseInt(request.cursor ?? '0') + 1)
        ? String(parseInt(request.cursor ?? '0') + 1)
        : null,
    };
  }

  async checkReceiver(request: CheckReceiverRequest): Promise<CheckReceiverResponse> {
    const token = await this.getAccessToken();
    const pixKey = request.pixKey ?? request.accountNumber;

    const response = await fetch(`${this.apiUrl}/v2/cob/chave/${encodeURIComponent(pixKey)}`, {
      method: 'GET',
      headers: this.headers(token),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      return { eligible: false, availableRails: [], institutionName: null };
    }

    const result = await response.json();
    return {
      eligible: result.ativa === true || result.status === 'ATIVA',
      availableRails: (result.ativa === true || result.status === 'ATIVA') ? ['pix'] : [],
      institutionName: result.nomeInstituicao ?? null,
    };
  }

  async sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.apiUrl}/v2/cobv`, {
      method: 'POST',
      headers: this.headers(token),
      body: JSON.stringify({
        devedor: {
          nome: request.payerName,
        },
        valor: {
          original: (request.amountCents / 100).toFixed(2),
        },
        descricao: request.description,
        calendario: {
          dataDeVencimento: request.expiresAt.split('T')[0],
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Pix cobranca failed (${response.status})`);
    }

    const result = await response.json();
    const rfp: RequestForPayment = {
      rfpId: result.txid ?? result.id,
      rail: 'pix',
      status: 'pending',
      amountCents: request.amountCents,
      currency: 'BRL',
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
