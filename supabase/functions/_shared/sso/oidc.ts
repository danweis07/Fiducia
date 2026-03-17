/**
 * OpenID Connect Protocol Implementation
 *
 * Handles the Authorization Code Flow with PKCE:
 * 1. Build authorization URL with state, nonce, and PKCE challenge
 * 2. Exchange authorization code for tokens
 * 3. Validate ID token (JWT signature, claims, nonce)
 *
 * Supports RS256/RS384/RS512 signing algorithms.
 * Uses Web Crypto API for all cryptographic operations.
 */

import type { OIDCConfig, OIDCDiscovery, SSOAuthResult } from './types.ts';

// =============================================================================
// DISCOVERY
// =============================================================================

/**
 * Fetch and validate an OIDC Discovery document.
 *
 * Appends /.well-known/openid-configuration if not already present.
 * Caches are left to the caller (edge function request lifecycle is short).
 */
export async function fetchDiscovery(discoveryUrl: string): Promise<OIDCDiscovery> {
  const url = discoveryUrl.endsWith('/.well-known/openid-configuration')
    ? discoveryUrl
    : `${discoveryUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch OIDC discovery document: ${response.status} ${response.statusText}`);
  }

  const doc = await response.json();

  // Validate required fields per OpenID Connect Discovery 1.0
  if (!doc.authorization_endpoint || !doc.token_endpoint || !doc.jwks_uri || !doc.issuer) {
    throw new Error('OIDC discovery document is missing required fields (authorization_endpoint, token_endpoint, jwks_uri, issuer)');
  }

  return doc as OIDCDiscovery;
}

// =============================================================================
// PKCE (Proof Key for Code Exchange)
// =============================================================================

/**
 * Generate a PKCE code verifier and corresponding S256 challenge.
 *
 * The code verifier is a high-entropy random string (43-128 chars).
 * The challenge is the SHA-256 hash of the verifier, base64url-encoded.
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);

  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = base64UrlEncode(new Uint8Array(hash));

  return { codeVerifier, codeChallenge };
}

// =============================================================================
// AUTHORIZATION
// =============================================================================

/**
 * Build the authorization URL for initiating the OIDC flow.
 *
 * Includes PKCE challenge, state parameter (CSRF protection),
 * and nonce (replay protection). Returns both the URL and the
 * code verifier that must be stored for the callback.
 */
export async function buildAuthorizationUrl(
  config: OIDCConfig,
  state: string,
  nonce: string,
): Promise<{ url: string; codeVerifier: string }> {
  const discovery = await fetchDiscovery(config.discoveryUrl);
  const { codeVerifier, codeChallenge } = await generatePKCE();

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const url = `${discovery.authorization_endpoint}?${params.toString()}`;
  return { url, codeVerifier };
}

// =============================================================================
// TOKEN EXCHANGE
// =============================================================================

/**
 * Exchange an authorization code for tokens.
 *
 * Sends the code, PKCE verifier, and client credentials to the
 * token endpoint. Returns the id_token, access_token, and optional
 * refresh_token.
 */
