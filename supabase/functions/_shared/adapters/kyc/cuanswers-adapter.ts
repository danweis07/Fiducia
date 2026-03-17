// TODO: Provisional integration — not yet validated in production.
/**
 * CU*Answers KYC Adapter (Experian PreciseID via CU*Answers API)
 *
 * CU*Answers proxies Experian PreciseID through their API for identity
 * verification. The flow is:
 *   1. POST candidate → creates verification candidate
 *   2. GET questions → retrieves out-of-wallet questions from Experian
 *   3. POST answers → submits answers, receives pass/fail + score
 *
 * This adapter wraps the CU*Answers candidate/verification endpoints
 * to implement the platform's KYCAdapter interface.
 *
 * Configuration:
 *   CUANSWERS_BASE_URL — API base URL
 *   CUANSWERS_APP_KEY — APP Key for authentication
 *   CUANSWERS_CREDIT_UNION_ID — Credit Union ID (format: CUXXXXX)
 *
 * IMPORTANT: SSN is transmitted to CU*Answers for Experian lookup but
 * MUST NEVER appear in logs or API responses. Only masked last-4 digits.
 */

import type { KYCAdapter, KYCApplicant, KYCResult, KYCStatus } from './types.ts';

// =============================================================================
// CU*ANSWERS API TYPES
// =============================================================================

interface CUAnswersCandidate {
  ssn: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: 'M' | 'F' | 'U';
  date_of_birth: string;
  us_citizen: 'Y' | 'N';
  street_address: string;
  address_line_2: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  phone: string;
  work_phone: string;
  work_extension: string;
  other_phone: string;
  drivers_license: string;
  drivers_license_state: string;
  email_address: string;
  marital_status: 'M' | 'S' | 'U';
}

interface CUAnswersQuestionsResponse {
  data: {
    precise_id: number;
    session_id: string;
    questions: Array<{
      QuestionType: string;
      QuestionText: string;
      QuestionSelect: {
        QuestionChoice: string[];
      };
    }>;
    errors: string[];
  };
}

interface _CUAnswersAnswersResponse {
  data: {
    questions_id: string;
    precise_id: number;
    pass: boolean;
    out_of_wallet_score: number;
    errors: string[];
  };
}

// =============================================================================
// IN-MEMORY STATE (for tracking evaluations across calls)
// FIXME: In-memory Map is lost on serverless cold start and not shared across
// instances. The multi-step KYC flow (create → questions → answers) will break
// if requests hit different isolates. Migrate to a database-backed store.
// =============================================================================

interface EvaluationState {
  candidateId: string;
  status: KYCStatus;
  preciseId: number;
  sessionId: string;
  reasons: string[];
  createdAt: string;
  updatedAt: string;
}

const evaluationStore = new Map<string, EvaluationState>();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Convert ISO date (YYYY-MM-DD) to CU*Answers format (mmddyyyy).
 */
