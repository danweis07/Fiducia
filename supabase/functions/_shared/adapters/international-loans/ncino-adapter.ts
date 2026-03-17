// TODO: Provisional integration — not yet validated in production.
/**
 * nCino International Loan Origination Adapter
 *
 * Integrates with nCino's global cloud banking platform for loan origination.
 * nCino is a Salesforce-native LOS used by banks worldwide for commercial
 * and consumer lending.
 *
 * API base: https://api.ncino.com/v1
 *
 * Configuration:
 *   NCINO_API_KEY  — API key for authentication
 *   NCINO_BASE_URL — Base URL (default: https://api.ncino.com/v1)
 *
 * Authentication: x-api-key header.
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
// NCINO API RESPONSE TYPES (PRIVATE)
// =============================================================================

interface NcinoApplicant {
  Id: string;
  FirstName: string;
  LastName: string;
  Email?: string;
  Phone?: string;
  Role__c: string;
  Country_of_Residence__c: string;
  Nationality__c?: string;
  Tax_ID_Masked__c?: string;
}

interface NcinoLoan {
  Id: string;
  Status__c: string;
  Product__c: string;
  Requested_Amount__c: number;
  Approved_Amount__c?: number;
  Currency_Code__c: string;
  Term_Months__c?: number;
  Interest_Rate_BPS__c?: number;
  Jurisdiction__c: string;
  Additional_Jurisdictions__c?: string;
  Borrowers__r: { records: NcinoApplicant[] };
  Decision_Date__c?: string;
  Decision_Notes__c?: string;
  CreatedDate: string;
  LastModifiedDate: string;
}

interface NcinoCreditAssessment {
  Id: string;
  Loan__c: string;
  Credit_Model__c: string;
  Jurisdiction__c: string;
  Score__c?: number;
  Score_Band__c?: string;
  DTI_BPS__c?: number;
  Recommended_Max__c?: number;
  Risk_Grade__c?: string;
  Passed__c: boolean;
  Notes__c?: string;
  Assessed_Date__c: string;
}

interface NcinoComplianceCheck {
  Id: string;
  Loan__c: string;
  Check_Type__c: string;
  Jurisdiction__c: string;
  Status__c: string;
  Provider__c?: string;
  Result_Summary__c?: string;
  Expires_At__c?: string;
  Performed_Date__c: string;
}

interface NcinoDocument {
  Id: string;
  Loan__c: string;
  Category__c: string;
  Document_Type_Label__c: string;
  Jurisdiction__c: string;
  Language__c: string;
  File_Name__c?: string;
  File_Content__c?: string;
  Mime_Type__c?: string;
  Verified__c: boolean;
  Uploaded_Date__c: string;
  Expires_At__c?: string;
}

interface NcinoQueryResponse<T> {
  records: T[];
  totalSize: number;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapNcinoStatus(status: string): LoanApplicationStatus {
  const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
  const statusMap: Record<string, LoanApplicationStatus> = {
    draft: 'draft',
    submitted: 'submitted',
    in_review: 'in_review',
    under_review: 'in_review',
    compliance_review: 'compliance_review',
    credit_assessment: 'credit_assessment',
    credit_review: 'credit_assessment',
    approved: 'approved',
    conditionally_approved: 'conditionally_approved',
    denied: 'denied',
    declined: 'denied',
    withdrawn: 'withdrawn',
    cancelled: 'withdrawn',
    funded: 'funded',
    booked: 'funded',
  };
  return statusMap[normalized] ?? 'submitted';
}

function mapNcinoApplicantRole(role: string): InternationalApplicant['role'] {
  const roleMap: Record<string, InternationalApplicant['role']> = {
    Primary: 'primary',
    'Co-Applicant': 'co_applicant',
    CoApplicant: 'co_applicant',
    Guarantor: 'guarantor',
  };
  return roleMap[role] ?? 'primary';
}

function mapNcinoApplicant(raw: NcinoApplicant): InternationalApplicant {
  return {
    id: raw.Id,
    firstName: raw.FirstName,
    lastName: raw.LastName,
    email: raw.Email,
    phone: raw.Phone,
    role: mapNcinoApplicantRole(raw.Role__c),
    countryOfResidence: raw.Country_of_Residence__c as JurisdictionCode,
    nationality: raw.Nationality__c,
    taxIdMasked: raw.Tax_ID_Masked__c,
  };
}

function mapNcinoApplication(raw: NcinoLoan): InternationalLoanApplication {
  const additionalJurisdictions = raw.Additional_Jurisdictions__c
    ? raw.Additional_Jurisdictions__c.split(';').map(j => j.trim()) as JurisdictionCode[]
    : undefined;

  return {
    id: raw.Id,
    status: mapNcinoStatus(raw.Status__c),
    productId: raw.Product__c,
    requestedAmountMinorUnits: raw.Requested_Amount__c,
    approvedAmountMinorUnits: raw.Approved_Amount__c,
    currency: raw.Currency_Code__c as CurrencyCode,
    termMonths: raw.Term_Months__c,
    interestRateBps: raw.Interest_Rate_BPS__c,
    jurisdiction: raw.Jurisdiction__c as JurisdictionCode,
    additionalJurisdictions,
    applicants: raw.Borrowers__r.records.map(mapNcinoApplicant),
    decisionDate: raw.Decision_Date__c,
    decisionNotes: raw.Decision_Notes__c,
    createdAt: raw.CreatedDate,
    updatedAt: raw.LastModifiedDate,
  };
}

function mapNcinoCreditModel(model: string): CreditModelType {
  const modelMap: Record<string, CreditModelType> = {
    'UK Experian': 'uk_experian',
    'UK Equifax': 'uk_equifax',
    Schufa: 'eu_schufa',
    'Banque de France': 'eu_banque_de_france',
    CIBIL: 'in_cibil',
    CRIF: 'in_crif',
    'CBS Singapore': 'sg_cbs',
    'APAC Generic': 'apac_generic',
    FICO: 'us_fico',
  };
  return modelMap[model] ?? 'apac_generic';
}

function mapNcinoComplianceStatus(status: string): ComplianceCheckStatus {
  const statusMap: Record<string, ComplianceCheckStatus> = {
    Pending: 'pending',
    Passed: 'passed',
    Cleared: 'passed',
    Failed: 'failed',
    'Review Required': 'review_required',
    Flagged: 'review_required',
    Expired: 'expired',
  };
  return statusMap[status] ?? 'pending';
}

function mapNcinoComplianceType(type: string): ComplianceCheckType {
  const typeMap: Record<string, ComplianceCheckType> = {
    'AML/KYC': 'aml_kyc',
    'Sanctions Screening': 'sanctions_screening',
    'PEP Screening': 'pep_screening',
    Affordability: 'affordability',
    'Regulatory Capital': 'regulatory_capital',
    'Consumer Duty': 'consumer_duty',
    'GDPR Consent': 'gdpr_consent',
    'RBI Compliance': 'rbi_compliance',
    'MAS Compliance': 'mas_compliance',
    'Cross-Border Reporting': 'cross_border_reporting',
  };
  return typeMap[type] ?? 'aml_kyc';
}

function mapNcinoDocumentCategory(category: string): DocumentCategory {
  const catMap: Record<string, DocumentCategory> = {
    Identity: 'identity',
    'Address Proof': 'address_proof',
    'Income Proof': 'income_proof',
    'Tax Document': 'tax_document',
    'Employment Verification': 'employment_verification',
    'Business Registration': 'business_registration',
    'Regulatory Filing': 'regulatory_filing',
    'Consent Form': 'consent_form',
    Collateral: 'collateral',
  };
  return catMap[category] ?? 'other';
}

function mapNcinoDocument(raw: NcinoDocument): InternationalLoanDocument {
  return {
    id: raw.Id,
    applicationId: raw.Loan__c,
    category: mapNcinoDocumentCategory(raw.Category__c),
    documentTypeLabel: raw.Document_Type_Label__c,
    jurisdiction: raw.Jurisdiction__c as JurisdictionCode,
    language: raw.Language__c,
    fileName: raw.File_Name__c,
    fileContent: raw.File_Content__c,
    mimeType: raw.Mime_Type__c,
    verified: raw.Verified__c,
    uploadedAt: raw.Uploaded_Date__c,
    expiresAt: raw.Expires_At__c,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class NcinoInternationalLoanAdapter implements InternationalLoanOriginationAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'ncino',
    name: 'nCino International Loan Origination',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('NCINO_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('NCINO_BASE_URL') ?? 'https://api.ncino.com/v1';
    this.sandbox = !this.apiKey;
  }

  // ---------------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------------

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('nCino adapter in sandbox mode — API key not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout.requestTimeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`nCino API error (${res.status}): ${errBody}`);
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
      await this.request('GET', '/loans?limit=1');
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

    const raw = await this.request<NcinoLoan>(
      'GET', `/loans/${encodeURIComponent(request.applicationId)}`,
    );
    return { application: mapNcinoApplication(raw) };
  }

  async createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().createApplication(request);
    }

    const payload = {
      Product__c: request.productId,
      Requested_Amount__c: request.requestedAmountMinorUnits,
      Currency_Code__c: request.currency,
      Jurisdiction__c: request.jurisdiction,
      Additional_Jurisdictions__c: request.additionalJurisdictions?.join(';'),
      Term_Months__c: request.termMonths,
      Borrowers: [
        {
          FirstName: request.applicant.firstName,
          LastName: request.applicant.lastName,
          Email: request.applicant.email,
          Phone: request.applicant.phone,
          Country_of_Residence__c: request.applicant.countryOfResidence,
          Nationality__c: request.applicant.nationality,
          Role__c: 'Primary',
        },
        ...(request.coApplicant
          ? [{
              FirstName: request.coApplicant.firstName,
              LastName: request.coApplicant.lastName,
              Email: request.coApplicant.email,
              Phone: request.coApplicant.phone,
              Country_of_Residence__c: request.coApplicant.countryOfResidence,
              Nationality__c: request.coApplicant.nationality,
              Role__c: 'Co-Applicant',
            }]
          : []),
      ],
      ...(request.additionalFields ?? {}),
    };

    const raw = await this.request<NcinoLoan>('POST', '/loans', payload);
    return { application: mapNcinoApplication(raw) };
  }

  async listApplications(request: ListApplicationsRequest): Promise<ListApplicationsResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().listApplications(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    let path = `/loans?limit=${limit}&offset=${offset}`;
    if (request.status) path += `&status=${request.status}`;
    if (request.jurisdiction) path += `&jurisdiction=${request.jurisdiction}`;
    if (request.currency) path += `&currency=${request.currency}`;

    const raw = await this.request<NcinoQueryResponse<NcinoLoan>>('GET', path);
    return {
      applications: raw.records.map(mapNcinoApplication),
      total: raw.totalSize,
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

    const raw = await this.request<NcinoCreditAssessment>(
      'GET', `/loans/${encodeURIComponent(request.applicationId)}/credit-assessment`,
    );

    return {
      assessment: {
        id: raw.Id,
        applicationId: raw.Loan__c,
        model: mapNcinoCreditModel(raw.Credit_Model__c),
        jurisdiction: raw.Jurisdiction__c as JurisdictionCode,
        score: raw.Score__c,
        scoreBand: raw.Score_Band__c,
        debtToIncomeBps: raw.DTI_BPS__c,
        recommendedMaxMinorUnits: raw.Recommended_Max__c,
        riskGrade: raw.Risk_Grade__c,
        passed: raw.Passed__c,
        notes: raw.Notes__c,
        assessedAt: raw.Assessed_Date__c,
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

    const raw = await this.request<NcinoQueryResponse<NcinoComplianceCheck>>(
      'GET', `/loans/${encodeURIComponent(request.applicationId)}/compliance-checks`,
    );

    return {
      checks: raw.records.map(c => ({
        id: c.Id,
        applicationId: c.Loan__c,
        type: mapNcinoComplianceType(c.Check_Type__c),
        jurisdiction: c.Jurisdiction__c as JurisdictionCode,
        status: mapNcinoComplianceStatus(c.Status__c),
        provider: c.Provider__c,
        resultSummary: c.Result_Summary__c,
        expiresAt: c.Expires_At__c,
        performedAt: c.Performed_Date__c,
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

    const raw = await this.request<NcinoDocument>(
      'GET', `/documents/${encodeURIComponent(request.documentId)}`,
    );
    return { document: mapNcinoDocument(raw) };
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().createDocument(request);
    }

    const payload = {
      Loan__c: request.applicationId,
      Category__c: request.category,
      Document_Type_Label__c: request.documentTypeLabel,
      Jurisdiction__c: request.jurisdiction,
      Language__c: request.language,
      File_Name__c: request.fileName,
      File_Content__c: request.fileContent,
      Mime_Type__c: request.mimeType,
      Expires_At__c: request.expiresAt,
    };

    const raw = await this.request<{ Id: string }>('POST', '/documents', payload);
    return { documentId: raw.Id };
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    if (this.sandbox) {
      const { MockInternationalLoanOriginationAdapter } = await import('./mock-adapter.ts');
      return new MockInternationalLoanOriginationAdapter().updateDocument(request);
    }

    const payload: Record<string, unknown> = {};
    if (request.fileName !== undefined) payload.File_Name__c = request.fileName;
    if (request.fileContent !== undefined) payload.File_Content__c = request.fileContent;
    if (request.mimeType !== undefined) payload.Mime_Type__c = request.mimeType;
    if (request.verified !== undefined) payload.Verified__c = request.verified;
    if (request.expiresAt !== undefined) payload.Expires_At__c = request.expiresAt;

    await this.request<{ Id: string }>(
      'PATCH', `/documents/${encodeURIComponent(request.documentId)}`, payload,
    );
    return { documentId: request.documentId };
  }
}
