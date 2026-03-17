/**
 * International Loan Origination Adapter Interface
 *
 * Defines the contract for international loan origination system integrations.
 * Supports multi-country, multi-currency loan applications with jurisdiction-
 * specific compliance checks and credit assessment models (APAC/EU/UK).
 *
 * Core flows:
 *   1. Get application    -> retrieve an international loan application by ID
 *   2. Create application -> submit a new multi-jurisdiction loan application
 *   3. List applications  -> query applications with filters
 *   4. Get credit assessment -> retrieve credit assessment for an application
 *   5. Get compliance checks -> retrieve jurisdiction compliance checks
 *   6. Get document       -> retrieve a document by ID
 *   7. Create document    -> attach a localized document to an application
 *   8. Update document    -> modify an existing document record
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type LoanApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'compliance_review'
  | 'credit_assessment'
  | 'approved'
  | 'conditionally_approved'
  | 'denied'
  | 'withdrawn'
  | 'funded';

export type JurisdictionCode =
  | 'GB'   // United Kingdom
  | 'DE'   // Germany
  | 'FR'   // France
  | 'NL'   // Netherlands
  | 'IE'   // Ireland
  | 'IN'   // India
  | 'SG'   // Singapore
  | 'AU'   // Australia
  | 'HK'   // Hong Kong
  | 'JP'   // Japan
  | 'AE'   // UAE
  | 'US';  // United States (for cross-border)

/** ISO 4217 currency codes supported */
export type CurrencyCode =
  | 'GBP'
  | 'EUR'
  | 'INR'
  | 'SGD'
  | 'AUD'
  | 'HKD'
  | 'JPY'
  | 'AED'
  | 'USD';

export type CreditModelType =
  | 'uk_experian'
  | 'uk_equifax'
  | 'eu_schufa'
  | 'eu_banque_de_france'
  | 'in_cibil'
  | 'in_crif'
  | 'sg_cbs'
  | 'apac_generic'
  | 'us_fico';

export type ComplianceCheckType =
  | 'aml_kyc'
  | 'sanctions_screening'
  | 'pep_screening'
  | 'affordability'
  | 'regulatory_capital'
  | 'consumer_duty'         // UK FCA Consumer Duty
  | 'gdpr_consent'          // EU GDPR
  | 'rbi_compliance'        // India RBI
  | 'mas_compliance'        // Singapore MAS
  | 'cross_border_reporting';

export type ComplianceCheckStatus =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'review_required'
  | 'expired';

export type DocumentCategory =
  | 'identity'
  | 'address_proof'
  | 'income_proof'
  | 'tax_document'
  | 'employment_verification'
  | 'business_registration'
  | 'regulatory_filing'
  | 'consent_form'
  | 'collateral'
  | 'other';

// =============================================================================
// DOMAIN MODELS
// =============================================================================

export interface InternationalApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: 'primary' | 'co_applicant' | 'guarantor';
  /** ISO 3166-1 alpha-2 country of residence */
  countryOfResidence: JurisdictionCode;
  /** ISO 3166-1 alpha-2 nationality */
  nationality?: string;
  /** Tax identification number (masked in responses) */
  taxIdMasked?: string;
}

export interface InternationalLoanApplication {
  /** Application ID (provider-assigned) */
  id: string;
  /** Application status */
  status: LoanApplicationStatus;
  /** Product identifier in LOS */
  productId: string;
  /** Requested loan amount in minor currency units (cents/pence/paise) */
  requestedAmountMinorUnits: number;
  /** Approved amount in minor currency units (if approved) */
  approvedAmountMinorUnits?: number;
  /** ISO 4217 currency code */
  currency: CurrencyCode;
  /** Loan term in months */
  termMonths?: number;
  /** Interest rate in basis points (if available) */
  interestRateBps?: number;
  /** Primary jurisdiction for the loan */
  jurisdiction: JurisdictionCode;
  /** Additional jurisdictions involved (cross-border) */
  additionalJurisdictions?: JurisdictionCode[];
  /** Applicants on the application */
  applicants: InternationalApplicant[];
  /** Decision date */
  decisionDate?: string;
  /** Decision notes */
  decisionNotes?: string;
  /** When the application was created */
  createdAt: string;
  /** When the application was last updated */
  updatedAt: string;
}

export interface ComplianceCheck {
  /** Check ID */
  id: string;
  /** Application ID this check belongs to */
  applicationId: string;
  /** Type of compliance check */
  type: ComplianceCheckType;
  /** Jurisdiction this check applies to */
  jurisdiction: JurisdictionCode;
  /** Check status */
  status: ComplianceCheckStatus;
  /** Provider that performed the check */
  provider?: string;
  /** Human-readable result summary */
  resultSummary?: string;
  /** Expiry date of the check result */
  expiresAt?: string;
  /** When the check was performed */
  performedAt: string;
}

export interface CreditAssessment {
  /** Assessment ID */
  id: string;
  /** Application ID */
  applicationId: string;
  /** Credit model used */
  model: CreditModelType;
  /** Jurisdiction of the assessment */
  jurisdiction: JurisdictionCode;
  /** Credit score (provider-specific scale) */
  score?: number;
  /** Score band / rating (e.g., 'A', 'B+', 'Excellent') */
  scoreBand?: string;
  /** Debt-to-income ratio in basis points (e.g., 3500 = 35.00%) */
  debtToIncomeBps?: number;
  /** Recommended maximum loan amount in minor currency units */
  recommendedMaxMinorUnits?: number;
  /** Risk grade assigned */
  riskGrade?: string;
  /** Whether the applicant passed the credit threshold */
  passed: boolean;
  /** Notes or flags from the assessment */
  notes?: string;
  /** When the assessment was performed */
  assessedAt: string;
}

