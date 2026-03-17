// TODO: Provisional integration — not yet validated in production.
/**
 * Solaris Global Clearing Adapter
 *
 * Integrates with Solaris (Solarisbank) for full-stack regulated EU banking
 * infrastructure. Provides passported German banking license enabling licensed
 * account offerings across the entire EU/EEA.
 *
 * Solaris API docs: https://docs.solarisgroup.com
 * Auth: OAuth2 client credentials
 *
 * IMPORTANT: IBANs and personal data MUST be masked in all logs.
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
// SOLARIS API TYPES
// =============================================================================

interface SolarisAccount {
  id: string;
  iban: string;
  bic: string;
  account_number: string;
  balance: { value: number; unit: string; currency: string };
  available_balance: { value: number; unit: string; currency: string };
  status: string;
  person_id: string;
  created_at: string;
}

interface SolarisPayment {
  id: string;
  account_id: string;
  creditor_name: string;
  creditor_iban: string;
  creditor_bic: string;
  amount: { value: number; unit: string; currency: string };
  reference: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  executed_at: string | null;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function maskIban(iban: string): string {
  if (iban.length <= 8) return '****' + iban.slice(-4);
  return iban.slice(0, 4) + '****' + iban.slice(-4);
}

/** Solaris uses cents as "unit": "cents" */
function solarisToMinorUnits(balance: { value: number; unit: string }): number {
  if (balance.unit === 'cents') return balance.value;
  return Math.round(balance.value * 100);
}

function fromMinorUnits(minorUnits: number): number {
  return minorUnits / 100;
}

function mapSolarisStatus(status: string): VirtualAccountStatus {
  switch (status) {
    case 'active': return 'active';
    case 'blocked': case 'blocked_outgoing': case 'blocked_incoming': return 'frozen';
    case 'closed': return 'closed';
    default: return 'pending_activation';
  }
}

