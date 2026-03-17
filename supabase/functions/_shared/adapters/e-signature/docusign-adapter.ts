/**
 * DocuSign E-Signature Adapter
 *
 * Integrates with DocuSign eSignature REST API v2.1 for document signing.
 * Supports both embedded signing (in-app iframe/redirect) and remote signing.
 *
 * API Reference:
 *   https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/
 *
 * Authentication: OAuth 2.0 JWT Bearer Grant
 *   https://developers.docusign.com/platform/auth/jwt/
 *
 * Required env vars:
 *   DOCUSIGN_BASE_URL       — API base (e.g., https://demo.docusign.net/restapi for sandbox)
 *   DOCUSIGN_ACCOUNT_ID     — DocuSign account ID
 *   DOCUSIGN_CLIENT_ID      — Integration key (OAuth client ID)
 *   DOCUSIGN_PRIVATE_KEY    — RSA private key for JWT grant (PEM)
 *   DOCUSIGN_USER_ID        — Impersonated user ID (for JWT grant)
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

interface DocuSignConfig {
  baseUrl: string;
  accountId: string;
  clientId: string;
  privateKey: string;
  userId: string;
}

function loadConfig(): DocuSignConfig {
  const get = (key: string): string => {
    const val = Deno.env.get(key);
    if (!val) throw new Error(`Missing required env var: ${key}`);
    return val;
  };
  return {
    baseUrl: get('DOCUSIGN_BASE_URL'),
    accountId: get('DOCUSIGN_ACCOUNT_ID'),
    clientId: get('DOCUSIGN_CLIENT_ID'),
    privateKey: get('DOCUSIGN_PRIVATE_KEY'),
    userId: get('DOCUSIGN_USER_ID'),
  };
}

// =============================================================================
// STATUS MAPPING
// =============================================================================

function mapDocuSignStatus(dsStatus: string): EnvelopeStatus {
  switch (dsStatus.toLowerCase()) {
    case 'created':
    case 'draft':
      return 'created';
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'viewed';
    case 'completed':
    case 'signed':
      return 'signed';
    case 'declined':
      return 'declined';
    case 'voided':
      return 'voided';
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

export class DocuSignESignatureAdapter implements ESignatureAdapter {
  readonly name = 'docusign';
  private config: DocuSignConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.config = loadConfig();
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 JWT Bearer Grant
  // ---------------------------------------------------------------------------

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    // Build JWT assertion
    const now = Math.floor(Date.now() / 1000);
    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      iss: this.config.clientId,
      sub: this.config.userId,
      aud: new URL(this.config.baseUrl).hostname.replace('demo.docusign.net', 'account-d.docusign.com').replace('docusign.net', 'account.docusign.com'),
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    }));

    // Sign JWT with RSA private key
    const key = await crypto.subtle.importKey(
      'pkcs8',
      this.pemToArrayBuffer(this.config.privateKey),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    const assertion = `${header}.${payload}.${sig}`;

    // Exchange JWT for access token
    const authHost = new URL(this.config.baseUrl).hostname
      .replace('demo.docusign.net', 'account-d.docusign.com')
      .replace('docusign.net', 'account.docusign.com');

    const tokenRes = await fetch(`https://${authHost}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`DocuSign OAuth failed: ${tokenRes.status} ${err}`);
    }

    const tokenData = await tokenRes.json();
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = Date.now() + (tokenData.expires_in - 60) * 1000;
    return this.accessToken!;
  }

  private pemToArrayBuffer(pem: string): ArrayBuffer {
    const b64 = pem
      .replace(/-----BEGIN [A-Z ]+-----/g, '')
      .replace(/-----END [A-Z ]+-----/g, '')
      .replace(/\s/g, '');
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private async apiCall(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res;
  }

  // ---------------------------------------------------------------------------
  // createEnvelope
  // ---------------------------------------------------------------------------

  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResult> {
    const recipients = {
      signers: request.signers.map((s, i) => ({
        clientUserId: s.clientUserId,
        name: s.name,
        email: s.email,
        recipientId: String(i + 1),
        routingOrder: String(s.order ?? i + 1),
        tabs: {
          signHereTabs: [
            { anchorString: '/sig/', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' },
          ],
          dateSignedTabs: [
            { anchorString: '/date/', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' },
          ],
        },
      })),
    };

    const documents = request.documents.map((doc, i) => {
      const base: Record<string, unknown> = {
        documentId: String(i + 1),
        name: doc.name,
      };
      if (doc.source.type === 'template') {
        // Use server-side template
        return { ...base, templateId: doc.source.templateId };
      } else if (doc.source.type === 'pdf_base64') {
        return {
          ...base,
          documentBase64: doc.source.base64,
          fileExtension: 'pdf',
        };
      } else if (doc.source.type === 'html') {
        return {
          ...base,
          documentBase64: btoa(doc.source.html),
          fileExtension: 'html',
        };
      }
      return base;
    });

    const envelopeBody = {
      emailSubject: request.subject,
      emailBlurb: request.message,
      recipients,
      documents,
      status: 'sent', // Send immediately
    };

    const res = await this.apiCall('POST', '/envelopes', envelopeBody);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DocuSign createEnvelope failed: ${res.status} ${err}`);
    }

    const data = await res.json();
    const now = new Date().toISOString();

    return {
      envelopeId: data.envelopeId,
      status: mapDocuSignStatus(data.status),
      createdAt: now,
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
    const res = await this.apiCall('GET', `/envelopes/${envelopeId}`);
    if (!res.ok) {
      throw new Error(`DocuSign getEnvelope failed: ${res.status}`);
    }

    const data = await res.json();

    // Get recipients for signer statuses
    const recipRes = await this.apiCall('GET', `/envelopes/${envelopeId}/recipients`);
    const recipData = recipRes.ok ? await recipRes.json() : { signers: [] };

    const signerStatuses: SignerStatus[] = (recipData.signers ?? []).map(
      (s: Record<string, string>) => ({
        clientUserId: s.clientUserId ?? '',
        emailMasked: maskEmail(s.email ?? ''),
        signed: s.status === 'completed',
        signedAt: s.signedDateTime ?? undefined,
        declined: s.status === 'declined',
      }),
    );

    return {
      envelopeId,
      status: mapDocuSignStatus(data.status),
      createdAt: data.createdDateTime ?? '',
      updatedAt: data.statusChangedDateTime ?? data.lastModifiedDateTime ?? '',
      signerStatuses,
    };
  }

  // ---------------------------------------------------------------------------
  // createEmbeddedSigningSession
  // ---------------------------------------------------------------------------

  async createEmbeddedSigningSession(
    request: EmbeddedSigningRequest,
  ): Promise<EmbeddedSigningSession> {
    // First, find the signer's details from the envelope
    const recipRes = await this.apiCall(
      'GET',
      `/envelopes/${request.envelopeId}/recipients`,
    );
    if (!recipRes.ok) {
      throw new Error(`DocuSign getRecipients failed: ${recipRes.status}`);
    }

    const recipData = await recipRes.json();
    const signer = (recipData.signers ?? []).find(
      (s: Record<string, string>) => s.clientUserId === request.clientUserId,
    );
    if (!signer) {
      throw new Error(`Signer not found: ${request.clientUserId}`);
    }

    // Create recipient view (embedded signing URL)
    const viewRes = await this.apiCall(
      'POST',
      `/envelopes/${request.envelopeId}/views/recipient`,
      {
        authenticationMethod: 'none',
        clientUserId: request.clientUserId,
        recipientId: signer.recipientId,
        userName: signer.name,
        email: signer.email,
        returnUrl: request.returnUrl,
      },
    );

    if (!viewRes.ok) {
      const err = await viewRes.text();
      throw new Error(`DocuSign createRecipientView failed: ${viewRes.status} ${err}`);
    }

    const viewData = await viewRes.json();

    return {
      signingUrl: viewData.url,
      expiresInSeconds: 300, // DocuSign embedded URLs expire in 5 minutes
    };
  }

  // ---------------------------------------------------------------------------
  // getSignedDocument
  // ---------------------------------------------------------------------------

  async getSignedDocument(envelopeId: string): Promise<SignedDocumentResult> {
    // Check envelope is completed
    const status = await this.getEnvelopeStatus(envelopeId);
    if (status.status !== 'signed') {
      throw new Error(`Envelope not completed. Status: ${status.status}`);
    }

    // Get combined document (all docs merged into one PDF)
    const res = await this.apiCall(
      'GET',
      `/envelopes/${envelopeId}/documents/combined`,
    );
    if (!res.ok) {
      throw new Error(`DocuSign getDocument failed: ${res.status}`);
    }

    // In a real implementation, we'd upload to storage and return a signed URL.
    // For now, return the API URL (requires auth, so caller must handle).
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    return {
      downloadUrl: `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/documents/combined`,
      expiresAt,
      auditCertificateUrl: `${this.config.baseUrl}/v2.1/accounts/${this.config.accountId}/envelopes/${envelopeId}/documents/certificate`,
    };
  }

  // ---------------------------------------------------------------------------
  // voidEnvelope
  // ---------------------------------------------------------------------------

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    const res = await this.apiCall('PUT', `/envelopes/${envelopeId}`, {
      status: 'voided',
      voidedReason: reason,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`DocuSign voidEnvelope failed: ${res.status} ${err}`);
    }
  }
}
