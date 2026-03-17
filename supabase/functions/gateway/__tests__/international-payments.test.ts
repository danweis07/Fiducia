/**
 * International Payments Handler Tests
 *
 * Tests for cross-border payments, FX quotes, global card issuing,
 * and international payouts handlers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    getCoverage: vi.fn(),
    getFXQuote: vi.fn(),
    createPayment: vi.fn(),
    getPayment: vi.fn(),
    listPayments: vi.fn(),
    issueGlobalCard: vi.fn(),
    listGlobalCards: vi.fn(),
    createPayout: vi.fn(),
    listPayouts: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  getInternationalCoverage,
  getFXQuote,
  createInternationalPayment,
  getInternationalPayment,
  listInternationalPayments,
  issueGlobalCard,
  listGlobalCards,
  createInternationalPayout,
  listInternationalPayouts,
} from '../handlers/international-payments.ts';

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

describe('international-payments handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'getInternationalCoverage', fn: getInternationalCoverage },
      { name: 'getFXQuote', fn: getFXQuote },
      { name: 'createInternationalPayment', fn: createInternationalPayment },
      { name: 'getInternationalPayment', fn: getInternationalPayment },
      { name: 'listInternationalPayments', fn: listInternationalPayments },
      { name: 'issueGlobalCard', fn: issueGlobalCard },
      { name: 'listGlobalCards', fn: listGlobalCards },
      { name: 'createInternationalPayout', fn: createInternationalPayout },
      { name: 'listInternationalPayouts', fn: listInternationalPayouts },
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
  // getInternationalCoverage
  // =========================================================================

  describe('getInternationalCoverage', () => {
    it('returns coverage data from adapter', async () => {
      const coverage = { countries: ['US', 'GB', 'DE'], corridors: 120 };
      mockAdapter.getCoverage.mockResolvedValue(coverage);

      const ctx = createMockContext({ params: { region: 'europe' } });
      const result = await getInternationalCoverage(ctx);

      expect(result.data).toEqual(coverage);
      expect(mockAdapter.getCoverage).toHaveBeenCalledWith({
        userId: 'user-123',
        tenantId: 'firm-456',
        region: 'europe',
      });
    });
  });

  // =========================================================================
  // getFXQuote
  // =========================================================================

  describe('getFXQuote', () => {
    it('returns 400 when fromCurrency is missing', async () => {
      const ctx = createMockContext({ params: { toCurrency: 'EUR' } });
      const result = await getFXQuote(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when toCurrency is missing', async () => {
      const ctx = createMockContext({ params: { fromCurrency: 'USD' } });
      const result = await getFXQuote(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns FX quote on valid request', async () => {
      const quote = { quoteId: 'q-1', rate: 0.92, fromAmountCents: 10000, toAmountCents: 9200 };
      mockAdapter.getFXQuote.mockResolvedValue(quote);

      const ctx = createMockContext({ params: { fromCurrency: 'USD', toCurrency: 'EUR', fromAmountCents: 10000 } });
      const result = await getFXQuote(ctx);

      expect(result.data).toEqual(quote);
      expect(mockAdapter.getFXQuote).toHaveBeenCalledWith(expect.objectContaining({
        fromCurrency: 'USD',
        toCurrency: 'EUR',
        fromAmountCents: 10000,
      }));
    });
  });

  // =========================================================================
  // createInternationalPayment
  // =========================================================================

  describe('createInternationalPayment', () => {
    const validParams = {
      fromAccountId: 'acct-1',
      fromCurrency: 'USD',
      toCurrency: 'GBP',
      amountCents: 50000,
      beneficiaryName: 'Jane Smith',
      beneficiaryCountry: 'GB',
      beneficiaryAccountNumber: '12345678',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { fromAccountId: 'acct-1' } });
      const result = await createInternationalPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({ params: { ...validParams, amountCents: -100 } });
      const result = await createInternationalPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });

    it('creates payment on valid request', async () => {
      const payment = { id: 'pmt-1', status: 'pending' };
      mockAdapter.createPayment.mockResolvedValue(payment);

      const ctx = createMockContext({ params: validParams });
      const result = await createInternationalPayment(ctx);

      expect(result.data).toEqual(payment);
      expect(mockAdapter.createPayment).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        tenantId: 'firm-456',
      }));
    });
  });

  // =========================================================================
  // getInternationalPayment
  // =========================================================================

  describe('getInternationalPayment', () => {
    it('returns 400 when paymentId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInternationalPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns payment details on valid request', async () => {
      const payment = { id: 'pmt-1', status: 'completed', amountCents: 50000 };
      mockAdapter.getPayment.mockResolvedValue(payment);

      const ctx = createMockContext({ params: { paymentId: 'pmt-1' } });
      const result = await getInternationalPayment(ctx);

      expect(result.data).toEqual(payment);
    });
  });

  // =========================================================================
  // listInternationalPayments
  // =========================================================================

  describe('listInternationalPayments', () => {
    it('returns paginated list of payments', async () => {
      const payments = [{ id: 'pmt-1' }, { id: 'pmt-2' }];
      mockAdapter.listPayments.mockResolvedValue({ payments, total: 2 });

      const ctx = createMockContext({ params: { limit: 10, offset: 0 } });
      const result = await listInternationalPayments(ctx);

      expect(result.data).toEqual(payments);
      expect(result.meta?.pagination).toEqual({ total: 2, limit: 10, offset: 0, hasMore: false });
    });

    it('sets hasMore true when more results exist', async () => {
      mockAdapter.listPayments.mockResolvedValue({ payments: [{ id: 'pmt-1' }], total: 100 });

      const ctx = createMockContext({ params: { limit: 10, offset: 0 } });
      const result = await listInternationalPayments(ctx);

      expect(result.meta?.pagination?.hasMore).toBe(true);
    });
  });

  // =========================================================================
  // issueGlobalCard
  // =========================================================================

  describe('issueGlobalCard', () => {
    const validParams = {
      type: 'virtual',
      cardholderName: 'Jane Smith',
      currency: 'EUR',
      country: 'DE',
      spendLimitCents: 100000,
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { type: 'virtual' } });
      const result = await issueGlobalCard(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('issues card on valid request', async () => {
      const card = { id: 'card-1', status: 'active', last4: '4242' };
      mockAdapter.issueGlobalCard.mockResolvedValue(card);

      const ctx = createMockContext({ params: validParams });
      const result = await issueGlobalCard(ctx);

      expect(result.data).toEqual(card);
    });
  });

  // =========================================================================
  // listGlobalCards
  // =========================================================================

  describe('listGlobalCards', () => {
    it('returns paginated list of cards', async () => {
      const cards = [{ id: 'card-1' }];
      mockAdapter.listGlobalCards.mockResolvedValue({ cards, total: 1 });

      const ctx = createMockContext({ params: {} });
      const result = await listGlobalCards(ctx);

      expect(result.data).toEqual(cards);
      expect(result.meta?.pagination).toBeDefined();
    });
  });

  // =========================================================================
  // createInternationalPayout
  // =========================================================================

  describe('createInternationalPayout', () => {
    const validParams = {
      destinationCountry: 'MX',
      destinationCurrency: 'MXN',
      amountCents: 100000,
      recipientName: 'Carlos Garcia',
      recipientAccountNumber: '0123456789',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { destinationCountry: 'MX' } });
      const result = await createInternationalPayout(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('creates payout on valid request', async () => {
      const payout = { id: 'po-1', status: 'pending' };
      mockAdapter.createPayout.mockResolvedValue(payout);

      const ctx = createMockContext({ params: validParams });
      const result = await createInternationalPayout(ctx);

      expect(result.data).toEqual(payout);
    });
  });

  // =========================================================================
  // listInternationalPayouts
  // =========================================================================

  describe('listInternationalPayouts', () => {
    it('returns paginated list of payouts', async () => {
      const payouts = [{ id: 'po-1' }];
      mockAdapter.listPayouts.mockResolvedValue({ payouts, total: 1 });

      const ctx = createMockContext({ params: {} });
      const result = await listInternationalPayouts(ctx);

      expect(result.data).toEqual(payouts);
      expect(result.meta?.pagination).toBeDefined();
    });
  });
});
