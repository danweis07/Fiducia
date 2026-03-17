// TODO: Provisional integration — not yet validated in production.
/**
 * Pinwheel Direct Deposit Switching Adapter
 *
 * Integrates with the Pinwheel API for automated direct deposit switching.
 * Pinwheel provides a drop-in widget (Link) that allows users to log into
 * their payroll provider (ADP, Workday, Gusto, etc.) and update their
 * routing/account numbers without manual intervention.
 *
 * API docs: https://docs.pinwheel.com
 *
 * NEVER log account numbers, payroll credentials, or Pinwheel tokens.
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
// PINWHEEL API TYPES
// =============================================================================

interface PinwheelLinkTokenResponse {
  data: {
    id: string;
    token: string;
    expires: string;
    mode: string;
  };
}

interface PinwheelJobStatusResponse {
  data: {
    id: string;
    status: string; // 'pending' | 'processing' | 'completed' | 'error'
    outcome?: string; // 'success' | 'error' | 'system_error'
    params: Record<string, unknown>;
    timestamps: {
      created_at: string;
      updated_at: string;
      completed_at?: string;
    };
    error?: {
      code: string;
      message: string;
    };
  };
}

interface PinwheelPlatformSearchResponse {
  data: Array<{
    id: string;
    name: string;
    logo_url?: string;
    type: string; // 'payroll', 'gig', 'government', etc.
    supported_jobs: string[];
  }>;
  meta: {
    next_cursor?: string;
  };
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapPinwheelStatus(status: string, outcome?: string): SwitchStatus {
  switch (status) {
    case 'pending':
      return 'awaiting_login';
    case 'processing':
      return 'processing';
    case 'completed':
      return outcome === 'success' ? 'completed' : 'failed';
    case 'error':
      return 'failed';
    default:
      return 'pending';
  }
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PinwheelDirectDepositAdapter implements DirectDepositAdapter {
  readonly config: AdapterConfig = {
    id: 'pinwheel',
    name: 'Pinwheel Direct Deposit',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.apiKey = Deno.env.get('PINWHEEL_API_KEY') ?? '';
    const isSandbox = Deno.env.get('PINWHEEL_ENVIRONMENT') !== 'production';
    this.baseUrl = isSandbox
      ? 'https://sandbox.getpinwheel.com/v1'
      : 'https://api.getpinwheel.com/v1';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await fetch(`${this.baseUrl}/platforms?limit=1`, {
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
    const body: Record<string, unknown> = {
      org_name: request.tenantId,
      end_user_id: request.userId,
      required_jobs: ['direct_deposit_switch'],
      routing_number: request.routingNumber,
      account_number: request.accountNumber,
      account_type: 'checking',
    };

    if (request.allocationType === 'full') {
      body.allocation = { type: 'full' };
    } else if (request.allocationType === 'partial') {
      body.allocation = { type: 'percent', value: request.allocationPercentage };
    } else if (request.allocationType === 'fixed_amount') {
      // Pinwheel expects dollar amounts, not cents
      body.allocation = { type: 'amount', value: (request.allocationAmountCents ?? 0) / 100 };
    }

    if (request.employerPlatformId) {
      body.platform_id = request.employerPlatformId;
    }

    const res = await fetch(`${this.baseUrl}/link_tokens`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pinwheel createLinkToken failed: HTTP ${res.status} — ${errBody}`);
    }

    const json = (await res.json()) as PinwheelLinkTokenResponse;

    return {
      linkToken: json.data.token,
      widgetUrl: `https://link.getpinwheel.com?token=${json.data.token}`,
      providerSwitchId: json.data.id,
      expiresAt: json.data.expires,
      provider: 'pinwheel',
    };
  }

  async getSwitchStatus(request: GetSwitchStatusRequest): Promise<GetSwitchStatusResponse> {
    const res = await fetch(`${this.baseUrl}/jobs/${request.providerSwitchId}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pinwheel getSwitchStatus failed: HTTP ${res.status} — ${errBody}`);
    }

    const json = (await res.json()) as PinwheelJobStatusResponse;
    const status = mapPinwheelStatus(json.data.status, json.data.outcome);

    return {
      providerSwitchId: json.data.id,
      status,
      providerConfirmationId: status === 'completed' ? json.data.id : undefined,
      failureReason: json.data.error?.message,
      completedAt: json.data.timestamps.completed_at,
      updatedAt: json.data.timestamps.updated_at,
    };
  }

  async searchEmployers(request: SearchEmployersRequest): Promise<SearchEmployersResponse> {
    const params = new URLSearchParams({
      q: request.query,
      limit: String(request.limit ?? 20),
      supported_jobs: 'direct_deposit_switch',
    });

    const res = await fetch(`${this.baseUrl}/platforms/search?${params}`, {
      headers: this.headers(),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Pinwheel searchEmployers failed: HTTP ${res.status} — ${errBody}`);
    }

    const json = (await res.json()) as PinwheelPlatformSearchResponse;

    return {
      employers: json.data.map((p) => ({
        platformId: p.id,
        name: p.name,
        logoUrl: p.logo_url,
        payrollProvider: p.type,
      })),
      hasMore: !!json.meta.next_cursor,
    };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-SECRET': this.apiKey,
      'Pinwheel-Version': '2023-11-22',
    };
  }
}
