// TODO: Provisional integration — not yet validated in production.
/**
 * Finastra International Loan Origination Adapter
 *
 * Integrates with Finastra's global lending APIs for multi-country,
 * multi-currency loan origination.
 *
 * API base: https://api.finastra.com/lending/v1
 *
 * Configuration:
 *   FINASTRA_CLIENT_ID     — OAuth2 client ID
 *   FINASTRA_CLIENT_SECRET — OAuth2 client secret
 *   FINASTRA_BASE_URL      — Base URL (default: https://api.finastra.com/lending/v1)
 *
 * Authentication: OAuth2 client_credentials → Bearer token.
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalLoanOriginationAdapter,
  InternationalLoanApplication,
  InternationalApplicant,
  LoanApplicationStatus,
  CreditModelType,
  ComplianceCheckStatus,
  ComplianceCheckType,
  InternationalLoanDocument,
  DocumentCategory,
  JurisdictionCode,
  CurrencyCode,
  GetApplicationRequest,
  GetApplicationResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ListApplicationsRequest,
  ListApplicationsResponse,
  GetCreditAssessmentRequest,
  GetCreditAssessmentResponse,
  GetComplianceChecksRequest,
  GetComplianceChecksResponse,
  GetDocumentRequest,
  GetDocumentResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
} from './types.ts';

// =============================================================================
// FINASTRA API RESPONSE TYPES (PRIVATE)
// =============================================================================

interface FinastraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface FinastraApplicant {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  role: string;
  country_of_residence: string;
  nationality?: string;
  tax_id_masked?: string;
}

interface FinastraApplication {
  id: string;
  status: string;
  product_id: string;
  requested_amount: number;
  approved_amount?: number;
  currency: string;
  term_months?: number;
  interest_rate_bps?: number;
  jurisdiction: string;
  additional_jurisdictions?: string[];
  applicants: FinastraApplicant[];
  decision_date?: string;
  decision_notes?: string;
  created_at: string;
  updated_at: string;
}

interface FinastraCreditAssessment {
  id: string;
  application_id: string;
  model: string;
  jurisdiction: string;
  score?: number;
  score_band?: string;
  debt_to_income_bps?: number;
  recommended_max_amount?: number;
  risk_grade?: string;
  passed: boolean;
  notes?: string;
  assessed_at: string;
}

interface FinastraComplianceCheck {
  id: string;
  application_id: string;
  check_type: string;
  jurisdiction: string;
  status: string;
  provider?: string;
  result_summary?: string;
  expires_at?: string;
  performed_at: string;
}

interface FinastraDocument {
  id: string;
  application_id: string;
  category: string;
  document_type_label: string;
  jurisdiction: string;
  language: string;
  file_name?: string;
  file_content?: string;
  mime_type?: string;
  verified: boolean;
  uploaded_at: string;
  expires_at?: string;
}

interface FinastraListResponse<T> {
  data: T[];
  total: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapFinastraStatus(status: string): LoanApplicationStatus {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const statusMap: Record<string, LoanApplicationStatus> = {
    draft: 'draft',
    submitted: 'submitted',
    in_review: 'in_review',
    pending_review: 'in_review',
    compliance_review: 'compliance_review',
    credit_assessment: 'credit_assessment',
    approved: 'approved',
    conditionally_approved: 'conditionally_approved',
    denied: 'denied',
    declined: 'denied',
    rejected: 'denied',
    withdrawn: 'withdrawn',
    cancelled: 'withdrawn',
    funded: 'funded',
    disbursed: 'funded',
  };
  return statusMap[normalized] ?? 'submitted';
}

function mapFinastraApplicant(raw: FinastraApplicant): InternationalApplicant {
  const roleMap: Record<string, InternationalApplicant['role']> = {
    primary: 'primary',
    co_applicant: 'co_applicant',
    joint: 'co_applicant',
    guarantor: 'guarantor',
  };
  return {
    id: raw.id,
    firstName: raw.first_name,
    lastName: raw.last_name,
    email: raw.email,
    phone: raw.phone,
    role: roleMap[raw.role] ?? 'primary',
    countryOfResidence: raw.country_of_residence as JurisdictionCode,
    nationality: raw.nationality,
    taxIdMasked: raw.tax_id_masked,
  };
}

function mapFinastraApplication(raw: FinastraApplication): InternationalLoanApplication {
  return {
    id: raw.id,
    status: mapFinastraStatus(raw.status),
    productId: raw.product_id,
    requestedAmountMinorUnits: raw.requested_amount,
    approvedAmountMinorUnits: raw.approved_amount,
    currency: raw.currency as CurrencyCode,
    termMonths: raw.term_months,
    interestRateBps: raw.interest_rate_bps,
    jurisdiction: raw.jurisdiction as JurisdictionCode,
    additionalJurisdictions: raw.additional_jurisdictions as JurisdictionCode[] | undefined,
    applicants: raw.applicants.map(mapFinastraApplicant),
    decisionDate: raw.decision_date,
    decisionNotes: raw.decision_notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function mapFinastraCreditModel(model: string): CreditModelType {
  const modelMap: Record<string, CreditModelType> = {
    uk_experian: 'uk_experian',
    uk_equifax: 'uk_equifax',
    eu_schufa: 'eu_schufa',
    eu_banque_de_france: 'eu_banque_de_france',
    in_cibil: 'in_cibil',
    in_crif: 'in_crif',
    sg_cbs: 'sg_cbs',
    apac_generic: 'apac_generic',
    us_fico: 'us_fico',
  };
  return modelMap[model] ?? 'apac_generic';
}

function mapFinastraComplianceStatus(status: string): ComplianceCheckStatus {
  const statusMap: Record<string, ComplianceCheckStatus> = {
    pending: 'pending',
    passed: 'passed',
    cleared: 'passed',
    failed: 'failed',
    flagged: 'review_required',
    review_required: 'review_required',
    expired: 'expired',
  };
  return statusMap[status] ?? 'pending';
}

function mapFinastraComplianceType(type: string): ComplianceCheckType {
  const typeMap: Record<string, ComplianceCheckType> = {
    aml_kyc: 'aml_kyc',
    sanctions_screening: 'sanctions_screening',
    pep_screening: 'pep_screening',
    affordability: 'affordability',
    regulatory_capital: 'regulatory_capital',
    consumer_duty: 'consumer_duty',
    gdpr_consent: 'gdpr_consent',
    rbi_compliance: 'rbi_compliance',
    mas_compliance: 'mas_compliance',
    cross_border_reporting: 'cross_border_reporting',
  };
  return typeMap[type] ?? 'aml_kyc';
}

function mapFinastraDocumentCategory(category: string): DocumentCategory {
  const catMap: Record<string, DocumentCategory> = {
    identity: 'identity',
    address_proof: 'address_proof',
    income_proof: 'income_proof',
    tax_document: 'tax_document',
    employment_verification: 'employment_verification',
    business_registration: 'business_registration',
    regulatory_filing: 'regulatory_filing',
    consent_form: 'consent_form',
    collateral: 'collateral',
  };
  return catMap[category] ?? 'other';
}

function mapFinastraDocument(raw: FinastraDocument): InternationalLoanDocument {
  return {
    id: raw.id,
    applicationId: raw.application_id,
    category: mapFinastraDocumentCategory(raw.category),
    documentTypeLabel: raw.document_type_label,
    jurisdiction: raw.jurisdiction as JurisdictionCode,
    language: raw.language,
    fileName: raw.file_name,
    fileContent: raw.file_content,
    mimeType: raw.mime_type,
    verified: raw.verified,
    uploadedAt: raw.uploaded_at,
    expiresAt: raw.expires_at,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class FinastraInternationalLoanAdapter implements InternationalLoanOriginationAdapter {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  readonly config: AdapterConfig = {
    id: 'finastra',
    name: 'Finastra International Loan Origination',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.clientId = Deno.env.get('FINASTRA_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('FINASTRA_CLIENT_SECRET') ?? '';
    this.baseUrl = Deno.env.get('FINASTRA_BASE_URL') ?? 'https://api.finastra.com/lending/v1';
    this.sandbox = !this.clientId || !this.clientSecret;
  }

  // ---------------------------------------------------------------------------
  // AUTH
  // ---------------------------------------------------------------------------

  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const tokenUrl = this.baseUrl.replace('/lending/v1', '/auth/token');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Finastra auth error (${res.status}): ${errBody}`);
    }

    const token: FinastraTokenResponse = await res.json();
    this.accessToken = token.access_token;
    // Expire 60 seconds early to avoid edge cases
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
    return this.accessToken;
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Finastra adapter in sandbox mode — credentials not configured');
    }

    const token = await this.authenticate();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout.requestTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Finastra API error (${res.status}): ${errBody}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      await this.request('GET', '/applications?limit=1');
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  // ---------------------------------------------------------------------------
  // APPLICATIONS
  // ---------------------------------------------------------------------------

  async getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().getApplication(request);
    }

    const raw = await this.request<FinastraApplication>(
      'GET', `/applications/${encodeURIComponent(request.applicationId)}`,
    );
    return { application: mapFinastraApplication(raw) };
  }

  async createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().createApplication(request);
    }

    const payload = {
      product_id: request.productId,
      requested_amount: request.requestedAmountMinorUnits,
      currency: request.currency,
      jurisdiction: request.jurisdiction,
      additional_jurisdictions: request.additionalJurisdictions,
      term_months: request.termMonths,
      applicant: {
        first_name: request.applicant.firstName,
        last_name: request.applicant.lastName,
        email: request.applicant.email,
        phone: request.applicant.phone,
        country_of_residence: request.applicant.countryOfResidence,
        nationality: request.applicant.nationality,
        role: 'primary',
      },
      ...(request.coApplicant && {
        co_applicant: {
          first_name: request.coApplicant.firstName,
          last_name: request.coApplicant.lastName,
          email: request.coApplicant.email,
          phone: request.coApplicant.phone,
          country_of_residence: request.coApplicant.countryOfResidence,
          nationality: request.coApplicant.nationality,
          role: 'co_applicant',
        },
      }),
      ...(request.additionalFields ?? {}),
    };

    const raw = await this.request<FinastraApplication>('POST', '/applications', payload);
    return { application: mapFinastraApplication(raw) };
  }

  async listApplications(request: ListApplicationsRequest): Promise<ListApplicationsResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().listApplications(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/applications?limit=${limit}&offset=${offset}`;
    if (request.status) path += `&status=${request.status}`;
    if (request.jurisdiction) path += `&jurisdiction=${request.jurisdiction}`;
    if (request.currency) path += `&currency=${request.currency}`;

    const raw = await this.request<FinastraListResponse<FinastraApplication>>('GET', path);
    return {
      applications: raw.data.map(mapFinastraApplication),
      total: raw.total,
    };
  }

  // ---------------------------------------------------------------------------
  // CREDIT ASSESSMENT
  // ---------------------------------------------------------------------------

  async getCreditAssessment(request: GetCreditAssessmentRequest): Promise<GetCreditAssessmentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().getCreditAssessment(request);
    }

    const raw = await this.request<FinastraCreditAssessment>(
      'GET', `/applications/${encodeURIComponent(request.applicationId)}/credit-assessment`,
    );

    return {
      assessment: {
        id: raw.id,
        applicationId: raw.application_id,
        model: mapFinastraCreditModel(raw.model),
        jurisdiction: raw.jurisdiction as JurisdictionCode,
        score: raw.score,
        scoreBand: raw.score_band,
        debtToIncomeBps: raw.debt_to_income_bps,
        recommendedMaxMinorUnits: raw.recommended_max_amount,
        riskGrade: raw.risk_grade,
        passed: raw.passed,
        notes: raw.notes,
        assessedAt: raw.assessed_at,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // COMPLIANCE CHECKS
  // ---------------------------------------------------------------------------

  async getComplianceChecks(request: GetComplianceChecksRequest): Promise<GetComplianceChecksResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().getComplianceChecks(request);
    }

    const raw = await this.request<FinastraListResponse<FinastraComplianceCheck>>(
      'GET', `/applications/${encodeURIComponent(request.applicationId)}/compliance-checks`,
    );

    return {
      checks: raw.data.map(c => ({
        id: c.id,
        applicationId: c.application_id,
        type: mapFinastraComplianceType(c.check_type),
        jurisdiction: c.jurisdiction as JurisdictionCode,
        status: mapFinastraComplianceStatus(c.status),
        provider: c.provider,
        resultSummary: c.result_summary,
        expiresAt: c.expires_at,
        performedAt: c.performed_at,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // DOCUMENTS
  // ---------------------------------------------------------------------------

  async getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().getDocument(request);
    }

    const raw = await this.request<FinastraDocument>(
      'GET', `/documents/${encodeURIComponent(request.documentId)}`,
    );
    return { document: mapFinastraDocument(raw) };
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().createDocument(request);
    }

    const payload = {
      application_id: request.applicationId,
      category: request.category,
      document_type_label: request.documentTypeLabel,
      jurisdiction: request.jurisdiction,
      language: request.language,
      file_name: request.fileName,
      file_content: request.fileContent,
      mime_type: request.mimeType,
      expires_at: request.expiresAt,
    };

    const raw = await this.request<{ id: string }>('POST', '/documents', payload);
    return { documentId: raw.id };
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().updateDocument(request);
    }

    const payload: Record<string, unknown> = {};
    if (request.fileName !== undefined) payload.file_name = request.fileName;
    if (request.fileContent !== undefined) payload.file_content = request.fileContent;
    if (request.mimeType !== undefined) payload.mime_type = request.mimeType;
    if (request.verified !== undefined) payload.verified = request.verified;
    if (request.expiresAt !== undefined) payload.expires_at = request.expiresAt;

    await this.request<{ id: string }>(
      'PATCH', `/documents/${encodeURIComponent(request.documentId)}`, payload,
    );
    return { documentId: request.documentId };
  }
}