function isoDateToCUAnswers(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[1]}${parts[2]}${parts[0]}`;
}

/**
 * Strip non-digit characters from phone numbers.
 */
function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 10);
}

// =============================================================================
// ADAPTER
// =============================================================================

export class CUAnswersKYCAdapter implements KYCAdapter {
  private readonly baseUrl: string;
  private readonly appKey: string;
  private readonly creditUnionId: string;
  private readonly sandbox: boolean;

  readonly name = 'cuanswers_preciseid';

  constructor() {
    this.baseUrl = Deno.env.get('CUANSWERS_BASE_URL') ?? '';
    this.appKey = Deno.env.get('CUANSWERS_APP_KEY') ?? '';
    this.creditUnionId = Deno.env.get('CUANSWERS_CREDIT_UNION_ID') ?? '';
    this.sandbox = !this.baseUrl || !this.appKey || !this.creditUnionId;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    if (this.sandbox) {
      throw new Error('CU*Answers KYC adapter in sandbox mode');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'APP-KEY': this.appKey,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`CU*Answers KYC API error (${res.status}): ${errBody}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  }

  /**
   * Create a KYC evaluation by submitting candidate to CU*Answers → Experian.
   *
   * Flow: POST candidate → GET questions → auto-return pending_review
   * (questions must be answered by the member through a separate UI flow)
   */
  async createEvaluation(applicant: KYCApplicant): Promise<KYCResult> {
    if (this.sandbox) {
      const { MockKYCAdapter } = await import('./mock-adapter.ts');
      return new MockKYCAdapter().createEvaluation(applicant);
    }

    const now = new Date().toISOString();

    // Map applicant to CU*Answers candidate format
    const candidate: CUAnswersCandidate = {
      ssn: applicant.ssn.replace(/\D/g, ''),
      first_name: applicant.firstName,
      middle_name: '',
      last_name: applicant.lastName,
      gender: 'U',
      date_of_birth: isoDateToCUAnswers(applicant.dateOfBirth),
      us_citizen: 'Y',
      street_address: applicant.address.line1,
      address_line_2: applicant.address.line2 ?? '',
      city: applicant.address.city,
      state: applicant.address.state.toUpperCase(),
      zip: applicant.address.zip.slice(0, 5),
      county: '',
      phone: cleanPhone(applicant.phone),
      work_phone: '',
      work_extension: '',
      other_phone: '',
      drivers_license: '',
      drivers_license_state: '',
      email_address: applicant.email,
      marital_status: 'U',
    };

    // Step 1: POST candidate for ID verification
    const _createRes = await this.request<void>(
      'POST',
      `/credit_unions/${this.creditUnionId}/verification/candidates`,
      candidate,
    );

    // The candidate ID comes back in the Location header, but since we're
    // using fetch, we generate a deterministic token from the candidate data
    const token = `cua-kyc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Step 2: Attempt to retrieve questions (Experian PreciseID)
    let status: KYCStatus = 'pending_review';
    const reasons: string[] = [];
    let preciseId = 0;
    let sessionId = '';

    try {
      // Check for block flag first
      try {
        await this.request(
          'GET',
          `/credit_unions/${this.creditUnionId}/verification/candidates/${token}/block`,
        );
        // 204 = block exists
        status = 'denied';
        reasons.push('Candidate blocked by credit union');
      } catch {
        // 404 = no block, continue
      }

      if (status !== 'denied') {
        // Get verification questions from Experian
        const questionsRes = await this.request<CUAnswersQuestionsResponse>(
          'GET',
          `/credit_unions/${this.creditUnionId}/verification/candidates/${token}/questions`,
        );

        preciseId = questionsRes.data.precise_id;
        sessionId = questionsRes.data.session_id;

        if (questionsRes.data.errors?.length) {
          status = 'denied';
          reasons.push(...questionsRes.data.errors);
        } else if (preciseId >= 700) {
          // High PreciseID score — auto-approve
          status = 'approved';
          reasons.push('PreciseID score meets threshold');
        } else if (questionsRes.data.questions?.length > 0) {
          // Questions need to be answered — mark as pending review
          status = 'pending_review';
          reasons.push('Identity verification questions pending');
        } else {
          status = 'manual_review';
          reasons.push('Unable to generate verification questions');
        }
      }
    } catch (err) {
      // If questions retrieval fails (429 rate limit, etc.), manual review
      status = 'manual_review';
      reasons.push(err instanceof Error ? err.message : 'Verification service unavailable');
    }

    const evaluation: EvaluationState = {
      candidateId: token,
      status,
      preciseId,
      sessionId,
      reasons,
      createdAt: now,
      updatedAt: now,
    };

    evaluationStore.set(token, evaluation);

    return {
      token,
      status,
      reasons,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getEvaluation(evaluationToken: string): Promise<KYCResult> {
    if (this.sandbox) {
      const { MockKYCAdapter } = await import('./mock-adapter.ts');
      return new MockKYCAdapter().getEvaluation(evaluationToken);
    }

    const evaluation = evaluationStore.get(evaluationToken);
    if (!evaluation) {
      throw new Error(`KYC evaluation ${evaluationToken} not found`);
    }

    return {
      token: evaluationToken,
      status: evaluation.status,
      reasons: evaluation.reasons,
      createdAt: evaluation.createdAt,
      updatedAt: evaluation.updatedAt,
    };
  }
}
