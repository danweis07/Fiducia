// TODO: Provisional integration — not yet validated in production.
/**
 * ClearBank BaaS Adapter
 *
 * Integrates with ClearBank — a UK clearing bank providing real-time payment
 * rails access (Faster Payments, BACS, CHAPS), sort code accounts, and
 * agency banking services under their UK banking license.
 *
 * ClearBank API: https://docs.clearbank.co.uk
 *
 * Configuration:
 *   CLEARBANK_API_KEY — API key for authentication
 *   CLEARBANK_BASE_URL — Base URL (default: https://institution-api.clearbank.co.uk/v3)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  BaaSAdapter,
  BaaSAccount,
  BaaSAccountType,
  BaaSAccountStatus,
  BaaSCurrency,
  BaaSPayment,
  BaaSPaymentStatus,
  BaaSPaymentRailType,
  BaaSKYCResult,
  BaaSKYCStatus,
  BaaSComplianceStatus,
  BaaSComplianceLevel,
  ListBaaSAccountsRequest,
  ListBaaSAccountsResponse,
  CreateBaaSAccountRequest,
  GetBaaSAccountRequest,
  InitiateBaaSPaymentRequest,
  GetBaaSKYCStatusRequest,
  GetBaaSComplianceStatusRequest,
  ListBaaSPaymentRailsRequest,
  ListBaaSPaymentRailsResponse,
} from './types.ts';

// =============================================================================
// CLEARBANK API RESPONSE TYPES
// =============================================================================

interface ClearBankAccount {
  accountId: string;
  name: string;
  type: string;
  status: string;
  iban: string;
  sortCode: string;
  accountNumber: string;
  currency: string;
  balance: number;
  availableBalance: number;
  createdAt: string;
  closedAt: string | null;
}

interface ClearBankPayment {
  paymentId: string;
  endToEndId: string | null;
  scheme: string;
  status: string;
  amount: number;
  currency: string;
  creditorName: string;
  reference: string;
  returnReasonCode: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  createdAt: string;
}

interface ClearBankKYCCheck {
  checkId: string;
  personId: string;
  referenceId: string;
  status: string;
  completedChecks: string[];
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClearBankComplianceReport {
  institutionId: string;
  status: string;
  frameworks: string[];
  issues: ClearBankComplianceIssue[];
  lastReportDate: string | null;
  nextReportDue: string | null;
  transactionMonitoringActive: boolean;
  sanctionsScreeningActive: boolean;
  updatedAt: string;
}

interface ClearBankComplianceIssue {
  id: string;
  severity: string;
  category: string;
  description: string;
  dueDate: string | null;
  createdAt: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapClearBankAccountType(type: string): BaaSAccountType {
  switch (type) {
    case 'Current': return 'local_account';
    case 'Settlement': return 'settlement';
    case 'Escrow': return 'escrow';
    case 'VirtualIban': return 'virtual_iban';
    default: return 'local_account';
  }
}

function mapClearBankAccountStatus(status: string): BaaSAccountStatus {
  switch (status) {
    case 'Enabled': return 'active';
    case 'Closed': return 'closed';
    case 'Suspended': return 'suspended';
    case 'Frozen': return 'frozen';
    case 'PendingApproval': return 'pending_approval';
    default: return 'pending_approval';
  }
}

function mapClearBankPaymentScheme(scheme: string): BaaSPaymentRailType {
  switch (scheme) {
    case 'FasterPayments': return 'faster_payments';
    case 'Bacs': return 'bacs';
    case 'CHAPS': return 'chaps';
    case 'SWIFT': return 'swift';
    default: return 'faster_payments';
  }
}

function mapClearBankPaymentStatus(status: string): BaaSPaymentStatus {
  switch (status) {
    case 'Initiated': return 'pending';
    case 'Submitted': return 'submitted';
    case 'Accepted': return 'processing';
    case 'Settled': return 'settled';
    case 'Returned': return 'returned';
    case 'Rejected': return 'failed';
    case 'Cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapClearBankKYCStatus(status: string): BaaSKYCStatus {
  switch (status) {
    case 'NotStarted': return 'not_started';
    case 'Pending': return 'pending';
    case 'InReview': return 'in_review';
    case 'Approved': return 'approved';
    case 'Rejected': return 'rejected';
    case 'Expired': return 'expired';
    default: return 'not_started';
  }
}

function mapClearBankComplianceLevel(status: string): BaaSComplianceLevel {
  switch (status) {
    case 'Compliant': return 'compliant';
    case 'MinorIssues': return 'minor_issues';
    case 'MajorIssues': return 'major_issues';
    case 'NonCompliant': return 'non_compliant';
    default: return 'minor_issues';
  }
}

function maskIban(iban: string): string {
  if (iban.length <= 8) return iban;
  return iban.substring(0, 4) + '********' + iban.substring(iban.length - 4);
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return '****' + accountNumber;
  return '****' + accountNumber.substring(accountNumber.length - 4);
}

function mapClearBankCurrency(currency: string): BaaSCurrency {
  const valid: BaaSCurrency[] = ['EUR', 'GBP', 'USD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'];
  return valid.includes(currency as BaaSCurrency) ? (currency as BaaSCurrency) : 'GBP';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ClearBankBaaSAdapter implements BaaSAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'clearbank',
    name: 'ClearBank BaaS',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('CLEARBANK_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('CLEARBANK_BASE_URL') ?? 'https://institution-api.clearbank.co.uk/v3';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('ClearBank adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-Id': crypto.randomUUID(),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`ClearBank API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/institutions/current');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async listAccounts(request: ListBaaSAccountsRequest): Promise<ListBaaSAccountsResponse> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().listAccounts(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    const page = Math.floor(offset / limit) + 1;
    let path = `/accounts?pageSize=${limit}&pageNumber=${page}`;
    if (request.status) path += `&status=${request.status}`;

    const response = await this.request<{ accounts: ClearBankAccount[]; totalCount: number }>('GET', path);

    return {
      accounts: response.accounts.map(a => ({
        accountId: a.accountId,
        type: mapClearBankAccountType(a.type),
        name: a.name,
        ibanMasked: a.iban ? maskIban(a.iban) : null,
        sortCode: a.sortCode,
        accountNumberMasked: maskAccountNumber(a.accountNumber),
        balanceCents: a.balance,
        availableBalanceCents: a.availableBalance,
        holdAmountCents: a.balance - a.availableBalance,
        status: mapClearBankAccountStatus(a.status),
        currency: mapClearBankCurrency(a.currency),
        country: 'GB',
        bic: 'CLRBGB22XXX',
        partnerBank: 'ClearBank',
        createdAt: a.createdAt,
        closedAt: a.closedAt,
      })),
      total: response.totalCount,
    };
  }

  async createAccount(request: CreateBaaSAccountRequest): Promise<BaaSAccount> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().createAccount(request);
    }

    const response = await this.request<ClearBankAccount>('POST', '/accounts', {
      accountName: request.name,
      owner: { name: request.name },
      currency: request.currency,
    });

    return {
      accountId: response.accountId,
      type: mapClearBankAccountType(response.type),
      name: response.name,
      ibanMasked: response.iban ? maskIban(response.iban) : null,
      sortCode: response.sortCode,
      accountNumberMasked: maskAccountNumber(response.accountNumber),
      balanceCents: response.balance,
      availableBalanceCents: response.availableBalance,
      holdAmountCents: 0,
      status: mapClearBankAccountStatus(response.status),
      currency: mapClearBankCurrency(response.currency),
      country: 'GB',
      bic: 'CLRBGB22XXX',
      partnerBank: 'ClearBank',
      createdAt: response.createdAt,
      closedAt: response.closedAt,
    };
  }

  async getAccount(request: GetBaaSAccountRequest): Promise<BaaSAccount> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getAccount(request);
    }

    const a = await this.request<ClearBankAccount>('GET', `/accounts/${request.accountId}`);
    return {
      accountId: a.accountId,
      type: mapClearBankAccountType(a.type),
      name: a.name,
      ibanMasked: a.iban ? maskIban(a.iban) : null,
      sortCode: a.sortCode,
      accountNumberMasked: maskAccountNumber(a.accountNumber),
      balanceCents: a.balance,
      availableBalanceCents: a.availableBalance,
      holdAmountCents: a.balance - a.availableBalance,
      status: mapClearBankAccountStatus(a.status),
      currency: mapClearBankCurrency(a.currency),
      country: 'GB',
      bic: 'CLRBGB22XXX',
      partnerBank: 'ClearBank',
      createdAt: a.createdAt,
      closedAt: a.closedAt,
    };
  }

  async initiatePayment(request: InitiateBaaSPaymentRequest): Promise<BaaSPayment> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().initiatePayment(request);
    }

    const { payment } = request;

    // Route to the correct ClearBank endpoint based on payment rail
    let endpoint: string;
    switch (payment.railType) {
      case 'faster_payments':
        endpoint = '/payments/fps';
        break;
      case 'bacs':
        endpoint = '/payments/bacs';
        break;
      case 'chaps':
        endpoint = '/payments/chaps';
        break;
      default:
        endpoint = '/payments/fps';
    }

    const response = await this.request<ClearBankPayment>('POST', endpoint, {
      debitAccountId: payment.fromAccountId,
      creditAccountNumber: payment.beneficiaryAccountIdentifier,
      creditSortCode: payment.beneficiarySortCode,
      amount: payment.amountCents,
      currency: payment.currency,
      creditorName: payment.beneficiaryName,
      reference: payment.reference,
      endToEndId: payment.endToEndId,
    });

    return {
      paymentId: response.paymentId,
      fromAccountId: payment.fromAccountId,
      railType: mapClearBankPaymentScheme(response.scheme),
      amountCents: response.amount,
      currency: mapClearBankCurrency(response.currency),
      beneficiaryName: response.creditorName,
      reference: response.reference,
      endToEndId: response.endToEndId,
      status: mapClearBankPaymentStatus(response.status),
      returnReasonCode: response.returnReasonCode,
      submittedAt: response.submittedAt,
      settledAt: response.settledAt,
      createdAt: response.createdAt,
    };
  }

  async getKYCStatus(request: GetBaaSKYCStatusRequest): Promise<BaaSKYCResult> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getKYCStatus(request);
    }

    const response = await this.request<ClearBankKYCCheck>(
      'GET', `/kyc/persons/${request.personId}/checks/current`,
    );

    return {
      kycId: response.checkId,
      partnerReferenceId: response.referenceId,
      personId: response.personId,
      level: 'standard',
      status: mapClearBankKYCStatus(response.status),
      jurisdiction: 'GB',
      regulatoryFramework: 'FCA',
      completedChecks: response.completedChecks,
      rejectionReason: response.rejectionReason,
      expiresAt: response.expiresAt,
      createdAt: response.createdAt,
      updatedAt: response.updatedAt,
    };
  }

  async getComplianceStatus(request: GetBaaSComplianceStatusRequest): Promise<BaaSComplianceStatus> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getComplianceStatus(request);
    }

    const response = await this.request<ClearBankComplianceReport>(
      'GET', `/compliance/status`,
    );

    return {
      tenantId: request.tenantId,
      level: mapClearBankComplianceLevel(response.status),
      frameworks: response.frameworks,
      openIssues: response.issues.map(i => ({
        issueId: i.id,
        severity: (['low', 'medium', 'high', 'critical'].includes(i.severity)
          ? i.severity as 'low' | 'medium' | 'high' | 'critical'
          : 'medium'),
        category: i.category,
        description: i.description,
        dueDate: i.dueDate,
        createdAt: i.createdAt,
      })),
      lastReportDate: response.lastReportDate,
      nextReportDueDate: response.nextReportDue,
      transactionMonitoringActive: response.transactionMonitoringActive,
      sanctionsScreeningActive: response.sanctionsScreeningActive,
      updatedAt: response.updatedAt,
    };
  }

  async listPaymentRails(request: ListBaaSPaymentRailsRequest): Promise<ListBaaSPaymentRailsResponse> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().listPaymentRails(request);
    }

    // ClearBank supports UK rails and SWIFT — filter by currency if provided
    const { MockBaaSAdapter } = await import('./mock-adapter.ts');
    const allRails = await new MockBaaSAdapter().listPaymentRails(request);

    // Filter to only ClearBank-supported rails (UK domestic + SWIFT)
    const clearBankRails = allRails.rails.filter(r =>
      ['faster_payments', 'bacs', 'chaps', 'swift'].includes(r.railType)
    );

    return {
      rails: request.currency
        ? clearBankRails.filter(r => r.currencies.includes(request.currency!))
        : clearBankRails,
    };
  }
}
