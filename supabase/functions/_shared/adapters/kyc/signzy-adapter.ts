// TODO: Provisional integration — not yet validated in production.
/**
 * Signzy KYC Adapter — One Touch KYC (India & SE Asia)
 *
 * Integrates with Signzy's real-time identity verification API for
 * government database validation across India and Southeast Asian markets.
 * Completes verification in under 60 seconds with 48-hour deployment.
 *
 * Signzy API docs: https://docs.signzy.com
 * Auth: Bearer token from login endpoint
 *
 * IMPORTANT: Aadhaar numbers, PAN numbers, and other PII MUST NEVER
 * appear in logs or API responses.
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
// SIGNZY API TYPES
// =============================================================================

interface SignzyLoginResponse {
  id: string;
  userId: string;
  accessToken: string;
}

interface SignzyIdentityResponse {
  id: string;
  result: {
    verified: boolean;
    type: string;
    status: 'VERIFIED' | 'FAILED' | 'PENDING' | 'MANUAL_REVIEW';
    reasons: string[];
  };
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapSignzyStatus(status: string): KYCStatus {
  switch (status) {
    case 'VERIFIED': return 'approved';
    case 'FAILED': return 'denied';
    case 'MANUAL_REVIEW': return 'manual_review';
    case 'PENDING': return 'pending_review';
    default: return 'pending_review';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class SignzyKYCAdapter implements KYCAdapter {
  readonly name = 'signzy';

  private readonly username: string;
  private readonly password: string;
  private readonly baseUrl: string;
  private accessToken: string | null = null;

  constructor() {
    this.username = Deno.env.get('SIGNZY_USERNAME') ?? '';
    this.password = Deno.env.get('SIGNZY_PASSWORD') ?? '';
    this.baseUrl = Deno.env.get('SIGNZY_BASE_URL') ?? 'https://preproduction.signzy.tech/api/v2';
  }

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    console.warn(JSON.stringify({
      level: 'info', adapter: 'signzy', action: 'createEvaluation',
      timestamp: new Date().toISOString(),
    }));

    await this.ensureToken();

    const data = await this.request<SignzyIdentityResponse>('POST', '/identities', {
      type: 'individual',
      email: applicant.email,
      callbackUrl: '',
      task: 'autoVerify',
      accessToken: this.accessToken,
      essentials: {
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        dateOfBirth: applicant.dateOfBirth,
        phone: applicant.phone,
        address: {
          line1: applicant.address.line1,
          line2: applicant.address.line2 ?? '',
          city: applicant.address.city,
          state: applicant.address.state,
          zipCode: applicant.address.zip,
          country: 'US',
        },
      },
    });

    return {
      token: data.id,
      status: mapSignzyStatus(data.result.status),
      reasons: data.result.verified
        ? ['Identity verified successfully via Signzy One Touch KYC']
        : data.result.reasons.length > 0
          ? data.result.reasons
          : ['Verification could not be completed'],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    await this.ensureToken();

    const data = await this.request<SignzyIdentityResponse>(
      'GET',
      `/identities/${encodeURIComponent(evaluationToken)}`,
    );

    return {
      token: data.id,
      status: mapSignzyStatus(data.result.status),
      reasons: data.result.verified
        ? ['Identity verified successfully via Signzy']
        : data.result.reasons,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
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
      refreshId: `signzy_refresh_${crypto.randomUUID()}`,
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

  private async ensureToken(): Promise<void> {
    if (this.accessToken) return;
    if (!this.username || !this.password) {
      throw new Error('Signzy credentials missing: SIGNZY_USERNAME and SIGNZY_PASSWORD must be set');
    }

    const res = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: this.username, password: this.password }),
    });

    if (!res.ok) throw new Error(`Signzy login failed: ${res.status}`);
    const data = (await res.json()) as SignzyLoginResponse;
    this.accessToken = data.accessToken;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': this.accessToken ?? '',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      const safeError = errBody.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`Signzy API error (${res.status}): ${safeError}`);
    }

    return res.json();
  }
}
