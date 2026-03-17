// TODO: Provisional integration — not yet validated in production.
/**
 * Banking Circle Global Clearing Adapter
 *
 * Integrates with Banking Circle's cross-border multi-currency infrastructure.
 * Provides dedicated IBANs in 25+ currencies with direct access to local
 * clearing rails (SEPA, Faster Payments, SWIFT).
 *
 * Banking Circle API docs: https://docs.bankingcircle.com
 * Auth: OAuth2 client credentials with certificate-based mTLS
 *
 * IMPORTANT: IBANs and account numbers MUST be masked in all logs/responses.
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
// BANKING CIRCLE API TYPES
// =============================================================================

interface BCTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface BCAccount {
  accountId: string;
  iban: string;
  bic: string;
  currency: string;
  accountHolderName: string;
  balance: { amount: number; currency: string };
  availableBalance: { amount: number; currency: string };
  status: string;
  country: string;
  createdAt: string;
}

interface BCFXQuote {
  quoteId: string;
  sourceCurrency: string;
  targetCurrency: string;
  rate: number;
  sourceAmount: number;
  targetAmount: number;
  fee: number;
  expiresAt: string;
}

interface BCPayment {
  paymentId: string;
  debtorAccount: string;
  creditorName: string;
  creditorAccount: string;
  creditorBic: string;
  creditorCountry: string;
  instructedAmount: { amount: number; currency: string };
  targetAmount: { amount: number; currency: string };
  exchangeRate: number | null;
  fee: { amount: number; currency: string };
  paymentScheme: string;
  reference: string;
  status: string;
  statusReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskIban(iban: string): string {
  if (iban.length <= 8) return '****' + iban.slice(-4);
  return iban.slice(0, 4) + '****' + iban.slice(-4);
}

function mapBCAccountStatus(status: string): VirtualAccountStatus {
  switch (status.toLowerCase()) {
    case 'active': return 'active';
    case 'frozen': case 'blocked': return 'frozen';
    case 'closed': return 'closed';
    default: return 'pending_activation';
  }
}

function mapBCPaymentStatus(status: string): CrossBorderPaymentStatus {
  switch (status.toLowerCase()) {
    case 'pending': case 'created': return 'pending';
    case 'processing': case 'in_progress': return 'processing';
    case 'completed': case 'settled': return 'completed';
    case 'failed': case 'rejected': return 'failed';
    case 'returned': return 'returned';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapBCSchemeToRail(scheme: string): ClearingRail {
  switch (scheme.toLowerCase()) {
    case 'sepa': case 'sct': return 'sepa';
    case 'sepa_instant': case 'sct_inst': return 'sepa_instant';
    case 'faster_payments': case 'fps': return 'faster_payments';
    case 'bacs': return 'bacs';
    case 'chaps': return 'chaps';
    case 'swift': return 'swift';
    default: return 'swift';
  }
}

/** Convert decimal amount to minor units (cents) */
function toMinorUnits(amount: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
  if (zeroDecimalCurrencies.includes(currency)) return Math.round(amount);
  return Math.round(amount * 100);
}

