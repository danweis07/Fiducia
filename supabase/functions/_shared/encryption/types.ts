/**
 * Types for Envelope Encryption
 *
 * Shared type definitions for the field-level envelope encryption system.
 */

/** Encrypted envelope containing wrapped DEK and ciphertext */
export interface EncryptedEnvelope {
  /** Key identifier for rotation support */
  keyId: string;
  /** Base64-encoded initialization vector (12 bytes) */
  iv: string;
  /** Base64-encoded ciphertext (without auth tag) */
  ciphertext: string;
  /** Base64-encoded authentication tag (16 bytes, from AES-GCM) */
  tag: string;
  /** Envelope format version */
  version: number;
  /** Base64-encoded wrapped DEK (encrypted with KEK via AES-KW) */
  wrappedDek: string;
}

/** Validation status for envelope integrity checks */
export interface ValidationStatus {
  /** Whether the envelope is structurally valid */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** The envelope version detected */
  version?: number;
  /** The key ID referenced */
  keyId?: string;
}
