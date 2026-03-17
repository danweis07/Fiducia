/**
 * SSO Callback Edge Function
 *
 * Handles the callback from the Identity Provider after authentication:
 *
 * SAML flow (POST):
 *   - Receives SAMLResponse in POST body
 *   - Validates assertion against stored certificate
 *   - Extracts user email and attributes
 *
 * OIDC flow (GET):
 *   - Receives authorization code and state in query params
 *   - Exchanges code for tokens using stored code_verifier (PKCE)
 *   - Validates ID token and extracts user info
 *
 * After authentication:
 *   - Validates email domain restriction if configured
 *   - Looks up or auto-provisions user in firm_users
 *   - Creates/retrieves Supabase auth user
 *   - Generates magic link for session creation
 *   - Redirects to frontend with session token
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { validateSAMLResponse } from '../_shared/sso/saml.ts';
import { exchangeCode, validateIdToken } from '../_shared/sso/oidc.ts';
import type { SSOAuthResult, SSOProviderRow, OIDCConfig } from '../_shared/sso/types.ts';

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let authResult: SSOAuthResult;
    let firmId: string;
    let providerId: string;
    let redirectUrl: string;
    let providerRow: SSOProviderRow;

    if (req.method === 'POST') {
      // =====================================================================
      // SAML CALLBACK (HTTP-POST binding)
      // =====================================================================
      const formData = await req.formData();
      const samlResponse = formData.get('SAMLResponse') as string;
      const relayState = formData.get('RelayState') as string; // This is our state parameter

      if (!samlResponse) {
        return redirectWithError(supabaseUrl, 'Missing SAMLResponse in callback');
      }
      if (!relayState) {
        return redirectWithError(supabaseUrl, 'Missing RelayState (state) in SAML callback');
      }

      // Look up the SSO session by state (RelayState)
      const { data: session, error: sessionErr } = await supabase
        .from('sso_auth_sessions')
        .select('*')
        .eq('state', relayState)
        .single();

      if (sessionErr || !session) {
        return redirectWithError(supabaseUrl, 'Invalid or expired SSO session');
      }

      // Check session expiry
      if (new Date(session.expires_at) < new Date()) {
        await supabase.from('sso_auth_sessions').delete().eq('id', session.id);
        return redirectWithError(supabaseUrl, 'SSO session has expired. Please try again.');
      }

      firmId = session.firm_id;
      providerId = session.provider_id;
      redirectUrl = session.redirect_url || `${supabaseUrl}/auth/sso-complete`;

      // Fetch provider config for certificate
      const { data: provider, error: provErr } = await supabase
        .from('sso_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (provErr || !provider) {
        return redirectWithError(supabaseUrl, 'SSO provider configuration not found');
      }

      providerRow = provider as SSOProviderRow;

      if (!providerRow.certificate) {
        return redirectWithError(supabaseUrl, 'SAML certificate not configured');
      }

      // Validate SAML Response
      const expectedAudience = `${supabaseUrl}/sso/${firmId}`;
      authResult = await validateSAMLResponse(
        samlResponse,
        providerRow.certificate,
        expectedAudience,
      );

      // Clean up session
      await supabase.from('sso_auth_sessions').delete().eq('id', session.id);

    } else if (req.method === 'GET') {
      // =====================================================================
      // OIDC CALLBACK (Authorization Code flow)
      // =====================================================================
      const url = new URL(req.url);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');

      // Handle IdP-side errors
      if (error) {
        console.error('OIDC error from IdP:', error, errorDescription);
        return redirectWithError(supabaseUrl, errorDescription || error);
      }

      if (!code || !state) {
        return redirectWithError(supabaseUrl, 'Missing code or state parameter in callback');
      }

      // Look up the SSO session by state
      const { data: session, error: sessionErr } = await supabase
        .from('sso_auth_sessions')
        .select('*')
        .eq('state', state)
        .single();

      if (sessionErr || !session) {
        return redirectWithError(supabaseUrl, 'Invalid or expired SSO session');
      }

      // Check session expiry
      if (new Date(session.expires_at) < new Date()) {
        await supabase.from('sso_auth_sessions').delete().eq('id', session.id);
        return redirectWithError(supabaseUrl, 'SSO session has expired. Please try again.');
      }

      firmId = session.firm_id;
      providerId = session.provider_id;
      redirectUrl = session.redirect_url || `${supabaseUrl}/auth/sso-complete`;
      const nonce = session.nonce;
      const codeVerifier = session.code_verifier;

      // Fetch provider config
      const { data: provider, error: provErr } = await supabase
        .from('sso_providers')
        .select('*')
        .eq('id', providerId)
        .single();

      if (provErr || !provider) {
        return redirectWithError(supabaseUrl, 'SSO provider configuration not found');
      }

      providerRow = provider as SSOProviderRow;

      if (!providerRow.client_id || !providerRow.client_secret_encrypted || !providerRow.discovery_url) {
        return redirectWithError(supabaseUrl, 'OIDC provider is misconfigured');
      }

      const oidcConfig: OIDCConfig = {
        clientId: providerRow.client_id,
        clientSecret: providerRow.client_secret_encrypted,
        discoveryUrl: providerRow.discovery_url,
        redirectUri: `${supabaseUrl}/functions/v1/sso-callback`,
        scopes: ['openid', 'email', 'profile'],
      };

      // Exchange authorization code for tokens
      const tokens = await exchangeCode(oidcConfig, code, codeVerifier);

      // Validate ID token
      authResult = await validateIdToken(tokens.idToken, oidcConfig, nonce);

      // Clean up session
      await supabase.from('sso_auth_sessions').delete().eq('id', session.id);

    } else {
      return new Response('Method not allowed', { status: 405 });
    }

    // =====================================================================
    // POST-AUTHENTICATION: User provisioning and session creation
    // =====================================================================

    // 1. Validate email domain restriction
    if (providerRow.email_domain_restriction) {
      const allowedDomains = providerRow.email_domain_restriction
        .split(',')
        .map(d => d.trim().toLowerCase())
        .filter(Boolean);

      const emailDomain = authResult.email.split('@')[1];
      if (!allowedDomains.includes(emailDomain)) {
        console.warn(`SSO email domain rejected: ${emailDomain} not in allowed list for provider ${providerId}`);
        return redirectWithError(
          redirectUrl,
          `Email domain @${emailDomain} is not authorized for this organization`,
        );
      }
    }

    // 2. Look up existing Supabase auth user by email
    const { data: existingUsers, error: _userListErr } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === authResult.email);

    if (!authUser && !providerRow.auto_provision_users) {
      return redirectWithError(
        redirectUrl,
        'Your account has not been provisioned. Contact your administrator.',
      );
    }

    // 3. Create auth user if not exists (auto-provisioning)
    if (!authUser) {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: authResult.email,
        email_confirm: true, // SSO-authenticated emails are pre-verified
        user_metadata: {
          first_name: authResult.firstName,
          last_name: authResult.lastName,
          sso_provider: providerRow.provider_type,
          sso_provider_id: providerId,
        },
      });

      if (createErr || !newUser?.user) {
        console.error('Failed to create SSO user:', createErr?.message);
        return redirectWithError(redirectUrl, 'Failed to provision user account');
      }

      authUser = newUser.user;

      // Log auto-provisioning (no PII in logs)
      console.warn(JSON.stringify({
        level: 'info',
        type: 'sso_user_provisioned',
        firm_id: firmId,
        provider_id: providerId,
        user_id: authUser.id,
        timestamp: new Date().toISOString(),
      }));
    }

    // 4. Ensure firm_users membership exists
    const { data: existingMembership } = await supabase
      .from('firm_users')
      .select('id, status, role')
      .eq('user_id', authUser.id)
      .eq('firm_id', firmId)
      .single();

    if (!existingMembership) {
      // Create firm membership with default role from SSO provider config
      const { error: memberErr } = await supabase
        .from('firm_users')
        .insert({
          firm_id: firmId,
          user_id: authUser.id,
          role: providerRow.default_role || 'member',
          status: 'active',
          display_name: [authResult.firstName, authResult.lastName].filter(Boolean).join(' ') || authResult.email,
        });

      if (memberErr) {
        console.error('Failed to create firm membership:', memberErr.message);
        // Don't block login - user exists but membership failed
        // This can happen with unique constraint if there's a race condition
      }
    } else if (existingMembership.status === 'suspended' || existingMembership.status === 'inactive') {
      return redirectWithError(
        redirectUrl,
        'Your account has been suspended. Contact your administrator.',
      );
    }

    // 5. Update last_active_at
    await supabase
      .from('firm_users')
      .update({ last_active_at: new Date().toISOString() })
      .eq('user_id', authUser.id)
      .eq('firm_id', firmId);

    // 6. Generate a magic link to create a Supabase session
    // This gives the user a valid Supabase JWT without requiring a password.
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: authResult.email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkErr || !linkData) {
      console.error('Failed to generate session link:', linkErr?.message);
      return redirectWithError(redirectUrl, 'Failed to create session');
    }

    // Extract the token from the magic link
    // The magic link URL format is: {site_url}/#access_token=...&token_type=...
    // We need the hashed_token from properties for a cleaner redirect
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      return redirectWithError(redirectUrl, 'Failed to generate authentication link');
    }

    // 7. Audit log the SSO login (no PII)
    await supabase.from('audit_log').insert({
      firm_id: firmId,
      user_id: authUser.id,
      action: 'sso.login',
      resource_type: 'user',
      resource_id: authUser.id,
      details: {
        provider_type: providerRow.provider_type,
        provider_id: providerId,
        provider_name: providerRow.name,
        auto_provisioned: !existingMembership,
      },
    }).then(() => { /* fire and forget */ });

    // 8. Log successful SSO login (no PII)
    console.warn(JSON.stringify({
      level: 'info',
      type: 'sso_login_success',
      firm_id: firmId,
      provider_id: providerId,
      user_id: authUser.id,
      auto_provisioned: !existingMembership,
      timestamp: new Date().toISOString(),
    }));

    // 9. Redirect to the magic link which will set up the session
    // and then redirect to the final destination
    return Response.redirect(actionLink, 302);

  } catch (error: unknown) {
    console.error('Error in sso-callback:', error);
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    return redirectWithError(supabaseUrl, message);
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Redirect to the frontend with an error message.
 * Uses a dedicated error page path to avoid infinite redirect loops.
 */
function redirectWithError(baseUrl: string, message: string): Response {
  try {
    const url = new URL(baseUrl);
    // Use a dedicated auth error path
    url.pathname = '/auth/sso-error';
    url.searchParams.set('error', message);
    return Response.redirect(url.toString(), 302);
  } catch {
    // Fallback if baseUrl is not a valid URL
    const fallbackUrl = `${Deno.env.get('SUPABASE_URL') || ''}/auth/sso-error?error=${encodeURIComponent(message)}`;
    return Response.redirect(fallbackUrl, 302);
  }
}
