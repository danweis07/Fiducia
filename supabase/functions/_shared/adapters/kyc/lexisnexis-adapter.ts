// TODO: Provisional integration — not yet validated in production.
/**
 * LexisNexis Risk Solutions — KYC Identity Verification Adapter
 *
 * Integrates with LexisNexis Risk Solutions for identity verification and
 * perpetual KYC monitoring using the InstantID and Identity Manager APIs.
 *
 * LexisNexis docs: https://risk.lexisnexis.com/products/instantid
 * Auth: API key + secret via HTTP Basic
 *
 * Capabilities:
 * - Real-time identity verification (InstantID)
 * - Document verification
 * - Perpetual KYC with scheduled and event-driven refresh
 * - Risk scoring with CVI (Comprehensive Verification Index)
 *
 * IMPORTANT: SSN is sent to LexisNexis for verification but MUST NEVER
 * appear in logs, responses, or error messages.
 */

import type {
  KYCAdapter,
  KYCApplicant,
  KYCResult,
  KYCStatus,
  KYCRefreshResult,
  KYCRefreshConfig,
} from './types.ts';

// =============================================================================
// LEXISNEXIS API TYPES
// =============================================================================

interface LNInstantIDRequest {
  TransactionID: string;
  Person: {
    Name: {
      First: string;
      Middle?: string;
      Last: string;
    };
    SSN: string;
    DOB: { Year: string; Month: string; Day: string };
    Address: {
      StreetAddress1: string;
      StreetAddress2?: string;
      City: string;
      State: string;
      Zip5: string;
    };
    Phone: string;
    Email: string;
  };
  Options: {
    IncludeModels: boolean;
    CVICalculation: boolean;
  };
}

interface LNInstantIDResponse {
  TransactionID: string;
  Status: string;
  ComprehensiveVerificationIndex: number; // 0-60 scale
  RiskIndicators: Array<{
    Code: string;
    Description: string;
    Severity: 'High' | 'Medium' | 'Low';
  }>;
  VerificationResult: {
    NameMatch: boolean;
    AddressMatch: boolean;
    SSNMatch: boolean;
    DOBMatch: boolean;
    PhoneMatch: boolean;
  };
  CreatedAt: string;
  UpdatedAt: string;
}

