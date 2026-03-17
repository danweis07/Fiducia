// TODO: Provisional integration — not yet validated in production.
/**
 * Synctera mRDC Adapter
 *
 * Integrates with Synctera's v0/mrdc API for mobile remote deposit capture.
 * Synctera provides developer-friendly REST APIs with clean OpenAPI schemas.
 *
 * API Reference: https://dev.synctera.com/
 * Endpoint pattern: POST /v0/mrdc/deposits
 *
 * Configuration:
 *   SYNCTERA_API_KEY — API key for authentication
 *   SYNCTERA_BASE_URL — Base URL (default: https://api.synctera.com)
 *
 * Sandbox mode auto-enabled when no API key is configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
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
// SYNCTERA API TYPES (mirrors Synctera OpenAPI schema)
// =============================================================================

interface SyncteraDepositRequest {
  account_id: string;
  amount: number;              // Synctera uses cents
  front_image_id?: string;     // Reference to uploaded image
  back_image_id?: string;
  check_number?: string;
  description?: string;
  metadata?: Record<string, string>;
}

interface SyncteraDepositResponse {
  id: string;
  account_id: string;
  amount: number;
  status: string;              // PENDING | SUBMITTED | ACCEPTED | REJECTED | RETURNED
  front_image_id: string;
  back_image_id: string;
  check_number?: string;
  reference_id: string;
  creation_time: string;
  last_updated_time: string;
  rejection_reason?: string;
  vendor_info?: {
    vendor: string;
    vendor_reference_id: string;
  };
}

interface SyncteraImageUploadResponse {
  id: string;
  status: string;
  creation_time: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapSyncteraStatus(syncteraStatus: string): DepositStatus {
  switch (syncteraStatus.toUpperCase()) {
    case 'PENDING':    return 'pending';
    case 'SUBMITTED':  return 'reviewing';
    case 'ACCEPTED':   return 'accepted';
    case 'REJECTED':   return 'rejected';
    case 'CLEARING':   return 'clearing';
    case 'CLEARED':
    case 'SETTLED':    return 'cleared';
    case 'RETURNED':   return 'returned';
    default:           return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SyncteraRDCAdapter implements RDCAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'synctera',
    name: 'Synctera mRDC',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },   // Image uploads can be slow
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? Deno.env.get('SYNCTERA_API_KEY') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('SYNCTERA_BASE_URL') ?? 'https://api.synctera.com';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Synctera adapter in sandbox mode — no API key configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Synctera API error (${res.status}): ${errBody}`);
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
        errorMessage: 'Running in sandbox mode (no API key)',
      };
    }

    try {
      await this.request('GET', '/v0/status');
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

  /**
   * Upload a check image to Synctera's image store.
   * Returns the image ID for use in deposit submission.
   */
  private async uploadImage(image: { imageBase64: string; mimeType?: string }): Promise<string> {
    if (this.sandbox) {
      return `img_sandbox_${Math.random().toString(36).slice(2, 10)}`;
    }

    const response = await this.request<SyncteraImageUploadResponse>('POST', '/v0/mrdc/images', {
      content: image.imageBase64,
      content_type: image.mimeType ?? 'image/jpeg',
    });

    return response.id;
  }

  async submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    // Sandbox mode: return realistic mock response
    if (this.sandbox) {
      const depositId = `syn_dep_${Date.now().toString(36)}`;
      return {
        providerDepositId: depositId,
        status: 'pending',
        referenceNumber: `SYN-${depositId.slice(-8).toUpperCase()}`,
        receivedAt: new Date().toISOString(),
        expectedAvailabilityDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        provider: 'synctera',
      };
    }

    // 1. Upload front and back images
    const [frontImageId, backImageId] = await Promise.all([
      this.uploadImage(request.frontImage),
      this.uploadImage(request.backImage),
    ]);

    // 2. Submit deposit
    const depositBody: SyncteraDepositRequest = {
      account_id: request.accountId,
      amount: request.amountCents,
      front_image_id: frontImageId,
      back_image_id: backImageId,
      check_number: request.checkNumber,
      description: `mRDC deposit by ${request.userId}`,
      metadata: {
        tenant_id: request.tenantId,
        internal_user_id: request.userId,
      },
    };

    const response = await this.request<SyncteraDepositResponse>('POST', '/v0/mrdc/deposits', depositBody);

    return {
      providerDepositId: response.id,
      status: mapSyncteraStatus(response.status),
      referenceNumber: response.reference_id,
      receivedAt: response.creation_time,
      provider: 'synctera',
    };
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

    const response = await this.request<SyncteraDepositResponse>(
      'GET',
      `/v0/mrdc/deposits/${request.providerDepositId}`
    );

    return {
      providerDepositId: response.id,
      status: mapSyncteraStatus(response.status),
      rejectionReason: response.rejection_reason,
      confirmedAmountCents: response.amount,
      updatedAt: response.last_updated_time,
    };
  }

  async getDepositLimits(_request: GetDepositLimitsRequest): Promise<DepositLimits> {
    // Synctera limits are typically configured at the account level
    // For sandbox, return standard limits
    return {
      perDepositLimitCents: 500_000,
      dailyLimitCents: 2_500_000,
      dailyUsedCents: 0,
      monthlyLimitCents: 50_000_000,
      monthlyUsedCents: 0,
      maxDepositsPerDay: 10,
      depositsToday: 0,
    };
  }

  async validateCheck(request: ValidateCheckRequest): Promise<CheckValidationResult> {
    if (this.sandbox) {
      return {
        valid: true,
        qualityScore: 88,
        issues: [],
        extractedFields: {
          amountCents: 25000,
          checkNumber: '1001',
        },
      };
    }

    // Synctera does server-side validation during deposit submission
    // Pre-validation is a client-side check
    const issues: { code: string; severity: 'error' | 'warning'; message: string }[] = [];

    if (!request.frontImage.imageBase64 || request.frontImage.imageBase64.length < 1000) {
      issues.push({ code: 'IMAGE_TOO_SMALL', severity: 'error', message: 'Front image appears too small or corrupt' });
    }
    if (!request.backImage.imageBase64 || request.backImage.imageBase64.length < 500) {
      issues.push({ code: 'IMAGE_TOO_SMALL', severity: 'error', message: 'Back image appears too small or corrupt' });
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      qualityScore: issues.length === 0 ? 85 : 40,
      issues,
    };
  }
}
