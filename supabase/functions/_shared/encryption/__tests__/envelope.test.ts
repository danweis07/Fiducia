/**
 * Envelope Encryption — Security Tests
 *
 * Tests for AES-256-GCM envelope encryption used to protect PII fields
 * (SSN, account numbers, etc.) at rest.
 *
 * Uses the Web Crypto API (crypto.subtle) which is available in
 * Node 20+ and Deno runtimes.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// ---------------------------------------------------------------------------
// INLINE IMPLEMENTATION (to be extracted to envelope.ts)
// The module under test will export these. For now, we define them inline
// so the tests are self-contained and validate the cryptographic contract.
// ---------------------------------------------------------------------------

interface EncryptedEnvelope {
  keyId: string;
  iv: string;        // base64
  ciphertext: string; // base64
  tag: string;        // base64
  version: number;
}

async function deriveKeyFromSecret(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('fiducia-envelope-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptField(
  plaintext: string,
  keyId: string,
  keyMaterial: CryptoKey,
): Promise<EncryptedEnvelope> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    keyMaterial,
    encoder.encode(plaintext),
  );

  // AES-GCM appends the auth tag to the ciphertext
  const encryptedBytes = new Uint8Array(encrypted);
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);

  return {
    keyId,
    iv: toBase64(iv.buffer),
    ciphertext: toBase64(ciphertextBytes.buffer),
    tag: toBase64(tagBytes.buffer),
    version: 1,
  };
}

async function decryptField(
  envelope: EncryptedEnvelope,
  keyMaterial: CryptoKey,
): Promise<string> {
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  const tag = fromBase64(envelope.tag);

  // Reconstruct the combined ciphertext + tag buffer
  const combined = new Uint8Array(ciphertext.length + tag.length);
  combined.set(ciphertext, 0);
  combined.set(tag, ciphertext.length);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    keyMaterial,
    combined,
  );

  return new TextDecoder().decode(decrypted);
}

// ===========================================================================
// TEST SUITE
// ===========================================================================

describe('Envelope Encryption (AES-256-GCM)', () => {
  let key: CryptoKey;
  let wrongKey: CryptoKey;

  beforeAll(async () => {
    key = await deriveKeyFromSecret('test-master-key-32-chars-long!!!');
    wrongKey = await deriveKeyFromSecret('wrong-key-totally-different-!!??');
  });

  // -------------------------------------------------------------------------
  // ROUND-TRIP TESTS
  // -------------------------------------------------------------------------

  describe('encrypt/decrypt round-trip', () => {
    it('round-trips a Social Security Number', async () => {
      const ssn = '123-45-6789';
      const envelope = await encryptField(ssn, 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe(ssn);
    });

    it('round-trips an account number', async () => {
      const acctNum = '9876543210';
      const envelope = await encryptField(acctNum, 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe(acctNum);
    });

    it('round-trips a card number', async () => {
      const cardNum = '4111111111111111';
      const envelope = await encryptField(cardNum, 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe(cardNum);
    });

    it('round-trips unicode content', async () => {
      const unicodeStr = 'Nombre: Jose Garcia-Lopez';
      const envelope = await encryptField(unicodeStr, 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe(unicodeStr);
    });

    it('round-trips a long string (address)', async () => {
      const address = '12345 Very Long Street Name, Apartment 678B, Some City, State 90210-1234';
      const envelope = await encryptField(address, 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe(address);
    });
  });

  // -------------------------------------------------------------------------
  // CIPHERTEXT SECURITY
  // -------------------------------------------------------------------------

  describe('ciphertext properties', () => {
    it('encrypted output is different from plaintext', async () => {
      const plaintext = '123-45-6789';
      const envelope = await encryptField(plaintext, 'key-v1', key);

      // Neither ciphertext nor IV should contain the plaintext
      expect(envelope.ciphertext).not.toContain(plaintext);
      expect(envelope.iv).not.toContain(plaintext);
      expect(envelope.tag).not.toContain(plaintext);

      // The base64 ciphertext should not accidentally decode to the plaintext
      const decoded = new TextDecoder().decode(fromBase64(envelope.ciphertext));
      expect(decoded).not.toBe(plaintext);
    });

    it('encrypting the same plaintext twice produces different ciphertext', async () => {
      const plaintext = '123-45-6789';
      const envelope1 = await encryptField(plaintext, 'key-v1', key);
      const envelope2 = await encryptField(plaintext, 'key-v1', key);

      // Different random IVs should produce different ciphertext
      expect(envelope1.iv).not.toBe(envelope2.iv);
      expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
    });

    it('ciphertext does not leak PII in any envelope field', async () => {
      const ssn = '987654321';
      const envelope = await encryptField(ssn, 'key-v1', key);

      // Check all string fields in the envelope
      const allFields = [envelope.keyId, envelope.iv, envelope.ciphertext, envelope.tag];
      for (const field of allFields) {
        expect(field).not.toContain(ssn);
      }
    });
  });

  // -------------------------------------------------------------------------
  // WRONG KEY
  // -------------------------------------------------------------------------

  describe('decryption with wrong key', () => {
    it('fails when decrypted with a different key', async () => {
      const envelope = await encryptField('sensitive-data', 'key-v1', key);

      await expect(decryptField(envelope, wrongKey)).rejects.toThrow();
    });

    it('does not return the original plaintext with wrong key', async () => {
      const plaintext = 'SSN-123-45-6789';
      const envelope = await encryptField(plaintext, 'key-v1', key);

      try {
        const result = await decryptField(envelope, wrongKey);
        // If somehow it doesn't throw, the result must not match
        expect(result).not.toBe(plaintext);
      } catch {
        // Expected: decryption should fail with wrong key
        expect(true).toBe(true);
      }
    });
  });

  // -------------------------------------------------------------------------
  // KEY VERSIONING
  // -------------------------------------------------------------------------

  describe('key versioning', () => {
    it('envelope contains the keyId used for encryption', async () => {
      const envelope = await encryptField('data', 'key-v2', key);
      expect(envelope.keyId).toBe('key-v2');
    });

    it('different keyIds are preserved in the envelope', async () => {
      const env1 = await encryptField('data', 'key-v1', key);
      const env2 = await encryptField('data', 'key-v2', key);
      expect(env1.keyId).toBe('key-v1');
      expect(env2.keyId).toBe('key-v2');
    });

    it('version field is set to 1', async () => {
      const envelope = await encryptField('data', 'key-v1', key);
      expect(envelope.version).toBe(1);
    });

    it('envelope has all required fields', async () => {
      const envelope = await encryptField('test', 'key-v1', key);
      expect(envelope).toHaveProperty('keyId');
      expect(envelope).toHaveProperty('iv');
      expect(envelope).toHaveProperty('ciphertext');
      expect(envelope).toHaveProperty('tag');
      expect(envelope).toHaveProperty('version');
      expect(typeof envelope.iv).toBe('string');
      expect(typeof envelope.ciphertext).toBe('string');
      expect(typeof envelope.tag).toBe('string');
    });
  });

  // -------------------------------------------------------------------------
  // EMPTY STRING
  // -------------------------------------------------------------------------

  describe('empty string handling', () => {
    it('encrypts and decrypts empty string', async () => {
      const envelope = await encryptField('', 'key-v1', key);
      const decrypted = await decryptField(envelope, key);
      expect(decrypted).toBe('');
    });

    it('empty string still produces ciphertext (not empty)', async () => {
      const envelope = await encryptField('', 'key-v1', key);
      // Even empty plaintext should produce a non-empty envelope
      // (IV + auth tag are always present)
      expect(envelope.iv.length).toBeGreaterThan(0);
      expect(envelope.tag.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // TAMPER DETECTION
  // -------------------------------------------------------------------------

  describe('tamper detection', () => {
    it('detects modified ciphertext', async () => {
      const envelope = await encryptField('sensitive', 'key-v1', key);

      // Tamper with the ciphertext
      const tampered = { ...envelope, ciphertext: envelope.ciphertext + 'AA' };
      await expect(decryptField(tampered, key)).rejects.toThrow();
    });

    it('detects modified IV', async () => {
      const envelope = await encryptField('sensitive', 'key-v1', key);

      // Change the IV
      const ivBytes = fromBase64(envelope.iv);
      ivBytes[0] ^= 0xFF;
      const tampered = { ...envelope, iv: toBase64(ivBytes.buffer) };
      await expect(decryptField(tampered, key)).rejects.toThrow();
    });

    it('detects modified auth tag', async () => {
      const envelope = await encryptField('sensitive', 'key-v1', key);

      // Change the tag
      const tagBytes = fromBase64(envelope.tag);
      tagBytes[0] ^= 0xFF;
      const tampered = { ...envelope, tag: toBase64(tagBytes.buffer) };
      await expect(decryptField(tampered, key)).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // KEY DERIVATION
  // -------------------------------------------------------------------------

  describe('deriveKeyFromSecret', () => {
    it('derives a CryptoKey from a secret string', async () => {
      const derived = await deriveKeyFromSecret('my-secret-key');
      expect(derived).toBeDefined();
      expect(derived.type).toBe('secret');
    });

    it('same secret produces the same derived key (deterministic)', async () => {
      const key1 = await deriveKeyFromSecret('deterministic-secret');
      const key2 = await deriveKeyFromSecret('deterministic-secret');

      // Encrypt with key1, decrypt with key2 should work
      const envelope = await encryptField('test-data', 'k1', key1);
      const decrypted = await decryptField(envelope, key2);
      expect(decrypted).toBe('test-data');
    });

    it('different secrets produce different keys', async () => {
      const keyA = await deriveKeyFromSecret('secret-alpha');
      const keyB = await deriveKeyFromSecret('secret-bravo');

      const envelope = await encryptField('data', 'k1', keyA);
      await expect(decryptField(envelope, keyB)).rejects.toThrow();
    });
  });
});
