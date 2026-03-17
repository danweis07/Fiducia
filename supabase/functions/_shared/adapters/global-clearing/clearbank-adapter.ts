// TODO: Provisional integration — not yet validated in production.
/**
 * ClearBank Global Clearing Adapter
 *
 * Integrates with ClearBank's UK clearing infrastructure for real-time
 * Faster Payments, BACS, and CHAPS access via API-first banking.
 *
 * ClearBank API docs: https://docs.clearbank.co.uk
 * Auth: API key + digital signature (HMAC-SHA256)
 *
 * IMPORTANT: Account numbers and sort codes MUST be masked in all logs.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
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
// CLEARBANK API TYPES
// =============================================================================

interface CBAccount {
  accountId: string;
  iban: string;
  bic: string;
  sortCode: string;
  accountNumber: string;
  name: string;
  currency: string;
  balance: number;
  availableBalance: number;
  status: string;
  createdAt: string;
}

interface CBPayment {
  paymentId: string;
  debtorAccountId: string;
  creditorName: string;
  creditorIban: string;
  creditorBic: string;
  amount: number;
  currency: string;
  targetCurrency: string;
  targetAmount: number;
  exchangeRate: number | null;
  fee: number;
  scheme: string;
  reference: string;
  status: string;
  failureReason: string | null;
  createdAt: string;
  settledAt: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskIban(iban: string): string {
  if (iban.length <= 8) return '****' + iban.slice(-4);
  return iban.slice(0, 4) + '****' + iban.slice(-4);
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function fromMinorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

function mapCBStatus(status: string): VirtualAccountStatus {
  switch (status.toLowerCase()) {
    case 'enabled': case 'active': return 'active';
    case 'suspended': return 'frozen';
    case 'closed': return 'closed';
    default: return 'pending_activation';
  }
}

function mapCBPaymentStatus(status: string): CrossBorderPaymentStatus {
  switch (status.toLowerCase()) {
    case 'initiated': case 'pending': return 'pending';
    case 'processing': return 'processing';
    case 'settled': case 'completed': return 'completed';
    case 'failed': case 'rejected': return 'failed';
    case 'returned': return 'returned';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapCBScheme(scheme: string): ClearingRail {
  switch (scheme.toLowerCase()) {
    case 'fps': case 'faster_payments': return 'faster_payments';
    case 'bacs': return 'bacs';
    case 'chaps': return 'chaps';
    case 'sepa': return 'sepa';
    case 'swift': return 'swift';
    default: return 'faster_payments';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ClearBankGlobalClearingAdapter implements GlobalClearingAdapter {
  readonly config: AdapterConfig = {
    id: 'clearbank',
    name: 'ClearBank UK Clearing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('CLEARBANK_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('CLEARBANK_BASE_URL') ?? 'https://institution-api-sim.clearbank.co.uk/v3';
  }

  private get sandbox(): boolean {
    return !this.apiKey;
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id, healthy: true, circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode',
      };
    }
    try {
      await this.request<unknown>('GET', '/health');
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
    const data = await this.request<CBAccount>('POST', '/accounts', {
      accountName: request.holderName,
      currency: request.currency,
      owner: { name: request.holderName },
    });
    return this.mapAccount(data);
  }

  async listVirtualAccounts(request: ListVirtualAccountsRequest): Promise<ListVirtualAccountsResponse> {
    const params = new URLSearchParams();
    if (request.currency) params.set('currency', request.currency);
    params.set('pageSize', String(request.limit ?? 25));
    params.set('pageNumber', String(Math.floor((request.offset ?? 0) / (request.limit ?? 25)) + 1));

    const data = await this.request<{ accounts: CBAccount[]; totalItems: number }>(
      'GET', `/accounts?${params.toString()}`,
    );
    return {
      accounts: data.accounts.map((a) => this.mapAccount(a)),
      total: data.totalItems,
    };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    const data = await this.request<{
      quoteId: string; rate: number; sourceAmount: number; targetAmount: number; fee: number; expiresAt: string;
    }>('POST', '/fx/quotes', {
      buyCurrency: request.targetCurrency,
      sellCurrency: request.sourceCurrency,
      sellAmount: fromMinorUnits(request.sourceAmountMinorUnits),
    });

    return {
      quoteId: data.quoteId,
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate: data.rate,
      inverseRate: 1 / data.rate,
      sourceAmountMinorUnits: toMinorUnits(data.sourceAmount),
      targetAmountMinorUnits: toMinorUnits(data.targetAmount),
      feeMinorUnits: toMinorUnits(data.fee),
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString(),
    };
  }

  async executeFXConversion(request: ExecuteFXConversionRequest): Promise<FXConversion> {
    const data = await this.request<{
      conversionId: string; quoteId: string; sourceCurrency: string; targetCurrency: string;
      rate: number; sourceAmount: number; targetAmount: number; fee: number;
      status: string; completedAt: string | null; createdAt: string;
    }>('POST', '/fx/conversions', {
      quoteId: request.quoteId,
      sourceAccountId: request.sourceAccountId,
      targetAccountId: request.targetAccountId,
    });

    return {
      conversionId: data.conversionId,
      quoteId: data.quoteId,
      sourceCurrency: data.sourceCurrency,
      targetCurrency: data.targetCurrency,
      rate: data.rate,
      sourceAmountMinorUnits: toMinorUnits(data.sourceAmount),
      targetAmountMinorUnits: toMinorUnits(data.targetAmount),
      feeMinorUnits: toMinorUnits(data.fee),
      status: data.status === 'completed' ? 'completed' : 'pending',
      completedAt: data.completedAt,
      createdAt: data.createdAt,
    };
  }

  async sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'clearbank', action: 'sendPayment',
      tenantId: request.tenantId, idempotencyKey: request.idempotencyKey,
      timestamp: new Date().toISOString(),
    }));

    const data = await this.request<CBPayment>('POST', '/payments', {
      debtorAccountId: request.sourceAccountId,
      creditorName: request.beneficiaryName,
      creditorIban: request.beneficiaryIban,
      creditorBic: request.beneficiaryBic,
      amount: fromMinorUnits(request.amountMinorUnits),
      currency: request.targetCurrency ?? 'GBP',
      reference: request.reference,
      scheme: request.preferredRail ?? 'fps',
    });

    return this.mapPayment(data);
  }

  async getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment> {
    const data = await this.request<CBPayment>('GET', `/payments/${request.paymentId}`);
    return this.mapPayment(data);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    if (request.sourceAccountId) params.set('debtorAccountId', request.sourceAccountId);
    if (request.status) params.set('status', request.status);
    params.set('pageSize', String(request.limit ?? 25));

    const data = await this.request<{ payments: CBPayment[]; totalItems: number }>(
      'GET', `/payments?${params.toString()}`,
    );
    return {
      payments: data.payments.map((p) => this.mapPayment(p)),
      total: data.totalItems,
    };
  }

  async listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse> {
    return {
      currencies: [
        { code: 'GBP', name: 'British Pound', minorUnits: 2, availableRails: ['faster_payments', 'bacs', 'chaps'] as ClearingRail[] },
        { code: 'EUR', name: 'Euro', minorUnits: 2, availableRails: ['sepa', 'sepa_instant', 'swift'] as ClearingRail[] },
        { code: 'USD', name: 'US Dollar', minorUnits: 2, availableRails: ['swift'] as ClearingRail[] },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('ClearBank adapter in sandbox mode — credentials not configured');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`ClearBank API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }

  private mapAccount(data: CBAccount): VirtualAccount {
    return {
      accountId: data.accountId,
      externalId: data.accountId,
      ibanMasked: maskIban(data.iban),
      bic: data.bic,
      holderName: data.name,
      currency: data.currency,
      balanceMinorUnits: toMinorUnits(data.balance),
      availableBalanceMinorUnits: toMinorUnits(data.availableBalance),
      status: mapCBStatus(data.status),
      country: 'GB',
      availableRails: ['faster_payments', 'bacs', 'chaps', 'swift'],
      createdAt: data.createdAt,
    };
  }

  private mapPayment(data: CBPayment): CrossBorderPayment {
    return {
      paymentId: data.paymentId,
      sourceAccountId: data.debtorAccountId,
      sourceCurrency: data.currency,
      sourceAmountMinorUnits: toMinorUnits(data.amount),
      beneficiaryName: data.creditorName,
      beneficiaryIbanMasked: maskIban(data.creditorIban),
      beneficiaryBic: data.creditorBic,
      beneficiaryCountry: 'GB',
      targetCurrency: data.targetCurrency,
      targetAmountMinorUnits: toMinorUnits(data.targetAmount),
      fxRate: data.exchangeRate,
      feeMinorUnits: toMinorUnits(data.fee),
      rail: mapCBScheme(data.scheme),
      reference: data.reference,
      status: mapCBPaymentStatus(data.status),
      statusReason: data.failureReason,
      createdAt: data.createdAt,
      completedAt: data.settledAt,
    };
  }
}
