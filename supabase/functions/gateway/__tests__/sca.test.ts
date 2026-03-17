/**
 * Strong Customer Authentication (SCA) Handler Tests
 *
 * Tests for PSD2/PSD3 SCA challenge initiation, completion,
 * and exemption checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    initiateChallenge: vi.fn(),
    completeChallenge: vi.fn(),
    checkExemption: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  initiateChallenge,
  completeChallenge,
  checkExemption,
} from '../handlers/sca.ts';

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

function createMockContext(overrides: Partial<GatewayContext> = {}): GatewayContext {
  return {
    supabase: {} as GatewayContext['supabase'],
    db: {} as GatewayContext['db'],
    deps: {} as GatewayContext['deps'],
    params: {},
    userId: 'user-123',
    firmId: 'firm-456',
    locale: 'en' as GatewayContext['locale'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sca handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'initiateChallenge', fn: initiateChallenge },
      { name: 'completeChallenge', fn: completeChallenge },
      { name: 'checkExemption', fn: checkExemption },
    ];

    for (const { name, fn } of handlers) {
      it(`${name} returns 401 when userId is missing`, async () => {
        const ctx = createMockContext({ userId: undefined });
        const result = await fn(ctx);
        expect(result.status).toBe(401);
        expect(result.error?.code).toBe('UNAUTHORIZED');
      });

      it(`${name} returns 401 when firmId is missing`, async () => {
        const ctx = createMockContext({ firmId: undefined });
        const result = await fn(ctx);
        expect(result.status).toBe(401);
        expect(result.error?.code).toBe('UNAUTHORIZED');
      });
    }
  });

  // =========================================================================
  // initiateChallenge
  // =========================================================================

  describe('initiateChallenge', () => {
    it('returns 400 when action is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await initiateChallenge(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when action is invalid', async () => {
      const ctx = createMockContext({ params: { action: 'invalid_action' } });
      const result = await initiateChallenge(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('Invalid action');
    });

    it('accepts all valid action types', async () => {
      const validActions = ['payment', 'login', 'beneficiary_add', 'card_activation', 'profile_change'];

      for (const action of validActions) {
        mockAdapter.initiateChallenge.mockResolvedValue({ challengeId: `ch-${action}`, method: 'push' });
        const ctx = createMockContext({ params: { action } });
        const result = await initiateChallenge(ctx);
        expect(result.status).toBeUndefined(); // no error status means 200
        expect(result.data).toBeDefined();
      }
    });

    it('initiates challenge on valid payment action', async () => {
      const challenge = { challengeId: 'ch-1', method: 'push', expiresAt: '2026-03-17T00:05:00Z' };
      mockAdapter.initiateChallenge.mockResolvedValue(challenge);

      const ctx = createMockContext({
        params: {
          action: 'payment',
          preferredMethod: 'push',
          amountMinorUnits: 50000,
          currency: 'EUR',
          payeeName: 'Jane Doe',
        },
      });
      const result = await initiateChallenge(ctx);

      expect(result.data).toEqual(challenge);
      expect(mockAdapter.initiateChallenge).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'firm-456',
        userId: 'user-123',
        action: 'payment',
        amountMinorUnits: 50000,
        currency: 'EUR',
      }));
    });
  });

  // =========================================================================
  // completeChallenge
  // =========================================================================

  describe('completeChallenge', () => {
    it('returns 400 when challengeId is missing', async () => {
      const ctx = createMockContext({ params: { authenticationProof: 'proof-xyz' } });
      const result = await completeChallenge(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when authenticationProof is missing', async () => {
      const ctx = createMockContext({ params: { challengeId: 'ch-1' } });
      const result = await completeChallenge(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('completes challenge on valid request', async () => {
      const completion = { success: true, scaToken: 'sca-token-abc', expiresAt: '2026-03-17T00:10:00Z' };
      mockAdapter.completeChallenge.mockResolvedValue(completion);

      const ctx = createMockContext({ params: { challengeId: 'ch-1', authenticationProof: 'proof-xyz' } });
      const result = await completeChallenge(ctx);

      expect(result.data).toEqual(completion);
      expect(mockAdapter.completeChallenge).toHaveBeenCalledWith({
        tenantId: 'firm-456',
        challengeId: 'ch-1',
        authenticationProof: 'proof-xyz',
      });
    });
  });

  // =========================================================================
  // checkExemption
  // =========================================================================

  describe('checkExemption', () => {
    it('returns 400 when exemptionType is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await checkExemption(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('checks exemption on valid request', async () => {
      const exemption = { exempt: true, exemptionType: 'low_value', reason: 'Transaction below 30 EUR threshold' };
      mockAdapter.checkExemption.mockResolvedValue(exemption);

      const ctx = createMockContext({
        params: { exemptionType: 'low_value', amountMinorUnits: 2500, currency: 'EUR' },
      });
      const result = await checkExemption(ctx);

      expect(result.data).toEqual(exemption);
      expect(mockAdapter.checkExemption).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'firm-456',
        userId: 'user-123',
        exemptionType: 'low_value',
        amountMinorUnits: 2500,
        currency: 'EUR',
      }));
    });
  });
});
