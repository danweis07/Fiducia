/**
 * Global Compliance Handler Tests
 *
 * Tests for GDPR/LGPD data portability, loan cooling-off periods,
 * interest withholding, and data residency.
 * These handlers use ctx.db directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter — returns a core banking adapter with interest txns
// ---------------------------------------------------------------------------
const { mockCoreBankingAdapter } = vi.hoisted(() => ({
  mockCoreBankingAdapter: {
    listTransactions: vi.fn().mockResolvedValue({
      transactions: [
        { transactionId: 'txn-1', amountCents: 5000, type: 'interest', postedAt: '2025-03-15T00:00:00Z', createdAt: '2025-03-15T00:00:00Z' },
        { transactionId: 'txn-2', amountCents: 4500, type: 'interest', postedAt: '2025-06-15T00:00:00Z', createdAt: '2025-06-15T00:00:00Z' },
        { transactionId: 'txn-3', amountCents: 3000, type: 'interest', postedAt: '2025-09-15T00:00:00Z', createdAt: '2025-09-15T00:00:00Z' },
        { transactionId: 'txn-4', amountCents: 2500, type: 'interest', postedAt: '2025-12-15T00:00:00Z', createdAt: '2025-12-15T00:00:00Z' },
      ],
      total: 4,
    }),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockCoreBankingAdapter }),
}));

import {
  requestDataPortability,
  getDataResidency,
  getLoanCoolingOff,
  exerciseLoanWithdrawal,
  getInterestWithholding,
} from '../handlers/global-compliance.ts';

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

function createQueryBuilder(resolvedValue: { data?: unknown; error?: unknown; count?: number } = { data: null }) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['from', 'select', 'insert', 'update', 'eq', 'gte', 'lte', 'not', 'limit', 'order', 'range'];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);

  (builder as Record<string, unknown>).then = (resolve: (value: unknown) => void) => {
    resolve(resolvedValue);
  };

  return builder;
}

/**
 * Creates a mock db where different tables can return different results.
 * Use _setResult(table, result) to configure per-table responses.
 * Use _setResultSequence(table, results) for tables queried multiple times.
 */
function createMockDb() {
  const queryResults = new Map<string, { data?: unknown; error?: unknown; count?: number }>();
  const querySequences = new Map<string, { data?: unknown; error?: unknown; count?: number }[]>();
  const callCounts = new Map<string, number>();

  const db = {
    from: vi.fn((table: string) => {
      const count = (callCounts.get(table) ?? 0);
      callCounts.set(table, count + 1);

      const seq = querySequences.get(table);
      if (seq && seq.length > count) {
        return createQueryBuilder(seq[count]);
      }

      const result = queryResults.get(table) ?? { data: null };
      return createQueryBuilder(result);
    }),
    _setResult: (table: string, result: { data?: unknown; error?: unknown; count?: number }) => {
      queryResults.set(table, result);
    },
    _setResultSequence: (table: string, results: { data?: unknown; error?: unknown; count?: number }[]) => {
      querySequences.set(table, results);
    },
  };

  return db;
}

// ---------------------------------------------------------------------------
// Context factory
// ---------------------------------------------------------------------------

