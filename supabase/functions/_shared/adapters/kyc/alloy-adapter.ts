// TODO: Provisional integration — not yet validated in production.
/**
 * Alloy Adapter — KYC Identity Verification
 *
 * Integrates with Alloy's identity decisioning API for KYC checks.
 *
 * Alloy API docs: https://docs.alloy.com
 * Base URL (sandbox): https://sandbox.alloy.co/v1
 * Auth: HTTP Basic with ALLOY_API_TOKEN:ALLOY_SECRET
 *
 * IMPORTANT: SSN is sent to Alloy for verification but MUST NEVER
 * appear in logs, responses, or error messages.
 */

import type {
  KYCAdapter,
  KYCApplicant,
  KYCResult,
  KYCStatus,
} from './types.ts';

// =============================================================================
// ALLOY API TYPES
// =============================================================================

interface AlloyEvaluationRequest {
  name_first: string;
  name_last: string;
  email_address: string;
  phone_number: string;
  birth_date: string;
  document_ssn: string;
  address_line_1: string;
  address_line_2?: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country_code: string;
}

interface AlloyEvaluationResponse {
  evaluation_token: string;
  entity_token: string;
  outcome: 'Approved' | 'Denied' | 'Manual Review';
  tags: string[];
  created_at: string;
  updated_at: string;
  summary: {
    outcome: string;
    reasons: string[];
  };
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapAlloyOutcome(outcome: string): KYCStatus {
  switch (outcome) {
    case 'Approved':
      return 'approved';
    case 'Denied':
      return 'denied';
    case 'Manual Review':
      return 'manual_review';
    default:
      return 'pending_review';
  }
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class AlloyKYCAdapter implements KYCAdapter {
  readonly name = 'alloy';

  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor() {
    const apiToken = Deno.env.get('ALLOY_API_TOKEN');
    const secret = Deno.env.get('ALLOY_SECRET');

    if (!apiToken || !secret) {
      throw new Error(
        'Alloy credentials missing: ALLOY_API_TOKEN and ALLOY_SECRET must be set'
      );
    }

    this.baseUrl = 'https://sandbox.alloy.co/v1';
    // Alloy uses HTTP Basic: base64(token:secret)
    this.authHeader = `Basic ${btoa(`${apiToken}:${secret}`)}`;
  }

  // ---------------------------------------------------------------------------
  // PUBLIC INTERFACE
  // ---------------------------------------------------------------------------

  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    // NOTE: SSN is sent to Alloy but never logged
    const body: AlloyEvaluationRequest = {
      name_first: applicant.firstName,
      name_last: applicant.lastName,
      email_address: applicant.email,
      phone_number: applicant.phone,
      birth_date: applicant.dateOfBirth,
      document_ssn: applicant.ssn,
      address_line_1: applicant.address.line1,
      address_line_2: applicant.address.line2,
      address_city: applicant.address.city,
      address_state: applicant.address.state,
      address_postal_code: applicant.address.zip,
      address_country_code: 'US',
    };

    // Log evaluation creation WITHOUT PII — only log that it happened
    console.warn(JSON.stringify({
      level: 'info',
      adapter: 'alloy',
      action: 'createEvaluation',
      timestamp: new Date().toISOString(),
      // Deliberately omit all PII fields
    }));

    const response = await fetch(`${this.baseUrl}/evaluations`, {
      method: 'POST',
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Strip any PII that might be in the error response
      const safeError = errorText.replace(/\d{3}-?\d{2}-?\d{4}/g, '***-**-****');
      throw new Error(
        `Alloy evaluation API error (${response.status}): ${safeError}`
      );
    }

    const data = (await response.json()) as AlloyEvaluationResponse;
    return this.mapToResult(data);
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    const response = await fetch(
      `${this.baseUrl}/evaluations/${encodeURIComponent(evaluationToken)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': this.authHeader,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const safeError = errorText.replace(/\d{3}-?\d{2}-?\d{4}/g, '***-**-****');
      throw new Error(
        `Alloy getEvaluation API error (${response.status}): ${safeError}`
      );
    }

    const data = (await response.json()) as AlloyEvaluationResponse;
    return this.mapToResult(data);
  }

  // ---------------------------------------------------------------------------
  // MAPPING
  // ---------------------------------------------------------------------------

  private mapToResult(data: AlloyEvaluationResponse): KYCResult {
    return {
      token: data.evaluation_token,
      status: mapAlloyOutcome(data.outcome),
      reasons: data.summary?.reasons ?? [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}
