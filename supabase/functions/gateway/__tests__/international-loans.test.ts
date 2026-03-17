/**
 * International Loans Handler Tests
 *
 * Tests for global loan applications, credit assessments,
 * and compliance checks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GatewayContext } from '../core.ts';

// ---------------------------------------------------------------------------
// Mock resolveAdapter before importing handlers
// ---------------------------------------------------------------------------
const { mockAdapter } = vi.hoisted(() => ({
  mockAdapter: {
    createApplication: vi.fn(),
    getApplication: vi.fn(),
    listApplications: vi.fn(),
    getCreditAssessment: vi.fn(),
    getComplianceChecks: vi.fn(),
  },
}));

vi.mock('../../_shared/adapters/registry.ts', () => ({
  resolveAdapter: vi.fn().mockResolvedValue({ adapter: mockAdapter }),
}));

import {
  createInternationalLoanApplication,
  getInternationalLoanApplication,
  listInternationalLoanApplications,
  getInternationalCreditAssessment,
  getInternationalComplianceChecks,
} from '../handlers/international-loans.ts';

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

describe('international-loans handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Authentication
  // =========================================================================

  describe('authentication', () => {
    const handlers = [
      { name: 'createInternationalLoanApplication', fn: createInternationalLoanApplication },
      { name: 'getInternationalLoanApplication', fn: getInternationalLoanApplication },
      { name: 'listInternationalLoanApplications', fn: listInternationalLoanApplications },
      { name: 'getInternationalCreditAssessment', fn: getInternationalCreditAssessment },
      { name: 'getInternationalComplianceChecks', fn: getInternationalComplianceChecks },
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
  // createInternationalLoanApplication
  // =========================================================================

  describe('createInternationalLoanApplication', () => {
    const validParams = {
      country: 'DE',
      currency: 'EUR',
      productType: 'personal',
      requestedAmountCents: 500000,
      applicant: { firstName: 'Hans', lastName: 'Mueller', email: 'hans@example.com' },
    };

    it('returns 400 when required fields are missing', async () => {
      const ctx = createMockContext({ params: { country: 'DE' } });
      const result = await createInternationalLoanApplication(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when applicant is missing', async () => {
      const ctx = createMockContext({
        params: { country: 'DE', currency: 'EUR', productType: 'personal', requestedAmountCents: 500000 },
      });
      const result = await createInternationalLoanApplication(ctx);
      expect(result.status).toBe(400);
    });

    it('creates loan application on valid request', async () => {
      const application = { id: 'app-1', status: 'pending_review' };
      mockAdapter.createApplication.mockResolvedValue(application);

      const ctx = createMockContext({ params: validParams });
      const result = await createInternationalLoanApplication(ctx);

      expect(result.data).toEqual(application);
      expect(mockAdapter.createApplication).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        tenantId: 'firm-456',
        country: 'DE',
        currency: 'EUR',
      }));
    });
  });

  // =========================================================================
  // getInternationalLoanApplication
  // =========================================================================

  describe('getInternationalLoanApplication', () => {
    it('returns 400 when applicationId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInternationalLoanApplication(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns application details on valid request', async () => {
      const application = { id: 'app-1', status: 'approved', country: 'DE' };
      mockAdapter.getApplication.mockResolvedValue(application);

      const ctx = createMockContext({ params: { applicationId: 'app-1' } });
      const result = await getInternationalLoanApplication(ctx);

      expect(result.data).toEqual(application);
    });
  });

  // =========================================================================
  // listInternationalLoanApplications
  // =========================================================================

  describe('listInternationalLoanApplications', () => {
    it('returns paginated list of applications', async () => {
      const applications = [{ id: 'app-1' }, { id: 'app-2' }];
      mockAdapter.listApplications.mockResolvedValue({ applications, total: 2 });

      const ctx = createMockContext({ params: { limit: 20, offset: 0 } });
      const result = await listInternationalLoanApplications(ctx);

      expect(result.data).toEqual(applications);
      expect(result.meta?.pagination).toEqual({ total: 2, limit: 20, offset: 0, hasMore: false });
    });

    it('filters by country and status', async () => {
      mockAdapter.listApplications.mockResolvedValue({ applications: [], total: 0 });

      const ctx = createMockContext({ params: { country: 'FR', status: 'approved' } });
      await listInternationalLoanApplications(ctx);

      expect(mockAdapter.listApplications).toHaveBeenCalledWith(expect.objectContaining({
        country: 'FR',
        status: 'approved',
      }));
    });
  });

  // =========================================================================
  // getInternationalCreditAssessment
  // =========================================================================

  describe('getInternationalCreditAssessment', () => {
    it('returns 400 when applicationId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInternationalCreditAssessment(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns credit assessment on valid request', async () => {
      const assessment = { score: 720, recommendation: 'approve' };
      mockAdapter.getCreditAssessment.mockResolvedValue(assessment);

      const ctx = createMockContext({ params: { applicationId: 'app-1' } });
      const result = await getInternationalCreditAssessment(ctx);

      expect(result.data).toEqual(assessment);
    });
  });

  // =========================================================================
  // getInternationalComplianceChecks
  // =========================================================================

  describe('getInternationalComplianceChecks', () => {
    it('returns 400 when applicationId is missing', async () => {
      const ctx = createMockContext({ params: {} });
      const result = await getInternationalComplianceChecks(ctx);
      expect(result.status).toBe(400);
      expect(result.error?.code).toBe('VALIDATION_ERROR');
    });

    it('returns compliance checks on valid request', async () => {
      const checks = { aml: 'pass', kyc: 'pass', sanctions: 'clear' };
      mockAdapter.getComplianceChecks.mockResolvedValue(checks);

      const ctx = createMockContext({ params: { applicationId: 'app-1' } });
      const result = await getInternationalComplianceChecks(ctx);

      expect(result.data).toEqual(checks);
    });
  });
});
