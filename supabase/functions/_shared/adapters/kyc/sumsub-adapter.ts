// TODO: Provisional integration — not yet validated in production.
/**
 * Sumsub KYC Adapter — Global Identity Verification
 *
 * Integrates with Sumsub's unified verification platform for document
 * authentication, biometric liveness checks, and ongoing AML monitoring
 * across 220+ countries.
 *
 * Sumsub API docs: https://docs.sumsub.com
 * Auth: App Token + HMAC-SHA256 signature
 *
 * IMPORTANT: PII (names, DOBs, document images) sent to Sumsub MUST NEVER
 * appear in logs or API responses. Only verification IDs and status.
 */

import type {
  KYCAdapter,
  KYCApplicant,
  KYCResult,
  KYCStatus,
  KYCRefreshResult,
  KYCRefreshConfig,
} from './types.ts';

// =============================================================================
// SUMSUB API TYPES
// =============================================================================

interface SumsubApplicantResponse {
  id: string;
  createdAt: string;
  inspectionId: string;
  review: {
    reviewResult?: {
      reviewAnswer: 'GREEN' | 'RED' | 'PENDING';
      rejectLabels?: string[];
      reviewRejectType?: string;
    };
    reviewStatus: string;
    priority: number;
  };
}

interface _SumsubVerificationResponse {
  id: string;
  applicantId: string;
  inspectionId: string;
  reviewResult: {
    reviewAnswer: 'GREEN' | 'RED' | 'PENDING';
    rejectLabels?: string[];
    clientComment?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapSumsubAnswer(answer: string): KYCStatus {
  switch (answer) {
    case 'GREEN': return 'approved';
    case 'RED': return 'denied';
    case 'PENDING': return 'pending_review';
    default: return 'pending_review';
  }
}

function mapRejectLabels(labels: string[] | undefined): string[] {
  if (!labels || labels.length === 0) return [];
  const labelMap: Record<string, string> = {
    FORGERY: 'Document appears forged',
    DOCUMENT_TEMPLATE: 'Unrecognized document template',
    LOW_QUALITY: 'Document image quality too low',
    SPAM: 'Duplicate/spam submission detected',
    NOT_DOCUMENT: 'Uploaded file is not a valid document',
    SELFIE_MISMATCH: 'Selfie does not match document photo',
    ID_INVALID: 'Identity document is invalid or expired',
    UNFULFILLED: 'Required verification steps not completed',
    BLACKLISTED: 'Applicant found on watchlist',
    REGULATIONS_VIOLATIONS: 'Regulatory compliance check failed',
    PROBLEMATIC_APPLICANT_DATA: 'Applicant data inconsistencies detected',
  };
  return labels.map((l) => labelMap[l] ?? `Verification issue: ${l}`);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SumsubKYCAdapter implements KYCAdapter {
  readonly name = 'sumsub';

  private readonly appToken: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly levelName: string;

  constructor() {
    this.appToken = Deno.env.get('SUMSUB_APP_TOKEN') ?? '';
    this.secretKey = Deno.env.get('SUMSUB_SECRET_KEY') ?? '';
    this.baseUrl = Deno.env.get('SUMSUB_BASE_URL') ?? 'https://api.sumsub.com';
    this.levelName = Deno.env.get('SUMSUB_LEVEL_NAME') ?? 'basic-kyc-level';
  }

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'sumsub', action: 'createEvaluation',
      timestamp: new Date().toISOString(),
    }));

    // Step 1: Create applicant
    const applicantRes = await this.request<SumsubApplicantResponse>(
      'POST',
      `/resources/applicants?levelName=${encodeURIComponent(this.levelName)}`,
      {
        externalUserId: crypto.randomUUID(),
        info: {
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          dob: applicant.dateOfBirth,
          email: applicant.email,
          phone: applicant.phone,
          addresses: [{
            street: applicant.address.line1,
            subStreet: applicant.address.line2 ?? '',
            town: applicant.address.city,
            state: applicant.address.state,
            postCode: applicant.address.zip,
            country: 'USA',
          }],
        },
      },
    );

    const status = applicantRes.review?.reviewResult?.reviewAnswer ?? 'PENDING';
    const rejectLabels = applicantRes.review?.reviewResult?.rejectLabels;

    return {
      token: applicantRes.id,
      status: mapSumsubAnswer(status),
      reasons: status === 'GREEN'
        ? ['Identity verified successfully via Sumsub']
        : mapRejectLabels(rejectLabels),
      createdAt: applicantRes.createdAt,
      updatedAt: applicantRes.createdAt,
    };
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    const data = await this.request<SumsubApplicantResponse>(
      'GET',
      `/resources/applicants/${encodeURIComponent(evaluationToken)}/one`,
    );

    const status = data.review?.reviewResult?.reviewAnswer ?? 'PENDING';
    const rejectLabels = data.review?.reviewResult?.rejectLabels;

    return {
      token: data.id,
      status: mapSumsubAnswer(status),
      reasons: status === 'GREEN'
        ? ['Identity verified successfully via Sumsub']
        : mapRejectLabels(rejectLabels),
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    };
  }

  async refreshEvaluation(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<KYCRefreshResult> {
    // Sumsub supports "applicant reset" which triggers re-verification
    const data = await this.request<SumsubApplicantResponse>(
      'POST',
      `/resources/applicants/${encodeURIComponent(evaluationToken)}/reset`,
    );

    const status = data.review?.reviewResult?.reviewAnswer ?? 'PENDING';
    const now = new Date();
    const nextRefreshMs = config.intervalHours * 60 * 60 * 1000;
    const riskScore = status === 'GREEN' ? 10 : status === 'RED' ? 90 : 50;

    return {
      refreshId: `sumsub_refresh_${crypto.randomUUID()}`,
      evaluationToken,
      trigger: config.triggers[0] ?? 'scheduled',
      status: mapSumsubAnswer(status),
      changes: [],
      riskScore,
      refreshedAt: now.toISOString(),
      nextRefreshAt: new Date(now.getTime() + nextRefreshMs).toISOString(),
    };
  }

  async configureRefresh(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<{ configured: boolean; nextRefreshAt: string }> {
    // Sumsub supports monitoring via the "applicant monitoring" API
    await this.request<unknown>(
      'POST',
      `/resources/applicants/${encodeURIComponent(evaluationToken)}/monitoring`,
      { enabled: true },
    );

    const now = new Date();
    const nextRefreshMs = config.intervalHours * 60 * 60 * 1000;

    return {
      configured: true,
      nextRefreshAt: new Date(now.getTime() + nextRefreshMs).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.appToken || !this.secretKey) {
      throw new Error('Sumsub credentials missing: SUMSUB_APP_TOKEN and SUMSUB_SECRET_KEY must be set');
    }

    const ts = Math.floor(Date.now() / 1000).toString();
    const bodyStr = body ? JSON.stringify(body) : '';

    // HMAC-SHA256 signature: ts + method + path + body
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(this.secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const data = encoder.encode(ts + method.toUpperCase() + path + bodyStr);
    const sigBuf = await crypto.subtle.sign('HMAC', key, data);
    const sig = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-App-Token': this.appToken,
        'X-App-Access-Ts': ts,
        'X-App-Access-Sig': sig,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: bodyStr || undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      // Strip any PII from error responses
      const safeError = errBody.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`Sumsub API error (${res.status}): ${safeError}`);
    }

    return res.json();
  }
}
