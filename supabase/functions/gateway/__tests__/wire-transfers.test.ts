/**
 * Wire Transfers Handler Tests
 *
 * Tests for domestic and international wire transfers, cancellation,
 * fee schedules, and transfer limits. This handler uses ctx.db directly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

import {
  createDomesticWire,
  createInternationalWire,
  listWires,
  getWire,
  cancelWire,
  getWireFees,
  getWireLimits,
} from '../handlers/wire-transfers.ts';

// ---------------------------------------------------------------------------
// DB mock helpers
// ---------------------------------------------------------------------------

/** Creates a chainable mock that mimics the Supabase query builder */
function createQueryBuilder(resolvedValue: { data?: unknown; error?: unknown; count?: number } = { data: null }) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['from', 'select', 'insert', 'update', 'eq', 'gte', 'lte', 'not', 'limit', 'order', 'range'];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.single = vi.fn().mockResolvedValue(resolvedValue);

  // For queries that don't end in .single() (e.g., listWires uses await query directly)
  // We make the builder itself thenable
  (builder as Record<string, unknown>).then = (resolve: (value: unknown) => void) => {
    resolve(resolvedValue);
  };

  return builder;
}

function createMockDb() {
  const queryResults = new Map<string, { data?: unknown; error?: unknown; count?: number }>();
  const callLog: { table: string }[] = [];

  const db = {
    from: vi.fn((table: string) => {
      callLog.push({ table });
      const result = queryResults.get(table) ?? { data: null };
      return createQueryBuilder(result);
    }),
    _setResult: (table: string, result: { data?: unknown; error?: unknown; count?: number }) => {
      queryResults.set(table, result);
    },
    _callLog: callLog,
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

describe('wire-transfers handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'createDomesticWire', fn: createDomesticWire },
      { name: 'createInternationalWire', fn: createInternationalWire },
      { name: 'listWires', fn: listWires },
      { name: 'getWire', fn: getWire },
      { name: 'cancelWire', fn: cancelWire },
      { name: 'getWireFees', fn: getWireFees },
      { name: 'getWireLimits', fn: getWireLimits },
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
  // createDomesticWire — input validation
  // =========================================================================

  describe('createDomesticWire', () => {
    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { fromAccountId: 'acct-1' } });
      const result = await createDomesticWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when routing number is invalid', async () => {
      const ctx = createMockContext({
        params: {
          fromAccountId: 'acct-1',
          beneficiaryName: 'Jane Doe',
          bankName: 'Wells Fargo',
          routingNumber: '12345', // invalid — not 9 digits
          accountNumber: '9876543210',
          amountCents: 10000,
          purpose: 'invoice payment',
        },
      });
      const result = await createDomesticWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('9 digits');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({
        params: {
          fromAccountId: 'acct-1',
          beneficiaryName: 'Jane Doe',
          bankName: 'Wells Fargo',
          routingNumber: '123456789',
          accountNumber: '9876543210',
          amountCents: -100,
          purpose: 'invoice payment',
        },
      });
      const result = await createDomesticWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });
  });

  // =========================================================================
  // createInternationalWire — input validation
  // =========================================================================

  describe('createInternationalWire', () => {
    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { fromAccountId: 'acct-1' } });
      const result = await createInternationalWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when SWIFT code is invalid', async () => {
      const ctx = createMockContext({
        params: {
          fromAccountId: 'acct-1',
          beneficiaryName: 'Hans Mueller',
          swiftCode: 'INVALID', // not valid format
          iban: 'DE89370400440532013000',
          bankName: 'Deutsche Bank',
          bankCountry: 'DE',
          amountCents: 50000,
          currency: 'EUR',
          purpose: 'consulting fee',
        },
      });
      const result = await createInternationalWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('SWIFT');
    });

    it('returns 400 when amountCents is not positive', async () => {
      const ctx = createMockContext({
        params: {
          fromAccountId: 'acct-1',
          beneficiaryName: 'Hans Mueller',
          swiftCode: 'DEUTDEFF',
          iban: 'DE89370400440532013000',
          bankName: 'Deutsche Bank',
          bankCountry: 'DE',
          amountCents: -1,
          currency: 'EUR',
          purpose: 'consulting fee',
        },
      });
      const result = await createInternationalWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });
  });

  // =========================================================================
  // getWire — input validation
  // =========================================================================

  describe('getWire', () => {
    it('returns 400 when id is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // cancelWire — input validation
  // =========================================================================

  describe('cancelWire', () => {
    it('returns 400 when id is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await cancelWire(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // getWireFees — happy path
  // =========================================================================

  describe('getWireFees', () => {
    it('returns default fees when no fee config exists', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getWireFees(ctx);

      expect(result.data).toBeDefined();
      const fees = (result.data as Record<string, unknown>).fees as Record<string, number>;
      expect(fees.domesticFeeCents).toBe(2500);
      expect(fees.internationalFeeCents).toBe(4500);
    });
  });

  // =========================================================================
  // getWireLimits — happy path
  // =========================================================================

  describe('getWireLimits', () => {
    it('returns default limits and zero usage when no wires today', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getWireLimits(ctx);

      expect(result.data).toBeDefined();
      const limits = (result.data as Record<string, unknown>).limits as Record<string, number>;
      expect(limits.dailyLimitCents).toBe(50000000);
      expect(limits.perTransactionLimitCents).toBe(25000000);
      expect(limits.usedTodayCents).toBe(0);
      expect(limits.remainingDailyCents).toBe(50000000);
    });
  });
});
