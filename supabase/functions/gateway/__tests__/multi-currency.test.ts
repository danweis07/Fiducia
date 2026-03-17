/**
 * Multi-Currency & Regulatory Transparency Handler Tests
 *
 * Tests for currency pots, vIBAN management, FX swaps,
 * safeguarding, tax withholding, and carbon tracking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock the MockMultiCurrencyAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    listPots: vi.fn(),
    createPot: vi.fn(),
    getPot: vi.fn(),
    closePot: vi.fn(),
    generateVIBAN: vi.fn(),
    getSwapQuote: vi.fn(),
    executeSwap: vi.fn(),
    listSwaps: vi.fn(),
    getSafeguarding: vi.fn(),
    listWithholding: vi.fn(),
    getCarbonFootprint: vi.fn(),
    getCarbonSummary: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  listCurrencyPots,
  createCurrencyPot,
  getCurrencyPot,
  closeCurrencyPot,
  generateVIBAN,
  getSwapQuote,
  executeSwap,
  listSwaps,
  getSafeguardingInfo,
  listInterestWithholding,
  getCarbonFootprint,
  getCarbonSummary,
} from '../handlers/multi-currency.ts';

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

describe('multi-currency handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'listCurrencyPots', fn: listCurrencyPots },
      { name: 'createCurrencyPot', fn: createCurrencyPot },
      { name: 'getCurrencyPot', fn: getCurrencyPot },
      { name: 'closeCurrencyPot', fn: closeCurrencyPot },
      { name: 'generateVIBAN', fn: generateVIBAN },
      { name: 'getSwapQuote', fn: getSwapQuote },
      { name: 'executeSwap', fn: executeSwap },
      { name: 'listSwaps', fn: listSwaps },
      { name: 'getSafeguardingInfo', fn: getSafeguardingInfo },
      { name: 'listInterestWithholding', fn: listInterestWithholding },
      { name: 'getCarbonFootprint', fn: getCarbonFootprint },
      { name: 'getCarbonSummary', fn: getCarbonSummary },
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
  // Currency Pots
  // =========================================================================

  describe('listCurrencyPots', () => {
    it('returns list of pots from adapter', async () => {
      const pots = [{ id: 'pot-1', currency: 'EUR' }];
      mockAdapter.listPots.mockResolvedValue(pots);

      const ctx = createMockContext({ params: { status: 'active' } });
      const result = await listCurrencyPots(ctx);

      expect(result.data).toEqual(pots);
    });
  });

  describe('createCurrencyPot', () => {
    it('returns 400 when currency is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await createCurrencyPot(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('creates pot on valid request', async () => {
      const pot = { id: 'pot-1', currency: 'GBP', balanceCents: 0 };
      mockAdapter.createPot.mockResolvedValue(pot);

      const ctx = createMockContext({ params: { currency: 'GBP' } });
      const result = await createCurrencyPot(ctx);

      expect(result.data).toEqual(pot);
    });
  });

  describe('getCurrencyPot', () => {
    it('returns 400 when potId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getCurrencyPot(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns pot details on valid request', async () => {
      const pot = { id: 'pot-1', currency: 'EUR', balanceCents: 100000 };
      mockAdapter.getPot.mockResolvedValue(pot);

      const ctx = createMockContext({ params: { potId: 'pot-1' } });
      const result = await getCurrencyPot(ctx);

      expect(result.data).toEqual(pot);
    });
  });

  describe('closeCurrencyPot', () => {
    it('returns 400 when potId or transferToPotId is missing', async () => {
      const ctx = createMockContext({ params: { potId: 'pot-1' } });
      const result = await closeCurrencyPot(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('closes pot on valid request', async () => {
      const closeResult = { success: true, transferredAmountCents: 50000 };
      mockAdapter.closePot.mockResolvedValue(closeResult);

      const ctx = createMockContext({ params: { potId: 'pot-1', transferToPotId: 'pot-2' } });
      const result = await closeCurrencyPot(ctx);

      expect(result.data).toEqual(closeResult);
    });
  });

  // =========================================================================
  // vIBANs
  // =========================================================================

  describe('generateVIBAN', () => {
    it('returns 400 when potId or country is missing', async () => {
      const ctx = createMockContext({ params: { potId: 'pot-1' } });
      const result = await generateVIBAN(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('generates vIBAN on valid request', async () => {
      const viban = { iban: 'DE89370400440532013000', bic: 'COBADEFFXXX' };
      mockAdapter.generateVIBAN.mockResolvedValue(viban);

      const ctx = createMockContext({ params: { potId: 'pot-1', country: 'DE' } });
      const result = await generateVIBAN(ctx);

      expect(result.data).toEqual(viban);
    });
  });

  // =========================================================================
  // FX Swaps
  // =========================================================================

  describe('getSwapQuote', () => {
    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { fromPotId: 'pot-1' } });
      const result = await getSwapQuote(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns swap quote on valid request', async () => {
      const quote = { quoteId: 'sq-1', rate: 0.85, fromAmountCents: 10000, toAmountCents: 8500 };
      mockAdapter.getSwapQuote.mockResolvedValue(quote);

      const ctx = createMockContext({ params: { fromPotId: 'pot-1', toPotId: 'pot-2', fromAmountCents: 10000 } });
      const result = await getSwapQuote(ctx);

      expect(result.data).toEqual(quote);
    });
  });

  describe('executeSwap', () => {
    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { fromPotId: 'pot-1' } });
      const result = await executeSwap(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('executes swap on valid request', async () => {
      const swap = { swapId: 'sw-1', status: 'completed' };
      mockAdapter.executeSwap.mockResolvedValue(swap);

      const ctx = createMockContext({
        params: { quoteId: 'sq-1', fromPotId: 'pot-1', toPotId: 'pot-2', fromAmountCents: 10000, idempotencyKey: 'idem-1' },
      });
      const result = await executeSwap(ctx);

      expect(result.data).toEqual(swap);
    });
  });

  describe('listSwaps', () => {
    it('returns list of swaps', async () => {
      const swaps = { swaps: [{ id: 'sw-1' }], cursor: null };
      mockAdapter.listSwaps.mockResolvedValue(swaps);

      const ctx = createMockContext({ params: { potId: 'pot-1', limit: 10 } });
      const result = await listSwaps(ctx);

      expect(result.data).toEqual(swaps);
    });
  });

  // =========================================================================
  // Regulatory Transparency
  // =========================================================================

  describe('getSafeguardingInfo', () => {
    it('returns safeguarding info', async () => {
      const info = { institution: 'Barclays', segregatedFunds: true };
      mockAdapter.getSafeguarding.mockResolvedValue(info);

      const ctx = createMockContext({ params: { country: 'GB' } });
      const result = await getSafeguardingInfo(ctx);

      expect(result.data).toEqual(info);
    });
  });

  describe('listInterestWithholding', () => {
    it('returns withholding info', async () => {
      const withholding = [{ year: 2025, withheldCents: 500 }];
      mockAdapter.listWithholding.mockResolvedValue(withholding);

      const ctx = createMockContext({ params: { accountId: 'acct-1', year: 2025 } });
      const result = await listInterestWithholding(ctx);

      expect(result.data).toEqual(withholding);
    });
  });

  describe('getCarbonFootprint', () => {
    it('returns 400 when transactionId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getCarbonFootprint(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns carbon footprint on valid request', async () => {
      const footprint = { co2Grams: 120, category: 'transport' };
      mockAdapter.getCarbonFootprint.mockResolvedValue(footprint);

      const ctx = createMockContext({ params: { transactionId: 'txn-1' } });
      const result = await getCarbonFootprint(ctx);

      expect(result.data).toEqual(footprint);
    });
  });

  describe('getCarbonSummary', () => {
    it('returns 400 when periodStart or periodEnd is missing', async () => {
      const ctx = createMockContext({ params: { periodStart: '2026-01-01' } });
      const result = await getCarbonSummary(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('returns carbon summary on valid request', async () => {
      const summary = { totalCo2Grams: 5000, categories: [{ name: 'transport', co2Grams: 3000 }] };
      mockAdapter.getCarbonSummary.mockResolvedValue(summary);

      const ctx = createMockContext({ params: { periodStart: '2026-01-01', periodEnd: '2026-03-31' } });
      const result = await getCarbonSummary(ctx);

      expect(result.data).toEqual(summary);
    });
  });
});