interface LNRefreshResponse {
  TransactionID: string;
  RefreshID: string;
  Status: string;
  Changes: string[];
  CVIScore: number;
  NextRefreshDate: string | null;
  RefreshedAt: string;
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

/**
 * Map LexisNexis CVI score to KYC status.
 * CVI scale: 0 (no verification) to 60 (full verification)
 * - 40-60: Approved (strong identity match)
 * - 20-39: Pending review (partial match, may need docs)
 * - 10-19: Manual review (weak match)
 * - 0-9: Denied (no match / high risk)
 */
function mapCVIToStatus(cvi: number): KYCStatus {
  if (cvi >= 40) return 'approved';
  if (cvi >= 20) return 'pending_review';
  if (cvi >= 10) return 'manual_review';
  return 'denied';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class LexisNexisKYCAdapter implements KYCAdapter {
  readonly name = 'lexisnexis';

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    const apiKey = Deno.env.get('LEXISNEXIS_KYC_API_KEY');
    const secret = Deno.env.get('LEXISNEXIS_KYC_SECRET');

    if (!apiKey || !secret) {
      throw new Error(
        'LexisNexis KYC credentials missing: LEXISNEXIS_KYC_API_KEY and LEXISNEXIS_KYC_SECRET must be set'
      );
    }

    this.baseUrl = Deno.env.get('LEXISNEXIS_KYC_BASE_URL') ?? 'https://risk.lexisnexis.com/api/v1';
    this.authHeader = `Basic ${btoa(`${apiKey}:${secret}`)}`;
  }

  // ---------------------------------------------------------------------------
  // IDENTITY VERIFICATION
  // ---------------------------------------------------------------------------

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    const transactionId = `ln_kyc_${crypto.randomUUID()}`;
    const [year, month, day] = applicant.dateOfBirth.split('-');

    const body: LNInstantIDRequest = {
      TransactionID: transactionId,
      Person: {
        Name: {
          First: applicant.firstName,
          Last: applicant.lastName,
        },
        SSN: applicant.ssn.replace(/\D/g, ''),
        DOB: { Year: year, Month: month, Day: day },
        Address: {
          StreetAddress1: applicant.address.line1,
          StreetAddress2: applicant.address.line2,
          City: applicant.address.city,
          State: applicant.address.state,
          Zip5: applicant.address.zip.slice(0, 5),
        },
        Phone: applicant.phone,
        Email: applicant.email,
      },
      Options: {
        IncludeModels: true,
        CVICalculation: true,
      },
    };

    // Log WITHOUT PII
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'lexisnexis-kyc',
      action: 'createEvaluation',
      transactionId,
      timestamp: new Date().toISOString(),
    }));

    const response = await fetch(`${this.baseUrl}/instantid`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Strip SSNs from error responses
      const safeError = errorText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`LexisNexis KYC API error (${response.status}): ${safeError}`);
    }

    const data = (await response.json()) as LNInstantIDResponse;
    return this.mapToResult(data);
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    const response = await fetch(
      `${this.baseUrl}/instantid/transactions/${encodeURIComponent(evaluationToken)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const safeError = errorText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`LexisNexis getEvaluation API error (${response.status}): ${safeError}`);
    }

    const data = (await response.json()) as LNInstantIDResponse;
    return this.mapToResult(data);
  }

  // ---------------------------------------------------------------------------
  // PERPETUAL KYC
  // ---------------------------------------------------------------------------

  async refreshEvaluation(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<KYCRefreshResult> {
    // Log WITHOUT PII
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'lexisnexis-kyc',
      action: 'refreshEvaluation',
      evaluationToken,
      triggers: config.triggers,
      timestamp: new Date().toISOString(),
    }));

    const response = await fetch(
      `${this.baseUrl}/instantid/transactions/${encodeURIComponent(evaluationToken)}/refresh`,
      {
        method: 'POST',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          RiskThreshold: config.riskThreshold,
          AutoDeny: config.autoDenyOnHighRisk,
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const safeError = errorText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, '***-**-****');
      throw new Error(`LexisNexis refresh API error (${response.status}): ${safeError}`);
    }

    const data = (await response.json()) as LNRefreshResponse;

    const riskScore = Math.round((1 - data.CVIScore / 60) * 100);
    let status: KYCStatus = mapCVIToStatus(data.CVIScore);

    if (config.autoDenyOnHighRisk && riskScore >= config.riskThreshold) {
      status = 'denied';
    }

    return {
      refreshId: data.RefreshID,
      evaluationToken,
      trigger: config.triggers[0] ?? 'scheduled',
      status,
      changes: data.Changes,
      riskScore,
      refreshedAt: data.RefreshedAt,
      nextRefreshAt: data.NextRefreshDate,
    };
  }

  async configureRefresh(
    evaluationToken: string,
    config: KYCRefreshConfig,
  ): Promise<{ configured: boolean; nextRefreshAt: string }> {
    const response = await fetch(
      `${this.baseUrl}/instantid/transactions/${encodeURIComponent(evaluationToken)}/monitor`,
      {
        method: 'PUT',
        headers: {
          'Authorization': this.authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          IntervalHours: config.intervalHours,
          Triggers: config.triggers,
          RiskThreshold: config.riskThreshold,
          AutoDeny: config.autoDenyOnHighRisk,
        }),
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!response.ok) {
      throw new Error(`LexisNexis configureRefresh error (${response.status})`);
    }

    const data = (await response.json()) as { configured: boolean; next_refresh_at: string };
    return {
      configured: data.configured,
      nextRefreshAt: data.next_refresh_at,
    };
  }

  // ---------------------------------------------------------------------------
  // MAPPING
  // ---------------------------------------------------------------------------

  private mapToResult(data: LNInstantIDResponse): KYCResult {
    const status = mapCVIToStatus(data.ComprehensiveVerificationIndex);
    const reasons: string[] = [];

    // Build human-readable reasons from verification result
    const v = data.VerificationResult;
    if (!v.NameMatch) reasons.push('Name could not be verified');
    if (!v.AddressMatch) reasons.push('Address mismatch detected');
    if (!v.SSNMatch) reasons.push('SSN verification failed');
    if (!v.DOBMatch) reasons.push('Date of birth mismatch');
    if (!v.PhoneMatch) reasons.push('Phone number mismatch');

    // Add risk indicator descriptions
    for (const ri of data.RiskIndicators) {
      if (ri.Severity === 'High') {
        reasons.push(`${ri.Description} (${ri.Code})`);
      }
    }

    if (reasons.length === 0 && status === 'approved') {
      reasons.push('Identity verified successfully');
    }

    return {
      token: data.TransactionID,
      status,
      reasons,
      createdAt: data.CreatedAt,
      updatedAt: data.UpdatedAt,
    };
  }
}
