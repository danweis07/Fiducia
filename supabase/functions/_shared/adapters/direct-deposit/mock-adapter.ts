/**
 * Mock Direct Deposit Switching Adapter
 *
 * Sandbox implementation for development and demo mode.
 * Simulates the payroll widget flow with realistic responses.
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

// Simulated switch store (in-memory for sandbox)
const switches = new Map<string, { status: SwitchStatus; createdAt: number }>();

// Mock employer directory
const MOCK_EMPLOYERS = [
  { platformId: 'emp_adp', name: 'ADP', payrollProvider: 'ADP Workforce Now', logoUrl: undefined },
  { platformId: 'emp_workday', name: 'Workday', payrollProvider: 'Workday', logoUrl: undefined },
  { platformId: 'emp_gusto', name: 'Gusto', payrollProvider: 'Gusto', logoUrl: undefined },
  { platformId: 'emp_paychex', name: 'Paychex', payrollProvider: 'Paychex Flex', logoUrl: undefined },
  { platformId: 'emp_paylocity', name: 'Paylocity', payrollProvider: 'Paylocity', logoUrl: undefined },
  { platformId: 'emp_paycom', name: 'Paycom', payrollProvider: 'Paycom', logoUrl: undefined },
  { platformId: 'emp_bamboo', name: 'BambooHR', payrollProvider: 'BambooHR', logoUrl: undefined },
  { platformId: 'emp_rippling', name: 'Rippling', payrollProvider: 'Rippling', logoUrl: undefined },
  { platformId: 'emp_square', name: 'Square Payroll', payrollProvider: 'Square', logoUrl: undefined },
  { platformId: 'emp_walmart', name: 'Walmart', payrollProvider: 'ADP Workforce Now', logoUrl: undefined },
  { platformId: 'emp_amazon', name: 'Amazon', payrollProvider: 'ADP Workforce Now', logoUrl: undefined },
  { platformId: 'emp_target', name: 'Target', payrollProvider: 'Workday', logoUrl: undefined },
  { platformId: 'emp_usps', name: 'USPS', payrollProvider: 'PostalEASE', logoUrl: undefined },
  { platformId: 'emp_fedgov', name: 'US Federal Government', payrollProvider: 'myPay / GRB', logoUrl: undefined },
];

export class MockDirectDepositAdapter implements DirectDepositAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Direct Deposit (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async createLinkToken(_request: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse> {
    const switchId = `dds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const token = crypto.randomUUID();

    switches.set(switchId, { status: 'awaiting_login', createdAt: Date.now() });

    return {
      linkToken: `mock_lt_${token}`,
      widgetUrl: `https://payroll-widget.example.com/switch/${token}`,
      providerSwitchId: switchId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
      provider: 'mock',
    };
  }

  async getSwitchStatus(request: GetSwitchStatusRequest): Promise<GetSwitchStatusResponse> {
    const sw = switches.get(request.providerSwitchId);
    const now = Date.now();

    if (!sw) {
      return {
        providerSwitchId: request.providerSwitchId,
        status: 'completed',
        providerConfirmationId: `mock_conf_${request.providerSwitchId}`,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Simulate lifecycle: awaiting_login → processing (30s) → completed (60s)
    const elapsed = now - sw.createdAt;
    let status: SwitchStatus = sw.status;

    if (elapsed > 60_000) {
      status = 'completed';
    } else if (elapsed > 30_000) {
      status = 'processing';
    }

    sw.status = status;

    return {
      providerSwitchId: request.providerSwitchId,
      status,
      providerConfirmationId: status === 'completed' ? `mock_conf_${request.providerSwitchId}` : undefined,
      completedAt: status === 'completed' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  async searchEmployers(request: SearchEmployersRequest): Promise<SearchEmployersResponse> {
    const query = request.query.toLowerCase();
    const limit = request.limit ?? 20;

    const filtered = MOCK_EMPLOYERS.filter(
      (e) => e.name.toLowerCase().includes(query) || e.payrollProvider.toLowerCase().includes(query),
    );

    return {
      employers: filtered.slice(0, limit),
      hasMore: filtered.length > limit,
    };
  }
}
