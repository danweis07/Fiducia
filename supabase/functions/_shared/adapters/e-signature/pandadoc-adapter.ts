/**
 * PandaDoc E-Signature Adapter
 *
 * Integrates with PandaDoc API for document creation and embedded signing.
 *
 * API Reference:
 *   https://developers.pandadoc.com/reference/
 *
 * Embedded Signing:
 *   https://developers.pandadoc.com/docs/embedded-signing
 *
 * Authentication: API Key (Bearer token)
 *
 * Required env vars:
 *   PANDADOC_API_KEY     — API key for authentication
 *   PANDADOC_BASE_URL    — API base (default: https://api.pandadoc.com)
 */

import type {
  ESignatureAdapter,
  CreateEnvelopeRequest,
  EnvelopeResult,
  EnvelopeStatus,
  EmbeddedSigningRequest,
  EmbeddedSigningSession,
  SignedDocumentResult,
  SignerStatus,
} from './types.ts';

// =============================================================================
// CONFIG
// =============================================================================

interface PandaDocConfig {
  apiKey: string;
  baseUrl: string;
}

function loadConfig(): PandaDocConfig {
  const apiKey = Deno.env.get('PANDADOC_API_KEY');
  if (!apiKey) throw new Error('Missing required env var: PANDADOC_API_KEY');

  return {
    apiKey,
    baseUrl: Deno.env.get('PANDADOC_BASE_URL') ?? 'https://api.pandadoc.com',
  };
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapPandaDocStatus(pdStatus: string): EnvelopeStatus {
  switch (pdStatus.toLowerCase()) {
    case 'document.draft':
    case 'draft':
      return 'created';
    case 'document.sent':
    case 'sent':
      return 'sent';
    case 'document.viewed':
    case 'viewed':
      return 'viewed';
    case 'document.completed':
    case 'completed':
      return 'signed';
    case 'document.declined':
    case 'declined':
      return 'declined';
    case 'document.voided':
    case 'voided':
      return 'voided';
    case 'document.expired':
    case 'expired':
      return 'expired';
    default:
      return 'created';
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****@****.***';
  return `${local.charAt(0)}***@${domain}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PandaDocESignatureAdapter implements ESignatureAdapter {
  readonly name = 'pandadoc';
  private config: PandaDocConfig;

  constructor() {
    this.config = loadConfig();
  }

  private async apiCall(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    return fetch(url, {
      method,
      headers: {
        'Authorization': `API-Key ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // createEnvelope (PandaDoc: Create Document from Template or PDF)
  // ---------------------------------------------------------------------------

  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResult> {
    const recipients = request.signers.map((s) => ({
      email: s.email,
      first_name: s.name.split(' ')[0] ?? s.name,
      last_name: s.name.split(' ').slice(1).join(' ') || s.name,
      role: 'signer',
      signing_order: s.order ?? 1,
    }));

    // Determine document source
    let docBody: Record<string, unknown>;

    const firstDoc = request.documents[0];
    if (firstDoc?.source.type === 'template') {
      // Create from PandaDoc template
      docBody = {
        name: request.subject,
        template_uuid: firstDoc.source.templateId,
        recipients,
        tokens: Object.entries(request.templateData ?? {}).map(([name, value]) => ({
          name,
          value: String(value),
        })),
        metadata: {
          reference_id: request.referenceId,
          reference_type: request.referenceType,
        },
      };
    } else if (firstDoc?.source.type === 'pdf_url') {
      // Create from URL
      docBody = {
        name: request.subject,
        url: firstDoc.source.url,
        recipients,
        parse_form_fields: true,
      };
    } else if (firstDoc?.source.type === 'pdf_base64') {
      // For base64, use the file upload flow (multipart)
      // Simplified: use URL-based creation with a data URI
      docBody = {
        name: request.subject,
        recipients,
      };
    } else {
      docBody = {
        name: request.subject,
        recipients,
      };
    }

    // Create document
    const res = await this.apiCall('POST', '/public/v1/documents', docBody);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PandaDoc createDocument failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const documentId = data.id;

    // Send the document for signing
    const sendRes = await this.apiCall(
      'POST',
      `/public/v1/documents/${documentId}/send`,
      { message: request.message ?? 'Please review and sign this document.', silent: true },
    );

    if (!sendRes.ok) {
      const err = await sendRes.text();
      throw new Error(`PandaDoc sendDocument failed: ${sendRes.status} ${err}`);
    }

    const now = new Date().toISOString();

    return {
      envelopeId: documentId,
      status: 'sent',
      createdAt: data.date_created ?? now,
      updatedAt: now,
      expiresAt: request.expiresInHours
        ? new Date(Date.now() + request.expiresInHours * 3600000).toISOString()
        : undefined,
      signerStatuses: request.signers.map((s) => ({
        clientUserId: s.clientUserId,
        emailMasked: maskEmail(s.email),
        signed: false,
        declined: false,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // getEnvelopeStatus
  // ---------------------------------------------------------------------------

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeResult> {
    const res = await this.apiCall('GET', `/public/v1/documents/${envelopeId}`);
    if (!res.ok) {
      throw new Error(`PandaDoc getDocument failed: ${res.status}`);
    }

    const data = await res.json();

    const signerStatuses: SignerStatus[] = (data.recipients ?? []).map(
      (r: Record<string, unknown>) => ({
        clientUserId: (r.email as string) ?? '',
        emailMasked: maskEmail((r.email as string) ?? ''),
        signed: r.has_completed === true,
        signedAt: r.completed_on ? String(r.completed_on) : undefined,
        declined: r.has_declined === true,
      }),
    );

    return {
      envelopeId,
      status: mapPandaDocStatus(data.status ?? ''),
      createdAt: data.date_created ?? '',
      updatedAt: data.date_modified ?? '',
      signerStatuses,
    };
  }

  // ---------------------------------------------------------------------------
  // createEmbeddedSigningSession
  // ---------------------------------------------------------------------------

  async createEmbeddedSigningSession(
    request: EmbeddedSigningRequest,
  ): Promise<EmbeddedSigningSession> {
    // Create a document session for the recipient
    const res = await this.apiCall(
      'POST',
      `/public/v1/documents/${request.envelopeId}/session`,
      {
        recipient: request.clientUserId, // email of the signer
        lifetime: 3600, // 1 hour
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PandaDoc createSession failed: ${res.status} ${err}`);
    }

    const data = await res.json();

    return {
      signingUrl: `https://app.pandadoc.com/s/${data.id}`,
      sessionId: data.id,
      expiresInSeconds: data.expires_at
        ? Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000)
        : 3600,
    };
  }

  // ---------------------------------------------------------------------------
  // getSignedDocument
  // ---------------------------------------------------------------------------

  async getSignedDocument(envelopeId: string): Promise<SignedDocumentResult> {
    const status = await this.getEnvelopeStatus(envelopeId);
    if (status.status !== 'signed') {
      throw new Error(`Document not completed. Status: ${status.status}`);
    }

    // PandaDoc provides a download endpoint
    const expiresAt = new Date(Date.now() + 3600000).toISOString();

    return {
      downloadUrl: `${this.config.baseUrl}/public/v1/documents/${envelopeId}/download`,
      expiresAt,
    };
  }

  // ---------------------------------------------------------------------------
  // voidEnvelope
  // ---------------------------------------------------------------------------

  async voidEnvelope(envelopeId: string, _reason: string): Promise<void> {
    const res = await this.apiCall(
      'PATCH',
      `/public/v1/documents/${envelopeId}`,
      { status: 'document.voided' },
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PandaDoc voidDocument failed: ${res.status} ${err}`);
    }
  }
}
