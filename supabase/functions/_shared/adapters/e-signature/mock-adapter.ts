/**
 * Mock E-Signature Adapter
 *
 * In-memory mock for development and testing.
 * Simulates envelope creation and embedded signing.
 *
 * Deterministic behavior:
 * - Signer email containing "decline" → signer declines
 * - All others → auto-sign when embedded session is created
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

const envelopeStore = new Map<string, {
  request: CreateEnvelopeRequest;
  status: EnvelopeStatus;
  signerStatuses: SignerStatus[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}>();

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****@****.***';
  return `${local.charAt(0)}***@${domain}`;
}

export class MockESignatureAdapter implements ESignatureAdapter {
  readonly name = 'mock';

  async createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResult> {
    const envelopeId = `env_${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + (request.expiresInHours ?? 72) * 60 * 60 * 1000,
    ).toISOString();

    const signerStatuses: SignerStatus[] = request.signers.map((s) => ({
      clientUserId: s.clientUserId,
      emailMasked: maskEmail(s.email),
      signed: false,
      declined: false,
    }));

    envelopeStore.set(envelopeId, {
      request,
      status: 'created',
      signerStatuses,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    });

    return {
      envelopeId,
      status: 'created',
      createdAt: now,
      updatedAt: now,
      expiresAt,
      signerStatuses,
    };
  }

  async getEnvelopeStatus(envelopeId: string): Promise<EnvelopeResult> {
    const envelope = envelopeStore.get(envelopeId);
    if (!envelope) throw new Error(`Envelope not found: ${envelopeId}`);

    return {
      envelopeId,
      status: envelope.status,
      createdAt: envelope.createdAt,
      updatedAt: envelope.updatedAt,
      expiresAt: envelope.expiresAt,
      signerStatuses: envelope.signerStatuses,
    };
  }

  async createEmbeddedSigningSession(
    request: EmbeddedSigningRequest,
  ): Promise<EmbeddedSigningSession> {
    const envelope = envelopeStore.get(request.envelopeId);
    if (!envelope) throw new Error(`Envelope not found: ${request.envelopeId}`);

    // Mark as viewed
    envelope.status = 'viewed';
    envelope.updatedAt = new Date().toISOString();

    // Deterministic: auto-sign unless email contains "decline"
    const signer = envelope.signerStatuses.find(
      (s) => s.clientUserId === request.clientUserId,
    );
    if (!signer) throw new Error(`Signer not found: ${request.clientUserId}`);

    const originalSigner = envelope.request.signers.find(
      (s) => s.clientUserId === request.clientUserId,
    );
    if (originalSigner?.email.includes('decline')) {
      signer.declined = true;
      envelope.status = 'declined';
    } else {
      signer.signed = true;
      signer.signedAt = new Date().toISOString();

      // Check if all signers have signed
      const allSigned = envelope.signerStatuses.every((s) => s.signed);
      if (allSigned) {
        envelope.status = 'signed';
      }
    }

    envelope.updatedAt = new Date().toISOString();
    envelopeStore.set(request.envelopeId, envelope);

    return {
      signingUrl: `https://mock-esign.example.com/sign/${request.envelopeId}?signer=${request.clientUserId}&returnUrl=${encodeURIComponent(request.returnUrl)}`,
      sessionId: `sess_${crypto.randomUUID()}`,
      expiresInSeconds: 3600,
    };
  }

  async getSignedDocument(envelopeId: string): Promise<SignedDocumentResult> {
    const envelope = envelopeStore.get(envelopeId);
    if (!envelope) throw new Error(`Envelope not found: ${envelopeId}`);
    if (envelope.status !== 'signed') {
      throw new Error(`Envelope not fully signed. Status: ${envelope.status}`);
    }

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    return {
      downloadUrl: `https://mock-esign.example.com/download/${envelopeId}/signed.pdf`,
      expiresAt,
      auditCertificateUrl: `https://mock-esign.example.com/download/${envelopeId}/audit.pdf`,
    };
  }

  async voidEnvelope(envelopeId: string, _reason: string): Promise<void> {
    const envelope = envelopeStore.get(envelopeId);
    if (!envelope) throw new Error(`Envelope not found: ${envelopeId}`);
    if (envelope.status === 'signed') {
      throw new Error('Cannot void a completed envelope');
    }
    envelope.status = 'voided';
    envelope.updatedAt = new Date().toISOString();
    envelopeStore.set(envelopeId, envelope);
  }
}