function mapSolarisPaymentStatus(status: string): CrossBorderPaymentStatus {
  switch (status) {
    case 'created': case 'authorization_required': return 'pending';
    case 'confirmed': case 'in_progress': return 'processing';
    case 'executed': case 'completed': return 'completed';
    case 'failed': case 'declined': return 'failed';
    case 'returned': return 'returned';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SolarisGlobalClearingAdapter implements GlobalClearingAdapter {
  readonly config: AdapterConfig = {
    id: 'solaris',
    name: 'Solaris EU Banking Infrastructure',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.clientId = Deno.env.get('SOLARIS_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('SOLARIS_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('SOLARIS_BASE_URL') ?? 'https://api.solarisgroup.com/v1';
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
    const data = await this.request<SolarisAccount>('POST', '/accounts', {
      type: 'CHECKING_PERSONAL',
      currency: request.currency,
    });
    return this.mapAccount(data, request.holderName);
  }

  async listVirtualAccounts(request: ListVirtualAccountsRequest): Promise<ListVirtualAccountsResponse> {
    const params = new URLSearchParams();
    params.set('per_page', String(request.limit ?? 25));
    params.set('page', String(Math.floor((request.offset ?? 0) / (request.limit ?? 25)) + 1));

    const data = await this.request<SolarisAccount[]>('GET', `/accounts?${params.toString()}`);
    let accounts = data.map((a) => this.mapAccount(a, ''));
    if (request.currency) accounts = accounts.filter((a) => a.currency === request.currency);
    if (request.status) accounts = accounts.filter((a) => a.status === request.status);
    return { accounts, total: accounts.length };
  }

  async getFXQuote(request: GetFXQuoteRequest): Promise<FXQuote> {
    const data = await this.request<{
      id: string; rate: number; source_amount: number; target_amount: number;
      fee: number; expires_at: string;
    }>('POST', '/fx/quotes', {
      source_currency: request.sourceCurrency,
      target_currency: request.targetCurrency,
      source_amount: fromMinorUnits(request.sourceAmountMinorUnits),
    });

    return {
      quoteId: data.id,
      sourceCurrency: request.sourceCurrency,
      targetCurrency: request.targetCurrency,
      rate: data.rate,
      inverseRate: 1 / data.rate,
      sourceAmountMinorUnits: Math.round(data.source_amount * 100),
      targetAmountMinorUnits: Math.round(data.target_amount * 100),
      feeMinorUnits: Math.round(data.fee * 100),
      expiresAt: data.expires_at,
      createdAt: new Date().toISOString(),
    };
  }

  async executeFXConversion(request: ExecuteFXConversionRequest): Promise<FXConversion> {
    const data = await this.request<{
      id: string; quote_id: string; source_currency: string; target_currency: string;
      rate: number; source_amount: number; target_amount: number; fee: number;
      status: string; completed_at: string | null; created_at: string;
    }>('POST', '/fx/conversions', {
      quote_id: request.quoteId,
      source_account_id: request.sourceAccountId,
      target_account_id: request.targetAccountId,
    });

    return {
      conversionId: data.id,
      quoteId: data.quote_id,
      sourceCurrency: data.source_currency,
      targetCurrency: data.target_currency,
      rate: data.rate,
      sourceAmountMinorUnits: Math.round(data.source_amount * 100),
      targetAmountMinorUnits: Math.round(data.target_amount * 100),
      feeMinorUnits: Math.round(data.fee * 100),
      status: data.status === 'completed' ? 'completed' : 'pending',
      completedAt: data.completed_at,
      createdAt: data.created_at,
    };
  }

  async sendPayment(request: SendCrossBorderPaymentRequest): Promise<CrossBorderPayment> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'solaris', action: 'sendPayment',
      tenantId: request.tenantId, idempotencyKey: request.idempotencyKey,
      timestamp: new Date().toISOString(),
    }));

    const data = await this.request<SolarisPayment>('POST', `/accounts/${request.sourceAccountId}/payments/sepa_credit_transfers`, {
      creditor_name: request.beneficiaryName,
      creditor_iban: request.beneficiaryIban,
      creditor_bic: request.beneficiaryBic,
      amount: { value: request.amountMinorUnits, unit: 'cents', currency: request.targetCurrency ?? 'EUR' },
      reference: request.reference,
    });

    return this.mapPayment(data, request.targetCurrency ?? 'EUR');
  }

  async getPayment(request: GetPaymentRequest): Promise<CrossBorderPayment> {
    const data = await this.request<SolarisPayment>('GET', `/payments/${request.paymentId}`);
    return this.mapPayment(data, 'EUR');
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    const params = new URLSearchParams();
    params.set('per_page', String(request.limit ?? 25));

    const path = request.sourceAccountId
      ? `/accounts/${request.sourceAccountId}/payments?${params.toString()}`
      : `/payments?${params.toString()}`;

    const data = await this.request<SolarisPayment[]>('GET', path);
    return {
      payments: data.map((p) => this.mapPayment(p, 'EUR')),
      total: data.length,
    };
  }

  async listSupportedCurrencies(): Promise<ListSupportedCurrenciesResponse> {
    return {
      currencies: [
        { code: 'EUR', name: 'Euro', minorUnits: 2, availableRails: ['sepa', 'sepa_instant', 'swift'] as ClearingRail[] },
        { code: 'GBP', name: 'British Pound', minorUnits: 2, availableRails: ['swift'] as ClearingRail[] },
        { code: 'USD', name: 'US Dollar', minorUnits: 2, availableRails: ['swift'] as ClearingRail[] },
        { code: 'CHF', name: 'Swiss Franc', minorUnits: 2, availableRails: ['swift'] as ClearingRail[] },
      ],
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
    if (!res.ok) throw new Error(`Solaris auth failed: ${res.status}`);
    const token = (await res.json()) as { access_token: string; expires_in: number };
    this.accessToken = token.access_token;
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) throw new Error('Solaris adapter in sandbox mode — credentials not configured');
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
      throw new Error(`Solaris API error (${res.status}): ${errBody}`);
    }
    return res.json();
  }

  private mapAccount(data: SolarisAccount, holderName: string): VirtualAccount {
    return {
      accountId: data.id,
      externalId: data.id,
      ibanMasked: maskIban(data.iban),
      bic: data.bic,
      holderName,
      currency: data.balance.currency,
      balanceMinorUnits: solarisToMinorUnits(data.balance),
      availableBalanceMinorUnits: solarisToMinorUnits(data.available_balance),
      status: mapSolarisStatus(data.status),
      country: 'DE',
      availableRails: ['sepa', 'sepa_instant', 'swift'],
      createdAt: data.created_at,
    };
  }

  private mapPayment(data: SolarisPayment, targetCurrency: string): CrossBorderPayment {
    return {
      paymentId: data.id,
      sourceAccountId: data.account_id,
      sourceCurrency: data.amount.currency,
      sourceAmountMinorUnits: solarisToMinorUnits(data.amount),
      beneficiaryName: data.creditor_name,
      beneficiaryIbanMasked: maskIban(data.creditor_iban),
      beneficiaryBic: data.creditor_bic,
      beneficiaryCountry: data.creditor_iban.slice(0, 2),
      targetCurrency,
      targetAmountMinorUnits: solarisToMinorUnits(data.amount),
      fxRate: null,
      feeMinorUnits: 0,
      rail: 'sepa',
      reference: data.reference,
      status: mapSolarisPaymentStatus(data.status),
      statusReason: data.failure_reason,
      createdAt: data.created_at,
      completedAt: data.executed_at,
    };
  }
}
