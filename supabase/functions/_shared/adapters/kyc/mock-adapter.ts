/**
 * Mock KYC Adapter
 *
 * Deterministic identity verification for development and testing.
 *
 * Decision rules:
 * - First name starting with "DENY" → denied
 * - First name starting with "REVIEW" → manual_review
 * - All others → approved (with 1 second simulated delay)
 *
 * IMPORTANT: Even in mock mode, SSN must never appear in responses or logs.
 */

import type {
  KYCAdapter,
  KYCApplicant,
  KYCResult,
  KYCStatus,
  KYCRefreshResult,
  KYCRefreshConfig,
} from './types.ts';
import { maskSSN } from './types.ts';

// =============================================================================
// IN-MEMORY STORE (for getEvaluation lookups in dev)
// =============================================================================

const evaluationStore = new Map<string, KYCResult>();

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class MockKYCAdapter implements KYCAdapter {
  readonly name = 'mock';

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    // Simulate network latency (1 second)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const token = `mock_eval_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const { status, reasons } = this.decide(applicant);

    // Log WITHOUT PII — only masked SSN last-4 for traceability
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'mock-kyc',
      action: 'createEvaluation',
      token,
      status,
      ssnLast4: maskSSN(applicant.ssn),
      timestamp: now,
    }));

    const result: KYCResult = {
      token,
      status,
      reasons,
      createdAt: now,
      updatedAt: now,
    };

    // Store for later retrieval
    evaluationStore.set(token, result);

    return result;
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = evaluationStore.get(evaluationToken);
    if (!stored) {
      throw new Error(`Evaluation not found: ${evaluationToken}`);
    }

    return stored;
  }

  // ---------------------------------------------------------------------------
  // PERPETUAL KYC
  // ---------------------------------------------------------------------------

  async refreshEvaluation(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<KYCRefreshResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const stored = evaluationStore.get(evaluationToken);
    if (!stored) {
      throw new Error(`Evaluation not found: ${evaluationToken}`);
    }

    const now = new Date();
    const nextRefreshMs = config.intervalHours * 60 * 60 * 1000;
    const riskScore = stored.status === 'approved' ? 15 : stored.status === 'denied' ? 85 : 50;

    return {
      refreshId: `mock_refresh_${crypto.randomUUID()}`,
      evaluationToken,
      trigger: config.triggers[0] ?? 'scheduled',
      status: stored.status,
      changes: [],
      riskScore,
      refreshedAt: now.toISOString(),
      nextRefreshAt: new Date(now.getTime() + nextRefreshMs).toISOString(),
    };
  }

  async configureRefresh(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<{ configured: boolean; nextRefreshAt: string }> {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const stored = evaluationStore.get(evaluationToken);
    if (!stored) {
      throw new Error(`Evaluation not found: ${evaluationToken}`);
    }

    const now = new Date();
    const nextRefreshMs = config.intervalHours * 60 * 60 * 1000;

    return {
      configured: true,
      nextRefreshAt: new Date(now.getTime() + nextRefreshMs).toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // DECISION LOGIC
  // ---------------------------------------------------------------------------

  private decide(applicant: KYCApplicant): { status: KYCStatus; reasons: string[] } {
    const firstName = applicant.firstName.toUpperCase();

    if (firstName.startsWith('DENY')) {
      return {
        status: 'denied',
        reasons: [
          'Identity could not be verified',
          'Address mismatch detected',
          'OFAC watchlist potential match',
        ],
      };
    }

    if (firstName.startsWith('REVIEW')) {
      return {
        status: 'manual_review',
        reasons: [
          'Partial identity match — additional documentation required',
          'Unable to verify address automatically',
        ],
      };
    }

    return {
      status: 'approved',
      reasons: ['Identity verified successfully'],
    };
  }
}
