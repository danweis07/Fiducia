/**
 * Application-Level PII Encryption
 *
 * Provides AES-256-GCM encryption for restricted PII fields (SSN, account
 * numbers, DOB, etc.) beyond database-level encryption-at-rest.
 *
 * Usage:
 *   const encrypted = await piiEncrypt('123-45-6789', tenantId);
 *   const decrypted = await piiDecrypt(encrypted, tenantId);
 *
 * Key derivation:
 *   A master key (from PII_ENCRYPTION_KEY env var) is combined with the
 *   tenant ID using HKDF to produce a per-tenant data encryption key.
 *   This ensures tenant data isolation even at the cryptographic level.
 *
 * Format:
 *   Base64(IV || ciphertext || authTag)
 *   IV: 12 bytes, ciphertext: variable, authTag: 16 bytes
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12;
const TAG_LENGTH = 128; // bits

// Validate PII encryption key at module load time
const _masterKeyHex: string | undefined =
  (typeof Deno !== 'undefined' ? Deno.env.get('PII_ENCRYPTION_KEY') : undefined)
  ?? (typeof process !== 'undefined' ? (process as Record<string, Record<string, string>>).env?.PII_ENCRYPTION_KEY : undefined);

if (_masterKeyHex && !/^[0-9a-fA-F]{64}$/.test(_masterKeyHex)) {
  console.error('PII_ENCRYPTION_KEY must be exactly 64 hex characters (256-bit key)');
}

/**
 * Derive a per-tenant encryption key from the master key using HKDF.
 */
async function deriveKey(tenantId: string): Promise<CryptoKey> {
  if (!_masterKeyHex) {
    throw new Error('PII_ENCRYPTION_KEY environment variable is not set');
  }
  const masterKeyHex = _masterKeyHex;

  // Import master key as raw key material for HKDF
  const masterKeyBytes = hexToBytes(masterKeyHex);
  const masterKey = await crypto.subtle.importKey(
    'raw',
    masterKeyBytes,
    'HKDF',
    false,
    ['deriveKey'],
  );

  // Derive a tenant-specific key
  const salt = new TextEncoder().encode(`fiducia-pii-${tenantId}`);

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('pii-field-encryption'),
    },
    masterKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt a PII string value.
 * Returns a base64-encoded string containing IV + ciphertext + auth tag.
 */
export async function piiEncrypt(plaintext: string, tenantId: string): Promise<string> {
  const key = await deriveKey(tenantId);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded,
  );

  // Combine IV + ciphertext (which includes the auth tag in WebCrypto)
  const combined = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_LENGTH);

  return bytesToBase64(combined);
}

/**
 * Decrypt a PII string value.
 * Expects the base64-encoded format produced by piiEncrypt.
 */
export async function piiDecrypt(encrypted: string, tenantId: string): Promise<string> {
  const key = await deriveKey(tenantId);
  const combined = base64ToBytes(encrypted);

  if (combined.length < IV_LENGTH + 1) {
    throw new Error('Invalid encrypted PII data: too short');
  }

  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Encrypt an object's specified fields in place.
 * Non-string fields and missing fields are skipped.
 */
export async function encryptFields(
  obj: Record<string, unknown>,
  fields: string[],
  tenantId: string,
): Promise<Record<string, unknown>> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      result[field] = await piiEncrypt(value, tenantId);
    }
  }
  return result;
}

/**
 * Decrypt an object's specified fields in place.
 * Non-string fields and missing fields are skipped.
 */
export async function decryptFields(
  obj: Record<string, unknown>,
  fields: string[],
  tenantId: string,
): Promise<Record<string, unknown>> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        result[field] = await piiDecrypt(value, tenantId);
      } catch {
        // Field may not be encrypted (migration period) — leave as-is
      }
    }
  }
  return result;
}

// =============================================================================
// ENCODING HELPERS
// =============================================================================

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** PII field classification — fields that should be encrypted at the application level */
export const RESTRICTED_PII_FIELDS = {
  users: ['ssn', 'tax_id', 'date_of_birth', 'drivers_license_number'],
  accounts: ['account_number'],
  beneficiaries: ['account_number', 'routing_number'],
  kyc: ['ssn', 'tax_id', 'document_number', 'date_of_birth'],
} as const;
