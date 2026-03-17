/**
 * Envelope Encryption for Restricted PII
 *
 * Implements field-level envelope encryption using AES-256-GCM.
 * Designed for Deno/Supabase Edge Functions using Web Crypto API.
 *
 * Key hierarchy:
 * - KEK (Key Encryption Key): Derived from tenant secret or KMS, wraps DEKs
 * - DEK (Data Encryption Key): Random per-field, encrypts actual data
 *
 * Pattern:
 * 1. Generate random 256-bit DEK
 * 2. Encrypt plaintext with DEK using AES-256-GCM
 * 3. Wrap DEK with KEK using AES-KW
 * 4. Store wrapped DEK + ciphertext + IV + tag together
 */

import type { EncryptedEnvelope, ValidationStatus } from "./types.ts";

export type { EncryptedEnvelope, ValidationStatus };

const CURRENT_VERSION = 1;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const DEK_BITS = 256;
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

// --- Base64 helpers (Deno-compatible, no Node.js requires) ---

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Key derivation ---

/**
 * Derive a CryptoKey from a secret string (for use as KEK).
 * Uses PBKDF2 with 100,000 iterations and SHA-256.
 *
 * The derived key is suitable for AES-KW (key wrapping).
 * If no salt is provided, a random 16-byte salt is generated.
 * Callers must persist the salt alongside encrypted data for decryption.
 */
export async function deriveKeyFromSecret(
  secret: string,
  salt?: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  const effectiveSalt = salt ?? crypto.getRandomValues(new Uint8Array(SALT_BYTES));

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: effectiveSalt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-KW", length: DEK_BITS },
    false,
    ["wrapKey", "unwrapKey"],
  );
}

// --- Core encryption ---

/**
 * Encrypt a plaintext field using envelope encryption.
 *
 * 1. Generates a random 256-bit DEK
 * 2. Encrypts plaintext with DEK (AES-256-GCM, random 12-byte IV)
 * 3. Wraps DEK with KEK (AES-KW)
 * 4. Returns EncryptedEnvelope with all components
 */
export async function encryptField(
  plaintext: string,
  keyId: string,
  kek: CryptoKey,
): Promise<EncryptedEnvelope> {
  // Generate random DEK
  const dek = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: DEK_BITS },
    true, // extractable so we can wrap it
    ["encrypt"],
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));

  // Encrypt plaintext with DEK
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: TAG_BYTES * 8 },
    dek,
    plaintextBytes,
  );

  // Web Crypto AES-GCM appends the auth tag to the ciphertext.
  // Split into ciphertext and tag (last 16 bytes).
  const encrypted = new Uint8Array(encryptedBuffer);
  const ciphertext = encrypted.slice(0, encrypted.length - TAG_BYTES);
  const tag = encrypted.slice(encrypted.length - TAG_BYTES);

  // Wrap DEK with KEK using AES-KW
  const wrappedDekBuffer = await crypto.subtle.wrapKey("raw", dek, kek, "AES-KW");

  return {
    keyId,
    iv: uint8ToBase64(iv),
    ciphertext: uint8ToBase64(ciphertext),
    tag: uint8ToBase64(tag),
    version: CURRENT_VERSION,
    wrappedDek: uint8ToBase64(new Uint8Array(wrappedDekBuffer)),
  };
}

// --- Core decryption ---

/**
 * Decrypt an encrypted envelope.
 *
 * 1. Unwraps DEK using KEK (AES-KW)
 * 2. Reassembles ciphertext + tag
 * 3. Decrypts with DEK (AES-256-GCM)
 */
export async function decryptField(
  envelope: EncryptedEnvelope,
  kek: CryptoKey,
): Promise<string> {
  if (envelope.version !== CURRENT_VERSION) {
    throw new Error(
      `Unsupported envelope version: ${envelope.version}. Expected ${CURRENT_VERSION}.`,
    );
  }

  // Unwrap DEK
  const wrappedDek = base64ToUint8(envelope.wrappedDek);
  const dek = await crypto.subtle.unwrapKey(
    "raw",
    wrappedDek,
    kek,
    "AES-KW",
    { name: "AES-GCM", length: DEK_BITS },
    false,
    ["decrypt"],
  );

  // Decode components
  const iv = base64ToUint8(envelope.iv);
  const ciphertext = base64ToUint8(envelope.ciphertext);
  const tag = base64ToUint8(envelope.tag);

  // Reassemble ciphertext + tag (Web Crypto expects them concatenated)
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv, tagLength: TAG_BYTES * 8 },
    dek,
    combined,
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

// --- Batch operations ---

/**
 * Encrypt multiple PII fields at once.
 * Each field gets its own random DEK for isolation.
 */
export async function encryptPIIFields(
  fields: Record<string, string>,
  keyId: string,
  kek: CryptoKey,
): Promise<Record<string, EncryptedEnvelope>> {
  const entries = Object.entries(fields);
  const results = await Promise.all(
    entries.map(async ([key, value]) => {
      const envelope = await encryptField(value, keyId, kek);
      return [key, envelope] as const;
    }),
  );
  return Object.fromEntries(results);
}

/**
 * Decrypt multiple PII fields at once.
 */
export async function decryptPIIFields(
  fields: Record<string, EncryptedEnvelope>,
  kek: CryptoKey,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields);
  const results = await Promise.all(
    entries.map(async ([key, envelope]) => {
      const plaintext = await decryptField(envelope, kek);
      return [key, plaintext] as const;
    }),
  );
  return Object.fromEntries(results);
}

// --- Serialization ---

/**
 * Serialize an EncryptedEnvelope to a JSON string for database storage.
 */
export function serializeEnvelope(envelope: EncryptedEnvelope): string {
  return JSON.stringify(envelope);
}

/**
 * Deserialize an EncryptedEnvelope from a stored JSON string.
 * Validates structure before returning.
 */
export function deserializeEnvelope(serialized: string): EncryptedEnvelope {
  const parsed = JSON.parse(serialized);
  const validation = validateEnvelope(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid envelope: ${validation.error}`);
  }
  return parsed as EncryptedEnvelope;
}

// --- Validation ---

/**
 * Validate that an object has the expected EncryptedEnvelope structure.
 */
export function validateEnvelope(obj: unknown): ValidationStatus {
  if (obj === null || typeof obj !== "object") {
    return { valid: false, error: "Envelope must be a non-null object" };
  }

  const envelope = obj as Record<string, unknown>;

  if (typeof envelope.keyId !== "string" || envelope.keyId.length === 0) {
    return { valid: false, error: "Missing or empty keyId" };
  }

  if (typeof envelope.iv !== "string" || envelope.iv.length === 0) {
    return { valid: false, error: "Missing or empty iv" };
  }

  if (typeof envelope.ciphertext !== "string") {
    return { valid: false, error: "Missing ciphertext" };
  }

  if (typeof envelope.tag !== "string" || envelope.tag.length === 0) {
    return { valid: false, error: "Missing or empty tag" };
  }

  if (typeof envelope.version !== "number") {
    return { valid: false, error: "Missing or invalid version" };
  }

  if (typeof envelope.wrappedDek !== "string" || envelope.wrappedDek.length === 0) {
    return { valid: false, error: "Missing or empty wrappedDek" };
  }

  return {
    valid: true,
    version: envelope.version as number,
    keyId: envelope.keyId as string,
  };
}
