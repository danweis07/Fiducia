// Integration OAuth Start
// Initiates OAuth flow for connecting third-party integrations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { encodeBase64 as base64Encode } from 'https://deno.land/std@0.220.0/encoding/base64.ts';

interface StartOAuthInput {
  providerId: string;
  redirectUri?: string;  // Where to redirect after OAuth completes
}

interface OAuthConfig {
  authorize_url: string;
  token_url: string;
  scopes: string[];
  response_type: string;
  access_type?: string;
  scope_delimiter?: string;        // ',' for Slack, ' ' for others
  additional_params?: Record<string, string>;  // Provider-specific params
}

// Allowed redirect URI patterns (prevent open redirect attacks)
const ALLOWED_REDIRECT_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?\//, // Local development
  /^https?:\/\/127\.0\.0\.1(:\d+)?\//, // Local development
  /^https:\/\/[a-z0-9-]+\.supabase\.co\//, // Supabase hosted
  /^https:\/\/([a-z0-9-]+\.)?vantage\.com\//, // Production domain
  /^https:\/\/([a-z0-9-]+\.)?vercel\.app\//, // Vercel preview deployments
];

function isValidRedirectUri(uri: string, supabaseUrl: string): boolean {
  // Always allow redirect to same Supabase project
  if (uri.startsWith(supabaseUrl)) return true;

  // Check against allowed patterns
  return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(uri));
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user's firm
    const { data: firmUser } = await supabase
      .from('firm_users')
      .select('firm_id')
      .eq('user_id', user.id)
      .single();

    if (!firmUser) {
      return new Response(
        JSON.stringify({ error: 'User not associated with a firm' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const input: StartOAuthInput = await req.json();

    if (!input.providerId) {
      return new Response(
        JSON.stringify({ error: 'providerId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get provider configuration
    const { data: provider, error: providerError } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('id', input.providerId)
      .eq('is_enabled', true)
      .single();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: 'Integration provider not found or disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (provider.auth_type !== 'oauth2') {
      return new Response(
        JSON.stringify({ error: 'This provider does not use OAuth' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const oauthConfig = provider.oauth_config as OAuthConfig;
    if (!oauthConfig) {
      return new Response(
        JSON.stringify({ error: 'OAuth not configured for this provider' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Generate secure state parameter
    const stateBytes = new Uint8Array(32);
    crypto.getRandomValues(stateBytes);
    const state = base64Encode(stateBytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Generate PKCE code verifier and challenge (for providers that support it)
    const verifierBytes = new Uint8Array(32);
    crypto.getRandomValues(verifierBytes);
    const codeVerifier = base64Encode(verifierBytes)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // The callback URL for our edge function
    const callbackUrl = `${supabaseUrl}/functions/v1/integration-oauth-callback`;

    // Validate redirect URI to prevent open redirect attacks
    const finalRedirectUri = input.redirectUri || `${supabaseUrl}/settings/integrations`;
    if (!isValidRedirectUri(finalRedirectUri, supabaseUrl)) {
      return new Response(
        JSON.stringify({ error: 'Invalid redirect URI. Must be an allowed domain.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Store state for verification in callback
    const { error: stateError } = await supabase
      .from('integration_oauth_state')
      .insert({
        state,
        firm_id: firmUser.firm_id,
        provider_id: input.providerId,
        user_id: user.id,
        redirect_uri: finalRedirectUri,
        code_verifier: codeVerifier,
      });

    if (stateError) {
      throw new Error(`Failed to store OAuth state: ${stateError.message}`);
    }

    // Get OAuth client credentials from environment
    const clientId = Deno.env.get(`${input.providerId.toUpperCase()}_CLIENT_ID`);
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: `OAuth not configured for ${provider.name}. Contact support.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Build authorization URL
    // Use scope_delimiter from config (defaults to space)
    const scopeDelimiter = oauthConfig.scope_delimiter || ' ';
    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: oauthConfig.response_type || 'code',
      scope: oauthConfig.scopes.join(scopeDelimiter),
      state,
    });

    // Add optional parameters from config
    if (oauthConfig.access_type) {
      authParams.set('access_type', oauthConfig.access_type);
    }

    // Add any additional provider-specific params from config
    if (oauthConfig.additional_params) {
      for (const [key, value] of Object.entries(oauthConfig.additional_params)) {
        authParams.set(key, value);
      }
    }

    const authUrl = `${oauthConfig.authorize_url}?${authParams.toString()}`;

    console.warn(`OAuth started for ${input.providerId} by user ${user.id}`);

    return new Response(
      JSON.stringify({
        authUrl,
        state,
        expiresIn: 600,  // 10 minutes
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in integration-oauth-start:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
