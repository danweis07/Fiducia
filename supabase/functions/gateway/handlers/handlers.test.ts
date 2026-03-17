/**
 * Gateway Handler Unit Tests
 *
 * Tests handler functions directly with mocked GatewayContext.
 * Covers auth guards, input validation, database interactions, and error paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno for Node test runner
vi.stubGlobal('Deno', { env: { get: () => undefined } });

// ---------------------------------------------------------------------------
// Mock database builder (fluent query API)
// ---------------------------------------------------------------------------

type MockQueryResult = { data: unknown; error: unknown; count?: number };

function createMockDb(overrides: Record<string, MockQueryResult> = {}) {
  const defaultResult: MockQueryResult = { data: null, error: null };

  const chainMethods = () => {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'not', 'in', 'order', 'limit', 'range', 'single', 'maybeSingle'];

    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }

    // Terminal methods return the result
    chain.then = vi.fn().mockImplementation((cb) => cb(defaultResult));

    // Make the chain itself thenable (for await)
    const thenable = Object.assign(
      Promise.resolve(defaultResult),
      chain,
    );

    for (const m of methods) {
      thenable[m] = vi.fn().mockReturnValue(thenable);
    }

    return thenable;
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      const result = overrides[table] ?? defaultResult;
      const chain = chainMethods();

      // Override the promise resolution with table-specific data
      const tableChain = Object.assign(
        Promise.resolve(result),
        chain,
      );

      const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'not', 'in', 'order', 'limit', 'range', 'single', 'maybeSingle'];
      for (const m of methods) {
        tableChain[m] = vi.fn().mockReturnValue(tableChain);
      }

      return tableChain;
    }),
    rpc: vi.fn().mockResolvedValue(defaultResult),
  };
}

function createMockCtx(params: Record<string, unknown> = {}, dbOverrides: Record<string, MockQueryResult> = {}) {
  const db = createMockDb(dbOverrides);
  return {
    ctx: {
      supabase: db,
      db,
      deps: {},
      params,
      userId: 'user-123',
      firmId: 'firm-456',
      locale: 'en' as const,
    },
    db,
  };
}

function createUnauthCtx(params: Record<string, unknown> = {}) {
  const db = createMockDb();
  return {
    ctx: {
      supabase: db,
      db,
      deps: {},
      params,
      userId: undefined,
      firmId: undefined,
      locale: 'en' as const,
    },
    db,
  };
}

// ---------------------------------------------------------------------------
// Global Compliance Handler Tests
// ---------------------------------------------------------------------------

describe('Global Compliance Handlers', () => {
  let handlers: typeof import('./global-compliance.ts');

  beforeEach(async () => {
    vi.resetModules();
    handlers = await import('./global-compliance.ts');
  });

  describe('requestDataPortability', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.requestDataPortability(ctx as never);
      expect(result.status).toBe(401);
      expect(result.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid export format', async () => {
      const { ctx } = createMockCtx({ format: 'pdf' });
      const result = await handlers.requestDataPortability(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('accepts valid export formats', async () => {
      for (const format of ['json', 'xml', 'csv']) {
        const { ctx } = createMockCtx({ format });
        const result = await handlers.requestDataPortability(ctx as never);
        expect(result.status).toBeUndefined(); // No error status = success
        expect(result.data).toBeDefined();
      }
    });

    it('defaults to json format', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.requestDataPortability(ctx as never);
      expect((result.data as Record<string, unknown>).format).toBe('json');
    });
  });

  describe('getDataResidency', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getDataResidency(ctx as never);
      expect(result.status).toBe(401);
    });

    it('returns 404 when tenant not found', async () => {
      const { ctx } = createMockCtx({});
      // db.from('firms') returns null data by default
      const result = await handlers.getDataResidency(ctx as never);
      expect(result.status).toBe(404);
    });
  });

  describe('getLoanCoolingOff', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getLoanCoolingOff(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires loanId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getLoanCoolingOff(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for nonexistent loan', async () => {
      const { ctx } = createMockCtx({ loanId: 'loan-999' });
      const result = await handlers.getLoanCoolingOff(ctx as never);
      expect(result.status).toBe(404);
    });
  });

  describe('exerciseLoanWithdrawal', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.exerciseLoanWithdrawal(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires loanId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.exerciseLoanWithdrawal(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('getInterestWithholding', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getInterestWithholding(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires accountId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getInterestWithholding(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 for nonexistent account', async () => {
      const { ctx } = createMockCtx({ accountId: 'acct-999' });
      const result = await handlers.getInterestWithholding(ctx as never);
      expect(result.status).toBe(404);
    });
  });
});

// ---------------------------------------------------------------------------
// Open Banking Handler Tests
// ---------------------------------------------------------------------------

describe('Open Banking Handlers', () => {
  let handlers: typeof import('./open-banking.ts');

  beforeEach(async () => {
    vi.resetModules();
    handlers = await import('./open-banking.ts');
  });

  describe('listConsents', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.listConsents(ctx as never);
      expect(result.status).toBe(401);
    });
  });

  describe('getConsent', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getConsent(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires consentId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getConsent(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });
  });

  describe('grantConsent', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.grantConsent(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires providerName, providerId, and scopes', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.grantConsent(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('INVALID_PARAMS');
    });

    it('rejects empty scopes array', async () => {
      const { ctx } = createMockCtx({
        providerName: 'Test', providerId: 'test-1', scopes: [],
      });
      const result = await handlers.grantConsent(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('revokeConsent', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.revokeConsent(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires consentId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.revokeConsent(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('listAccessLogs', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.listAccessLogs(ctx as never);
      expect(result.status).toBe(401);
    });
  });

  describe('getConsentSummary', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getConsentSummary(ctx as never);
      expect(result.status).toBe(401);
    });
  });
});

// ---------------------------------------------------------------------------
// Instant Payments Handler Tests
// ---------------------------------------------------------------------------

describe('Instant Payments Handlers', () => {
  let handlers: typeof import('./instant-payments.ts');

  beforeEach(async () => {
    vi.resetModules();

    // Mock the adapter registry
    vi.doMock('../../_shared/adapters/registry.ts', () => ({
      resolveAdapter: vi.fn().mockResolvedValue({
        adapter: {
          sendPayment: vi.fn().mockResolvedValue({ paymentId: 'pay-1', status: 'accepted' }),
          getPayment: vi.fn().mockResolvedValue({ paymentId: 'pay-1', status: 'completed' }),
          listPayments: vi.fn().mockResolvedValue({ payments: [], total: 0, hasMore: false }),
          checkReceiver: vi.fn().mockResolvedValue({ eligible: true }),
          sendRequestForPayment: vi.fn().mockResolvedValue({ requestId: 'req-1' }),
        },
      }),
    }));

    handlers = await import('./instant-payments.ts');
  });

  describe('sendInstantPayment', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.sendInstantPayment(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.sendInstantPayment(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-positive amount', async () => {
      const { ctx } = createMockCtx({
        sourceAccountId: 'acc-1', receiverName: 'Bob',
        amountCents: -100, description: 'test', idempotencyKey: 'key-1',
      });
      const result = await handlers.sendInstantPayment(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.message).toContain('positive');
    });

    it('rejects zero amount', async () => {
      const { ctx } = createMockCtx({
        sourceAccountId: 'acc-1', receiverName: 'Bob',
        amountCents: 0, description: 'test', idempotencyKey: 'key-1',
      });
      const result = await handlers.sendInstantPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('getInstantPayment', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getInstantPayment(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires paymentId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getInstantPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('sendRequestForPayment', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.sendRequestForPayment(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.sendRequestForPayment(ctx as never);
      expect(result.status).toBe(400);
    });

    it('rejects non-positive amount', async () => {
      const { ctx } = createMockCtx({
        requesterAccountId: 'acc-1', payerRoutingNumber: '123456789',
        payerAccountNumber: '111222333', payerName: 'Alice',
        amountCents: -50, description: 'test', expiresAt: '2026-12-31',
      });
      const result = await handlers.sendRequestForPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// International Payments Handler Tests
// ---------------------------------------------------------------------------

describe('International Payments Handlers', () => {
  let handlers: typeof import('./international-payments.ts');

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock('../../_shared/adapters/registry.ts', () => ({
      resolveAdapter: vi.fn().mockResolvedValue({
        adapter: {
          getCoverage: vi.fn().mockResolvedValue({ countries: [] }),
          getFXQuote: vi.fn().mockResolvedValue({ quoteId: 'q1', rate: 1.25 }),
          createPayment: vi.fn().mockResolvedValue({ paymentId: 'ip-1', status: 'processing' }),
          getPayment: vi.fn().mockResolvedValue({ paymentId: 'ip-1' }),
          listPayments: vi.fn().mockResolvedValue({ payments: [], total: 0 }),
          issueGlobalCard: vi.fn().mockResolvedValue({ cardId: 'gc-1' }),
          listGlobalCards: vi.fn().mockResolvedValue({ cards: [], total: 0 }),
          createPayout: vi.fn().mockResolvedValue({ payoutId: 'po-1' }),
          listPayouts: vi.fn().mockResolvedValue({ payouts: [], total: 0 }),
        },
      }),
    }));

    handlers = await import('./international-payments.ts');
  });

  describe('createInternationalPayment', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.createInternationalPayment(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.createInternationalPayment(ctx as never);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-positive amount', async () => {
      const { ctx } = createMockCtx({
        fromAccountId: 'acc-1', fromCurrency: 'USD', toCurrency: 'EUR',
        amountCents: 0, beneficiaryName: 'Bob', beneficiaryCountry: 'DE',
        beneficiaryAccountNumber: 'DE89370400440532013000',
      });
      const result = await handlers.createInternationalPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('getFXQuote', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.getFXQuote(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires fromCurrency and toCurrency', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getFXQuote(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('getInternationalPayment', () => {
    it('requires paymentId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getInternationalPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('createInternationalPayout', () => {
    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.createInternationalPayout(ctx as never);
      expect(result.status).toBe(400);
    });

    it('rejects non-positive amount', async () => {
      const { ctx } = createMockCtx({
        destinationCountry: 'GB', destinationCurrency: 'GBP',
        amountCents: -100, recipientName: 'Alice', recipientAccountNumber: 'GB123',
      });
      const result = await handlers.createInternationalPayout(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('issueGlobalCard', () => {
    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.issueGlobalCard(ctx as never);
      expect(result.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// International Bill Pay Handler Tests
// ---------------------------------------------------------------------------

describe('International Bill Pay Handlers', () => {
  let handlers: typeof import('./international-bill-pay.ts');

  beforeEach(async () => {
    vi.resetModules();

    vi.doMock('../../_shared/adapters/registry.ts', () => ({
      resolveAdapter: vi.fn().mockResolvedValue({
        adapter: {
          searchBillers: vi.fn().mockResolvedValue({ billers: [] }),
          payBill: vi.fn().mockResolvedValue({ paymentId: 'bp-1', status: 'processing' }),
          getPayment: vi.fn().mockResolvedValue({ paymentId: 'bp-1' }),
          listPayments: vi.fn().mockResolvedValue({ payments: [], total: 0 }),
          getSupportedCountries: vi.fn().mockResolvedValue({ countries: [] }),
        },
      }),
    }));

    handlers = await import('./international-bill-pay.ts');
  });

  describe('searchInternationalBillers', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.searchInternationalBillers(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires query parameter', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.searchInternationalBillers(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('payInternationalBill', () => {
    it('returns 401 when unauthenticated', async () => {
      const { ctx } = createUnauthCtx();
      const result = await handlers.payInternationalBill(ctx as never);
      expect(result.status).toBe(401);
    });

    it('requires mandatory fields', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.payInternationalBill(ctx as never);
      expect(result.status).toBe(400);
    });

    it('rejects non-positive amount', async () => {
      const { ctx } = createMockCtx({
        billerId: 'b-1', fromAccountId: 'acc-1', fromCurrency: 'USD',
        amountCents: 0, accountReference: 'ref-1',
      });
      const result = await handlers.payInternationalBill(ctx as never);
      expect(result.status).toBe(400);
    });
  });

  describe('getInternationalBillPayment', () => {
    it('requires paymentId', async () => {
      const { ctx } = createMockCtx({});
      const result = await handlers.getInternationalBillPayment(ctx as never);
      expect(result.status).toBe(400);
    });
  });
});
