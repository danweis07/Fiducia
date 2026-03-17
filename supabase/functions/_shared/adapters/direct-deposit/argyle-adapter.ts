// TODO: Provisional integration — not yet validated in production.
/**
 * Argyle Direct Deposit Switching Adapter
 *
 * Integrates with the Argyle API for automated direct deposit switching.
 * Argyle provides a Link widget for users to connect their payroll account
 * and switch direct deposits.
 *
 * API docs: https://docs.argyle.com
 *
 * NEVER log account numbers, payroll credentials, or Argyle tokens.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  DirectDepositAdapter,
  CreateLinkTokenRequest,
  CreateLinkTokenResponse,
  GetSwitchStatusRequest,
  GetSwitchStatusResponse,
  SearchEmployersRequest,
  SearchEmployersResponse,
  SwitchStatus,
} from './types.ts';

// =============================================================================
// ARGYLE API TYPES
// =============================================================================

interface ArgyleUserTokenResponse {
  user_token: string;
  expires_at: string;
}

interface ArgylePayDistributionResponse {
  id: string;
  status: string; // 'new' | 'pending' | 'completed' | 'error'
  account_id: string;
  updated_at: string;
  error_code?: string;
  error_message?: string;
}

interface ArgyleSearchResponse {
  results: Array<{
    id: string;
    name: string;
    logo_url?: string;
    kind: string; // 'employer', 'gig', 'platform'
  }>;
  next?: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapArgyleStatus(status: string): SwitchStatus {
  switch (status) {
    case 'new':
      return 'awaiting_login';
    case 'pending':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class ArgyleDirectDepositAdapter implements DirectDepositAdapter {
  readonly config: AdapterConfig = {
    id: 'argyle',
    name: 'Argyle Direct Deposit',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly clientId: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('ARGYLE_API_KEY') ?? '';
    this.clientId = Deno.env.get('ARGYLE_CLIENT_ID') ?? '';
    const isSandbox = Deno.env.get('ARGYLE_ENVIRONMENT') !== 'production';
    this.baseUrl = isSandbox
      ? 'https://api-sandbox.argyle.com/v2'
      : 'https://api.argyle.com/v2';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/search/link-items?q=test&limit=1`, {
        headers: this.headers(),
      });
      return {
        adapterId: this.config.id,
        healthy: res.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async createLinkToken(request: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse> {
    // Argyle uses a user-token flow: create/get user, then generate a user token
    const userTokenRes = await fetch(`${this.baseUrl}/user-tokens`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ user: request.userId }),
    });

    if (!userTokenRes.ok) {
      const errBody = await userTokenRes.text();
      throw new Error(`Argyle createLinkToken failed: HTTP ${userTokenRes.status} — ${errBody}`);
    }

    const tokenJson = (await userTokenRes.json()) as ArgyleUserTokenResponse;
    const switchId = `argyle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      linkToken: tokenJson.user_token,
      widgetUrl: `https://link.argyle.com?userToken=${tokenJson.user_token}&clientId=${this.clientId}`,
      providerSwitchId: switchId,
      expiresAt: tokenJson.expires_at,
      provider: 'argyle',
    };
  }

  async getSwitchStatus(request: GetSwitchStatusRequest): Promise<GetSwitchStatusResponse> {
    const res = await fetch(`${this.baseUrl}/pay-distributions/${request.providerSwitchId}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Argyle getSwitchStatus failed: HTTP ${res.status} — ${errBody}`);
    }

    const json = (await res.json()) as ArgylePayDistributionResponse;
    const status = mapArgyleStatus(json.status);

    return {
      providerSwitchId: json.id,
      status,
      providerConfirmationId: status === 'completed' ? json.id : undefined,
      failureReason: json.error_message,
      completedAt: status === 'completed' ? json.updated_at : undefined,
      updatedAt: json.updated_at,
    };
  }

  async searchEmployers(request: SearchEmployersRequest): Promise<SearchEmployersResponse> {
    const params = new URLSearchParams({
      q: request.query,
      limit: String(request.limit ?? 20),
    });

    const res = await fetch(`${this.baseUrl}/search/link-items?${params}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Argyle searchEmployers failed: HTTP ${res.status} — ${errBody}`);
    }

    const json = (await res.json()) as ArgyleSearchResponse;

    return {
      employers: json.results.map((r) => ({
        platformId: r.id,
        name: r.name,
        logoUrl: r.logo_url,
        payrollProvider: r.kind,
      })),
      hasMore: !!json.next,
    };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${this.clientId}:${this.apiKey}`)}`,
    };
  }
}
