// TODO: Provisional integration — not yet validated in production.
/**
 * Solaris BaaS Adapter
 *
 * Integrates with Solaris SE — a fully licensed German bank providing
 * "License-as-a-Service" for European banking operations. Offers virtual
 * IBANs, SEPA payment rails, KYC under Solaris' banking license, and
 * regulatory compliance infrastructure.
 *
 * Solaris API: https://docs.solarisgroup.com
 *
 * Configuration:
 *   SOLARIS_API_KEY — API key for authentication
 *   SOLARIS_BASE_URL — Base URL (default: https://api.solarisbank.de/v1)
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
// SOLARIS API RESPONSE TYPES
// =============================================================================

interface SolarisAccount {
  id: string;
  iban: string;
  bic: string;
  balance: { value: number; currency: string };
  available_balance: { value: number; currency: string };
  locking_status: string;
  status: string;
  type: string;
  name: string;
  created_at: string;
  closed_at: string | null;
}

interface SolarisSepaTransfer {
  id: string;
  status: string;
  amount: { value: number; currency: string };
  recipient_iban: string;
  recipient_name: string;
  reference: string;
  end_to_end_id: string | null;
  return_reason_code: string | null;
  submitted_at: string | null;
  settled_at: string | null;
  created_at: string;
}

interface SolarisKYC {
  id: string;
  person_id: string;
  method: string;
  status: string;
  rejection_reason: string | null;
  completed_checks: string[];
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SolarisComplianceReport {
  tenant_id: string;
  status: string;
  frameworks: string[];
  issues: SolarisComplianceIssue[];
  last_report_date: string | null;
  next_report_due: string | null;
  transaction_monitoring: boolean;
  sanctions_screening: boolean;
  updated_at: string;
}

interface SolarisComplianceIssue {
  id: string;
  severity: string;
  category: string;
  description: string;
  due_date: string | null;
  created_at: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapSolarisAccountType(type: string): BaaSAccountType {
  switch (type) {
    case 'virtual_iban': return 'virtual_iban';
    case 'settlement': return 'settlement';
    case 'escrow': return 'escrow';
    default: return 'virtual_iban';
  }
}

function mapSolarisAccountStatus(status: string, lockingStatus: string): BaaSAccountStatus {
  if (lockingStatus === 'BLOCKED') return 'frozen';
  switch (status) {
    case 'ACTIVE': return 'active';
    case 'CLOSED': return 'closed';
    case 'PENDING': return 'pending_approval';
    case 'SUSPENDED': return 'suspended';
    default: return 'pending_approval';
  }
}

function mapSolarisPaymentStatus(status: string): BaaSPaymentStatus {
  switch (status) {
    case 'accepted': return 'pending';
    case 'confirmed': return 'submitted';
    case 'executed': return 'processing';
    case 'completed': return 'settled';
    case 'returned': return 'returned';
    case 'declined': return 'failed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function mapSolarisKYCStatus(status: string): BaaSKYCStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'in_progress': return 'in_review';
    case 'successful': return 'approved';
    case 'failed': return 'rejected';
    case 'expired': return 'expired';
    default: return 'not_started';
  }
}

function mapSolarisComplianceLevel(status: string): BaaSComplianceLevel {
  switch (status) {
    case 'compliant': return 'compliant';
    case 'minor_issues': return 'minor_issues';
    case 'major_issues': return 'major_issues';
    case 'non_compliant': return 'non_compliant';
    default: return 'minor_issues';
  }
}

function maskIban(iban: string): string {
  if (iban.length <= 8) return iban;
  return iban.substring(0, 4) + '********' + iban.substring(iban.length - 4);
}

function extractAccountNumberLast4(iban: string): string {
  return '****' + iban.substring(iban.length - 4);
}

function mapSolarisCurrency(currency: string): BaaSCurrency {
  const valid: BaaSCurrency[] = ['EUR', 'GBP', 'USD', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK'];
  return valid.includes(currency as BaaSCurrency) ? (currency as BaaSCurrency) : 'EUR';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SolarisBaaSAdapter implements BaaSAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'solaris',
    name: 'Solaris BaaS',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('SOLARIS_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('SOLARIS_BASE_URL') ?? 'https://api.solarisbank.de/v1';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Solaris adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Solaris API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/accounts?page[size]=1');
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
    let path = `/accounts?page[size]=${limit}&page[number]=${page}`;
    if (request.status) path += `&filter[status]=${request.status}`;

    const response = await this.request<{ data: SolarisAccount[]; total: number }>('GET', path);

    return {
      accounts: response.data.map(a => ({
        accountId: a.id,
        type: mapSolarisAccountType(a.type),
        name: a.name,
        ibanMasked: maskIban(a.iban),
        sortCode: null,
        accountNumberMasked: extractAccountNumberLast4(a.iban),
        balanceCents: a.balance.value,
        availableBalanceCents: a.available_balance.value,
        holdAmountCents: a.balance.value - a.available_balance.value,
        status: mapSolarisAccountStatus(a.status, a.locking_status),
        currency: mapSolarisCurrency(a.balance.currency),
        country: 'DE',
        bic: a.bic,
        partnerBank: 'Solaris SE',
        createdAt: a.created_at,
        closedAt: a.closed_at,
      })),
      total: response.total,
    };
  }

  async createAccount(request: CreateBaaSAccountRequest): Promise<BaaSAccount> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().createAccount(request);
    }

    const response = await this.request<SolarisAccount>('POST', '/accounts', {
      type: request.type,
      name: request.name,
      currency: request.currency,
    });

    return {
      accountId: response.id,
      type: mapSolarisAccountType(response.type),
      name: response.name,
      ibanMasked: maskIban(response.iban),
      sortCode: null,
      accountNumberMasked: extractAccountNumberLast4(response.iban),
      balanceCents: response.balance.value,
      availableBalanceCents: response.available_balance.value,
      holdAmountCents: 0,
      status: mapSolarisAccountStatus(response.status, response.locking_status),
      currency: mapSolarisCurrency(response.balance.currency),
      country: 'DE',
      bic: response.bic,
      partnerBank: 'Solaris SE',
      createdAt: response.created_at,
      closedAt: response.closed_at,
    };
  }

  async getAccount(request: GetBaaSAccountRequest): Promise<BaaSAccount> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getAccount(request);
    }

    const a = await this.request<SolarisAccount>('GET', `/accounts/${request.accountId}`);
    return {
      accountId: a.id,
      type: mapSolarisAccountType(a.type),
      name: a.name,
      ibanMasked: maskIban(a.iban),
      sortCode: null,
      accountNumberMasked: extractAccountNumberLast4(a.iban),
      balanceCents: a.balance.value,
      availableBalanceCents: a.available_balance.value,
      holdAmountCents: a.balance.value - a.available_balance.value,
      status: mapSolarisAccountStatus(a.status, a.locking_status),
      currency: mapSolarisCurrency(a.balance.currency),
      country: 'DE',
      bic: a.bic,
      partnerBank: 'Solaris SE',
      createdAt: a.created_at,
      closedAt: a.closed_at,
    };
  }

  async initiatePayment(request: InitiateBaaSPaymentRequest): Promise<BaaSPayment> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().initiatePayment(request);
    }

    const { payment } = request;
    const endpoint = payment.railType === 'sepa_instant'
      ? '/sepa_instant_credit_transfers'
      : '/sepa_credit_transfers';

    const response = await this.request<SolarisSepaTransfer>('POST', endpoint, {
      account_id: payment.fromAccountId,
      recipient_iban: payment.beneficiaryAccountIdentifier,
      recipient_name: payment.beneficiaryName,
      amount: { value: payment.amountCents, currency: payment.currency },
      reference: payment.reference,
      end_to_end_id: payment.endToEndId,
    });

    return {
      paymentId: response.id,
      fromAccountId: payment.fromAccountId,
      railType: payment.railType,
      amountCents: response.amount.value,
      currency: payment.currency,
      beneficiaryName: response.recipient_name,
      reference: response.reference,
      endToEndId: response.end_to_end_id,
      status: mapSolarisPaymentStatus(response.status),
      returnReasonCode: response.return_reason_code,
      submittedAt: response.submitted_at,
      settledAt: response.settled_at,
      createdAt: response.created_at,
    };
  }

  async getKYCStatus(request: GetBaaSKYCStatusRequest): Promise<BaaSKYCResult> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getKYCStatus(request);
    }

    const response = await this.request<SolarisKYC>(
      'GET', `/persons/${request.personId}/identifications/current`,
    );

    return {
      kycId: response.id,
      partnerReferenceId: response.id,
      personId: response.person_id,
      level: 'standard',
      status: mapSolarisKYCStatus(response.status),
      jurisdiction: 'DE',
      regulatoryFramework: 'MLD5',
      completedChecks: response.completed_checks,
      rejectionReason: response.rejection_reason,
      expiresAt: response.expires_at,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
    };
  }

  async getComplianceStatus(request: GetBaaSComplianceStatusRequest): Promise<BaaSComplianceStatus> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().getComplianceStatus(request);
    }

    const response = await this.request<SolarisComplianceReport>(
      'GET', `/compliance/tenants/${request.tenantId}/status`,
    );

    return {
      tenantId: response.tenant_id,
      level: mapSolarisComplianceLevel(response.status),
      frameworks: response.frameworks,
      openIssues: response.issues.map(i => ({
        issueId: i.id,
        severity: (['low', 'medium', 'high', 'critical'].includes(i.severity)
          ? i.severity as 'low' | 'medium' | 'high' | 'critical'
          : 'medium'),
        category: i.category,
        description: i.description,
        dueDate: i.due_date,
        createdAt: i.created_at,
      })),
      lastReportDate: response.last_report_date,
      nextReportDueDate: response.next_report_due,
      transactionMonitoringActive: response.transaction_monitoring,
      sanctionsScreeningActive: response.sanctions_screening,
      updatedAt: response.updated_at,
    };
  }

  async listPaymentRails(request: ListBaaSPaymentRailsRequest): Promise<ListBaaSPaymentRailsResponse> {
    if (this.sandbox) {
      const { MockBaaSAdapter } = await import('./mock-adapter.ts');
      return new MockBaaSAdapter().listPaymentRails(request);
    }

    // Solaris supports SEPA rails and SWIFT — filter by currency if provided
    const { MockBaaSAdapter } = await import('./mock-adapter.ts');
    const allRails = await new MockBaaSAdapter().listPaymentRails(request);

    // Filter to only Solaris-supported rails (SEPA + SWIFT)
    const solarisRails = allRails.rails.filter(r =>
      ['sepa_credit', 'sepa_instant', 'sepa_direct_debit', 'swift'].includes(r.railType)
    );

    return {
      rails: request.currency
        ? solarisRails.filter(r => r.currencies.includes(request.currency!))
        : solarisRails,
    };
  }
}
