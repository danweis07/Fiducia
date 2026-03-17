// TODO: Provisional integration — not yet validated in production.
/**
 * Fiserv CheckFree Bill Pay Adapter
 *
 * Integrates with Fiserv's Biller Solutions / CheckFree platform,
 * the most widely used bill pay engine in the US banking industry.
 *
 * API Reference: Fiserv Developer Portal (Unified Wealth API / Biller Solutions)
 *
 * Key concepts:
 *   - Biller Directory: Central database of payees (AT&T, PG&E, etc.)
 *   - Payment Lifecycle: Scheduled → Processing → Paid / Failed
 *   - E-Bill: Electronic bill presentment — billers push bills to users
 *   - Rush Payment: Same-day or next-day delivery for urgent payments
 *
 * Configuration:
 *   FISERV_CLIENT_ID — OAuth client ID
 *   FISERV_CLIENT_SECRET — OAuth client secret
 *   FISERV_BASE_URL — Base URL (default: https://api.fiserv.com)
 *   FISERV_SUBSCRIBER_ID — Tenant's subscriber ID in CheckFree
 *
 * Sandbox mode auto-enabled when credentials are not configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  BillPayAdapter,
  Payee,
  Payment,
  SearchBillersRequest,
  SearchBillersResponse,
  EnrollPayeeRequest,
  EnrollPayeeResponse,
  ListPayeesRequest,
  ListPayeesResponse,
  SchedulePaymentRequest,
  SchedulePaymentResponse,
  CancelPaymentRequest,
  CancelPaymentResponse,
  GetPaymentStatusRequest,
  ListPaymentsRequest,
  ListPaymentsResponse,
  ListEBillsRequest,
  ListEBillsResponse,
  PaymentStatus,
  BillerCategory,
} from './types.ts';

// =============================================================================
// FISERV API TYPES (mirrors CheckFree/Biller Solutions schema)
// =============================================================================

interface FiservTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FiservBiller {
  billerNum: string;
  name: string;
  shortName: string;
  categoryCode: string;
  logoUri?: string;
  eBillCapable: boolean;
  rushCapable: boolean;
  processingDays: number;
  requiredFields: Array<{
    fieldName: string;
    displayLabel: string;
    fieldType: string;
    required: boolean;
    maxLength?: number;
    regex?: string;
    helpText?: string;
  }>;
}

interface FiservPayee {
  payeeId: string;
  billerNum: string;
  payeeName: string;
  nickname: string;
  categoryCode: string;
  accountNumberMasked: string;
  eBillActivationStatus: string;
  nextPaymentDueDate?: string;
  amountDue?: number;
  minimumAmountDue?: number;
  autopayStatus: string;
  enrollmentDate: string;
}

interface FiservPayment {
  paymentId: string;
  checkFreePaymentId: string;
  payeeId: string;
  sourceAccountId: string;
  amount: number;                // Cents
  status: string;                // Scheduled | InProcess | Complete | Failed | Cancelled | Returned
  scheduledDate: string;
  processDate?: string;
  deliveredDate?: string;
  deliveryMethod: string;        // Electronic | PaperCheck | SameDay
  confirmationNumber: string;
  memo?: string;
  frequency?: string;
  failureReason?: string;
  auditInfo: {
    createdDate: string;
    updatedDate: string;
    createdBy: string;
  };
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapFiservCategory(categoryCode: string): BillerCategory {
  const map: Record<string, BillerCategory> = {
    'UTIL': 'utilities',
    'TELE': 'telecom',
    'INSR': 'insurance',
    'CCARD': 'credit_card',
    'MORT': 'mortgage',
    'AUTO': 'auto_loan',
    'SLOAN': 'student_loan',
    'GOVT': 'government',
    'MED': 'medical',
    'SUB': 'subscription',
  };
  return map[categoryCode] ?? 'other';
}

function mapFiservPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case 'Scheduled':   return 'scheduled';
    case 'InProcess':   return 'processing';
    case 'Complete':    return 'paid';
    case 'Failed':      return 'failed';
    case 'Cancelled':   return 'canceled';
    case 'Returned':    return 'returned';
    default:            return 'scheduled';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FiservBillPayAdapter implements BillPayAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly subscriberId: string;
  private readonly sandbox: boolean;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  readonly config: AdapterConfig = {
    id: 'fiserv',
    name: 'Fiserv CheckFree Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(clientId?: string, clientSecret?: string, baseUrl?: string) {
    this.clientId = clientId ?? Deno.env.get('FISERV_CLIENT_ID') ?? '';
    this.clientSecret = clientSecret ?? Deno.env.get('FISERV_CLIENT_SECRET') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('FISERV_BASE_URL') ?? 'https://api.fiserv.com';
    this.subscriberId = Deno.env.get('FISERV_SUBSCRIBER_ID') ?? '';
    this.sandbox = !this.clientId || !this.clientSecret;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const res = await fetch(`${this.baseUrl}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) throw new Error(`Fiserv OAuth failed: ${res.status}`);
    const data: FiservTokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Fiserv adapter in sandbox mode — no credentials configured');
    }

    const token = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Fiserv-Subscriber-Id': this.subscriberId,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Fiserv API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode (no credentials)',
      };
    }

    try {
      await this.getAccessToken();
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async searchBillers(request: SearchBillersRequest): Promise<SearchBillersResponse> {
    if (this.sandbox) {
      // Return sandbox billers
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().searchBillers(request);
    }

    const params = new URLSearchParams({
      search: request.query,
      ...(request.category ? { category: request.category } : {}),
      ...(request.zipCode ? { zipCode: request.zipCode } : {}),
      limit: String(request.limit ?? 20),
    });

    const response = await this.request<{ billers: FiservBiller[]; totalCount: number }>(
      'GET',
      `/billpay/v1/billers?${params}`,
    );

    return {
      billers: response.billers.map(b => ({
        billerId: b.billerNum,
        name: b.name,
        shortName: b.shortName,
        category: mapFiservCategory(b.categoryCode),
        logoUrl: b.logoUri,
        supportsEBill: b.eBillCapable,
        supportsRushPayment: b.rushCapable,
        processingDays: b.processingDays,
        enrollmentFields: b.requiredFields.map(f => ({
          name: f.fieldName,
          label: f.displayLabel,
          type: f.fieldType as 'text',
          required: f.required,
          maxLength: f.maxLength,
          pattern: f.regex,
          helpText: f.helpText,
        })),
      })),
      totalCount: response.totalCount,
    };
  }

  async enrollPayee(request: EnrollPayeeRequest): Promise<EnrollPayeeResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().enrollPayee(request);
    }

    const response = await this.request<FiservPayee>('POST', '/billpay/v1/payees', {
      billerNum: request.billerId,
      accountNumber: request.accountNumber,
      nickname: request.nickname,
      subscriberId: this.subscriberId,
      ...request.enrollmentFields,
    });

    return {
      payee: this.mapPayee(response),
    };
  }

  async listPayees(request: ListPayeesRequest): Promise<ListPayeesResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listPayees(request);
    }

    const response = await this.request<{ payees: FiservPayee[] }>(
      'GET',
      `/billpay/v1/subscribers/${this.subscriberId}/payees`,
    );

    return {
      payees: response.payees.map(p => this.mapPayee(p)),
    };
  }

  async schedulePayment(request: SchedulePaymentRequest): Promise<SchedulePaymentResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().schedulePayment(request);
    }

    const response = await this.request<FiservPayment>('POST', '/billpay/v1/payments', {
      payeeId: request.payeeId,
      sourceAccountId: request.fromAccountId,
      amount: request.amountCents,
      scheduledDate: request.scheduledDate,
      deliveryMethod: request.method === 'rush' ? 'SameDay' : 'Electronic',
      memo: request.memo,
      frequency: request.recurringRule?.frequency,
    });

    return {
      payment: this.mapPayment(response),
    };
  }

  async cancelPayment(request: CancelPaymentRequest): Promise<CancelPaymentResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().cancelPayment(request);
    }

    const response = await this.request<FiservPayment>(
      'DELETE',
      `/billpay/v1/payments/${request.providerPaymentId}`,
    );

    return {
      success: true,
      payment: this.mapPayment(response),
    };
  }

  async getPaymentStatus(request: GetPaymentStatusRequest): Promise<Payment> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().getPaymentStatus(request);
    }

    const response = await this.request<FiservPayment>(
      'GET',
      `/billpay/v1/payments/${request.providerPaymentId}`,
    );

    return this.mapPayment(response);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listPayments(request);
    }

    const params = new URLSearchParams({
      ...(request.payeeId ? { payeeId: request.payeeId } : {}),
      ...(request.status ? { status: request.status } : {}),
      ...(request.fromDate ? { fromDate: request.fromDate } : {}),
      ...(request.toDate ? { toDate: request.toDate } : {}),
      limit: String(request.limit ?? 50),
      offset: String(request.offset ?? 0),
    });

    const response = await this.request<{ payments: FiservPayment[]; totalCount: number }>(
      'GET',
      `/billpay/v1/subscribers/${this.subscriberId}/payments?${params}`,
    );

    return {
      payments: response.payments.map(p => this.mapPayment(p)),
      totalCount: response.totalCount,
    };
  }

  async listEBills(request: ListEBillsRequest): Promise<ListEBillsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listEBills(request);
    }

    const params = new URLSearchParams({
      ...(request.payeeId ? { payeeId: request.payeeId } : {}),
      ...(request.status ? { status: request.status } : {}),
    });

    const response = await this.request<{
      eBills: Array<{
        eBillId: string;
        payeeId: string;
        amount: number;
        minimumAmount?: number;
        dueDate: string;
        statementDate: string;
        status: string;
        balance?: number;
      }>;
    }>('GET', `/billpay/v1/subscribers/${this.subscriberId}/ebills?${params}`);

    return {
      eBills: response.eBills.map(e => ({
        eBillId: e.eBillId,
        payeeId: e.payeeId,
        amountCents: e.amount,
        minimumPaymentCents: e.minimumAmount,
        dueDate: e.dueDate,
        statementDate: e.statementDate,
        status: e.status as 'unpaid',
        balanceCents: e.balance,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // MAPPERS
  // ---------------------------------------------------------------------------

  private mapPayee(fp: FiservPayee): Payee {
    return {
      payeeId: fp.payeeId,
      billerId: fp.billerNum,
      nickname: fp.nickname || undefined,
      billerName: fp.payeeName,
      category: mapFiservCategory(fp.categoryCode),
      accountNumberMasked: fp.accountNumberMasked,
      eBillStatus: fp.eBillActivationStatus === 'Active' ? 'active'
        : fp.eBillActivationStatus === 'Pending' ? 'pending' : 'not_enrolled',
      nextDueDate: fp.nextPaymentDueDate,
      nextAmountDueCents: fp.amountDue,
      minimumPaymentCents: fp.minimumAmountDue,
      enrolledAt: fp.enrollmentDate,
      autopayEnabled: fp.autopayStatus === 'Active',
    };
  }

  private mapPayment(fp: FiservPayment): Payment {
    return {
      paymentId: fp.paymentId,
      providerPaymentId: fp.checkFreePaymentId,
      payeeId: fp.payeeId,
      fromAccountId: fp.sourceAccountId,
      amountCents: fp.amount,
      status: mapFiservPaymentStatus(fp.status),
      scheduledDate: fp.scheduledDate,
      processedDate: fp.processDate,
      deliveryDate: fp.deliveredDate,
      method: fp.deliveryMethod === 'SameDay' ? 'rush'
        : fp.deliveryMethod === 'PaperCheck' ? 'check' : 'electronic',
      confirmationNumber: fp.confirmationNumber,
      memo: fp.memo,
      createdAt: fp.auditInfo.createdDate,
      failureReason: fp.failureReason,
    };
  }
}
