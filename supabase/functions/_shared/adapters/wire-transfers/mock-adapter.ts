/**
 * Mock Wire Transfer Adapter
 *
 * Sandbox/testing implementation that simulates wire origination,
 * status tracking, and fee/limit lookups without connecting to
 * FedWire or SWIFT.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  WireTransferAdapter,
  WireOriginationRequest,
  WireTransferResult,
  WireStatusInquiry,
  WireFeeSchedule,
  WireLimits,
} from './types.ts';

export class MockWireTransferAdapter implements WireTransferAdapter {
  readonly name = 'mock';
  readonly config: AdapterConfig = {
    id: 'mock-wire-transfers',
    name: 'Mock Wire Transfer Adapter',
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

  async originate(request: WireOriginationRequest): Promise<WireTransferResult> {
    const wireId = `mock_wire_${crypto.randomUUID().slice(0, 12)}`;
    const now = new Date().toISOString();
    const acctNum = request.beneficiaryAccountNumber;
    const masked = `****${acctNum.slice(-4)}`;

    console.warn(`[mock-wire] Originating ${request.type} wire: $${(request.amountCents / 100).toFixed(2)} to ${request.beneficiaryName}`);

    return {
      wireId,
      referenceNumber: `REF-${wireId}`,
      type: request.type,
      status: 'submitted',
      amountCents: request.amountCents,
      feeCents: request.type === 'domestic' ? 2500 : 4500,
      currency: request.currency ?? 'USD',
      beneficiaryName: request.beneficiaryName,
      beneficiaryBankName: request.beneficiaryBankName,
      beneficiaryAccountMasked: request.beneficiaryAccountMasked ?? masked,
      isoMessageType: 'pacs.008',
      uetr: request.type === 'international' ? crypto.randomUUID() : undefined,
      imad: request.type === 'domestic' ? `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}MMQFMP${wireId.slice(-6)}` : undefined,
      estimatedCompletionDate: request.type === 'domestic'
        ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()  // 2 hours for domestic
        : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours for international
      completedAt: null,
      failureReason: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getStatus(wireId: string): Promise<WireStatusInquiry> {
    return {
      wireId,
      status: 'processing',
      statusHistory: [
        { status: 'pending', timestamp: new Date(Date.now() - 60000).toISOString() },
        { status: 'submitted', timestamp: new Date(Date.now() - 30000).toISOString(), institution: 'Originator Bank' },
        { status: 'processing', timestamp: new Date().toISOString(), institution: 'Intermediary Bank' },
      ],
    };
  }

  async cancel(wireId: string): Promise<{ success: boolean; reason?: string }> {
    console.warn(`[mock-wire] Cancelling wire ${wireId}`);
    return { success: true };
  }

  async getFees(_tenantId: string): Promise<WireFeeSchedule> {
    return {
      domesticFeeCents: 2500,
      internationalFeeCents: 4500,
      expeditedDomesticFeeCents: 3500,
      expeditedInternationalFeeCents: 6500,
    };
  }

  async getLimits(_tenantId: string): Promise<WireLimits> {
    return {
      dailyLimitCents: 25000000,     // $250,000
      perTransactionLimitCents: 10000000, // $100,000
      usedTodayCents: 0,
      remainingDailyCents: 25000000,
    };
  }
}
