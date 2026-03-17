// TODO: Provisional integration — not yet validated in production.
/**
 * Unit Check Deposit Adapter (JSON:API)
 *
 * Integrates with Unit's Check Deposit API following the JSON:API specification.
 * Unit provides BaaS (Banking as a Service) with clean, well-documented APIs.
 *
 * API Reference: https://docs.unit.co/check-deposits
 * Endpoint pattern: POST /check-deposits
 *
 * Configuration:
 *   UNIT_API_TOKEN — Bearer token for authentication
 *   UNIT_BASE_URL — Base URL (default: https://api.s.unit.sh for sandbox)
 *
 * JSON:API envelope: { "data": { "type": "checkDeposit", "attributes": {...} } }
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  RDCAdapter,
  SubmitDepositRequest,
  SubmitDepositResponse,
  GetDepositStatusRequest,
  GetDepositStatusResponse,
  GetDepositLimitsRequest,
  DepositLimits,
  ValidateCheckRequest,
  CheckValidationResult,
  DepositStatus,
} from './types.ts';

// =============================================================================
// UNIT JSON:API TYPES
// =============================================================================

interface UnitCheckDepositResource {
  type: 'checkDeposit';
  id: string;
  attributes: {
    createdAt: string;
    updatedAt: string;
    amount: number;               // Cents
    description: string;
    status: string;               // Pending | PendingReview | Clearing | Sent | Canceled | Returned | Rejected
    reason?: string;              // Rejection/return reason
    reasonCode?: string;
    checkNumber?: string;
    counterparty?: {
      routingNumber: string;
      accountNumber: string;      // Masked
      name: string;
    };
    tags?: Record<string, string>;
    settlementDate?: string;
    vendorResults?: Array<{
      vendorName: string;
      decision: string;
    }>;
  };
  relationships?: {
    account: { data: { type: string; id: string } };
    customer: { data: { type: string; id: string } };
  };
}

interface UnitResponse<T> {
  data: T;
}

interface UnitCreateCheckDepositBody {
  data: {
    type: 'checkDeposit';
    attributes: {
      amount: number;
      description: string;
      tags?: Record<string, string>;
    };
    relationships: {
      account: { data: { type: 'depositAccount' | 'account'; id: string } };
    };
  };
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapUnitStatus(unitStatus: string): DepositStatus {
  switch (unitStatus) {
    case 'Pending':
    case 'AwaitingImages':
    case 'AwaitingFrontImage':
    case 'AwaitingBackImage':   return 'pending';
    case 'PendingReview':       return 'reviewing';
    case 'Clearing':
    case 'Sent':                return 'clearing';
    case 'Canceled':
    case 'Rejected':            return 'rejected';
    case 'Returned':            return 'returned';
    default:                    return 'cleared';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class UnitRDCAdapter implements RDCAdapter {
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'unit',
    name: 'Unit Check Deposits (JSON:API)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(apiToken?: string, baseUrl?: string) {
    this.apiToken = apiToken ?? Deno.env.get('UNIT_API_TOKEN') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('UNIT_BASE_URL') ?? 'https://api.s.unit.sh';
    this.sandbox = !this.apiToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Unit adapter in sandbox mode — no API token configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/vnd.api+json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Unit API error (${res.status}): ${errBody}`);
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
        errorMessage: 'Running in sandbox mode (no API token)',
      };
    }

    try {
      // Unit health check — list with limit=0 to test connectivity
      await this.request('GET', '/check-deposits?page[limit]=0');
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

  async submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    if (this.sandbox) {
      const depositId = `unit_dep_${Date.now().toString(36)}`;
      return {
        providerDepositId: depositId,
        status: 'pending',
        referenceNumber: `UNIT-${depositId.slice(-8).toUpperCase()}`,
        receivedAt: new Date().toISOString(),
        expectedAvailabilityDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        provider: 'unit',
      };
    }

    // Step 1: Create check deposit resource (JSON:API format)
    const createBody: UnitCreateCheckDepositBody = {
      data: {
        type: 'checkDeposit',
        attributes: {
          amount: request.amountCents,
          description: `Check deposit #${request.checkNumber ?? 'N/A'}`,
          tags: {
            tenantId: request.tenantId,
            internalUserId: request.userId,
          },
        },
        relationships: {
          account: {
            data: { type: 'depositAccount', id: request.accountId },
          },
        },
      },
    };

    const createResponse = await this.request<UnitResponse<UnitCheckDepositResource>>(
      'POST',
      '/check-deposits',
      createBody,
    );

    const deposit = createResponse.data;

    // Step 2: Upload front image
    await this.uploadImage(deposit.id, 'front', request.frontImage.imageBase64);

    // Step 3: Upload back image
    await this.uploadImage(deposit.id, 'back', request.backImage.imageBase64);

    return {
      providerDepositId: deposit.id,
      status: mapUnitStatus(deposit.attributes.status),
      referenceNumber: deposit.id,
      receivedAt: deposit.attributes.createdAt,
      provider: 'unit',
    };
  }

  /**
   * Upload a check image to a Unit check deposit.
   * Unit uses separate image upload endpoints after deposit creation.
   */
  private async uploadImage(depositId: string, side: 'front' | 'back', imageBase64: string): Promise<void> {
    if (this.sandbox) return;

    const res = await fetch(`${this.baseUrl}/check-deposits/${depositId}/${side}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'image/jpeg',
      },
      body: Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0)),
    });

    if (!res.ok) {
      throw new Error(`Unit image upload failed (${side}): ${res.status}`);
    }
  }

  async getDepositStatus(request: GetDepositStatusRequest): Promise<GetDepositStatusResponse> {
    if (this.sandbox) {
      return {
        providerDepositId: request.providerDepositId,
        status: 'accepted',
        updatedAt: new Date().toISOString(),
        availabilityDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      };
    }

    const response = await this.request<UnitResponse<UnitCheckDepositResource>>(
      'GET',
      `/check-deposits/${request.providerDepositId}`,
    );

    const deposit = response.data;

    return {
      providerDepositId: deposit.id,
      status: mapUnitStatus(deposit.attributes.status),
      rejectionReason: deposit.attributes.reason,
      rejectionCode: deposit.attributes.reasonCode,
      confirmedAmountCents: deposit.attributes.amount,
      updatedAt: deposit.attributes.updatedAt,
      availabilityDate: deposit.attributes.settlementDate,
    };
  }

  async getDepositLimits(_request: GetDepositLimitsRequest): Promise<DepositLimits> {
    // Unit limits are configured at the account/customer level
    // Retrieve from Unit's limits endpoint or use defaults
    return {
      perDepositLimitCents: 500_000,
      dailyLimitCents: 2_500_000,
      dailyUsedCents: 0,
      monthlyLimitCents: 25_000_000,
      monthlyUsedCents: 0,
      maxDepositsPerDay: 5,
      depositsToday: 0,
    };
  }

  async validateCheck(request: ValidateCheckRequest): Promise<CheckValidationResult> {
    // Unit does server-side image validation during upload
    // Pre-validate image size and format client-side
    const issues: { code: string; severity: 'error' | 'warning'; message: string }[] = [];

    if (!request.frontImage.imageBase64 || request.frontImage.imageBase64.length < 1000) {
      issues.push({ code: 'FRONT_IMAGE_INVALID', severity: 'error', message: 'Front image is too small or missing' });
    }
    if (!request.backImage.imageBase64 || request.backImage.imageBase64.length < 500) {
      issues.push({ code: 'BACK_IMAGE_INVALID', severity: 'error', message: 'Back image is too small or missing' });
    }

    // Check file size (Unit max is 10MB per image)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (request.frontImage.imageBase64.length * 0.75 > maxSizeBytes) {
      issues.push({ code: 'FRONT_IMAGE_TOO_LARGE', severity: 'error', message: 'Front image exceeds 10MB limit' });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      qualityScore: issues.length === 0 ? 90 : 30,
      issues,
    };
  }
}
