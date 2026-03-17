/**
 * Mock Loan Origination Adapter
 *
 * Sandbox implementation for development and testing.
 * Returns realistic test data for loan applications and documents.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  LoanOriginationAdapter,
  GetApplicationRequest,
  GetApplicationResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  GetDocumentRequest,
  GetDocumentResponse,
  CreateDocumentRequest,
  CreateDocumentResponse,
  UpdateDocumentRequest,
  UpdateDocumentResponse,
  LoanApplication,
  LoanDocument,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_APPLICATIONS = new Map<string, LoanApplication>();
const MOCK_DOCUMENTS = new Map<string, LoanDocument>();

function generateId(): string {
  return crypto.randomUUID();
}

// Seed a sample application
const seedApp: LoanApplication = {
  id: 'app-mock-001',
  status: 'in_review',
  productId: 'jha-loanvantage',
  requestedAmountCents: 2500000,
  termMonths: 60,
  interestRateBps: 549,
  applicants: [
    { id: 'applicant-001', firstName: 'Jane', lastName: 'Doe', email: 'jane.doe@example.com', role: 'primary' },
  ],
  createdAt: '2026-03-10T14:30:00Z',
  updatedAt: '2026-03-12T09:15:00Z',
};
MOCK_APPLICATIONS.set(seedApp.id, seedApp);

// =============================================================================
// ADAPTER
// =============================================================================

export class MockLoanOriginationAdapter implements LoanOriginationAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Loan Origination (Sandbox)',
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

    const application: LoanApplication = {
      id,
      status: 'submitted',
      productId: request.productId,
      requestedAmountCents: request.requestedAmountCents,
      termMonths: request.termMonths,
      applicants: [
        {
          id: generateId(),
          firstName: request.applicant.firstName,
          lastName: request.applicant.lastName,
          email: request.applicant.email,
          phone: request.applicant.phone,
          role: 'primary',
        },
        ...(request.coApplicant
          ? [{
              id: generateId(),
              firstName: request.coApplicant.firstName,
              lastName: request.coApplicant.lastName,
              email: request.coApplicant.email,
              phone: request.coApplicant.phone,
              role: 'co_applicant' as const,
            }]
          : []),
      ],
      createdAt: now,
      updatedAt: now,
    };

    MOCK_APPLICATIONS.set(id, application);
    return { application };
  }

  async getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse> {
    const doc = MOCK_DOCUMENTS.get(request.documentId);
    if (!doc) {
      throw new Error(`Document not found: ${request.documentId}`);
    }
    return { document: { ...doc } };
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const idDocument = request.idDocument ?? generateId();

    const doc: LoanDocument = {
      idDocument,
      documentTemplateType: request.documentTemplateType,
      documentEntityType: request.documentEntityType,
      documentEntity: { ...request.documentEntity },
      statementDate: request.statementDate,
      dueDate: request.dueDate,
      requestedDate: request.requestedDate,
      documentFile: request.documentFile ? { ...request.documentFile } : undefined,
    };

    MOCK_DOCUMENTS.set(idDocument, doc);
    return { idDocument };
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    const doc = MOCK_DOCUMENTS.get(request.documentId);
    if (!doc) {
      throw new Error(`Document not found: ${request.documentId}`);
    }

    if (request.documentFile) {
      doc.documentFile = { ...request.documentFile };
    }
    if (request.statementDate) {
      doc.statementDate = request.statementDate;
    }
    if (request.dueDate) {
      doc.dueDate = request.dueDate;
    }

    MOCK_DOCUMENTS.set(request.documentId, doc);
    return { idDocument: request.documentId };
  }
}