export async function exchangeCode(
  config: OIDCConfig,
  code: string,
  codeVerifier: string,
): Promise<{ idToken: string; accessToken: string; refreshToken?: string }> {
  const discovery = await fetchDiscovery(config.discoveryUrl);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code,
    code_verifier: codeVerifier,
  });

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${errorBody}`);
  }

  const tokens = await response.json();

  if (!tokens.id_token) {
    throw new Error('Token response missing id_token. Ensure "openid" scope is requested.');
  }

  return {
    idToken: tokens.id_token,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  };
}

// =============================================================================
// ID TOKEN VALIDATION
// =============================================================================

/**
 * Validate a JWT ID token per the OIDC Core specification.
 *
 * Performs the following checks:
 * 1. JWT format (3 parts)
 * 2. Signature verification against JWKS
 * 3. Issuer match
 * 4. Audience match (client_id)
 * 5. Expiration check
 * 6. Issued-at sanity check (not too far in the future)
 * 7. Nonce match (replay protection)
 * 8. Email claim presence
 */
export async function validateIdToken(
  idToken: string,
  config: OIDCConfig,
  nonce: string,
): Promise<SSOAuthResult> {
  // Split JWT into header, payload, signature
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format: expected 3 dot-separated parts');
  }

  // Decode header and payload (without verification first, to read kid/alg)
  const header = JSON.parse(decodeBase64Url(parts[0]));
  const payload = JSON.parse(decodeBase64Url(parts[1]));

  // Fetch JWKS and verify cryptographic signature
  const discovery = await fetchDiscovery(config.discoveryUrl);
  await verifyJWTSignature(idToken, header, discovery.jwks_uri);

  // Validate standard claims
  const now = Math.floor(Date.now() / 1000);

  // 1. Issuer
  if (payload.iss !== discovery.issuer) {
    throw new Error(`Issuer mismatch: expected ${discovery.issuer}, got ${payload.iss}`);
  }

  // 2. Audience (can be string or array per spec)
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(config.clientId)) {
    throw new Error(`Audience mismatch: ${config.clientId} not found in [${aud.join(', ')}]`);
  }

  // 3. Expiration (with 5-minute leeway for clock skew)
  if (payload.exp && payload.exp < now - 300) {
    throw new Error('ID token has expired');
  }

  // 4. Issued-at sanity check (token should not be from the far future)
  if (payload.iat && payload.iat > now + 300) {
    throw new Error('ID token issued in the future (clock skew too large)');
  }

  // 5. Nonce (must match what we sent in the authorization request)
  if (payload.nonce !== nonce) {
    throw new Error('Nonce mismatch - possible replay attack');
  }

  // Extract user info from standard OIDC claims
  const email = (payload.email ?? '').toLowerCase().trim();
  if (!email) {
    throw new Error('No email claim in ID token. Ensure "email" scope is requested.');
  }

  // Parse name from various claim formats
  const firstName = payload.given_name
    ?? payload.name?.split(' ')[0]
    ?? '';
  const lastName = payload.family_name
    ?? payload.name?.split(' ').slice(1).join(' ')
    ?? '';

  // Groups claim varies by provider:
  // - Azure AD: "groups" (array of GUIDs)
  // - Okta: "groups" (array of names)
  // - AWS Cognito: "cognito:groups"
  // - Auth0: custom namespace claim
  const groups = payload.groups
    ?? payload['cognito:groups']
    ?? [];

  return {
    email,
    nameId: payload.sub,
    firstName,
    lastName,
    groups: Array.isArray(groups) ? groups : [],
    attributes: {
      sub: payload.sub ?? '',
      email: payload.email ?? '',
      email_verified: String(payload.email_verified ?? false),
      name: payload.name ?? '',
      picture: payload.picture ?? '',
    },
  };
}

// =============================================================================
// JWT SIGNATURE VERIFICATION
// =============================================================================

/**
 * Verify a JWT signature against the provider's JWKS endpoint.
 *
 * Fetches the JSON Web Key Set, finds the key matching the JWT's `kid`
 * header, imports it as a CryptoKey, and verifies the signature.
 */
async function verifyJWTSignature(
  jwt: string,
  header: { kid?: string; alg: string },
  jwksUri: string,
): Promise<void> {
  // Fetch JWKS
  const response = await fetch(jwksUri);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status}`);
  }
  const jwks = await response.json();

  if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
    throw new Error('JWKS contains no keys');
  }

  // Find the matching key by kid (Key ID)
  const key = header.kid
    ? jwks.keys.find((k: Record<string, string>) => k.kid === header.kid)
    : jwks.keys[0]; // Fall back to first key if no kid specified

  if (!key) {
    throw new Error(`No matching key found in JWKS for kid: ${header.kid}`);
  }

  // Import the JWK as a CryptoKey
  const algorithm = getAlgorithm(header.alg);
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    key,
    algorithm,
    true,
    ['verify'],
  );

  // Verify signature: sign(header.payload) == signature
  const parts = jwt.split('.');
  const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = Uint8Array.from(
    atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')),
    c => c.charCodeAt(0),
  );

  const valid = await crypto.subtle.verify(
    algorithm,
    cryptoKey,
    signature,
    signedContent,
  );

  if (!valid) {
    throw new Error('JWT signature verification failed');
  }
}

/**
 * Map JWT algorithm header to Web Crypto algorithm parameters.
 */
function getAlgorithm(alg: string): RsaHashedImportParams {
  switch (alg) {
    case 'RS256':
      return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    case 'RS384':
      return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' };
    case 'RS512':
      return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' };
    default:
      // Default to RS256 which is the most common
      return { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/** Base64url encode a byte array (RFC 4648 Section 5) */
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Decode a base64url-encoded string to a UTF-8 string */
function decodeBase64Url(str: string): string {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}
