/**
 * Mock BaaS Adapter
 *
 * Returns synthetic data for development and testing.
 * Includes EU IBAN accounts and UK sort code accounts.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  BaaSAdapter,
  BaaSAccount,
  BaaSPayment,
  BaaSKYCResult,
  BaaSComplianceStatus,
  BaaSPaymentRail,
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

export class MockBaaSAdapter implements BaaSAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-baas',
    name: 'Mock BaaS',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async listAccounts(request: ListBaaSAccountsRequest): Promise<ListBaaSAccountsResponse> {
    const accounts: BaaSAccount[] = [
      {
        accountId: 'baas_mock_eu_1',
        type: 'virtual_iban',
        name: 'EU Operating Account',
        ibanMasked: 'DE89********4567',
        sortCode: null,
        accountNumberMasked: '****4567',
        balanceCents: 24500000,
        availableBalanceCents: 24200000,
        holdAmountCents: 300000,
        status: 'active',
        currency: 'EUR',
        country: 'DE',
        bic: 'SOBKDEBBXXX',
        partnerBank: 'Solaris SE',
        createdAt: '2024-03-15T00:00:00Z',
        closedAt: null,
      },
      {
        accountId: 'baas_mock_eu_2',
        type: 'virtual_iban',
        name: 'EU Settlement Account',
        ibanMasked: 'DE72********8901',
        sortCode: null,
        accountNumberMasked: '****8901',
        balanceCents: 8750000,
        availableBalanceCents: 8750000,
        holdAmountCents: 0,
        status: 'active',
        currency: 'EUR',
        country: 'DE',
        bic: 'SOBKDEBBXXX',
        partnerBank: 'Solaris SE',
        createdAt: '2024-03-15T00:00:00Z',
        closedAt: null,
      },
      {
        accountId: 'baas_mock_uk_1',
        type: 'local_account',
        name: 'UK Operating Account',
        ibanMasked: 'GB29********6789',
        sortCode: '040004',
        accountNumberMasked: '****6789',
        balanceCents: 18300000,
        availableBalanceCents: 17800000,
        holdAmountCents: 500000,
        status: 'active',
        currency: 'GBP',
        country: 'GB',
        bic: 'CLRBGB22XXX',
        partnerBank: 'ClearBank',
        createdAt: '2024-04-01T00:00:00Z',
        closedAt: null,
      },
      {
        accountId: 'baas_mock_uk_2',
        type: 'settlement',
        name: 'UK Settlement Account',
        ibanMasked: 'GB82********2345',
        sortCode: '040004',
        accountNumberMasked: '****2345',
        balanceCents: 5600000,
        availableBalanceCents: 5600000,
        holdAmountCents: 0,
        status: 'active',
        currency: 'GBP',
        country: 'GB',
        bic: 'CLRBGB22XXX',
        partnerBank: 'ClearBank',
        createdAt: '2024-04-01T00:00:00Z',
        closedAt: null,
      },
    ];

    let filtered = accounts;
    if (request.status) filtered = filtered.filter(a => a.status === request.status);
    if (request.currency) filtered = filtered.filter(a => a.currency === request.currency);

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { accounts: filtered.slice(offset, offset + limit), total: filtered.length };
  }

  async createAccount(request: CreateBaaSAccountRequest): Promise<BaaSAccount> {
    const isUK = request.country === 'GB';
    const mockId = `baas_mock_${Date.now()}`;
    return {
      accountId: mockId,
      type: request.type,
      name: request.name,
      ibanMasked: isUK ? 'GB29********0000' : 'DE89********0000',
      sortCode: isUK ? '040004' : null,
      accountNumberMasked: '****0000',
      balanceCents: 0,
      availableBalanceCents: 0,
      holdAmountCents: 0,
      status: 'pending_approval',
      currency: request.currency,
      country: request.country,
      bic: isUK ? 'CLRBGB22XXX' : 'SOBKDEBBXXX',
      partnerBank: isUK ? 'ClearBank' : 'Solaris SE',
      createdAt: new Date().toISOString(),
      closedAt: null,
    };
  }

  async getAccount(request: GetBaaSAccountRequest): Promise<BaaSAccount> {
    const { accounts } = await this.listAccounts({ userId: request.userId, tenantId: request.tenantId });
    const account = accounts.find(a => a.accountId === request.accountId);
    if (!account) throw new Error(`BaaS account ${request.accountId} not found`);
    return account;
  }

  async initiatePayment(request: InitiateBaaSPaymentRequest): Promise<BaaSPayment> {
    const { payment } = request;
    return {
      paymentId: `baas_pmt_mock_${Date.now()}`,
      fromAccountId: payment.fromAccountId,
      railType: payment.railType,
      amountCents: payment.amountCents,
      currency: payment.currency,
      beneficiaryName: payment.beneficiaryName,
      reference: payment.reference,
      endToEndId: payment.endToEndId ?? null,
      status: 'pending',
      returnReasonCode: null,
      submittedAt: null,
      settledAt: null,
      createdAt: new Date().toISOString(),
    };
  }

  async getKYCStatus(request: GetBaaSKYCStatusRequest): Promise<BaaSKYCResult> {
    return {
      kycId: `baas_kyc_mock_${request.personId}`,
      partnerReferenceId: `partner_ref_${request.personId}`,
      personId: request.personId,
      level: 'standard',
      status: 'approved',
      jurisdiction: 'DE',
      regulatoryFramework: 'MLD5',
      completedChecks: ['identity_verification', 'address_verification', 'sanctions_screening', 'pep_check'],
      rejectionReason: null,
      expiresAt: '2026-12-31T23:59:59Z',
      createdAt: '2024-06-01T10:00:00Z',
      updatedAt: '2024-06-01T12:00:00Z',
    };
  }

  async getComplianceStatus(request: GetBaaSComplianceStatusRequest): Promise<BaaSComplianceStatus> {
    return {
      tenantId: request.tenantId,
      level: 'compliant',
      frameworks: ['PSD2', 'MLD5', 'GDPR', 'FCA'],
      openIssues: [
        {
          issueId: 'baas_issue_mock_1',
          severity: 'low',
          category: 'documentation',
          description: 'Annual beneficial ownership confirmation due',
          dueDate: '2026-06-30T23:59:59Z',
          createdAt: '2026-01-15T00:00:00Z',
        },
      ],
      lastReportDate: '2026-02-28T00:00:00Z',
      nextReportDueDate: '2026-03-31T00:00:00Z',
      transactionMonitoringActive: true,
      sanctionsScreeningActive: true,
      updatedAt: new Date().toISOString(),
    };
  }

  async listPaymentRails(_request: ListBaaSPaymentRailsRequest): Promise<ListBaaSPaymentRailsResponse> {
    const rails: BaaSPaymentRail[] = [
      {
        railType: 'sepa_credit',
        available: true,
        currencies: ['EUR'],
        maxAmountCents: 99999999999,
        settlementTime: '1 business day',
        cutoffTimeUtc: '14:00',
      },
      {
        railType: 'sepa_instant',
        available: true,
        currencies: ['EUR'],
        maxAmountCents: 10000000,
        settlementTime: '10 seconds',
        cutoffTimeUtc: null,
      },
      {
        railType: 'sepa_direct_debit',
        available: true,
        currencies: ['EUR'],
        maxAmountCents: 99999999999,
        settlementTime: '2-3 business days',
        cutoffTimeUtc: '12:00',
      },
      {
        railType: 'faster_payments',
        available: true,
        currencies: ['GBP'],
        maxAmountCents: 100000000,
        settlementTime: 'Near real-time',
        cutoffTimeUtc: null,
      },
      {
        railType: 'bacs',
        available: true,
        currencies: ['GBP'],
        maxAmountCents: 99999999999,
        settlementTime: '3 business days',
        cutoffTimeUtc: '16:00',
      },
      {
        railType: 'chaps',
        available: true,
        currencies: ['GBP'],
        maxAmountCents: 99999999999,
        settlementTime: 'Same day',
        cutoffTimeUtc: '14:30',
      },
      {
        railType: 'swift',
        available: true,
        currencies: ['EUR', 'GBP', 'USD', 'CHF'],
        maxAmountCents: 99999999999,
        settlementTime: '1-5 business days',
        cutoffTimeUtc: '14:00',
      },
    ];

    return { rails };
  }
}
