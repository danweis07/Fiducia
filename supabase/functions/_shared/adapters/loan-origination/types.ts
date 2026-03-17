/**
 * Loan Origination Adapter Interface
 *
 * Defines the contract for loan origination system integrations.
 * Supports LoanVantage (Jack Henry) and other LOS providers.
 *
 * Core flows:
 *   1. Get application → retrieve a loan application by ID
 *   2. Create application → submit a new loan application
 *   3. Get document → retrieve a document by ID
 *   4. Create document → attach a document to an application or applicant
 *   5. Update document → modify an existing document record
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// LOAN APPLICATION
// =============================================================================

export type LoanApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'conditionally_approved'
  | 'denied'
  | 'withdrawn'
  | 'funded';

export interface LoanApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: 'primary' | 'co_applicant' | 'guarantor';
}

export interface LoanApplication {
  /** Application ID (provider-assigned) */
  id: string;
  /** Application status */
  status: LoanApplicationStatus;
  /** Product identifier in LOS */
  productId: string;
  /** Requested loan amount in cents */
  requestedAmountCents: number;
  /** Approved amount in cents (if approved) */
  approvedAmountCents?: number;
  /** Loan term in months */
  termMonths?: number;
  /** Interest rate in basis points (if available) */
  interestRateBps?: number;
  /** Applicants on the application */
  applicants: LoanApplicant[];
  /** Decision date */
  decisionDate?: string;
  /** Decision notes */
  decisionNotes?: string;
  /** When the application was created */
  createdAt: string;
  /** When the application was last updated */
  updatedAt: string;
}

// =============================================================================
// DOCUMENTS
// =============================================================================

export type DocumentEntityType = 'Party' | 'Loan';
export type DocumentEntityContext = 'Applicant' | 'Application';

export interface DocumentEntity {
  id: string;
  context: DocumentEntityContext;
}

export interface DocumentFile {
  fileName: string;
  fileContent: string;
}

export interface LoanDocument {
  /** Document ID (provider-assigned) */
  idDocument: string;
  /** Document template type identifier */
  documentTemplateType: number;
  /** Entity type the document is linked to */
  documentEntityType: DocumentEntityType;
  /** Entity reference */
  documentEntity: DocumentEntity;
  /** Statement date */
  statementDate?: string;
  /** Due date */
  dueDate?: string;
  /** Requested date */
  requestedDate?: string;
  /** Attached file (optional) */
  documentFile?: DocumentFile;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface GetApplicationRequest {
  /** LOS application ID */
  applicationId: string;
  /** Institution ID for routing */
  institutionId: string;
  /** Environment (PROD, TEST, QA) */
  environmentId: string;
  /** Product ID (e.g., jha-loanvantage) */
  productId: string;
}

export interface GetApplicationResponse {
  application: LoanApplication;
}

export interface CreateApplicationRequest {
  /** Institution ID */
  institutionId: string;
  /** Environment */
  environmentId: string;
  /** Product ID */
  productId: string;
  /** Requested loan amount in cents */
  requestedAmountCents: number;
  /** Loan term in months */
  termMonths?: number;
  /** Primary applicant info */
  applicant: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  /** Co-applicant info (optional) */
  coApplicant?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  /** Provider-specific extra fields */
  additionalFields?: Record<string, unknown>;
}

export interface CreateApplicationResponse {
  application: LoanApplication;
}

export interface GetDocumentRequest {
  /** Document ID */
  documentId: string;
  /** Institution ID */
  institutionId: string;
  /** Environment */
  environmentId: string;
  /** Product ID */
  productId: string;
}

export interface GetDocumentResponse {
  document: LoanDocument;
}

export interface CreateDocumentRequest {
  /** Institution ID */
  institutionId: string;
  /** Environment */
  environmentId: string;
  /** Product ID */
  productId: string;
  /** Document ID (optional; provider generates if omitted) */
  idDocument?: string;
  /** Document template type (required) */
  documentTemplateType: number;
  /** Entity type: Party (applicant) or Loan (application) */
  documentEntityType: DocumentEntityType;
  /** Entity reference */
  documentEntity: DocumentEntity;
  /** Statement date */
  statementDate?: string;
  /** Due date */
  dueDate?: string;
  /** Requested date */
  requestedDate?: string;
  /** File attachment (optional — can be provided later via update) */
  documentFile?: DocumentFile;
}

export interface CreateDocumentResponse {
  idDocument: string;
}

export interface UpdateDocumentRequest {
  /** Document ID */
  documentId: string;
  /** Institution ID */
  institutionId: string;
  /** Environment */
  environmentId: string;
  /** Product ID */
  productId: string;
  /** Updated file content */
  documentFile?: DocumentFile;
  /** Updated statement date */
  statementDate?: string;
  /** Updated due date */
  dueDate?: string;
}

export interface UpdateDocumentResponse {
  idDocument: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface LoanOriginationAdapter extends BaseAdapter {
  /** Retrieve a loan application by ID */
  getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse>;

  /** Create a new loan application */
  createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse>;

  /** Retrieve a document by ID */
  getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse>;

  /** Create a new document record */
  createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse>;

  /** Update an existing document record */
  updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse>;
}