export interface InternationalLoanDocument {
  /** Document ID (provider-assigned) */
  id: string;
  /** Application ID */
  applicationId: string;
  /** Document category */
  category: DocumentCategory;
  /** Jurisdiction-specific document type label */
  documentTypeLabel: string;
  /** Jurisdiction this document satisfies */
  jurisdiction: JurisdictionCode;
  /** ISO 639-1 language code of the document */
  language: string;
  /** File name */
  fileName?: string;
  /** Base64-encoded file content (optional — may be stored externally) */
  fileContent?: string;
  /** MIME type */
  mimeType?: string;
  /** Whether the document has been verified */
  verified: boolean;
  /** When the document was uploaded */
  uploadedAt: string;
  /** When the document expires (e.g., identity docs) */
  expiresAt?: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface GetApplicationRequest {
  /** Application ID */
  applicationId: string;
  /** Tenant ID for routing */
  tenantId: string;
}

export interface GetApplicationResponse {
  application: InternationalLoanApplication;
}

export interface CreateApplicationRequest {
  /** Tenant ID */
  tenantId: string;
  /** Product ID */
  productId: string;
  /** Requested loan amount in minor currency units */
  requestedAmountMinorUnits: number;
  /** ISO 4217 currency code */
  currency: CurrencyCode;
  /** Primary jurisdiction */
  jurisdiction: JurisdictionCode;
  /** Additional jurisdictions (cross-border) */
  additionalJurisdictions?: JurisdictionCode[];
  /** Loan term in months */
  termMonths?: number;
  /** Primary applicant */
  applicant: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    countryOfResidence: JurisdictionCode;
    nationality?: string;
  };
  /** Co-applicant (optional) */
  coApplicant?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    countryOfResidence: JurisdictionCode;
    nationality?: string;
  };
  /** Provider-specific extra fields */
  additionalFields?: Record<string, unknown>;
}

export interface CreateApplicationResponse {
  application: InternationalLoanApplication;
}

export interface ListApplicationsRequest {
  /** Tenant ID */
  tenantId: string;
  /** Filter by status */
  status?: LoanApplicationStatus;
  /** Filter by jurisdiction */
  jurisdiction?: JurisdictionCode;
  /** Filter by currency */
  currency?: CurrencyCode;
  /** Pagination limit (default: 50) */
  limit?: number;
  /** Pagination offset (default: 0) */
  offset?: number;
}

export interface ListApplicationsResponse {
  applications: InternationalLoanApplication[];
  total: number;
}

export interface GetCreditAssessmentRequest {
  /** Application ID */
  applicationId: string;
  /** Tenant ID */
  tenantId: string;
}

export interface GetCreditAssessmentResponse {
  assessment: CreditAssessment;
}

export interface GetComplianceChecksRequest {
  /** Application ID */
  applicationId: string;
  /** Tenant ID */
  tenantId: string;
}

export interface GetComplianceChecksResponse {
  checks: ComplianceCheck[];
}

export interface GetDocumentRequest {
  /** Document ID */
  documentId: string;
  /** Tenant ID */
  tenantId: string;
}

export interface GetDocumentResponse {
  document: InternationalLoanDocument;
}

export interface CreateDocumentRequest {
  /** Tenant ID */
  tenantId: string;
  /** Application ID */
  applicationId: string;
  /** Document category */
  category: DocumentCategory;
  /** Jurisdiction-specific document type label */
  documentTypeLabel: string;
  /** Jurisdiction this document satisfies */
  jurisdiction: JurisdictionCode;
  /** ISO 639-1 language code */
  language: string;
  /** File name */
  fileName?: string;
  /** Base64-encoded file content */
  fileContent?: string;
  /** MIME type */
  mimeType?: string;
  /** Expiry date */
  expiresAt?: string;
}

export interface CreateDocumentResponse {
  documentId: string;
}

export interface UpdateDocumentRequest {
  /** Document ID */
  documentId: string;
  /** Tenant ID */
  tenantId: string;
  /** Updated file content */
  fileName?: string;
  /** Updated file content */
  fileContent?: string;
  /** Updated MIME type */
  mimeType?: string;
  /** Mark as verified */
  verified?: boolean;
  /** Updated expiry */
  expiresAt?: string;
}

export interface UpdateDocumentResponse {
  documentId: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface InternationalLoanOriginationAdapter extends BaseAdapter {
  /** Retrieve an international loan application by ID */
  getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse>;

  /** Create a new international loan application */
  createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse>;

  /** List applications with filters */
  listApplications(request: ListApplicationsRequest): Promise<ListApplicationsResponse>;

  /** Retrieve credit assessment for an application */
  getCreditAssessment(request: GetCreditAssessmentRequest): Promise<GetCreditAssessmentResponse>;

  /** Retrieve compliance checks for an application */
  getComplianceChecks(request: GetComplianceChecksRequest): Promise<GetComplianceChecksResponse>;

  /** Retrieve a document by ID */
  getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse>;

  /** Create a new document record */
  createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse>;

  /** Update an existing document record */
  updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse>;
}
