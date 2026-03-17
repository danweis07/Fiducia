// TODO: Provisional integration — not yet validated in production.
/**
 * CU*Answers Remote Deposit Capture (RDC) Adapter
 *
 * Integrates with CU*Answers' built-in RDC service for check deposit
 * processing. The flow is:
 *   1. Check enrollment status → enroll if not enrolled
 *   2. Check deposit eligibility (limits, standing)
 *   3. Submit deposit amount
 *   4. Update daily counter
 *
 * Note: CU*Answers RDC handles image capture/processing on their end.
 * This adapter passes through the deposit request and status management.
 *
 * API Base: /api/credit_unions/{credit_union_id}/transactions/remote_deposit_capture
 *
 * Configuration:
 *   CUANSWERS_BASE_URL — API base URL
 *   CUANSWERS_APP_KEY — APP Key for authentication
 *   CUANSWERS_CREDIT_UNION_ID — Credit Union ID (format: CUXXXXX)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  RDCAdapter,
  DepositStatus,
  SubmitDepositRequest,
  SubmitDepositResponse,
  GetDepositStatusRequest,
  GetDepositStatusResponse,
  GetDepositLimitsRequest,
  DepositLimits,
  ValidateCheckRequest,
  CheckValidationResult,
} from './types.ts';

// =============================================================================
// CU*ANSWERS RDC API TYPES
// =============================================================================

interface CUAnswersEnrollResponse {
  data: {
    last_eula_accepted: string;
    account_base: string;
    enrollment_status: 'enrolled' | 'not enrolled';
    message: string;
  };
}

interface CUAnswersDepositResponse {
  data: {
    deposit_status: 'accepted' | 'rejected';
    last_eula_accepted: string;
    account_base: string;
    enrollment_status: string;
    message: string;
  };
}

interface CUAnswersCheckDepositResponse {
  data: {
    in_good_standing: 'Y' | 'N';
    deposit_status: 'accepted' | 'rejected';
    message: string;
    account_base: string;
    enrollment_status: string;
    member_email: string;
  };
}

// =============================================================================
// IN-MEMORY DEPOSIT TRACKING
// =============================================================================

interface DepositRecord {
  depositId: string;
  accountId: string;
  amountCents: number;
  status: DepositStatus;
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

const depositStore = new Map<string, DepositRecord>();

// =============================================================================
// ADAPTER
// =============================================================================

export class CUAnswersRDCAdapter implements RDCAdapter {
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly creditUnionId: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'cuanswers_rdc',
    name: 'CU*Answers Remote Deposit Capture',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 60000 }, // RDC can be slow
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.baseUrl = Deno.env.get('CUANSWERS_BASE_URL') ?? '';
    this.appKey = Deno.env.get('CUANSWERS_APP_KEY') ?? '';
    this.creditUnionId = Deno.env.get('CUANSWERS_CREDIT_UNION_ID') ?? '';
    this.sandbox = !this.baseUrl || !this.appKey || !this.creditUnionId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.sandbox) {
      throw new Error('CU*Answers RDC adapter in sandbox mode');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'APP-KEY': this.appKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`CU*Answers RDC API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  private rdcPath(subpath: string): string {
    return `/api/credit_unions/${this.creditUnionId}/transactions/remote_deposit_capture${subpath}`;
  }

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      // Use the enrollment check as a health probe
      await this.request('POST', this.rdcPath('/enroll'), {
        session_token: 'health_check',
        application_user_id: 'health_check',
      });
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

  // ---------------------------------------------------------------------------
  // Submit deposit
  // ---------------------------------------------------------------------------

  async submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    if (this.sandbox) {
      const { MockRDCAdapter } = await import('./mock-adapter.ts');
      return new MockRDCAdapter().submitDeposit(request);
    }

    const now = new Date().toISOString();
    const depositId = `cua-rdc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Step 1: Check enrollment and enroll if needed
    const enrollStatus = await this.request<CUAnswersEnrollResponse>(
      'POST',
      this.rdcPath('/enroll'),
      {
        session_token: request.userId,
        application_user_id: request.userId,
      },
    );

    if (enrollStatus.data.enrollment_status !== 'enrolled') {
      // Auto-enroll the member
      await this.request<CUAnswersEnrollResponse>(
        'PUT',
        this.rdcPath('/enroll'),
        {
          session_token: request.userId,
          application_user_id: request.userId,
        },
      );
    }

    // Step 2: Check deposit eligibility
    const depositDate = new Date().toISOString().replace(/-/g, '').slice(0, 8);
    const checkResult = await this.request<CUAnswersCheckDepositResponse>(
      'POST',
      this.rdcPath('/check_deposit'),
      {
        account_number: request.accountId,
        deposit_amount: request.amountCents, // CU*Answers uses cents for RDC
        deposit_date: depositDate,
      },
    );

    if (checkResult.data.in_good_standing !== 'Y' || checkResult.data.deposit_status === 'rejected') {
      const record: DepositRecord = {
        depositId,
        accountId: request.accountId,
        amountCents: request.amountCents,
        status: 'rejected',
        createdAt: now,
        updatedAt: now,
        rejectionReason: checkResult.data.message || 'Deposit check failed',
      };
      depositStore.set(depositId, record);

      return {
        providerDepositId: depositId,
        status: 'rejected',
        referenceNumber: depositId,
        receivedAt: now,
        provider: 'cuanswers',
      };
    }

    // Step 3: Submit the deposit
    const depositResult = await this.request<CUAnswersDepositResponse>(
      'PUT',
      this.rdcPath('/deposit'),
      {
        session_token: request.userId,
        application_user_id: request.userId,
        deposit_amount: request.amountCents,
      },
    );

    const status: DepositStatus = depositResult.data.deposit_status === 'accepted'
      ? 'pending'
      : 'rejected';

    // Step 4: Update daily counter if accepted
    if (status === 'pending') {
      try {
        await this.request(
          'PUT',
          this.rdcPath('/daily_counter'),
          {
            account_number: request.accountId,
            deposit_amount: request.amountCents,
            deposit_date: depositDate,
          },
        );
      } catch {
        // Daily counter update is best-effort
      }
    }

    const record: DepositRecord = {
      depositId,
      accountId: request.accountId,
      amountCents: request.amountCents,
      status,
      createdAt: now,
      updatedAt: now,
      rejectionReason: status === 'rejected' ? (depositResult.data.message || 'Deposit rejected') : undefined,
    };
    depositStore.set(depositId, record);

    return {
      providerDepositId: depositId,
      status,
      referenceNumber: depositId,
      receivedAt: now,
      provider: 'cuanswers',
    };
  }

  // ---------------------------------------------------------------------------
  // Get deposit status
  // ---------------------------------------------------------------------------

  async getDepositStatus(request: GetDepositStatusRequest): Promise<GetDepositStatusResponse> {
    if (this.sandbox) {
      const { MockRDCAdapter } = await import('./mock-adapter.ts');
      return new MockRDCAdapter().getDepositStatus(request);
    }

    const record = depositStore.get(request.providerDepositId);
    if (!record) {
      throw new Error(`Deposit ${request.providerDepositId} not found`);
    }

    return {
      providerDepositId: record.depositId,
      status: record.status,
      rejectionReason: record.rejectionReason,
      confirmedAmountCents: record.amountCents,
      updatedAt: record.updatedAt,
    };
  }

  // ---------------------------------------------------------------------------
  // Get deposit limits
  // ---------------------------------------------------------------------------

  async getDepositLimits(request: GetDepositLimitsRequest): Promise<DepositLimits> {
    if (this.sandbox) {
      const { MockRDCAdapter } = await import('./mock-adapter.ts');
      return new MockRDCAdapter().getDepositLimits(request);
    }

    // CU*Answers enforces limits server-side via the check_deposit endpoint.
    // We return sensible defaults; the actual enforcement happens on submit.
    return {
      perDepositLimitCents: 500000,    // $5,000
      dailyLimitCents: 1000000,        // $10,000
      dailyUsedCents: 0,
      monthlyLimitCents: 2500000,      // $25,000
      monthlyUsedCents: 0,
      maxDepositsPerDay: 5,
      depositsToday: 0,
    };
  }

  // ---------------------------------------------------------------------------
  // Validate check (client-side pre-check — CU*Answers handles server-side)
  // ---------------------------------------------------------------------------

  async validateCheck(_request: ValidateCheckRequest): Promise<CheckValidationResult> {
    // CU*Answers handles check validation server-side during deposit.
    // This returns a pass-through validation since images are processed
    // by CU*Answers' own RDC infrastructure.
    return {
      valid: true,
      qualityScore: 100,
      issues: [],
    };
  }
}