/** Convert minor units to decimal amount */
function fromMinorUnits(minorUnits: number, currency: string): number {
  const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND'];
  if (zeroDecimalCurrencies.includes(currency)) return minorUnits;
  return minorUnits / 100;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class BankingCircleGlobalClearingAdapter implements GlobalClearingAdapter {
  readonly config: AdapterConfig = {
    id: 'banking-circle',
    name: 'Banking Circle Global Clearing',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = Deno.env.get('BANKING_CIRCLE_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('BANKING_CIRCLE_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('BANKING_CIRCLE_BASE_URL') ?? 'https://sandbox.bankingcircle.com/api/v1';
  }

  private get sandbox(): boolean {
    return !this.clientId || !this.clientSecret;
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
    const data = await this.request<BCAccount>('POST', '/accounts/virtual', {
      currency: request.currency,
      country: request.country,
      accountHolderName: request.holderName,
    });
    return this.mapAccount(data);
  }

  async listVirtualAccounts(request: ListVirtualAccountsRequest): Promise<ListVirtualAccountsResponse> {
    const params = new URLSearchParams();
    if (request.currency) params.set('currency', request.currency);
    if (request.status) params.set('status', request.status);
    params.set('pageSize', String(request.limit ?? 25));
    params.set('page', String(Math.floor((request.offset ?? 0) / (request.limit ?? 25)) + 1));

    const data = await this.request<{ accounts: BCAccount[]; totalCount: number }>(
      'GET', `/accounts/virtual?${params.toString()}`,
    );
    return {
      accounts: data.accounts.map((a) => this.mapAccount(a)),
      total: data.totalCount,
    };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    const data = await this.request<BCFXQuote>('POST', '/fx/quotes', {
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      sourceAmount: fromMinorUnits(request.sourceAmountMinorUnits, request.sourceCurrency),
    });

    return {
      quoteId: data.quoteId,
      sourceCurrency: data.sourceCurrency,
      targetCurrency: data.targetCurrency,
      rate: data.rate,
      inverseRate: 1 / data.rate,
      sourceAmountMinorUnits: toMinorUnits(data.sourceAmount, data.sourceCurrency),
      targetAmountMinorUnits: toMinorUnits(data.targetAmount, data.targetCurrency),
      feeMinorUnits: toMinorUnits(data.fee, data.sourceCurrency),
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
      sourceAmountMinorUnits: toMinorUnits(data.sourceAmount, data.sourceCurrency),
      targetAmountMinorUnits: toMinorUnits(data.targetAmount, data.targetCurrency),
      feeMinorUnits: toMinorUnits(data.fee, data.sourceCurrency),
      status: data.status === 'completed' ? 'completed' : 'pending',
      completedAt: data.completedAt,
      createdAt: data.createdAt,
    };
  }

  async sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'banking-circle', action: 'sendPayment',
      tenantId: request.tenantId, idempotencyKey: request.idempotencyKey,
      timestamp: new Date().toISOString(),
    }));

    const data = await this.request<BCPayment>('POST', '/payments/crossborder', {
      debtorAccountId: request.sourceAccountId,
      creditorName: request.beneficiaryName,
      creditorIban: request.beneficiaryIban,
      creditorBic: request.beneficiaryBic,
      creditorCountry: request.beneficiaryCountry,
      amount: fromMinorUnits(request.amountMinorUnits, 'USD'),
      currency: request.targetCurrency ?? 'EUR',
      reference: request.reference,
      paymentScheme: request.preferredRail ?? 'sepa',
      idempotencyKey: request.idempotencyKey,
    });

    return this.mapPayment(data);
  }

  async getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment> {
    const data = await this.request<BCPayment>('GET', `/payments/${request.paymentId}`);
    return this.mapPayment(data);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    if (request.sourceAccountId) params.set('debtorAccountId', request.sourceAccountId);
    if (request.status) params.set('status', request.status);
    if (request.startDate) params.set('fromDate', request.startDate);
    if (request.endDate) params.set('toDate', request.endDate);
    params.set('pageSize', String(request.limit ?? 25));

    const data = await this.request<{ payments: BCPayment[]; totalCount: number }>(
      'GET', `/payments?${params.toString()}`,
    );

    return {
      payments: data.payments.map((p) => this.mapPayment(p)),
      total: data.totalCount,
    };
  }

  async listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse> {
    const data = await this.request<{ currencies: Array<{ code: string; name: string; decimalPlaces: number; schemes: string[] }> }>(
      'GET', '/reference/currencies',
    );
    return {
      currencies: data.currencies.map((c) => ({
        code: c.code,
        name: c.name,
        minorUnits: c.decimalPlaces,
        availableRails: c.schemes.map(mapBCSchemeToRail),
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async ensureToken(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;
    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(this.clientId)}&client_secret=${encodeURIComponent(this.clientSecret)}`,
    });
    if (!res.ok) throw new Error(`Banking Circle auth failed: ${res.status}`);
    const token = (await res.json()) as BCTokenResponse;
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Banking Circle adapter in sandbox mode — credentials not configured');
    await this.ensureToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Banking Circle API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }

  private mapAccount(data: BCAccount): VirtualAccount {
    return {
      accountId: data.accountId,
      externalId: data.accountId,
      ibanMasked: maskIban(data.iban),
      bic: data.bic,
      holderName: data.accountHolderName,
      currency: data.currency,
      balanceMinorUnits: toMinorUnits(data.balance.amount, data.currency),
      availableBalanceMinorUnits: toMinorUnits(data.availableBalance.amount, data.currency),
      status: mapBCAccountStatus(data.status),
      country: data.country,
      availableRails: ['sepa', 'sepa_instant', 'swift'],
      createdAt: data.createdAt,
    };
  }

  private mapPayment(data: BCPayment): CrossBorderPayment {
    return {
      paymentId: data.paymentId,
      sourceAccountId: data.debtorAccount,
      sourceCurrency: data.instructedAmount.currency,
      sourceAmountMinorUnits: toMinorUnits(data.instructedAmount.amount, data.instructedAmount.currency),
      beneficiaryName: data.creditorName,
      beneficiaryIbanMasked: maskIban(data.creditorAccount),
      beneficiaryBic: data.creditorBic,
      beneficiaryCountry: data.creditorCountry,
      targetCurrency: data.targetAmount.currency,
      targetAmountMinorUnits: toMinorUnits(data.targetAmount.amount, data.targetAmount.currency),
      fxRate: data.exchangeRate,
      feeMinorUnits: toMinorUnits(data.fee.amount, data.fee.currency),
      rail: mapBCSchemeToRail(data.paymentScheme),
      reference: data.reference,
      status: mapBCPaymentStatus(data.status),
      statusReason: data.statusReason,
      createdAt: data.createdAt,
      completedAt: data.completedAt,
    };
  }
}
