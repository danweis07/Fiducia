// TODO: Provisional integration — not yet validated in production.
/**
 * Mitek Identity Cloud mRDC Adapter
 *
 * Integrates with Mitek's Identity Cloud API V2 for check deposit processing.
 * Mitek is the industry leader in mobile deposit capture, providing:
 *   - MiSnap SDK for client-side image capture (handled by mobile/web SDK)
 *   - Identity Cloud for server-side check verification via Dossiers
 *
 * API Reference: Mitek Identity Cloud API V2
 * Flow:
 *   1. Client captures check images via MiSnap SDK (proprietary encrypted payloads)
 *   2. SDK uploads to Mitek's edge → returns image references
 *   3. Server creates a "Dossier" with front/back image references
 *   4. Server calls "Verify Auto" to process the check
 *   5. Poll for results or use webhook callback
 *
 * Configuration:
 *   MITEK_CLIENT_ID — OAuth client ID
 *   MITEK_CLIENT_SECRET — OAuth client secret
 *   MITEK_BASE_URL — Base URL (default: https://api.identity.mitek.com)
 *
 * Sandbox mode auto-enabled when credentials are not configured.
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
// MITEK API TYPES
// =============================================================================

interface MitekTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface MitekDossier {
  id: string;
  status: string;          // Created | Processing | Completed | Failed
  created_at: string;
  updated_at: string;
}

interface MitekVerifyAutoRequest {
  dossier_id: string;
  document_type: 'check_front' | 'check_back';
  configuration?: {
    check_verification: {
      enabled: boolean;
      micr_extraction: boolean;
      car_lar_verification: boolean;   // Courtesy Amount Recognition / Legal Amount Recognition
      duplicate_detection: boolean;
    };
  };
}

interface MitekVerifyAutoResponse {
  id: string;
  dossier_id: string;
  status: string;        // Passed | Failed | ManualReview | Undetermined
  findings: MitekFinding[];
  extracted_data?: {
    amount?: {
      car_value: number;   // Courtesy Amount Recognition (numeric on check)
      lar_value: string;   // Legal Amount Recognition (written out)
      confidence: number;
    };
    micr?: {
      routing_number: string;
      account_number: string;  // Will be masked before storage
      check_number: string;
      raw_micr: string;
    };
    payee_name?: string;
    date?: string;
  };
  quality_assessment?: {
    overall_score: number;     // 0-100
    front_score: number;
    back_score: number;
    issues: string[];
  };
}

interface MitekFinding {
  code: string;
  category: string;        // ImageQuality | Security | Compliance
  severity: string;        // Error | Warning | Info
  description: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapMitekStatus(mitekStatus: string): DepositStatus {
  switch (mitekStatus) {
    case 'Created':
    case 'Submitted':       return 'pending';
    case 'Processing':      return 'reviewing';
    case 'Passed':
    case 'Accepted':        return 'accepted';
    case 'Failed':
    case 'Rejected':        return 'rejected';
    case 'ManualReview':    return 'reviewing';
    case 'Cleared':         return 'cleared';
    case 'Returned':        return 'returned';
    default:                return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MitekRDCAdapter implements RDCAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  readonly config: AdapterConfig = {
    id: 'mitek',
    name: 'Mitek Identity Cloud mRDC',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },  // Mitek has its own retry logic
    timeout: { requestTimeoutMs: 60000 },                // Image processing is slow
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(clientId?: string, clientSecret?: string, baseUrl?: string) {
    this.clientId = clientId ?? Deno.env.get('MITEK_CLIENT_ID') ?? '';
    this.clientSecret = clientSecret ?? Deno.env.get('MITEK_CLIENT_SECRET') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('MITEK_BASE_URL') ?? 'https://api.identity.mitek.com';
    this.sandbox = !this.clientId || !this.clientSecret;
  }

  /**
   * Obtain OAuth2 access token from Mitek Identity Cloud.
   * Tokens are cached until expiry.
   */
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
        scope: 'verify.rdc',
      }),
    });

    if (!res.ok) {
      throw new Error(`Mitek OAuth failed: ${res.status}`);
    }

    const data: MitekTokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s early

    return this.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Mitek adapter in sandbox mode — no credentials configured');
    }

    const token = await this.getAccessToken();

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Mitek API error (${res.status}): ${errBody}`);
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

  async submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    if (this.sandbox) {
      const depositId = `mtk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      return {
        providerDepositId: depositId,
        status: 'pending',
        referenceNumber: `MTK-${depositId.slice(-8).toUpperCase()}`,
        receivedAt: new Date().toISOString(),
        expectedAvailabilityDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        provider: 'mitek',
      };
    }

    // Step 1: Create a Dossier (container for the check images)
    const dossier = await this.request<MitekDossier>('POST', '/identity/v2/dossiers', {
      type: 'check_deposit',
      metadata: {
        tenant_id: request.tenantId,
        user_id: request.userId,
        account_id: request.accountId,
        amount_cents: request.amountCents,
      },
    });

    // Step 2: Upload front image to dossier
    await this.request('POST', `/identity/v2/dossiers/${dossier.id}/documents`, {
      document_type: 'check_front',
      image: {
        data: request.frontImage.imageBase64,
        content_type: request.frontImage.mimeType ?? 'image/jpeg',
      },
    });

    // Step 3: Upload back image to dossier
    await this.request('POST', `/identity/v2/dossiers/${dossier.id}/documents`, {
      document_type: 'check_back',
      image: {
        data: request.backImage.imageBase64,
        content_type: request.backImage.mimeType ?? 'image/jpeg',
      },
    });

    // Step 4: Trigger Verify Auto processing
    const verifyRequest: MitekVerifyAutoRequest = {
      dossier_id: dossier.id,
      document_type: 'check_front',
      configuration: {
        check_verification: {
          enabled: true,
          micr_extraction: true,
          car_lar_verification: true,
          duplicate_detection: true,
        },
      },
    };

    await this.request<MitekVerifyAutoResponse>('POST', '/identity/v2/verify-auto', verifyRequest);

    return {
      providerDepositId: dossier.id,
      status: 'reviewing',   // Mitek processes asynchronously
      referenceNumber: dossier.id,
      receivedAt: dossier.created_at,
      provider: 'mitek',
    };
  }

  async getDepositStatus(request: GetDepositStatusRequest): Promise<GetDepositStatusResponse> {
    if (this.sandbox) {
      return {
        providerDepositId: request.providerDepositId,
        status: 'accepted',
        confirmedAmountCents: 15000,
        updatedAt: new Date().toISOString(),
        availabilityDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      };
    }

    // Get dossier status
    const dossier = await this.request<MitekDossier>(
      'GET',
      `/identity/v2/dossiers/${request.providerDepositId}`,
    );

    // If processing is complete, get verification results
    let rejectionReason: string | undefined;
    let confirmedAmountCents: number | undefined;

    if (dossier.status === 'Completed') {
      try {
        const results = await this.request<{ results: MitekVerifyAutoResponse[] }>(
          'GET',
          `/identity/v2/dossiers/${request.providerDepositId}/results`,
        );

        const result = results.results[0];
        if (result) {
          if (result.status === 'Failed') {
            rejectionReason = result.findings
              .filter(f => f.severity === 'Error')
              .map(f => f.description)
              .join('; ');
          }
          if (result.extracted_data?.amount) {
            confirmedAmountCents = result.extracted_data.amount.car_value;
          }
        }
      } catch {
        // Results not yet available
      }
    }

    return {
      providerDepositId: request.providerDepositId,
      status: mapMitekStatus(dossier.status),
      rejectionReason,
      confirmedAmountCents,
      updatedAt: dossier.updated_at,
    };
  }

  async getDepositLimits(_request: GetDepositLimitsRequest): Promise<DepositLimits> {
    // Mitek doesn't manage limits — this is handled by the bank's core system
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
        qualityScore: 94,
        issues: [],
        extractedFields: {
          amountCents: 15000,
          checkNumber: '2048',
          routingNumber: '021000021',
          payeeName: 'Jane Smith',
          date: new Date().toISOString().split('T')[0],
          micrLine: 'T021000021T 123456789 1234',
        },
      };
    }

    // Use Mitek's image quality assessment
    const dossier = await this.request<MitekDossier>('POST', '/identity/v2/dossiers', {
      type: 'quality_check',
    });

    // Upload front for quality analysis
    await this.request('POST', `/identity/v2/dossiers/${dossier.id}/documents`, {
      document_type: 'check_front',
      image: { data: request.frontImage.imageBase64 },
    });

    // Get quality assessment
    const result = await this.request<MitekVerifyAutoResponse>('POST', '/identity/v2/verify-auto', {
      dossier_id: dossier.id,
      document_type: 'check_front',
      configuration: { check_verification: { enabled: false, micr_extraction: true, car_lar_verification: true, duplicate_detection: false } },
    });

    const issues = result.findings.map(f => ({
      code: f.code,
      severity: f.severity.toLowerCase() === 'error' ? 'error' as const : 'warning' as const,
      message: f.description,
    }));

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      qualityScore: result.quality_assessment?.overall_score ?? 75,
      issues,
      extractedFields: result.extracted_data ? {
        amountCents: result.extracted_data.amount?.car_value,
        checkNumber: result.extracted_data.micr?.check_number,
        routingNumber: result.extracted_data.micr?.routing_number,
        payeeName: result.extracted_data.payee_name,
        date: result.extracted_data.date,
        micrLine: result.extracted_data.micr?.raw_micr,
      } : undefined,
    };
  }
}