function createMockContext(overrides: Partial<GatewayContext> = {}): GatewayContext {
  return {
    supabase: {} as GatewayContext['supabase'],
    db: createMockDb() as unknown as GatewayContext['db'],
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

describe('global-compliance handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'requestDataPortability', fn: requestDataPortability },
      { name: 'getDataResidency', fn: getDataResidency },
      { name: 'getLoanCoolingOff', fn: getLoanCoolingOff },
      { name: 'exerciseLoanWithdrawal', fn: exerciseLoanWithdrawal },
      { name: 'getInterestWithholding', fn: getInterestWithholding },
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
  // requestDataPortability
  // =========================================================================

  describe('requestDataPortability', () => {
    it('returns 400 when format is invalid', async () => {
      const ctx = createMockContext({ params: { format: 'pdf' } });
      const result = await requestDataPortability(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
      expect(result.error?.message).toContain('json');
    });

    it('returns data export with default json format', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await requestDataPortability(ctx);

      expect(result.data).toBeDefined();
      const data = result.data as Record<string, unknown>;
      expect(data.format).toBe('json');
      expect(data.export).toBeDefined();
      const exportData = data.export as Record<string, unknown>;
      expect(exportData.exportMetadata).toBeDefined();
      const metadata = exportData.exportMetadata as Record<string, unknown>;
      expect(metadata.userId).toBe('user-123');
      expect(metadata.tenantId).toBe('firm-456');
      expect(metadata.regulation).toContain('GDPR');
    });

    it('accepts valid formats: json, xml, csv', async () => {
      for (const format of ['json', 'xml', 'csv']) {
        const ctx = createMockContext({ params: { format } });
        const result = await requestDataPortability(ctx);
        expect(result.status).toBeUndefined(); // no error status
        const data = result.data as Record<string, unknown>;
        expect(data.format).toBe(format);
      }
    });
  });

  // =========================================================================
  // getDataResidency
  // =========================================================================

  describe('getDataResidency', () => {
    it('returns 404 when tenant not found', async () => {
      const db = createMockDb();
      db._setResult('firms', { data: null });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'] });

      const result = await getDataResidency(ctx);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('returns data residency info for EU tenant', async () => {
      const db = createMockDb();
      db._setResult('firms', { data: { id: 'firm-456', data_residency_region: 'eu-west-1', country_code: 'DE' } });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'] });

      const result = await getDataResidency(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.dataResidencyRegion).toBe('eu-west-1');
      expect(data.countryCode).toBe('DE');
      expect((data.regulations as string[])).toContain('GDPR');
      expect((data.regulations as string[])).toContain('PSD2');
    });

    it('returns data residency info for US tenant with defaults', async () => {
      const db = createMockDb();
      db._setResult('firms', { data: { id: 'firm-456' } });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'] });

      const result = await getDataResidency(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.dataResidencyRegion).toBe('us-east-1');
      expect(data.countryCode).toBe('US');
      expect((data.regulations as string[])).toContain('CCPA');
    });
  });

  // =========================================================================
  // getLoanCoolingOff
  // =========================================================================

  describe('getLoanCoolingOff', () => {
    it('returns 400 when loanId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getLoanCoolingOff(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when loan not found', async () => {
      const db = createMockDb();
      db._setResult('banking_loans', { data: null });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await getLoanCoolingOff(ctx);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('returns not applicable for non-EU jurisdictions', async () => {
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'active', funded_at: '2026-03-01T00:00:00Z', jurisdiction: 'US', amount_cents: 500000, currency: 'USD' },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await getLoanCoolingOff(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.coolingOffApplicable).toBe(false);
    });

    it('returns active cooling-off for recently funded EU loan', async () => {
      const recentFundedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'active', funded_at: recentFundedAt, jurisdiction: 'DE', amount_cents: 500000, currency: 'EUR' },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await getLoanCoolingOff(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.coolingOffApplicable).toBe(true);
      expect(data.coolingOffDays).toBe(14);
      expect(data.isActive).toBe(true);
      expect(data.canWithdraw).toBe(true);
      expect((data.daysRemaining as number)).toBeGreaterThan(0);
    });

    it('returns expired cooling-off for old EU loan', async () => {
      const oldFundedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'active', funded_at: oldFundedAt, jurisdiction: 'GB', amount_cents: 100000, currency: 'GBP' },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await getLoanCoolingOff(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.coolingOffApplicable).toBe(true);
      expect(data.isActive).toBe(false);
      expect(data.daysRemaining).toBe(0);
    });
  });

  // =========================================================================
  // exerciseLoanWithdrawal
  // =========================================================================

  describe('exerciseLoanWithdrawal', () => {
    it('returns 400 when loanId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await exerciseLoanWithdrawal(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when loan not found', async () => {
      const db = createMockDb();
      db._setResult('banking_loans', { data: null });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await exerciseLoanWithdrawal(ctx);
      expect(result.status).toBe(404);
    });

    it('returns 409 when loan is already withdrawn', async () => {
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'withdrawn', funded_at: '2026-03-01T00:00:00Z', jurisdiction: 'DE', amount_cents: 500000 },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await exerciseLoanWithdrawal(ctx);
      expect(result.status).toBe(409);
      expect(result.error?.code).toBe('ALREADY_WITHDRAWN');
    });

    it('returns 409 when loan is not yet funded', async () => {
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'approved', funded_at: null, jurisdiction: 'DE', amount_cents: 500000 },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await exerciseLoanWithdrawal(ctx);
      expect(result.status).toBe(409);
      expect(result.error?.code).toBe('NOT_FUNDED');
    });

    it('returns 409 when cooling-off period has expired', async () => {
      const oldFundedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const db = createMockDb();
      db._setResult('banking_loans', {
        data: { id: 'loan-1', status: 'active', funded_at: oldFundedAt, jurisdiction: 'DE', amount_cents: 500000 },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { loanId: 'loan-1' } });

      const result = await exerciseLoanWithdrawal(ctx);
      expect(result.status).toBe(409);
      expect(result.error?.code).toBe('COOLING_OFF_EXPIRED');
    });
  });

  // =========================================================================
  // getInterestWithholding
  // =========================================================================

  describe('getInterestWithholding', () => {
    it('returns 400 when accountId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInterestWithholding(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when account not found', async () => {
      const db = createMockDb();
      db._setResult('banking_accounts', { data: null });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { accountId: 'acct-1' } });

      const result = await getInterestWithholding(ctx);
      expect(result.status).toBe(404);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('returns withholding data for German account', async () => {
      const db = createMockDb();
      db._setResult('banking_accounts', {
        data: { id: 'acct-1', type: 'savings', status: 'active', jurisdiction: 'DE', currency: 'EUR' },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { accountId: 'acct-1', taxYear: '2025' } });

      const result = await getInterestWithholding(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.accountId).toBe('acct-1');
      expect(data.taxYear).toBe('2025');
      expect(data.jurisdiction).toBe('DE');
      expect(data.withholdingRateBps).toBe(2637);
      expect(data.regulation).toContain('Abgeltungssteuer');
      expect(data.grossInterestCents).toBeGreaterThan(0);
      expect((data.taxWithheldCents as number)).toBeGreaterThan(0);
      expect(data.breakdown).toBeDefined();
      expect((data.breakdown as unknown[]).length).toBe(4);
    });

    it('returns zero withholding for US account', async () => {
      const db = createMockDb();
      db._setResult('banking_accounts', {
        data: { id: 'acct-1', type: 'savings', status: 'active', jurisdiction: 'US', currency: 'USD' },
      });
      const ctx = createMockContext({ db: db as unknown as GatewayContext['db'], params: { accountId: 'acct-1' } });

      const result = await getInterestWithholding(ctx);
      const data = result.data as Record<string, unknown>;
      expect(data.withholdingRateBps).toBe(0);
      expect(data.taxWithheldCents).toBe(0);
      expect(data.regulation).toContain('1099-INT');
    });
  });
});
