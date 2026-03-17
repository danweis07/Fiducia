/**
 * International Bill Pay Handler Tests
 *
 * Tests for cross-border bill payments, biller search,
 * payment tracking, and supported countries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    searchBillers: vi.fn(),
    payBill: vi.fn(),
    getPayment: vi.fn(),
    listPayments: vi.fn(),
    getSupportedCountries: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  searchInternationalBillers,
  payInternationalBill,
  getInternationalBillPayment,
  listInternationalBillPayments,
  getInternationalBillPayCountries,
} from '../handlers/international-bill-pay.ts';

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

describe('international-bill-pay handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'searchInternationalBillers', fn: searchInternationalBillers },
      { name: 'payInternationalBill', fn: payInternationalBill },
      { name: 'getInternationalBillPayment', fn: getInternationalBillPayment },
      { name: 'listInternationalBillPayments', fn: listInternationalBillPayments },
      { name: 'getInternationalBillPayCountries', fn: getInternationalBillPayCountries },
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
  // searchInternationalBillers
  // =========================================================================

  describe('searchInternationalBillers', () => {
    it('returns 400 when query is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await searchInternationalBillers(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns billers on valid search', async () => {
      const billers = [{ id: 'b-1', name: 'Electric Co MX' }];
      mockAdapter.searchBillers.mockResolvedValue(billers);

      const ctx = createMockContext({ params: { query: 'Electric', country: 'MX' } });
      const result = await searchInternationalBillers(ctx);

      expect(result.data).toEqual(billers);
      expect(mockAdapter.searchBillers).toHaveBeenCalledWith(expect.objectContaining({
        query: 'Electric',
        country: 'MX',
        limit: 20,
      }));
    });
  });

  // =========================================================================
  // payInternationalBill
  // =========================================================================

  describe('payInternationalBill', () => {
    const validParams = {
      billerId: 'b-1',
      fromAccountId: 'acct-1',
      fromCurrency: 'USD',
      amountCents: 5000,
      accountReference: 'REF-12345',
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { billerId: 'b-1' } });
      const result = await payInternationalBill(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({ params: { ...validParams, amountCents: -100 } });
      const result = await payInternationalBill(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });

    it('pays bill on valid request', async () => {
      const payment = { id: 'pay-1', status: 'pending' };
      mockAdapter.payBill.mockResolvedValue(payment);

      const ctx = createMockContext({ params: validParams });
      const result = await payInternationalBill(ctx);

      expect(result.data).toEqual(payment);
      expect(mockAdapter.payBill).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        tenantId: 'firm-456',
        billerId: 'b-1',
        amountCents: 5000,
      }));
    });
  });

  // =========================================================================
  // getInternationalBillPayment
  // =========================================================================

  describe('getInternationalBillPayment', () => {
    it('returns 400 when paymentId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInternationalBillPayment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns payment details on valid request', async () => {
      const payment = { id: 'pay-1', status: 'completed' };
      mockAdapter.getPayment.mockResolvedValue(payment);

      const ctx = createMockContext({ params: { paymentId: 'pay-1' } });
      const result = await getInternationalBillPayment(ctx);

      expect(result.data).toEqual(payment);
    });
  });

  // =========================================================================
  // listInternationalBillPayments
  // =========================================================================

  describe('listInternationalBillPayments', () => {
    it('returns paginated list of payments', async () => {
      const payments = [{ id: 'pay-1' }, { id: 'pay-2' }];
      mockAdapter.listPayments.mockResolvedValue({ payments, total: 2 });

      const ctx = createMockContext({ params: { limit: 10, offset: 0 } });
      const result = await listInternationalBillPayments(ctx);

      expect(result.data).toEqual(payments);
      expect(result.meta?.pagination).toEqual({ total: 2, limit: 10, offset: 0, hasMore: false });
    });

    it('sets hasMore true when more results exist', async () => {
      mockAdapter.listPayments.mockResolvedValue({ payments: [], total: 50 });

      const ctx = createMockContext({ params: { limit: 10, offset: 0 } });
      const result = await listInternationalBillPayments(ctx);

      expect(result.meta?.pagination?.hasMore).toBe(true);
    });
  });

  // =========================================================================
  // getInternationalBillPayCountries
  // =========================================================================

  describe('getInternationalBillPayCountries', () => {
    it('returns supported countries', async () => {
      const countries = [{ code: 'MX', name: 'Mexico' }, { code: 'GB', name: 'United Kingdom' }];
      mockAdapter.getSupportedCountries.mockResolvedValue(countries);

      const ctx = createMockContext({ params: {} });
      const result = await getInternationalBillPayCountries(ctx);

      expect(result.data).toEqual(countries);
    });
  });
});
