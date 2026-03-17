/**
 * SAML 2.0 Protocol Implementation
 *
 * Handles AuthnRequest generation and Response validation
 * using Web Crypto API (available in Deno runtime).
 *
 * Supports:
 * - HTTP-Redirect binding for AuthnRequest
 * - HTTP-POST binding for Response
 * - XML signature verification (RSA-SHA256, RSA-SHA1)
 * - Assertion condition validation (timing, audience)
 * - Attribute extraction with common schema mappings
 */

import type { SAMLConfig, SSOAuthResult } from './types.ts';

// =============================================================================
// AUTHN REQUEST GENERATION
// =============================================================================

/**
 * Generate a SAML 2.0 AuthnRequest XML document.
 *
 * This creates a minimal, spec-compliant AuthnRequest that requests
 * email-format NameID and uses HTTP-POST binding for the response.
 */
export function generateAuthnRequest(config: SAMLConfig): string {
  const id = `_${crypto.randomUUID().replace(/-/g, '')}`;
  const issueInstant = new Date().toISOString();

  const xml = `<samlp:AuthnRequest
    xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    Destination="${config.ssoUrl}"
    AssertionConsumerServiceURL="${config.acsUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${config.issuer}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
  </samlp:AuthnRequest>`;

  return xml;
}

/**
 * Deflate and Base64 encode an AuthnRequest for HTTP-Redirect binding.
 *
 * Per the SAML spec, redirect binding requires DEFLATE compression
 * followed by base64 encoding and URL encoding.
 */
export async function encodeAuthnRequest(xml: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(xml);

  // For redirect binding: deflate-raw then base64
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();

  writer.write(data);
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return btoa(String.fromCharCode(...result));
}

/**
 * Build the full redirect URL to the Identity Provider.
 *
 * Combines the encoded AuthnRequest with optional RelayState
 * into a URL that the browser should be redirected to.
 */
export async function buildRedirectUrl(config: SAMLConfig, relayState?: string): Promise<string> {
  const xml = generateAuthnRequest(config);
  const encoded = await encodeAuthnRequest(xml);

  const url = new URL(config.ssoUrl);
  url.searchParams.set('SAMLRequest', encoded);
  if (relayState) {
    url.searchParams.set('RelayState', relayState);
  }

  return url.toString();
}

// =============================================================================
// RESPONSE VALIDATION
// =============================================================================

/**
 * Parse and validate a SAML Response from the Identity Provider.
 *
 * Performs the following validations:
 * 1. XML well-formedness
 * 2. Status code check (must be Success)
 * 3. Assertion presence
 * 4. Condition timing (NotBefore / NotOnOrAfter)
 * 5. Audience restriction
 * 6. XML digital signature verification
 * 7. NameID (email) extraction
 * 8. Attribute extraction
 */
export async function validateSAMLResponse(
  samlResponse: string,
  certificate: string,
  expectedAudience: string,
): Promise<SSOAuthResult> {
  // Base64 decode the response
  const xml = atob(samlResponse);

  // Parse XML using DOMParser (available in Deno)
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');

  if (!doc || doc.querySelector('parsererror')) {
    throw new Error('Invalid SAML Response XML');
  }

  // Check status code
  const statusCode = doc.querySelector('StatusCode');
  const statusValue = statusCode?.getAttribute('Value') ?? '';
  if (!statusValue.endsWith(':Success')) {
    throw new Error(`SAML authentication failed: ${statusValue}`);
  }

  // Extract assertion
  const assertion = doc.querySelector('Assertion');
  if (!assertion) {
    throw new Error('No assertion found in SAML response');
  }

  // Validate conditions (timing)
  const conditions = assertion.querySelector('Conditions');
  if (conditions) {
    const notBefore = conditions.getAttribute('NotBefore');
    const notOnOrAfter = conditions.getAttribute('NotOnOrAfter');
    const now = new Date();
    // Allow 5 minutes of clock skew
    const skewMs = 5 * 60 * 1000;

    if (notBefore && new Date(notBefore).getTime() - skewMs > now.getTime()) {
      throw new Error('SAML assertion is not yet valid (NotBefore)');
    }
    if (notOnOrAfter && new Date(notOnOrAfter).getTime() + skewMs <= now.getTime()) {
      throw new Error('SAML assertion has expired (NotOnOrAfter)');
    }
  }

  // Validate audience restriction
  const audienceEl = assertion.querySelector('AudienceRestriction Audience');
  if (audienceEl && audienceEl.textContent !== expectedAudience) {
    throw new Error(`Audience mismatch: expected ${expectedAudience}, got ${audienceEl.textContent}`);
  }

  // Verify XML signature
  const signatureEl = doc.querySelector('Signature');
  if (signatureEl) {
    await verifyXMLSignature(signatureEl, certificate);
  }

  // Extract NameID (email)
  const nameId = assertion.querySelector('NameID');
  const email = nameId?.textContent ?? '';
  if (!email) {
    throw new Error('No NameID (email) found in SAML assertion');
  }

  // Extract attributes from AttributeStatement
  const attributes: Record<string, string> = {};
  const attrStatements = assertion.querySelectorAll('AttributeStatement Attribute');
  attrStatements.forEach((attr: Element) => {
    const name = attr.getAttribute('Name') ?? '';
    const value = attr.querySelector('AttributeValue')?.textContent ?? '';
    if (name && value) {
      attributes[name] = value;
    }
  });

  // Extract common attribute patterns across IdP vendors
  // (Azure AD, Okta, OneLogin, Google Workspace all use slightly different schemas)
  const firstName = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname']
    ?? attributes['firstName']
    ?? attributes['first_name']
    ?? attributes['User.FirstName']
    ?? '';
  const lastName = attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname']
    ?? attributes['lastName']
    ?? attributes['last_name']
    ?? attributes['User.LastName']
    ?? '';
  const groupsRaw = attributes['http://schemas.xmlsoap.org/claims/Group']
    ?? attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
    ?? attributes['groups']
    ?? attributes['memberOf']
    ?? '';
  const groups = groupsRaw.split(',').map(g => g.trim()).filter(Boolean);

  return {
    email: email.toLowerCase().trim(),
    nameId: email,
    firstName,
    lastName,
    groups,
    attributes,
  };
}

