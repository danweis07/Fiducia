/**
 * SSO Initiate Edge Function
 *
 * Starts the SSO authentication flow for a tenant.
 * Accepts a firm ID and provider type, looks up the SSO configuration,
 * generates the appropriate protocol request (SAML AuthnRequest or OIDC
 * authorization URL), stores state for CSRF protection, and returns
 * the redirect URL.
 *
 * Endpoints:
 *   POST /sso-initiate  { firmId, providerType, redirectUrl? }
 *   GET  /sso-initiate?firmId=...&providerType=...&redirectUrl=...
 *
 * NOTE: This is an unauthenticated endpoint - users are not yet logged in
 * when they initiate SSO. Security is ensured via state parameter validation
 * in the callback.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { buildRedirectUrl as buildSamlRedirectUrl } from '../_shared/sso/saml.ts';
import { buildAuthorizationUrl as buildOidcAuthUrl } from '../_shared/sso/oidc.ts';
import type { SAMLConfig, OIDCConfig, SSOProviderRow } from '../_shared/sso/types.ts';

// =============================================================================
// ALLOWED REDIRECT PATTERNS (prevent open redirect attacks)
// =============================================================================

const ALLOWED_REDIRECT_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?\//, // Local development
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//, // Local development
  /^https:\/\/[a-z0-9-]+\.supabase\.co\//, // Supabase hosted
  /^https:\/\/([a-z0-9-]+\.)?vercel\.app\//, // Vercel preview deployments
];

function isValidRedirectUrl(url: string, supabaseUrl: string): boolean {
  if (url.startsWith(supabaseUrl)) return true;
  return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(url));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Extract params from POST body or GET query string
    let firmId: string | null = null;
    let providerType: string | null = null;
    let redirectUrl: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json();
      firmId = body.firmId ?? null;
      providerType = body.providerType ?? null;
      redirectUrl = body.redirectUrl ?? null;
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      firmId = url.searchParams.get('firmId');
      providerType = url.searchParams.get('providerType');
      redirectUrl = url.searchParams.get('redirectUrl');
    } else {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 },
      );
    }

    // Validate required params
    if (!firmId) {
      return jsonError('Missing required parameter: firmId', 400);
    }
    if (!providerType || !['saml', 'oidc'].includes(providerType)) {
      return jsonError('providerType must be "saml" or "oidc"', 400);
    }

    // Initialize Supabase with service role (no user auth context yet)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up SSO provider config for this tenant
    const { data: provider, error: providerErr } = await supabase
      .from('sso_providers')
      .select('*')
      .eq('firm_id', firmId)
      .eq('provider_type', providerType)
      .eq('is_enabled', true)
      .single();

    if (providerErr || !provider) {
      return jsonError(`No enabled ${providerType.toUpperCase()} provider found for this tenant`, 404);
    }

    const row = provider as SSOProviderRow;

    // Validate and default the redirect URL
    const defaultRedirectUrl = `${supabaseUrl.replace('//', '//app.')}/auth/sso-callback`;
    const finalRedirectUrl = redirectUrl || defaultRedirectUrl;
    if (redirectUrl && !isValidRedirectUrl(redirectUrl, supabaseUrl)) {
      return jsonError('Invalid redirect URL. Must be an allowed domain.', 400);
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    let authUrl: string;
    let codeVerifier: string | null = null;

    if (providerType === 'saml') {
      // =====================================================================
      // SAML FLOW
      // =====================================================================
      if (!row.entity_id || !row.sso_url || !row.certificate) {
        return jsonError('SAML provider is misconfigured (missing entityId, ssoUrl, or certificate)', 500);
      }

      const acsUrl = `${supabaseUrl}/functions/v1/sso-callback`;
      const samlConfig: SAMLConfig = {
        entityId: row.entity_id,
        ssoUrl: row.sso_url,
        certificate: row.certificate,
        acsUrl,
        issuer: `${supabaseUrl}/sso/${firmId}`,
      };

      // Build SAML redirect URL with state as RelayState
      authUrl = await buildSamlRedirectUrl(samlConfig, state);

    } else {
      // =====================================================================
      // OIDC FLOW
      // =====================================================================
      if (!row.client_id || !row.client_secret_encrypted || !row.discovery_url) {
        return jsonError('OIDC provider is misconfigured (missing clientId, clientSecret, or discoveryUrl)', 500);
      }

      const oidcConfig: OIDCConfig = {
        clientId: row.client_id,
        clientSecret: row.client_secret_encrypted,
        discoveryUrl: row.discovery_url,
        redirectUri: `${supabaseUrl}/functions/v1/sso-callback`,
        scopes: ['openid', 'email', 'profile'],
      };

      // Build OIDC authorization URL with PKCE
      const result = await buildOidcAuthUrl(oidcConfig, state, nonce);
      authUrl = result.url;
      codeVerifier = result.codeVerifier;
    }

    // Store session state for validation in the callback
    const { error: sessionErr } = await supabase
      .from('sso_auth_sessions')
      .insert({
        firm_id: firmId,
        provider_id: row.id,
        state,
        nonce,
        code_verifier: codeVerifier,
        redirect_url: finalRedirectUrl,
      });

    if (sessionErr) {
      console.error('Failed to store SSO session:', sessionErr.message);
      return jsonError('Failed to initiate SSO session', 500);
    }

    // Log SSO initiation (no PII)
    console.warn(JSON.stringify({
      level: 'info',
      type: 'sso_initiate',
      firm_id: firmId,
      provider_type: providerType,
      provider_id: row.id,
      timestamp: new Date().toISOString(),
    }));

    // Return the redirect URL
    // For GET requests, we could redirect directly, but returning JSON
    // gives the frontend more control over the UX (loading states, etc.)
    if (req.method === 'GET') {
      // Direct redirect for GET requests (used by IdP-initiated flows)
      return Response.redirect(authUrl, 302);
    }

    return new Response(
      JSON.stringify({
        authUrl,
        state,
        expiresIn: 600, // 10 minutes
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error: unknown) {
    console.error('Error in sso-initiate:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonError(message, 500);
  }
});

// =============================================================================
// HELPERS
// =============================================================================

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status },
  );
}
