// TODO: Provisional integration — not yet validated in production.
/**
 * Didit KYC Adapter — Unlimited Free Identity Verification
 *
 * Integrates with Didit's free KYC platform offering document verification
 * and passive liveness detection. Ideal for open-source projects and
 * low-margin neobanks requiring cost-effective identity verification.
 *
 * Didit API docs: https://docs.didit.me
 * Auth: API key via x-api-key header
 *
 * IMPORTANT: PII sent to Didit MUST NEVER appear in logs or API responses.
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
// DIDIT API TYPES
// =============================================================================

interface DiditSessionResponse {
  session_id: string;
  status: 'created' | 'in_progress' | 'approved' | 'declined' | 'review' | 'expired';
  verification_url: string;
  created_at: string;
  updated_at: string;
}

interface DiditVerificationResponse {
  session_id: string;
  status: 'approved' | 'declined' | 'review' | 'expired' | 'in_progress';
  decision: {
    result: 'pass' | 'fail' | 'review';
    reasons: string[];
  };
  features: {
    document_verification: boolean;
    liveness_detection: boolean;
    face_matching: boolean;
  };
  created_at: string;
  updated_at: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapDiditStatus(status: string): KYCStatus {
  switch (status) {
    case 'approved': return 'approved';
    case 'declined': return 'denied';
    case 'review': return 'manual_review';
    case 'expired': return 'expired';
    case 'in_progress': case 'created': return 'pending_review';
    default: return 'pending_review';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class DiditKYCAdapter implements KYCAdapter {
  readonly name = 'didit';

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('DIDIT_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('DIDIT_BASE_URL') ?? 'https://api.didit.me/v1';
  }

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'didit', action: 'createEvaluation',
      timestamp: new Date().toISOString(),
    }));

    // Create a verification session
    const session = await this.request<DiditSessionResponse>('POST', '/sessions', {
      external_id: crypto.randomUUID(),
      features: ['document_verification', 'passive_liveness'],
      applicant: {
        first_name: applicant.firstName,
        last_name: applicant.lastName,
        email: applicant.email,
        date_of_birth: applicant.dateOfBirth,
      },
      callback_url: '',
    });

    return {
      token: session.session_id,
      status: mapDiditStatus(session.status),
      reasons: session.status === 'created'
        ? ['Verification session created — awaiting document upload']
        : ['Verification in progress'],
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    };
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    const data = await this.request<DiditVerificationResponse>(
      'GET',
      `/sessions/${encodeURIComponent(evaluationToken)}`,
    );

    return {
      token: data.session_id,
      status: mapDiditStatus(data.status),
      reasons: data.decision?.result === 'pass'
        ? ['Identity verified successfully via Didit']
        : data.decision?.reasons?.length > 0
          ? data.decision.reasons
          : ['Verification pending'],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  async refreshEvaluation(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<KYCRefreshResult> {
    const current = await this.getEvaluation(evaluationToken);
    const now = new Date();
    const nextRefreshMs = config.intervalHours * 60 * 60 * 1000;
    const riskScore = current.status === 'approved' ? 10 : current.status === 'denied' ? 90 : 50;

    return {
      refreshId: `didit_refresh_${crypto.randomUUID()}`,
      evaluationToken,
      trigger: config.triggers[0] ?? 'scheduled',
      status: current.status,
      changes: [],
      riskScore,
      refreshedAt: now.toISOString(),
      nextRefreshAt: new Date(now.getTime() + nextRefreshMs).toISOString(),
    };
  }

  async configureRefresh(
    _evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<{ configured: boolean; nextRefreshAt: string }> {
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
    if (!this.apiKey) {
      throw new Error('Didit credentials missing: DIDIT_API_KEY must be set');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      const safeError = errBody.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`Didit API error (${res.status}): ${safeError}`);
    }

    return res.json();
  }
}
