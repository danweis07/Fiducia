/**
 * Tink SCA Adapter
 *
 * Real implementation for PSD2/PSD3 Strong Customer Authentication via Tink's
 * open banking platform. Tink provides SCA challenge orchestration, dynamic
 * linking, and exemption evaluation for European payment providers.
 *
 * API Reference: Tink Authentication API v1
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  SCAAdapter,
  InitiateSCARequest,
  InitiateSCAResponse,
  CompleteSCARequest,
  CompleteSCAResponse,
  CheckExemptionRequest,
  CheckExemptionResponse,
  SCAChallengeMethod,
  SCAFactor,
} from './types.ts';

// =============================================================================
// TINK API TYPES
// =============================================================================

interface TinkChallengeRequest {
  user_id: string;
  action_type: string;
  preferred_method?: string;
  dynamic_link?: {
    amount_minor_units: number;
    currency: string;
    payee_name: string;
    payee_account: string;
  };
}

interface TinkChallengeResponse {
  challenge_id: string;
  method: string;
  factors: string[];
  status: string;
  created_at: string;
  expires_at: string;
}

interface TinkCompleteResponse {
  outcome: string;
  challenge: TinkChallengeResponse;
  factors_verified: string[];
  authorization_code: string | null;
  decided_at: string;
}

interface TinkExemptionResponse {
  exempt: boolean;
  exemption_type: string;
  reason: string | null;
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class TinkSCAAdapter implements SCAAdapter {
  readonly config: AdapterConfig = {
    id: 'tink-sca',
    name: 'Tink Strong Customer Authentication',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = Deno.env.get('TINK_BASE_URL') ?? 'https://api.tink.com/api/v1';
    this.clientId = Deno.env.get('TINK_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('TINK_CLIENT_SECRET') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const token = await this.getAccessToken();
      return {
        adapterId: this.config.id,
        healthy: !!token,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async initiateChallenge(request: InitiateSCARequest): Promise<InitiateSCAResponse> {
    const token = await this.getAccessToken();

    const tinkRequest: TinkChallengeRequest = {
      user_id: request.userId,
      action_type: request.action,
      preferred_method: request.preferredMethod,
    };

    // Dynamic linking for payment actions (PSD2 Art. 97)
    if (request.action === 'payment' && request.amountMinorUnits && request.currency) {
      tinkRequest.dynamic_link = {
        amount_minor_units: request.amountMinorUnits,
        currency: request.currency,
        payee_name: request.payeeName ?? '',
        payee_account: request.payeeAccountIdentifier ?? '',
      };
    }

    const response = await fetch(`${this.baseUrl}/sca/challenges`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify(tinkRequest),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tink SCA API error (${response.status}): ${errorText}`);
    }

    const tinkResponse = await response.json() as TinkChallengeResponse;

    return {
      challenge: {
        challengeId: tinkResponse.challenge_id,
        userId: request.userId,
        method: this.mapMethod(tinkResponse.method),
        factorsSatisfied: tinkResponse.factors.map(f => this.mapFactor(f)),
        status: 'pending',
        createdAt: tinkResponse.created_at,
        expiresAt: tinkResponse.expires_at,
        completedAt: null,
      },
    };
  }

  async completeChallenge(request: CompleteSCARequest): Promise<CompleteSCAResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}/sca/challenges/${request.challengeId}/complete`,
      {
        method: 'POST',
        headers: this.getHeaders(token),
        body: JSON.stringify({ authentication_proof: request.authenticationProof }),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tink SCA API error (${response.status}): ${errorText}`);
    }

    const tinkResult = await response.json() as TinkCompleteResponse;

    return {
      result: {
        outcome: tinkResult.outcome as 'authenticated' | 'denied' | 'exempted' | 'stepped_up',
        challenge: {
          challengeId: tinkResult.challenge.challenge_id,
          userId: 'resolved-from-challenge',
          method: this.mapMethod(tinkResult.challenge.method),
          factorsSatisfied: tinkResult.challenge.factors.map(f => this.mapFactor(f)),
          status: 'completed',
          createdAt: tinkResult.challenge.created_at,
          expiresAt: tinkResult.challenge.expires_at,
          completedAt: tinkResult.decided_at,
        },
        exemption: null,
        factorsVerified: tinkResult.factors_verified.map(f => this.mapFactor(f)),
        authorizationCode: tinkResult.authorization_code,
        decidedAt: tinkResult.decided_at,
      },
    };
  }

  async checkExemption(request: CheckExemptionRequest): Promise<CheckExemptionResponse> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}/sca/exemptions/check`, {
      method: 'POST',
      headers: this.getHeaders(token),
      body: JSON.stringify({
        user_id: request.userId,
        exemption_type: request.exemptionType,
        amount_minor_units: request.amountMinorUnits,
        currency: request.currency,
        payee_account: request.payeeAccountIdentifier,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tink SCA API error (${response.status}): ${errorText}`);
    }

    const result = await response.json() as TinkExemptionResponse;

    return {
      exempt: result.exempt,
      exemptionType: request.exemptionType,
      reason: result.reason,
    };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
        scope: 'sca:challenges sca:exemptions',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Tink OAuth error (${response.status})`);
    }

    const data = await response.json() as { access_token: string };
    return data.access_token;
  }

  private getHeaders(token: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-request-id': `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  private mapMethod(method: string): SCAChallengeMethod {
    const mapping: Record<string, SCAChallengeMethod> = {
      'push': 'push_notification',
      'sms': 'sms_otp',
      'totp': 'totp',
      'fido2': 'hardware_token',
      'biometric': 'biometric',
      'behavioral': 'behavioral_biometric',
    };
    return mapping[method] ?? 'push_notification';
  }

  private mapFactor(factor: string): SCAFactor {
    const mapping: Record<string, SCAFactor> = {
      'knowledge': 'knowledge',
      'possession': 'possession',
      'inherence': 'inherence',
    };
    return mapping[factor] ?? 'possession';
  }
}
