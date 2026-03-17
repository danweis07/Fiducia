/**
 * Mock RDC Adapter
 *
 * Sandbox implementation for development and demo mode.
 * Simulates the full deposit lifecycle with realistic delays and responses.
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

// Simulated deposit store (in-memory for sandbox)
const deposits = new Map<string, { status: DepositStatus; createdAt: number; amountCents: number }>();

export class MockRDCAdapter implements RDCAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock RDC (Sandbox)',
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

  async submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse> {
    const depositId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Simulate rejection for amounts over $5,000
    if (request.amountCents > 500_000) {
      return {
        providerDepositId: depositId,
        status: 'rejected',
        referenceNumber: `MOCK-${depositId.slice(-8).toUpperCase()}`,
        receivedAt: new Date().toISOString(),
        provider: 'mock',
      };
    }

    deposits.set(depositId, {
      status: 'pending',
      createdAt: Date.now(),
      amountCents: request.amountCents,
    });

    return {
      providerDepositId: depositId,
      status: 'pending',
      referenceNumber: `MOCK-${depositId.slice(-8).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
      expectedAvailabilityDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      provider: 'mock',
    };
  }

  async getDepositStatus(request: GetDepositStatusRequest): Promise<GetDepositStatusResponse> {
    const deposit = deposits.get(request.providerDepositId);
    const now = Date.now();

    if (!deposit) {
      // Return a realistic response for unknown deposits
      return {
        providerDepositId: request.providerDepositId,
        status: 'cleared',
        updatedAt: new Date().toISOString(),
        clearedAt: new Date().toISOString(),
      };
    }

    // Simulate lifecycle: pending → reviewing (30s) → accepted (60s) → cleared (120s)
    const elapsed = now - deposit.createdAt;
    let status: DepositStatus = deposit.status;

    if (elapsed > 120_000) {
      status = 'cleared';
    } else if (elapsed > 60_000) {
      status = 'accepted';
    } else if (elapsed > 30_000) {
      status = 'reviewing';
    }

    deposit.status = status;

    return {
      providerDepositId: request.providerDepositId,
      status,
      confirmedAmountCents: deposit.amountCents,
      updatedAt: new Date().toISOString(),
      availabilityDate: new Date(deposit.createdAt + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      clearedAt: status === 'cleared' ? new Date().toISOString() : undefined,
    };
  }

  async getDepositLimits(_request: GetDepositLimitsRequest): Promise<DepositLimits> {
    return {
      perDepositLimitCents: 500_000,     // $5,000
      dailyLimitCents: 2_500_000,        // $25,000
      dailyUsedCents: 0,
      monthlyLimitCents: 50_000_000,     // $500,000
      monthlyUsedCents: 0,
      maxDepositsPerDay: 10,
      depositsToday: 0,
    };
  }

  async validateCheck(_request: ValidateCheckRequest): Promise<CheckValidationResult> {
    // Mock always returns valid with high quality
    return {
      valid: true,
      qualityScore: 92,
      issues: [],
      extractedFields: {
        amountCents: 15000,
        checkNumber: '1042',
        routingNumber: '021000021',
        payeeName: 'John Doe',
        date: new Date().toISOString().split('T')[0],
      },
    };
  }
}
