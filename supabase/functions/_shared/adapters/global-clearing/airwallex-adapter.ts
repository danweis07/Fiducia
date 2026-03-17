// TODO: Provisional integration — not yet validated in production.
/**
 * Airwallex Global Clearing Adapter
 *
 * Integrates with Airwallex's global payment network for FX-focused
 * cross-border infrastructure. Enables opening local accounts in 130+
 * countries via a single API with competitive FX rates.
 *
 * Airwallex API docs: https://www.airwallex.com/docs/api
 * Auth: API key + client ID (x-api-key + x-client-id headers)
 *
 * IMPORTANT: Account numbers and beneficiary details MUST be masked in all logs.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  GlobalClearingAdapter,
  CreateVirtualAccountRequest,
  VirtualAccount,
  ListVirtualAccountsRequest,
  ListVirtualAccountsResponse,
  GetFXQuoteRequest,
  FXQuote,
  ExecuteFXConversionRequest,
  FXConversion,
  SendCrossBorderPaymentRequest,
  CrossBorderPayment,
  GetPaymentRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  ListSupportedCurrenciesResponse,
  VirtualAccountStatus,
  CrossBorderPaymentStatus,
  ClearingRail,
} from './types.ts';

// =============================================================================
// AIRWALLEX API TYPES
// =============================================================================

interface AWXAccount {
  id: string;
  request_id: string;
  iban: string;
  swift_code: string;
  account_name: string;
  currency: string;
  current_balance: number;
  available_balance: number;
  status: string;
  country_code: string;
  payment_methods: string[];
  created_at: string;
}

interface AWXQuote {
  id: string;
  source_currency: string;
  target_currency: string;
  client_rate: number;
  source_amount: number;
  target_amount: number;
  fee_amount: number;
  fee_currency: string;
  valid_to: string;
  created_at: string;
}

interface AWXPayment {
  id: string;
  source_id: string;
  beneficiary_name: string;
  beneficiary_iban: string;
  beneficiary_swift_code: string;
  beneficiary_country: string;
  source_currency: string;
  source_amount: number;
  payment_currency: string;
  payment_amount: number;
  fee_amount: number;
  fee_currency: string;
  rate: number | null;
  payment_method: string;
  reference: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  completed_at: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskIban(iban: string): string {
  if (iban.length <= 8) return '****' + iban.slice(-4);
  return iban.slice(0, 4) + '****' + iban.slice(-4);
}

function toMinorUnits(amount: number, currency: string): number {
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP'];
  if (zeroDecimal.includes(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

function fromMinorUnits(minorUnits: number, currency: string): number {
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP'];
  if (zeroDecimal.includes(currency)) return minorUnits;
  return minorUnits / 100;
}

function mapAWXAccountStatus(status: string): VirtualAccountStatus {
  switch (status.toLowerCase()) {
    case 'active': case 'enabled': return 'active';
    case 'suspended': case 'frozen': return 'frozen';
    case 'closed': return 'closed';
    default: return 'pending_activation';
  }
}

function mapAWXPaymentStatus(status: string): CrossBorderPaymentStatus {
  switch (status.toUpperCase()) {
    case 'CREATED': case 'SUBMITTED': return 'pending';
    case 'IN_PROGRESS': case 'SENDING': return 'processing';
    case 'PAID': case 'COMPLETED': return 'completed';
    case 'FAILED': case 'REJECTED': return 'failed';
    case 'RETURNED': case 'REFUNDED': return 'returned';
    case 'CANCELLED': return 'cancelled';
    default: return 'pending';
  }
}

function mapAWXPaymentMethod(method: string): ClearingRail {
  switch (method.toUpperCase()) {
    case 'SWIFT': return 'swift';
    case 'LOCAL': return 'local';
    case 'SEPA': return 'sepa';
    case 'FPS': return 'faster_payments';
    default: return 'local';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class AirwallexGlobalClearingAdapter implements GlobalClearingAdapter {
  readonly config: AdapterConfig = {
    id: 'airwallex',
    name: 'Airwallex Global Network',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly baseUrl: string;
  private bearerToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.apiKey = Deno.env.get('AIRWALLEX_API_KEY') ?? '';
    this.clientId = Deno.env.get('AIRWALLEX_CLIENT_ID') ?? '';
    this.baseUrl = Deno.env.get('AIRWALLEX_BASE_URL') ?? 'https://api-demo.airwallex.com/api/v1';
  }

  private get sandbox(): boolean {
    return !this.apiKey || !this.clientId;
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id, healthy: true, circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode',
      };
    }
    try {
      await this.ensureToken();
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return {
        adapterId: this.config.id, healthy: false, circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async createVirtualAccount(request: CreateVirtualAccountRequest): Promise<VirtualAccount> {
    const data = await this.request<AWXAccount>('POST', '/global_accounts/create', {
      currency: request.currency,
      country_code: request.country,
      nick_name: request.holderName,
      request_id: crypto.randomUUID(),
    });
    return this.mapAccount(data);
  }

  async listVirtualAccounts(request: ListVirtualAccountsRequest): Promise<ListVirtualAccountsResponse> {
    const params = new URLSearchParams();
    if (request.currency) params.set('currency', request.currency);
    params.set('page_size', String(request.limit ?? 25));
    params.set('page_num', String(Math.floor((request.offset ?? 0) / (request.limit ?? 25))));

    const data = await this.request<{ items: AWXAccount[]; total_count: number }>(
      'GET', `/global_accounts?${params.toString()}`,
    );
    return {
      accounts: data.items.map((a) => this.mapAccount(a)),
      total: data.total_count,
    };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    const data = await this.request<AWXQuote>('POST', '/fx/quotes/create', {
      source_currency: request.sourceCurrency,
      target_currency: request.targetCurrency,
      source_amount: fromMinorUnits(request.sourceAmountMinorUnits, request.sourceCurrency),
    });

    return {
      quoteId: data.id,
      sourceCurrency: data.source_currency,
      targetCurrency: data.target_currency,
      rate: data.client_rate,
      inverseRate: 1 / data.client_rate,
      sourceAmountMinorUnits: toMinorUnits(data.source_amount, data.source_currency),
      targetAmountMinorUnits: toMinorUnits(data.target_amount, data.target_currency),
      feeMinorUnits: toMinorUnits(data.fee_amount, data.fee_currency),
      expiresAt: data.valid_to,
      createdAt: data.created_at,
    };
  }

  async executeFXConversion(request: ExecuteFXConversionRequest): Promise<FXConversion> {
    const data = await this.request<{
      id: string; quote_id: string; source_currency: string; target_currency: string;
      client_rate: number; source_amount: number; target_amount: number;
      fee_amount: number; fee_currency: string;
      status: string; completed_at: string | null; created_at: string;
    }>('POST', '/fx/conversions/create', {
      quote_id: request.quoteId,
      source_account_id: request.sourceAccountId,
      target_account_id: request.targetAccountId,
    });

    return {
      conversionId: data.id,
      quoteId: data.quote_id,
      sourceCurrency: data.source_currency,
      targetCurrency: data.target_currency,
      rate: data.client_rate,
      sourceAmountMinorUnits: toMinorUnits(data.source_amount, data.source_currency),
      targetAmountMinorUnits: toMinorUnits(data.target_amount, data.target_currency),
      feeMinorUnits: toMinorUnits(data.fee_amount, data.fee_currency),
      status: data.status === 'COMPLETED' ? 'completed' : 'pending',
      completedAt: data.completed_at,
      createdAt: data.created_at,
    };
  }

  async sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'airwallex', action: 'sendPayment',
      tenantId: request.tenantId, idempotencyKey: request.idempotencyKey,
      timestamp: new Date().toISOString(),
    }));

    const data = await this.request<AWXPayment>('POST', '/payments/create', {
      source_id: request.sourceAccountId,
      beneficiary: {
        name: request.beneficiaryName,
        bank_details: {
          iban: request.beneficiaryIban,
          swift_code: request.beneficiaryBic,
          account_country: request.beneficiaryCountry,
        },
      },
      source_currency: 'USD',
      source_amount: fromMinorUnits(request.amountMinorUnits, 'USD'),
      payment_currency: request.targetCurrency ?? 'USD',
      payment_method: request.preferredRail === 'swift' ? 'SWIFT' : 'LOCAL',
      reference: request.reference,
      request_id: request.idempotencyKey,
    });

    return this.mapPayment(data);
  }

  async getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment> {
    const data = await this.request<AWXPayment>('GET', `/payments/${request.paymentId}`);
    return this.mapPayment(data);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    if (request.sourceAccountId) params.set('source_id', request.sourceAccountId);
    if (request.status) params.set('status', request.status.toUpperCase());
    if (request.startDate) params.set('from_created_at', request.startDate);
    if (request.endDate) params.set('to_created_at', request.endDate);
    params.set('page_size', String(request.limit ?? 25));

    const data = await this.request<{ items: AWXPayment[]; total_count: number }>(
      'GET', `/payments?${params.toString()}`,
    );

    return {
      payments: data.items.map((p) => this.mapPayment(p)),
      total: data.total_count,
    };
  }

  async listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse> {
    const data = await this.request<{ items: Array<{ code: string; name: string; decimal_digits: number; payment_methods: string[] }> }>(
      'GET', '/currencies',
    );
    return {
      currencies: data.items.map((c) => ({
        code: c.code,
        name: c.name,
        minorUnits: c.decimal_digits,
        availableRails: c.payment_methods.map(mapAWXPaymentMethod),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async ensureToken(): Promise<void> {
    if (this.bearerToken && Date.now() < this.tokenExpiresAt) return;
    const res = await fetch(`${this.baseUrl}/authentication/login`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'x-client-id': this.clientId,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error(`Airwallex auth failed: ${res.status}`);
    const data = (await res.json()) as { token: string; expires_at: string };
    this.bearerToken = data.token;
    this.tokenExpiresAt = new Date(data.expires_at).getTime() - 60000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Airwallex adapter in sandbox mode — credentials not configured');
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Airwallex API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }

  private mapAccount(data: AWXAccount): VirtualAccount {
    return {
      accountId: data.id,
      externalId: data.request_id,
      ibanMasked: maskIban(data.iban || data.id),
      bic: data.swift_code,
      holderName: data.account_name,
      currency: data.currency,
      balanceMinorUnits: toMinorUnits(data.current_balance, data.currency),
      availableBalanceMinorUnits: toMinorUnits(data.available_balance, data.currency),
      status: mapAWXAccountStatus(data.status),
      country: data.country_code,
      availableRails: data.payment_methods.map(mapAWXPaymentMethod),
      createdAt: data.created_at,
    };
  }

  private mapPayment(data: AWXPayment): CrossBorderPayment {
    return {
      paymentId: data.id,
      sourceAccountId: data.source_id,
      sourceCurrency: data.source_currency,
      sourceAmountMinorUnits: toMinorUnits(data.source_amount, data.source_currency),
      beneficiaryName: data.beneficiary_name,
      beneficiaryIbanMasked: maskIban(data.beneficiary_iban || data.id),
      beneficiaryBic: data.beneficiary_swift_code,
      beneficiaryCountry: data.beneficiary_country,
      targetCurrency: data.payment_currency,
      targetAmountMinorUnits: toMinorUnits(data.payment_amount, data.payment_currency),
      fxRate: data.rate,
      feeMinorUnits: toMinorUnits(data.fee_amount, data.fee_currency),
      rail: mapAWXPaymentMethod(data.payment_method),
      reference: data.reference,
      status: mapAWXPaymentStatus(data.status),
      statusReason: data.failure_reason,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    };
  }
}
