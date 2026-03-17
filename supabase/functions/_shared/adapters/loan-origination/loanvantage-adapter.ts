// TODO: Provisional integration — not yet validated in production.
/**
 * LoanVantage Adapter (Jack Henry)
 *
 * Integrates with the LoanVantage Open API for loan origination.
 * API base: https://jxdmz.jackhenry.com/jx-api
 *
 * Authentication: X-AuthenticationProductCredential header (JWT).
 * All requests require X-Request-ID (UUID) for correlation.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
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
  LoanApplicant,
  LoanDocument,
} from './types.ts';

// =============================================================================
// HELPERS
// =============================================================================

function generateUUID(): string {
  return crypto.randomUUID();
}

function buildBasePath(institutionId: string, environmentId: string, productId: string): string {
  return `/v1/institutions/${encodeURIComponent(institutionId)}/environments/${encodeURIComponent(environmentId)}/products/${encodeURIComponent(productId)}`;
}

function buildHeaders(productCredential: string, requestId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': requestId ?? generateUUID(),
    'X-AuthenticationProductCredential': `jwt:${productCredential}`,
    'X-FaultOverride': 'false',
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class LoanVantageAdapter implements LoanOriginationAdapter {
  readonly config: AdapterConfig = {
    id: 'loanvantage',
    name: 'LoanVantage (Jack Henry)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 45000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private readonly baseUrl: string;
  private readonly productCredential: string;

  constructor() {
    this.baseUrl = Deno.env.get('LOANVANTAGE_API_URL') ?? 'https://jxdmz.jackhenry.com/jx-api';
    this.productCredential = Deno.env.get('LOANVANTAGE_PRODUCT_CREDENTIAL') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    const healthy = !!this.productCredential;
    return {
      adapterId: this.config.id,
      healthy,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
      errorMessage: healthy ? undefined : 'LOANVANTAGE_PRODUCT_CREDENTIAL not configured',
    };
  }

  // ---------------------------------------------------------------------------
  // APPLICATION
  // ---------------------------------------------------------------------------

  async getApplication(request: GetApplicationRequest): Promise<GetApplicationResponse> {
    const path = buildBasePath(request.institutionId, request.environmentId, request.productId);
    const url = `${this.baseUrl}${path}/Application/${encodeURIComponent(request.applicationId)}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: buildHeaders(this.productCredential),
    });

    const body = await response.json();
    this.checkResponse(response, body);

    return { application: this.mapApplication(body) };
  }

  async createApplication(request: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    const path = buildBasePath(request.institutionId, request.environmentId, request.productId);
    const url = `${this.baseUrl}${path}/Application`;

    const payload = {
      requestedAmount: request.requestedAmountCents / 100,
      termMonths: request.termMonths,
      applicant: {
        firstName: request.applicant.firstName,
        lastName: request.applicant.lastName,
        email: request.applicant.email,
        phone: request.applicant.phone,
        role: 'primary',
      },
      ...(request.coApplicant && {
        coApplicant: {
          firstName: request.coApplicant.firstName,
          lastName: request.coApplicant.lastName,
          email: request.coApplicant.email,
          phone: request.coApplicant.phone,
          role: 'co_applicant',
        },
      }),
      ...(request.additionalFields ?? {}),
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: buildHeaders(this.productCredential),
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    this.checkResponse(response, body);

    return { application: this.mapApplication(body) };
  }

  // ---------------------------------------------------------------------------
  // DOCUMENTS
  // ---------------------------------------------------------------------------

  async getDocument(request: GetDocumentRequest): Promise<GetDocumentResponse> {
    const path = buildBasePath(request.institutionId, request.environmentId, request.productId);
    const url = `${this.baseUrl}${path}/Documents/${encodeURIComponent(request.documentId)}`;

    const response = await this.fetchWithTimeout(url, {
      method: 'GET',
      headers: buildHeaders(this.productCredential),
    });

    const body = await response.json();
    this.checkResponse(response, body);

    return { document: this.mapDocument(body) };
  }

  async createDocument(request: CreateDocumentRequest): Promise<CreateDocumentResponse> {
    const path = buildBasePath(request.institutionId, request.environmentId, request.productId);
    const url = `${this.baseUrl}${path}/Document`;

    const payload = {
      ...(request.idDocument && { idDocument: request.idDocument }),
      documentTemplateType: request.documentTemplateType,
      documentEntityType: request.documentEntityType,
      documentEntity: {
        id: request.documentEntity.id,
        context: request.documentEntity.context,
      },
      ...(request.statementDate && { statementDate: request.statementDate }),
      ...(request.dueDate && { dueDate: request.dueDate }),
      ...(request.requestedDate && { requestedDate: request.requestedDate }),
      ...(request.documentFile && {
        documentFile: {
          fileName: request.documentFile.fileName,
          fileContent: request.documentFile.fileContent,
        },
      }),
    };

    const response = await this.fetchWithTimeout(url, {
      method: 'POST',
      headers: buildHeaders(this.productCredential),
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    this.checkResponse(response, body);

    return { idDocument: body.idDocument };
  }

  async updateDocument(request: UpdateDocumentRequest): Promise<UpdateDocumentResponse> {
    const path = buildBasePath(request.institutionId, request.environmentId, request.productId);
    const url = `${this.baseUrl}${path}/Documents/${encodeURIComponent(request.documentId)}`;

    const payload: Record<string, unknown> = {};
    if (request.documentFile) {
      payload.documentFile = {
        fileName: request.documentFile.fileName,
        fileContent: request.documentFile.fileContent,
      };
    }
    if (request.statementDate) payload.statementDate = request.statementDate;
    if (request.dueDate) payload.dueDate = request.dueDate;

    const response = await this.fetchWithTimeout(url, {
      method: 'PUT',
      headers: buildHeaders(this.productCredential),
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    this.checkResponse(response, body);

    return { idDocument: body.idDocument ?? request.documentId };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL HELPERS
  // ---------------------------------------------------------------------------

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout.requestTimeoutMs);

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private checkResponse(response: Response, body: Record<string, unknown>): void {
    if (!response.ok) {
      const msgStatus = body.MessageStatus as Record<string, unknown> | undefined;
      const description = (msgStatus?.Description as string)
        ?? (body.Description as string)
        ?? `LoanVantage API error: ${response.status}`;
      throw new Error(description);
    }
  }

  private mapApplication(raw: Record<string, unknown>): LoanApplication {
    const applicants: LoanApplicant[] = [];

    if (raw.applicant) {
      const a = raw.applicant as Record<string, unknown>;
      applicants.push({
        id: (a.id as string) ?? generateUUID(),
        firstName: (a.firstName as string) ?? '',
        lastName: (a.lastName as string) ?? '',
        email: a.email as string | undefined,
        phone: a.phone as string | undefined,
        role: 'primary',
      });
    }
    if (raw.coApplicant) {
      const c = raw.coApplicant as Record<string, unknown>;
      applicants.push({
        id: (c.id as string) ?? generateUUID(),
        firstName: (c.firstName as string) ?? '',
        lastName: (c.lastName as string) ?? '',
        email: c.email as string | undefined,
        phone: c.phone as string | undefined,
        role: 'co_applicant',
      });
    }

    const requestedAmount = Number(raw.requestedAmount ?? raw.RequestedAmount ?? 0);
    const approvedAmount = raw.approvedAmount ?? raw.ApprovedAmount;

    return {
      id: (raw.id ?? raw.Id ?? raw.applicationId ?? raw.ApplicationId) as string,
      status: this.mapStatus((raw.status ?? raw.Status) as string),
      productId: (raw.productId ?? raw.ProductId ?? '') as string,
      requestedAmountCents: Math.round(requestedAmount * 100),
      approvedAmountCents: approvedAmount != null ? Math.round(Number(approvedAmount) * 100) : undefined,
      termMonths: raw.termMonths as number | undefined,
      interestRateBps: raw.interestRateBps as number | undefined,
      applicants,
      decisionDate: raw.decisionDate as string | undefined,
      decisionNotes: raw.decisionNotes as string | undefined,
      createdAt: (raw.createdAt ?? raw.CreatedAt ?? new Date().toISOString()) as string,
      updatedAt: (raw.updatedAt ?? raw.UpdatedAt ?? new Date().toISOString()) as string,
    };
  }

  private mapStatus(status: string | undefined): LoanApplication['status'] {
    if (!status) return 'submitted';
    const normalized = status.toLowerCase().replace(/[\s-]/g, '_');
    const statusMap: Record<string, LoanApplication['status']> = {
      draft: 'draft',
      submitted: 'submitted',
      in_review: 'in_review',
      pending: 'in_review',
      approved: 'approved',
      conditionally_approved: 'conditionally_approved',
      denied: 'denied',
      declined: 'denied',
      withdrawn: 'withdrawn',
      funded: 'funded',
      closed: 'funded',
    };
    return statusMap[normalized] ?? 'submitted';
  }

  private mapDocument(raw: Record<string, unknown>): LoanDocument {
    const entity = (raw.documentEntity ?? {}) as Record<string, unknown>;
    const file = raw.documentFile as Record<string, unknown> | undefined;

    return {
      idDocument: (raw.idDocument ?? raw.IdDocument) as string,
      documentTemplateType: Number(raw.documentTemplateType ?? raw.DocumentTemplateType ?? 0),
      documentEntityType: (raw.documentEntityType ?? raw.DocumentEntityType ?? 'Loan') as LoanDocument['documentEntityType'],
      documentEntity: {
        id: (entity.id ?? entity.Id ?? '') as string,
        context: (entity.context ?? entity.Context ?? 'Application') as LoanDocument['documentEntity']['context'],
      },
      statementDate: raw.statementDate as string | undefined,
      dueDate: raw.dueDate as string | undefined,
      requestedDate: raw.requestedDate as string | undefined,
      documentFile: file ? {
        fileName: (file.fileName ?? file.FileName) as string,
        fileContent: (file.fileContent ?? file.FileContent) as string,
      } : undefined,
    };
  }
}
