/**
 * Instant Payments Handler Tests
 *
 * Tests for real-time payment operations including sending,
 * status tracking, receiver eligibility, and Request for Payment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    sendPayment: vi.fn(),
    getPayment: vi.fn(),
    listPayments: vi.fn(),
    checkReceiver: vi.fn(),
    sendRequestForPayment: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  sendInstantPayment,
  getInstantPayment,
  listInstantPayments,
  checkInstantPaymentReceiver,
  sendRequestForPayment,
} from '../handlers/instant-payments.ts';

// ---------------------------------------------------------------------------
// Chainable DB mock for transaction limit validation
// ---------------------------------------------------------------------------

function createChainableDbMock() {
  const chain: Record<string, unknown> = {};
  const methods = ['from', 'select', 'eq', 'gte', 'not', 'limit', 'order', 'range', 'lte', 'maybeSingle'];
  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue({ data: null });
  // Make the chain itself a thenable that resolves to empty data
  (chain as Record<string, unknown>).then = (resolve: (v: unknown) => void) => resolve({ data: [], count: 0 });
  return chain;
}

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

function createMockContext(overrides: Partial<GatewayContext> = {}): GatewayContext {
  return {
    supabase: {} as GatewayContext['supabase'],
    db: createChainableDbMock() as unknown as GatewayContext['db'],
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

describe('instant-payments handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'sendInstantPayment', fn: sendInstantPayment },
      { name: 'getInstantPayment', fn: getInstantPayment },
      { name: 'listInstantPayments', fn: listInstantPayments },
      { name: 'checkInstantPaymentReceiver', fn: checkInstantPaymentReceiver },
      { name: 'sendRequestForPayment', fn: sendRequestForPayment },
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
  // sendInstantPayment
  // =========================================================================

  describe('sendInstantPayment', () => {
    const validParams = {
      sourceAccountId: 'acct-1',
      receiverRoutingNumber: '021000021',
      receiverAccountNumber: '1234567890',
      receiverName: 'Jane Doe',
      amountCents: 25000,
      description: 'Rent payment',
      idempotencyKey: 'idem-key-123',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { sourceAccountId: 'acct-1' } });
      const result = await sendInstantPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({ params: { ...validParams, amountCents: -1 } });
      const result = await sendInstantPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });

    it('sends payment on valid request', async () => {
      const payment = { id: 'ip-1', status: 'accepted', rail: 'fednow' };
      mockAdapter.sendPayment.mockResolvedValue(payment);

      const ctx = createMockContext({ params: validParams });
      const result = await sendInstantPayment(ctx);

      expect(result.data).toEqual(payment);
      expect(mockAdapter.sendPayment).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'firm-456',
        sourceAccountId: 'acct-1',
        amountCents: 25000,
        idempotencyKey: 'idem-key-123',
      }));
    });
  });

  // =========================================================================
  // getInstantPayment
  // =========================================================================

  describe('getInstantPayment', () => {
    it('returns 400 when paymentId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInstantPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns payment details wrapped in { payment }', async () => {
      const payment = { id: 'ip-1', status: 'completed', amountCents: 25000 };
      mockAdapter.getPayment.mockResolvedValue(payment);

      const ctx = createMockContext({ params: { paymentId: 'ip-1' } });
      const result = await getInstantPayment(ctx);

      expect(result.data).toEqual({ payment });
    });
  });

  // =========================================================================
  // listInstantPayments
  // =========================================================================

  describe('listInstantPayments', () => {
    it('returns paginated payments list', async () => {
      const payments = [{ id: 'ip-1' }, { id: 'ip-2' }];
      mockAdapter.listPayments.mockResolvedValue({ payments, total: 2, hasMore: false });

      const ctx = createMockContext({ params: { limit: 10 } });
      const result = await listInstantPayments(ctx);

      expect((result.data as Record<string, unknown>).payments).toEqual(payments);
      expect(result.meta?.pagination).toEqual({ total: 2, limit: 10, offset: 0, hasMore: false });
    });

    it('passes filter params to adapter', async () => {
      mockAdapter.listPayments.mockResolvedValue({ payments: [], total: 0, hasMore: false });

      const ctx = createMockContext({ params: { accountId: 'acct-1', direction: 'outgoing', status: 'completed' } });
      await listInstantPayments(ctx);

      expect(mockAdapter.listPayments).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'acct-1',
        direction: 'outgoing',
        status: 'completed',
      }));
    });
  });

  // =========================================================================
  // checkInstantPaymentReceiver
  // =========================================================================

  describe('checkInstantPaymentReceiver', () => {
    it('returns eligibility result', async () => {
      const eligibility = { eligible: true, supportedRails: ['fednow', 'rtp'] };
      mockAdapter.checkReceiver.mockResolvedValue(eligibility);

      const ctx = createMockContext({ params: { routingNumber: '021000021', accountNumber: '1234567890' } });
      const result = await checkInstantPaymentReceiver(ctx);

      expect(result.data).toEqual(eligibility);
    });
  });

  // =========================================================================
  // sendRequestForPayment
  // =========================================================================

  describe('sendRequestForPayment', () => {
    const validParams = {
      requesterAccountId: 'acct-1',
      payerRoutingNumber: '021000021',
      payerAccountNumber: '9876543210',
      payerName: 'Bob Smith',
      amountCents: 15000,
      description: 'Invoice #1234',
      expiresAt: '2026-04-01T00:00:00Z',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { requesterAccountId: 'acct-1' } });
      const result = await sendRequestForPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({ params: { ...validParams, amountCents: -100 } });
      const result = await sendRequestForPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });

    it('sends R2P on valid request', async () => {
      const r2p = { id: 'r2p-1', status: 'pending' };
      mockAdapter.sendRequestForPayment.mockResolvedValue(r2p);

      const ctx = createMockContext({ params: validParams });
      const result = await sendRequestForPayment(ctx);

      expect(result.data).toEqual(r2p);
    });
  });
});