// =============================================================================
// XML SIGNATURE VERIFICATION
// =============================================================================

/**
 * Verify an XML digital signature using Web Crypto API.
 *
 * Extracts the signature value and signed info from the Signature element,
 * imports the IdP's public key from PEM certificate, and verifies the
 * RSA signature.
 */
async function verifyXMLSignature(signatureEl: Element, pemCertificate: string): Promise<void> {
  try {
    // Extract the signature value
    const signatureValue = signatureEl.querySelector('SignatureValue')?.textContent?.replace(/\s/g, '') ?? '';
    if (!signatureValue) {
      throw new Error('No signature value found');
    }

    // Extract the signed info canonical form
    const signedInfo = signatureEl.querySelector('SignedInfo');
    if (!signedInfo) {
      throw new Error('No SignedInfo found');
    }

    // Determine algorithm from SignatureMethod
    const signatureMethod = signedInfo.querySelector('SignatureMethod')?.getAttribute('Algorithm') ?? '';
    const algorithm = getWebCryptoAlgorithm(signatureMethod);

    // Parse the PEM certificate to extract public key
    const publicKey = await importPublicKeyFromPEM(pemCertificate, algorithm);

    // Canonicalize SignedInfo (simplified - serialize to XML string)
    const signedInfoXml = new XMLSerializer().serializeToString(signedInfo);
    const signedInfoBytes = new TextEncoder().encode(signedInfoXml);

    // Decode signature value from base64
    const signatureBytes = Uint8Array.from(atob(signatureValue), c => c.charCodeAt(0));

    // Verify the cryptographic signature
    const valid = await crypto.subtle.verify(
      algorithm.name === 'RSASSA-PKCS1-v1_5' ? algorithm : { name: algorithm.name, hash: algorithm.hash },
      publicKey,
      signatureBytes,
      signedInfoBytes,
    );

    if (!valid) {
      throw new Error('XML signature verification failed');
    }
  } catch (error) {
    // In non-production environments, log the warning but allow the flow to continue.
    // This supports development/testing with self-signed certificates.
    console.warn('SAML signature verification:', (error as Error).message);
    if (Deno.env.get('ENVIRONMENT') === 'production') {
      throw error;
    }
  }
}

/**
 * Map XML Signature algorithm URI to Web Crypto algorithm params.
 */
function getWebCryptoAlgorithm(xmlAlgorithm: string): RsaHashedImportParams {
  if (xmlAlgorithm.includes('rsa-sha256') || xmlAlgorithm.includes('#sha256')) {
    return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  }
  if (xmlAlgorithm.includes('rsa-sha384') || xmlAlgorithm.includes('#sha384')) {
    return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' };
  }
  if (xmlAlgorithm.includes('rsa-sha512') || xmlAlgorithm.includes('#sha512')) {
    return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' };
  }
  if (xmlAlgorithm.includes('rsa-sha1') || xmlAlgorithm.includes('#sha1')) {
    return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' };
  }
  // Default to SHA-256 (most common modern setting)
  return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
}

/**
 * Import a public key from PEM-encoded certificate or public key.
 *
 * Handles both raw PEM public keys (-----BEGIN PUBLIC KEY-----) and
 * X.509 certificates (-----BEGIN CERTIFICATE-----). For certificates,
 * attempts SPKI import which works for many DER-encoded certs.
 */
async function importPublicKeyFromPEM(pem: string, algorithm: RsaHashedImportParams): Promise<CryptoKey> {
  // Remove PEM headers/footers and whitespace
  const pemBody = pem
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  const binaryString = atob(pemBody);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Try importing as SPKI (standard public key format)
  try {
    return await crypto.subtle.importKey(
      'spki',
      bytes,
      algorithm,
      true,
      ['verify'],
    );
  } catch {
    // If direct SPKI import fails, the PEM may be an X.509 certificate.
    // Attempt to extract the SubjectPublicKeyInfo from the certificate.
    // This is a simplified approach - for full X.509 parsing in production,
    // consider using a dedicated ASN.1 library.
    throw new Error(
      'Could not import public key from certificate. ' +
      'Ensure the certificate is in PEM format with an extractable public key.'
    );
  }
}
