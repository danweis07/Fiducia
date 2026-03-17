// TODO: Provisional integration — not yet validated in production.
/**
 * FIS Code Connect Bill Pay Adapter
 *
 * Integrates with FIS's Code Connect platform for bill payment processing.
 * FIS (formerly Metavante) is a major competitor to Fiserv in the bill pay space.
 *
 * API Reference: FIS Code Connect Portal
 *
 * Key differences from Fiserv:
 *   - More enterprise-style schemas with nested objects and audit headers
 *   - Account linking — users can see biller account balances
 *   - Strong payment scheduling with detailed confirmation
 *   - RESTful API under the "Payments" category
 *
 * Configuration:
 *   FIS_API_KEY — API key for authentication
 *   FIS_CLIENT_ID — Client identifier
 *   FIS_BASE_URL — Base URL (default: https://api.fisglobal.com)
 *   FIS_INSTITUTION_ID — FI's institution identifier
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
// FIS API TYPES (mirrors Code Connect schema)
// =============================================================================

interface FISBillerRecord {
  billerIdentifier: string;
  billerDetails: {
    name: string;
    displayName: string;
    categoryType: string;
    logoUrl?: string;
    capabilities: {
      electronicBillPresent: boolean;
      expeditedPayment: boolean;
      standardProcessingDays: number;
    };
  };
  enrollmentRequirements: Array<{
    fieldIdentifier: string;
    fieldLabel: string;
    dataType: string;
    mandatory: boolean;
    maxLength?: number;
    validationPattern?: string;
    tooltip?: string;
  }>;
}

interface FISPayeeRecord {
  payeeIdentifier: string;
  billerIdentifier: string;
  payeeInformation: {
    displayName: string;
    userNickname?: string;
    categoryType: string;
    maskedAccountReference: string;
    billerAccountDetails?: {
      currentBalance?: number;
      minimumPaymentDue?: number;
      nextPaymentDueDate?: string;
      amountDue?: number;
    };
  };
  eBillStatus: {
    enrollmentState: string;    // NotEnrolled | PendingActivation | Active | Suspended
  };
  autopayConfiguration: {
    enabled: boolean;
  };
  auditMetadata: {
    enrollmentTimestamp: string;
  };
}

interface FISPaymentRecord {
  paymentIdentifier: string;
  externalPaymentReference: string;
  paymentDetails: {
    payeeIdentifier: string;
    sourceAccountIdentifier: string;
    paymentAmount: number;
    scheduledPaymentDate: string;
    deliveryMethod: string;         // ELECTRONIC | CHECK | EXPEDITED
    paymentMemo?: string;
    confirmationCode: string;
  };
  paymentStatus: {
    currentState: string;           // SCHEDULED | IN_PROGRESS | COMPLETED | FAILED | CANCELLED | RETURNED
    processedTimestamp?: string;
    deliveredTimestamp?: string;
    failureDetails?: {
      reasonCode: string;
      reasonDescription: string;
    };
  };
  recurringConfiguration?: {
    frequency: string;
    terminationDate?: string;
    remainingOccurrences?: number;
  };
  auditMetadata: {
    createdTimestamp: string;
    lastModifiedTimestamp: string;
    createdBy: string;
  };
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapFISCategory(categoryType: string): BillerCategory {
  const map: Record<string, BillerCategory> = {
    'UTILITIES': 'utilities',
    'TELECOMMUNICATIONS': 'telecom',
    'INSURANCE': 'insurance',
    'CREDIT_CARD': 'credit_card',
    'MORTGAGE': 'mortgage',
    'AUTO_FINANCE': 'auto_loan',
    'STUDENT_LENDING': 'student_loan',
    'GOVERNMENT': 'government',
    'HEALTHCARE': 'medical',
    'DIGITAL_SERVICES': 'subscription',
  };
  return map[categoryType] ?? 'other';
}

function mapFISPaymentStatus(state: string): PaymentStatus {
  switch (state) {
    case 'SCHEDULED':     return 'scheduled';
    case 'IN_PROGRESS':   return 'processing';
    case 'COMPLETED':     return 'paid';
    case 'FAILED':        return 'failed';
    case 'CANCELLED':     return 'canceled';
    case 'RETURNED':      return 'returned';
    default:              return 'scheduled';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FISBillPayAdapter implements BillPayAdapter {
  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly baseUrl: string;
  private readonly institutionId: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'fis',
    name: 'FIS Code Connect Bill Pay',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(apiKey?: string, clientId?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? Deno.env.get('FIS_API_KEY') ?? '';
    this.clientId = clientId ?? Deno.env.get('FIS_CLIENT_ID') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('FIS_BASE_URL') ?? 'https://api.fisglobal.com';
    this.institutionId = Deno.env.get('FIS_INSTITUTION_ID') ?? '';
    this.sandbox = !this.apiKey || !this.clientId;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('FIS adapter in sandbox mode — no credentials configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Client-Id': this.clientId,
        'X-Institution-Id': this.institutionId,
        'Content-Type': 'application/json',
        'X-Correlation-Id': `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`FIS API error (${res.status}): ${errBody}`);
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
      await this.request('GET', '/payments/v1/health');
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
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().searchBillers(request);
    }

    const params = new URLSearchParams({
      searchTerm: request.query,
      ...(request.category ? { categoryType: request.category.toUpperCase() } : {}),
      ...(request.zipCode ? { serviceAreaZip: request.zipCode } : {}),
      pageSize: String(request.limit ?? 20),
    });

    const response = await this.request<{
      billerRecords: FISBillerRecord[];
      resultMetadata: { totalResults: number };
    }>('GET', `/payments/v1/biller-directory?${params}`);

    return {
      billers: response.billerRecords.map(b => ({
        billerId: b.billerIdentifier,
        name: b.billerDetails.name,
        shortName: b.billerDetails.displayName,
        category: mapFISCategory(b.billerDetails.categoryType),
        logoUrl: b.billerDetails.logoUrl,
        supportsEBill: b.billerDetails.capabilities.electronicBillPresent,
        supportsRushPayment: b.billerDetails.capabilities.expeditedPayment,
        processingDays: b.billerDetails.capabilities.standardProcessingDays,
        enrollmentFields: b.enrollmentRequirements.map(f => ({
          name: f.fieldIdentifier,
          label: f.fieldLabel,
          type: f.dataType as 'text',
          required: f.mandatory,
          maxLength: f.maxLength,
          pattern: f.validationPattern,
          helpText: f.tooltip,
        })),
      })),
      totalCount: response.resultMetadata.totalResults,
    };
  }

  async enrollPayee(request: EnrollPayeeRequest): Promise<EnrollPayeeResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().enrollPayee(request);
    }

    const response = await this.request<FISPayeeRecord>('POST', '/payments/v1/payees', {
      billerIdentifier: request.billerId,
      accountReference: request.accountNumber,
      userNickname: request.nickname,
      enrollmentFields: request.enrollmentFields,
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

    const response = await this.request<{ payeeRecords: FISPayeeRecord[] }>(
      'GET',
      '/payments/v1/payees',
    );

    return {
      payees: response.payeeRecords.map(p => this.mapPayee(p)),
    };
  }

  async schedulePayment(request: SchedulePaymentRequest): Promise<SchedulePaymentResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().schedulePayment(request);
    }

    const response = await this.request<FISPaymentRecord>('POST', '/payments/v1/bill-payments', {
      payeeIdentifier: request.payeeId,
      sourceAccountIdentifier: request.fromAccountId,
      paymentAmount: request.amountCents,
      scheduledPaymentDate: request.scheduledDate,
      deliveryMethod: request.method === 'rush' ? 'EXPEDITED' : 'ELECTRONIC',
      paymentMemo: request.memo,
      ...(request.recurringRule ? {
        recurringConfiguration: {
          frequency: request.recurringRule.frequency.toUpperCase(),
          terminationDate: request.recurringRule.endDate,
        },
      } : {}),
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

    const response = await this.request<FISPaymentRecord>(
      'PUT',
      `/payments/v1/bill-payments/${request.providerPaymentId}/cancel`,
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

    const response = await this.request<FISPaymentRecord>(
      'GET',
      `/payments/v1/bill-payments/${request.providerPaymentId}`,
    );

    return this.mapPayment(response);
  }

  async listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listPayments(request);
    }

    const params = new URLSearchParams({
      ...(request.payeeId ? { payeeIdentifier: request.payeeId } : {}),
      ...(request.status ? { statusFilter: request.status.toUpperCase() } : {}),
      ...(request.fromDate ? { fromDate: request.fromDate } : {}),
      ...(request.toDate ? { toDate: request.toDate } : {}),
      pageSize: String(request.limit ?? 50),
      pageOffset: String(request.offset ?? 0),
    });

    const response = await this.request<{
      paymentRecords: FISPaymentRecord[];
      resultMetadata: { totalResults: number };
    }>('GET', `/payments/v1/bill-payments?${params}`);

    return {
      payments: response.paymentRecords.map(p => this.mapPayment(p)),
      totalCount: response.resultMetadata.totalResults,
    };
  }

  async listEBills(request: ListEBillsRequest): Promise<ListEBillsResponse> {
    if (this.sandbox) {
      const { MockBillPayAdapter } = await import('./mock-adapter.ts');
      return new MockBillPayAdapter().listEBills(request);
    }

    const params = new URLSearchParams({
      ...(request.payeeId ? { payeeIdentifier: request.payeeId } : {}),
      ...(request.status ? { billStatus: request.status.toUpperCase() } : {}),
    });

    const response = await this.request<{
      eBillRecords: Array<{
        eBillIdentifier: string;
        payeeIdentifier: string;
        billDetails: {
          totalAmountDue: number;
          minimumPaymentDue?: number;
          paymentDueDate: string;
          statementDate: string;
          outstandingBalance?: number;
        };
        billStatus: string;
      }>;
    }>('GET', `/payments/v1/electronic-bills?${params}`);

    return {
      eBills: response.eBillRecords.map(e => ({
        eBillId: e.eBillIdentifier,
        payeeId: e.payeeIdentifier,
        amountCents: e.billDetails.totalAmountDue,
        minimumPaymentCents: e.billDetails.minimumPaymentDue,
        dueDate: e.billDetails.paymentDueDate,
        statementDate: e.billDetails.statementDate,
        status: e.billStatus.toLowerCase() as 'unpaid',
        balanceCents: e.billDetails.outstandingBalance,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // MAPPERS
  // ---------------------------------------------------------------------------

  private mapPayee(fp: FISPayeeRecord): Payee {
    return {
      payeeId: fp.payeeIdentifier,
      billerId: fp.billerIdentifier,
      nickname: fp.payeeInformation.userNickname,
      billerName: fp.payeeInformation.displayName,
      category: mapFISCategory(fp.payeeInformation.categoryType),
      accountNumberMasked: fp.payeeInformation.maskedAccountReference,
      eBillStatus: fp.eBillStatus.enrollmentState === 'Active' ? 'active'
        : fp.eBillStatus.enrollmentState === 'PendingActivation' ? 'pending' : 'not_enrolled',
      nextDueDate: fp.payeeInformation.billerAccountDetails?.nextPaymentDueDate,
      nextAmountDueCents: fp.payeeInformation.billerAccountDetails?.amountDue,
      minimumPaymentCents: fp.payeeInformation.billerAccountDetails?.minimumPaymentDue,
      accountBalanceCents: fp.payeeInformation.billerAccountDetails?.currentBalance,
      enrolledAt: fp.auditMetadata.enrollmentTimestamp,
      autopayEnabled: fp.autopayConfiguration.enabled,
    };
  }

  private mapPayment(fp: FISPaymentRecord): Payment {
    return {
      paymentId: fp.paymentIdentifier,
      providerPaymentId: fp.externalPaymentReference,
      payeeId: fp.paymentDetails.payeeIdentifier,
      fromAccountId: fp.paymentDetails.sourceAccountIdentifier,
      amountCents: fp.paymentDetails.paymentAmount,
      status: mapFISPaymentStatus(fp.paymentStatus.currentState),
      scheduledDate: fp.paymentDetails.scheduledPaymentDate,
      processedDate: fp.paymentStatus.processedTimestamp,
      deliveryDate: fp.paymentStatus.deliveredTimestamp,
      method: fp.paymentDetails.deliveryMethod === 'EXPEDITED' ? 'rush'
        : fp.paymentDetails.deliveryMethod === 'CHECK' ? 'check' : 'electronic',
      confirmationNumber: fp.paymentDetails.confirmationCode,
      memo: fp.paymentDetails.paymentMemo,
      recurringRule: fp.recurringConfiguration ? {
        frequency: fp.recurringConfiguration.frequency.toLowerCase() as 'monthly',
        endDate: fp.recurringConfiguration.terminationDate,
        remainingPayments: fp.recurringConfiguration.remainingOccurrences,
      } : undefined,
      createdAt: fp.auditMetadata.createdTimestamp,
      failureReason: fp.paymentStatus.failureDetails?.reasonDescription,
    };
  }
}
