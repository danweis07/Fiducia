/**
 * Mock International Loan Origination Adapter
 *
 * Sandbox implementation for development and testing.
 * Returns realistic test data from multiple jurisdictions:
 *   - UK (GBP) — personal loan in review
 *   - EU/Germany (EUR) — mortgage submitted
 *   - India (INR) — business loan approved
 *   - Singapore (SGD) — auto loan draft
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  InternationalLoanOriginationAdapter,
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
  InternationalLoanApplication,
  CreditAssessment,
  ComplianceCheck,
  InternationalLoanDocument,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_APPLICATIONS = new Map<string, InternationalLoanApplication>();
const MOCK_ASSESSMENTS = new Map<string, CreditAssessment>();
const MOCK_COMPLIANCE = new Map<string, ComplianceCheck[]>();
const MOCK_DOCUMENTS = new Map<string, InternationalLoanDocument>();

function generateId(): string {
  return crypto.randomUUID();
}

// --- UK personal loan (in_review) ---
const ukApp: InternationalLoanApplication = {
  id: 'intl-app-uk-001',
  status: 'in_review',
  productId: 'uk-personal-loan',
  requestedAmountMinorUnits: 1500000, // 15,000.00 GBP
  currency: 'GBP',
  termMonths: 48,
  interestRateBps: 620,
  jurisdiction: 'GB',
  applicants: [
    {
      id: 'applicant-uk-001',
      firstName: 'James',
      lastName: 'Whitfield',
      email: 'j.whitfield@example.co.uk',
      role: 'primary',
      countryOfResidence: 'GB',
      nationality: 'GB',
    },
  ],
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-10T14:30:00Z',
};
MOCK_APPLICATIONS.set(ukApp.id, ukApp);

MOCK_ASSESSMENTS.set(ukApp.id, {
  id: 'assess-uk-001',
  applicationId: ukApp.id,
  model: 'uk_experian',
  jurisdiction: 'GB',
  score: 720,
  scoreBand: 'Good',
  debtToIncomeBps: 2800,
  recommendedMaxMinorUnits: 2500000,
  riskGrade: 'B+',
  passed: true,
  assessedAt: '2026-03-02T09:00:00Z',
});

MOCK_COMPLIANCE.set(ukApp.id, [
  {
    id: 'comp-uk-001',
    applicationId: ukApp.id,
    type: 'aml_kyc',
    jurisdiction: 'GB',
    status: 'passed',
    provider: 'experian',
    resultSummary: 'Identity verified — no adverse findings',
    performedAt: '2026-03-01T11:00:00Z',
  },
  {
    id: 'comp-uk-002',
    applicationId: ukApp.id,
    type: 'consumer_duty',
    jurisdiction: 'GB',
    status: 'passed',
    resultSummary: 'FCA Consumer Duty affordability met',
    performedAt: '2026-03-01T11:05:00Z',
  },
  {
    id: 'comp-uk-003',
    applicationId: ukApp.id,
    type: 'sanctions_screening',
    jurisdiction: 'GB',
    status: 'passed',
    provider: 'refinitiv',
    resultSummary: 'No sanctions match',
    performedAt: '2026-03-01T11:02:00Z',
  },
]);

// --- EU/Germany mortgage (submitted) ---
const euApp: InternationalLoanApplication = {
  id: 'intl-app-eu-001',
  status: 'submitted',
  productId: 'eu-mortgage',
  requestedAmountMinorUnits: 35000000, // 350,000.00 EUR
  currency: 'EUR',
  termMonths: 300,
  jurisdiction: 'DE',
  applicants: [
    {
      id: 'applicant-eu-001',
      firstName: 'Anna',
      lastName: 'Mueller',
      email: 'a.mueller@example.de',
      role: 'primary',
      countryOfResidence: 'DE',
      nationality: 'DE',
    },
    {
      id: 'applicant-eu-002',
      firstName: 'Karl',
      lastName: 'Mueller',
      email: 'k.mueller@example.de',
      role: 'co_applicant',
      countryOfResidence: 'DE',
      nationality: 'DE',
    },
  ],
  createdAt: '2026-03-05T08:00:00Z',
  updatedAt: '2026-03-05T08:00:00Z',
};
MOCK_APPLICATIONS.set(euApp.id, euApp);

MOCK_ASSESSMENTS.set(euApp.id, {
  id: 'assess-eu-001',
  applicationId: euApp.id,
  model: 'eu_schufa',
  jurisdiction: 'DE',
  score: 95,
  scoreBand: 'A',
  debtToIncomeBps: 3200,
  recommendedMaxMinorUnits: 40000000,
  riskGrade: 'A',
  passed: true,
  assessedAt: '2026-03-06T10:00:00Z',
});

MOCK_COMPLIANCE.set(euApp.id, [
  {
    id: 'comp-eu-001',
    applicationId: euApp.id,
    type: 'aml_kyc',
    jurisdiction: 'DE',
    status: 'passed',
    provider: 'schufa',
    resultSummary: 'Identity verified',
    performedAt: '2026-03-05T09:00:00Z',
  },
  {
    id: 'comp-eu-002',
    applicationId: euApp.id,
    type: 'gdpr_consent',
    jurisdiction: 'DE',
    status: 'passed',
    resultSummary: 'GDPR data processing consent recorded',
    performedAt: '2026-03-05T08:30:00Z',
  },
]);

// --- India business loan (approved) ---
const inApp: InternationalLoanApplication = {
  id: 'intl-app-in-001',
  status: 'approved',
  productId: 'in-business-loan',
  requestedAmountMinorUnits: 500000000, // 50,00,000.00 INR (50 lakh)
  approvedAmountMinorUnits: 450000000,
  currency: 'INR',
  termMonths: 60,
  interestRateBps: 1050,
  jurisdiction: 'IN',
  applicants: [
    {
      id: 'applicant-in-001',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'p.sharma@example.in',
      role: 'primary',
      countryOfResidence: 'IN',
      nationality: 'IN',
      taxIdMasked: '****5678',
    },
  ],
  decisionDate: '2026-03-08T12:00:00Z',
  decisionNotes: 'Approved with collateral requirement',
  createdAt: '2026-02-20T06:00:00Z',
  updatedAt: '2026-03-08T12:00:00Z',
};
MOCK_APPLICATIONS.set(inApp.id, inApp);

MOCK_ASSESSMENTS.set(inApp.id, {
  id: 'assess-in-001',
  applicationId: inApp.id,
  model: 'in_cibil',
  jurisdiction: 'IN',
  score: 780,
  scoreBand: 'Excellent',
  debtToIncomeBps: 2200,
  recommendedMaxMinorUnits: 600000000,
  riskGrade: 'A+',
  passed: true,
  assessedAt: '2026-02-22T08:00:00Z',
});

MOCK_COMPLIANCE.set(inApp.id, [
  {
    id: 'comp-in-001',
    applicationId: inApp.id,
    type: 'aml_kyc',
    jurisdiction: 'IN',
    status: 'passed',
    provider: 'cibil',
    resultSummary: 'KYC verified via Aadhaar + PAN',
    performedAt: '2026-02-21T07:00:00Z',
  },
  {
    id: 'comp-in-002',
    applicationId: inApp.id,
    type: 'rbi_compliance',
    jurisdiction: 'IN',
    status: 'passed',
    resultSummary: 'RBI priority sector lending norms met',
    performedAt: '2026-02-21T07:30:00Z',
  },
]);

// --- Singapore auto loan (draft) ---
const sgApp: InternationalLoanApplication = {
  id: 'intl-app-sg-001',
  status: 'draft',
  productId: 'sg-auto-loan',
  requestedAmountMinorUnits: 8000000, // 80,000.00 SGD
  currency: 'SGD',
  termMonths: 84,
  jurisdiction: 'SG',
  applicants: [
    {
      id: 'applicant-sg-001',
      firstName: 'Wei',
      lastName: 'Tan',
      email: 'w.tan@example.sg',
      role: 'primary',
      countryOfResidence: 'SG',
      nationality: 'SG',
    },
  ],
  createdAt: '2026-03-14T03:00:00Z',
  updatedAt: '2026-03-14T03:00:00Z',
};
MOCK_APPLICATIONS.set(sgApp.id, sgApp);

MOCK_COMPLIANCE.set(sgApp.id, [
  {
    id: 'comp-sg-001',
    applicationId: sgApp.id,
    type: 'mas_compliance',
    jurisdiction: 'SG',
    status: 'pending',
    resultSummary: 'MAS TDSR check pending',
    performedAt: '2026-03-14T03:05:00Z',
  },
]);

// Seed a document for the UK application
const seedDoc: InternationalLoanDocument = {
  id: 'doc-uk-001',
  applicationId: ukApp.id,
  category: 'identity',
  documentTypeLabel: 'UK Passport',
  jurisdiction: 'GB',
  language: 'en',
  fileName: 'passport_whitfield.pdf',
  mimeType: 'application/pdf',
  verified: true,
  uploadedAt: '2026-03-01T10:30:00Z',
  expiresAt: '2032-06-15T00:00:00Z',
};
MOCK_DOCUMENTS.set(seedDoc.id, seedDoc);

// =============================================================================
// ADAPTER
// =============================================================================

export class MockInternationalLoanOriginationAdapter implements InternationalLoanOriginationAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock International Loan Origination (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // APPLICATIONS
  // ---------------------------------------------------------------------------

  async getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse> {
    const app = MOCK_APPLICATIONS.get(request.applicationId);
    if (!app) {
      throw new Error(`Application not found: ${request.applicationId}`);
    }
    return { application: { ...app } };
  }

  async createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    const id = generateId();
    const now = new Date().toISOString();

    const application: InternationalLoanApplication = {
      id,
      status: 'submitted',
      productId: request.productId,
      requestedAmountMinorUnits: request.requestedAmountMinorUnits,
      currency: request.currency,
      termMonths: request.termMonths,
      jurisdiction: request.jurisdiction,
      additionalJurisdictions: request.additionalJurisdictions,
      applicants: [
        {
          id: generateId(),
          firstName: request.applicant.firstName,
          lastName: request.applicant.lastName,
          email: request.applicant.email,
          phone: request.applicant.phone,
          role: 'primary',
          countryOfResidence: request.applicant.countryOfResidence,
          nationality: request.applicant.nationality,
        },
        ...(request.coApplicant
          ? [{
              id: generateId(),
              firstName: request.coApplicant.firstName,
              lastName: request.coApplicant.lastName,
              email: request.coApplicant.email,
              phone: request.coApplicant.phone,
              role: 'co_applicant' as const,
              countryOfResidence: request.coApplicant.countryOfResidence,
              nationality: request.coApplicant.nationality,
            }]
          : []),
      ],
      createdAt: now,
      updatedAt: now,
    };

    MOCK_APPLICATIONS.set(id, application);
    return { application };
  }

  async listApplications(request: ListApplicationsRequest): Promise<ListApplicationsResponse> {
    let apps = Array.from(MOCK_APPLICATIONS.values());

    if (request.status) {
      apps = apps.filter(a => a.status === request.status);
    }
    if (request.jurisdiction) {
      apps = apps.filter(a => a.jurisdiction === request.jurisdiction);
    }
    if (request.currency) {
      apps = apps.filter(a => a.currency === request.currency);
    }

    const total = apps.length;
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 50;
    const paged = apps.slice(offset, offset + limit);

    return { applications: paged, total };
  }

  // ---------------------------------------------------------------------------
  // CREDIT ASSESSMENT
  // ---------------------------------------------------------------------------

  async getCreditAssessment(request: GetCreditAssessmentRequest): Promise<GetCreditAssessmentResponse> {
    const assessment = MOCK_ASSESSMENTS.get(request.applicationId);
    if (!assessment) {
      throw new Error(`Credit assessment not found for application: ${request.applicationId}`);
    }
    return { assessment: { ...assessment } };
  }

  // ---------------------------------------------------------------------------
  // COMPLIANCE CHECKS
  // ---------------------------------------------------------------------------

  async getComplianceChecks(request: GetComplianceChecksRequest): Promise<GetComplianceChecksResponse> {
    const checks = MOCK_COMPLIANCE.get(request.applicationId);
    if (!checks) {
      return { checks: [] };
    }
    return { checks: checks.map(c => ({ ...c })) };
  }

  // ---------------------------------------------------------------------------
  // DOCUMENTS
  // ---------------------------------------------------------------------------

  async getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse> {
    const doc = MOCK_DOCUMENTS.get(request.documentId);
    if (!doc) {
      throw new Error(`Document not found: ${request.documentId}`);
    }
    return { document: { ...doc } };
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const documentId = generateId();

    const doc: InternationalLoanDocument = {
      id: documentId,
      applicationId: request.applicationId,
      category: request.category,
      documentTypeLabel: request.documentTypeLabel,
      jurisdiction: request.jurisdiction,
      language: request.language,
      fileName: request.fileName,
      fileContent: request.fileContent,
      mimeType: request.mimeType,
      verified: false,
      uploadedAt: new Date().toISOString(),
      expiresAt: request.expiresAt,
    };

    MOCK_DOCUMENTS.set(documentId, doc);
    return { documentId };
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    const doc = MOCK_DOCUMENTS.get(request.documentId);
    if (!doc) {
      throw new Error(`Document not found: ${request.documentId}`);
    }

    if (request.fileName !== undefined) doc.fileName = request.fileName;
    if (request.fileContent !== undefined) doc.fileContent = request.fileContent;
    if (request.mimeType !== undefined) doc.mimeType = request.mimeType;
    if (request.verified !== undefined) doc.verified = request.verified;
    if (request.expiresAt !== undefined) doc.expiresAt = request.expiresAt;

    MOCK_DOCUMENTS.set(request.documentId, doc);
    return { documentId: request.documentId };
  }
}
