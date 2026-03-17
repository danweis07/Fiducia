/**
 * E-Signature Adapter — Types
 *
 * Defines the interface for electronic signature providers (DocuSign, PandaDoc).
 * Used in account opening, loan origination, and any flow requiring legally
 * binding disclosure acceptance or document signing.
 *
 * Supports two signing modes:
 * - Embedded signing: integrated into the app via iframe/redirect URL
 * - Remote signing: envelope sent via email for out-of-band signing
 *
 * Compliance: UETA, ESIGN Act, eIDAS (EU) compliant via provider guarantees.
 *
 * IMPORTANT: PII handling
 * - Signer email and name are sent to the provider for envelope creation
 * - Audit certificates are stored but never contain SSN/DOB
 * - Signed documents may contain PII — access controlled via signed URLs
 */

// =============================================================================
// ENVELOPE / DOCUMENT STATUS
// =============================================================================

export type EnvelopeStatus =
  | 'created'     // Envelope created, not yet sent/opened
  | 'sent'        // Sent to signer(s) via email
  | 'viewed'      // Opened by at least one signer
  | 'signed'      // All signers have signed
  | 'declined'    // Signer declined to sign
  | 'voided'      // Sender voided the envelope
  | 'expired';    // Envelope expired before completion

// =============================================================================
// SIGNER
// =============================================================================

export interface Signer {
  /** Unique client-side identifier for this signer */
  clientUserId: string;
  /** @pii Signer's full name */
  name: string;
  /** @pii Signer's email */
  email: string;
  /** Signing order (1-based, for multi-signer flows) */
  order?: number;
}

// =============================================================================
// DOCUMENT / TEMPLATE
// =============================================================================

export interface SigningDocument {
  /** Document identifier (template ID or file reference) */
  documentId: string;
  /** Human-readable document name */
  name: string;
  /** How the document content is provided */
  source: DocumentSource;
}

export type DocumentSource =
  | { type: 'template'; templateId: string }
  | { type: 'pdf_url'; url: string }
  | { type: 'pdf_base64'; base64: string; fileName: string }
  | { type: 'html'; html: string; fileName: string };

// =============================================================================
// CREATE ENVELOPE REQUEST
// =============================================================================

export interface CreateEnvelopeRequest {
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Idempotency key to prevent duplicate envelopes */
  idempotencyKey?: string;
  /** Subject line (shown in email and signing UI) */
  subject: string;
  /** Optional message to the signer */
  message?: string;
  /** The signer(s) */
  signers: Signer[];
  /** Documents to include in the envelope */
  documents: SigningDocument[];
  /** Template data to merge into documents (e.g., applicant name, date) */
  templateData?: Record<string, unknown>;
  /** URL to redirect to after signing (for embedded signing) */
  returnUrl?: string;
  /** Expiry in hours (default: 72) */
  expiresInHours?: number;
  /** Application or entity this envelope is associated with */
  referenceId?: string;
  /** Reference type (e.g., 'account_application', 'loan_application') */
  referenceType?: string;
}

// =============================================================================
// ENVELOPE RESULT
// =============================================================================

export interface EnvelopeResult {
  /** Provider's envelope/document ID */
  envelopeId: string;
  /** Current status */
  status: EnvelopeStatus;
  /** When the envelope was created */
  createdAt: string;
  /** When the envelope was last updated */
  updatedAt: string;
  /** When the envelope expires */
  expiresAt?: string;
  /** Per-signer status */
  signerStatuses: SignerStatus[];
}

export interface SignerStatus {
  clientUserId: string;
  /** Masked email for display */
  emailMasked: string;
  /** Whether this signer has signed */
  signed: boolean;
  /** When they signed (if applicable) */
  signedAt?: string;
  /** Whether they declined */
  declined: boolean;
}

// =============================================================================
// EMBEDDED SIGNING SESSION
// =============================================================================

export interface EmbeddedSigningRequest {
  /** The envelope to sign */
  envelopeId: string;
  /** The signer's client user ID (must match CreateEnvelopeRequest) */
  clientUserId: string;
  /** URL to redirect to after signing */
  returnUrl: string;
}

export interface EmbeddedSigningSession {
  /** URL to redirect the user to for signing, or iframe src */
  signingUrl: string;
  /** Session ID (for PandaDoc iframe integration) */
  sessionId?: string;
  /** How long the signing URL is valid (seconds) */
  expiresInSeconds: number;
}

// =============================================================================
// SIGNED DOCUMENT DOWNLOAD
// =============================================================================

export interface SignedDocumentResult {
  /** Signed PDF download URL (time-limited) */
  downloadUrl: string;
  /** URL expiry */
  expiresAt: string;
  /** Audit certificate URL (if available) */
  auditCertificateUrl?: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface ESignatureAdapter {
  /** Adapter identifier (e.g., "docusign", "pandadoc", "mock") */
  readonly name: string;

  /**
   * Create an envelope with documents for signing.
   * Returns the envelope ID and initial status.
   */
  createEnvelope(request: CreateEnvelopeRequest): Promise<EnvelopeResult>;

  /**
   * Get the current status of an envelope.
   */
  getEnvelopeStatus(envelopeId: string): Promise<EnvelopeResult>;

  /**
   * Generate an embedded signing URL/session for a specific signer.
   * The signer can view and sign the document inline in the app.
   */
  createEmbeddedSigningSession(
    request: EmbeddedSigningRequest,
  ): Promise<EmbeddedSigningSession>;

  /**
   * Get a signed copy of the completed document (PDF download).
   * Only available after all signers have signed.
   */
  getSignedDocument(envelopeId: string): Promise<SignedDocumentResult>;

  /**
   * Void/cancel an envelope that hasn't been completed yet.
   */
  voidEnvelope(envelopeId: string, reason: string): Promise<void>;
}
