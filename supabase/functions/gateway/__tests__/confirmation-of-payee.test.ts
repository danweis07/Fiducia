/**
 * Confirmation of Payee (CoP) Handler Tests
 *
 * Tests for name-account verification before payment execution.
 * Supports UK CoP, SEPA VoP, Pix DICT, and UPI VPA.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    verifyPayee: vi.fn(),
    getVerification: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  verifyPayee,
  getVerification,
} from '../handlers/confirmation-of-payee.ts';

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

describe('confirmation-of-payee handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'verifyPayee', fn: verifyPayee },
      { name: 'getVerification', fn: getVerification },
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
  // verifyPayee
  // =========================================================================

  describe('verifyPayee', () => {
    it('returns 400 when payeeName is missing', async () => {
      const ctx = createMockContext({ params: { iban: 'DE89370400440532013000' } });
      const result = await verifyPayee(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('payeeName');
    });

    it('returns 400 when no account identifier is provided', async () => {
      const ctx = createMockContext({ params: { payeeName: 'Jane Doe' } });
      const result = await verifyPayee(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('account identifier');
    });

    it('verifies payee with IBAN identifier', async () => {
      const verification = { match: 'exact', verificationId: 'v-1', payeeName: 'Jane Doe' };
      mockAdapter.verifyPayee.mockResolvedValue(verification);

      const ctx = createMockContext({
        params: { payeeName: 'Jane Doe', iban: 'DE89370400440532013000', scheme: 'sepa_vop' },
      });
      const result = await verifyPayee(ctx);

      expect(result.data).toEqual(verification);
      expect(mockAdapter.verifyPayee).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'firm-456',
        payeeName: 'Jane Doe',
        iban: 'DE89370400440532013000',
      }));
    });

    it('verifies payee with sortCode + accountNumber', async () => {
      const verification = { match: 'close', suggestedName: 'J Doe' };
      mockAdapter.verifyPayee.mockResolvedValue(verification);

      const ctx = createMockContext({
        params: { payeeName: 'Jane Doe', sortCode: '200000', accountNumber: '55779911' },
      });
      const result = await verifyPayee(ctx);

      expect(result.data).toEqual(verification);
    });

    it('verifies payee with pixKey', async () => {
      const verification = { match: 'exact' };
      mockAdapter.verifyPayee.mockResolvedValue(verification);

      const ctx = createMockContext({
        params: { payeeName: 'Maria Silva', pixKey: '12345678901', pixKeyType: 'cpf' },
      });
      const result = await verifyPayee(ctx);

      expect(result.data).toEqual(verification);
    });

    it('verifies payee with VPA', async () => {
      const verification = { match: 'exact' };
      mockAdapter.verifyPayee.mockResolvedValue(verification);

      const ctx = createMockContext({
        params: { payeeName: 'Raj Kumar', vpa: 'raj@upi' },
      });
      const result = await verifyPayee(ctx);

      expect(result.data).toEqual(verification);
    });
  });

  // =========================================================================
  // getVerification
  // =========================================================================

  describe('getVerification', () => {
    it('returns 400 when verificationId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getVerification(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns verification result on valid request', async () => {
      const verification = { verificationId: 'v-1', match: 'exact', payeeName: 'Jane Doe', createdAt: '2026-03-17T00:00:00Z' };
      mockAdapter.getVerification.mockResolvedValue(verification);

      const ctx = createMockContext({ params: { verificationId: 'v-1' } });
      const result = await getVerification(ctx);

      expect(result.data).toEqual(verification);
      expect(mockAdapter.getVerification).toHaveBeenCalledWith({
        tenantId: 'firm-456',
        verificationId: 'v-1',
      });
    });
  });
});
