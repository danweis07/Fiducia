/**
 * Alias-First Payments Handler Tests
 *
 * Tests for global alias resolution, pay-by-alias,
 * and Request-to-Pay (R2P) operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock the MockAliasResolutionAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    resolveAlias: vi.fn(),
    payByAlias: vi.fn(),
    listInboundR2P: vi.fn(),
    respondToR2P: vi.fn(),
    sendR2P: vi.fn(),
    listOutboundR2P: vi.fn(),
    getSupportedDirectories: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  resolveAlias,
  payByAlias,
  listInboundR2P,
  respondToR2P,
  sendR2P,
  listOutboundR2P,
  getSupportedDirectories,
} from '../handlers/alias-payments.ts';

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

describe('alias-payments handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'resolveAlias', fn: resolveAlias },
      { name: 'payByAlias', fn: payByAlias },
      { name: 'listInboundR2P', fn: listInboundR2P },
      { name: 'respondToR2P', fn: respondToR2P },
      { name: 'sendR2P', fn: sendR2P },
      { name: 'listOutboundR2P', fn: listOutboundR2P },
      { name: 'getSupportedDirectories', fn: getSupportedDirectories },
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
  // resolveAlias
  // =========================================================================

  describe('resolveAlias', () => {
    it('returns 400 when aliasType is missing', async () => {
      const ctx = createMockContext({ params: { aliasValue: 'john@example.com' } });
      const result = await resolveAlias(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns 400 when aliasValue is missing', async () => {
      const ctx = createMockContext({ params: { aliasType: 'email' } });
      const result = await resolveAlias(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('resolves alias on valid request', async () => {
      const resolution = { found: true, accountName: 'John Doe', bankCode: 'BARCLAYS' };
      mockAdapter.resolveAlias.mockResolvedValue(resolution);

      const ctx = createMockContext({ params: { aliasType: 'email', aliasValue: 'john@example.com', region: 'uk' } });
      const result = await resolveAlias(ctx);

      expect(result.data).toEqual(resolution);
      expect(mockAdapter.resolveAlias).toHaveBeenCalledWith(expect.objectContaining({
        tenantId: 'firm-456',
        aliasType: 'email',
        aliasValue: 'john@example.com',
      }));
    });
  });

  // =========================================================================
  // payByAlias
  // =========================================================================

  describe('payByAlias', () => {
    const validParams = {
      sourceAccountId: 'acct-1',
      aliasType: 'email',
      aliasValue: 'jane@example.com',
      amountCents: 5000,
      currency: 'GBP',
      description: 'Dinner split',
      idempotencyKey: 'idem-1',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { sourceAccountId: 'acct-1' } });
      const result = await payByAlias(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('pays by alias on valid request', async () => {
      const payment = { paymentId: 'pay-1', status: 'completed' };
      mockAdapter.payByAlias.mockResolvedValue(payment);

      const ctx = createMockContext({ params: validParams });
      const result = await payByAlias(ctx);

      expect(result.data).toEqual(payment);
    });
  });

  // =========================================================================
  // listInboundR2P
  // =========================================================================

  describe('listInboundR2P', () => {
    it('returns list of inbound R2P requests', async () => {
      const requests = { requests: [{ id: 'r2p-1', status: 'pending' }] };
      mockAdapter.listInboundR2P.mockResolvedValue(requests);

      const ctx = createMockContext({ params: { status: 'pending', limit: 10 } });
      const result = await listInboundR2P(ctx);

      expect(result.data).toEqual(requests);
    });
  });

  // =========================================================================
  // respondToR2P
  // =========================================================================

  describe('respondToR2P', () => {
    it('returns 400 when requestId is missing', async () => {
      const ctx = createMockContext({ params: { action: 'approve' } });
      const result = await respondToR2P(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns 400 when action is missing', async () => {
      const ctx = createMockContext({ params: { requestId: 'r2p-1' } });
      const result = await respondToR2P(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('approves R2P on valid request', async () => {
      const response = { status: 'approved', paymentId: 'pay-1' };
      mockAdapter.respondToR2P.mockResolvedValue(response);

      const ctx = createMockContext({ params: { requestId: 'r2p-1', action: 'approve', sourceAccountId: 'acct-1' } });
      const result = await respondToR2P(ctx);

      expect(result.data).toEqual(response);
      expect(mockAdapter.respondToR2P).toHaveBeenCalledWith(expect.objectContaining({
        requestId: 'r2p-1',
        action: 'approve',
        sourceAccountId: 'acct-1',
      }));
    });

    it('declines R2P on valid request', async () => {
      const response = { status: 'declined' };
      mockAdapter.respondToR2P.mockResolvedValue(response);

      const ctx = createMockContext({ params: { requestId: 'r2p-1', action: 'decline' } });
      const result = await respondToR2P(ctx);

      expect(result.data).toEqual(response);
    });
  });

  // =========================================================================
  // sendR2P
  // =========================================================================

  describe('sendR2P', () => {
    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { sourceAccountId: 'acct-1' } });
      const result = await sendR2P(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('sends R2P on valid request', async () => {
      const r2p = { requestId: 'r2p-out-1', status: 'sent' };
      mockAdapter.sendR2P.mockResolvedValue(r2p);

      const ctx = createMockContext({
        params: {
          sourceAccountId: 'acct-1',
          payerAlias: 'bob@example.com',
          payerAliasType: 'email',
          amountCents: 3000,
          currency: 'GBP',
          description: 'Rent share',
          expiresAt: '2026-04-01T00:00:00Z',
        },
      });
      const result = await sendR2P(ctx);

      expect(result.data).toEqual(r2p);
    });
  });

  // =========================================================================
  // listOutboundR2P
  // =========================================================================

  describe('listOutboundR2P', () => {
    it('returns list of outbound R2P requests', async () => {
      const requests = { requests: [{ id: 'r2p-out-1', status: 'sent' }] };
      mockAdapter.listOutboundR2P.mockResolvedValue(requests);

      const ctx = createMockContext({ params: {} });
      const result = await listOutboundR2P(ctx);

      expect(result.data).toEqual(requests);
    });
  });

  // =========================================================================
  // getSupportedDirectories
  // =========================================================================

  describe('getSupportedDirectories', () => {
    it('returns supported directories', async () => {
      const directories = [
        { region: 'uk', schemes: ['fps', 'pay_uk'] },
        { region: 'brazil', schemes: ['pix'] },
      ];
      mockAdapter.getSupportedDirectories.mockResolvedValue(directories);

      const ctx = createMockContext({ params: {} });
      const result = await getSupportedDirectories(ctx);

      expect(result.data).toEqual(directories);
    });
  });
});
