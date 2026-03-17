// Integration OAuth Callback
// Handles OAuth callback, exchanges code for tokens, stores credentials

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { fetchWithRetry } from '../_shared/retry.ts';

interface OAuthConfig {
  authorize_url: string;
  token_url: string;
  scopes: string[];
  response_type: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  // Provider-specific fields
  instance_url?: string;  // Salesforce
  id?: string;            // Salesforce user ID
  team?: { id: string; name: string };  // Slack
  authed_user?: { id: string };  // Slack
}

Deno.serve(async (req) => {
  // OAuth callbacks come as GET requests with query params
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return redirectWithError(errorDescription || error);
  }

  if (!code || !state) {
    return redirectWithError('Missing code or state parameter');
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify state and get stored OAuth request
    const { data: oauthState, error: stateError } = await supabase
      .from('integration_oauth_state')
      .select('*')
      .eq('state', state)
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid OAuth state:', state);
      return redirectWithError('Invalid or expired OAuth state');
    }

    // Check if state is expired
    if (new Date(oauthState.expires_at) < new Date()) {
      await supabase.from('integration_oauth_state').delete().eq('state', state);
      return redirectWithError('OAuth session expired. Please try again.');
    }

    // Get provider configuration
    const { data: provider } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('id', oauthState.provider_id)
      .single();

    if (!provider) {
      return redirectWithError('Provider not found');
    }

    const oauthConfig = provider.oauth_config as OAuthConfig;

    // Get OAuth client credentials
    const clientId = Deno.env.get(`${oauthState.provider_id.toUpperCase()}_CLIENT_ID`);
    const clientSecret = Deno.env.get(`${oauthState.provider_id.toUpperCase()}_CLIENT_SECRET`);

    if (!clientId || !clientSecret) {
      return redirectWithError('OAuth not properly configured');
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/integration-oauth-callback`;

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      client_secret: clientSecret,
    });

    // Add PKCE verifier if we stored one
    if (oauthState.code_verifier) {
      tokenParams.set('code_verifier', oauthState.code_verifier);
    }

    // Exchange code for tokens (with retry for transient failures)
    let tokenResponse: Response;
    try {
      tokenResponse = await fetchWithRetry(
        oauthConfig.token_url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: tokenParams.toString(),
        },
        { context: `Token exchange for ${oauthState.provider_id}` }
      );
    } catch (retryError) {
      console.error('Token exchange failed after retries:', retryError);
      return redirectWithError('Failed to complete authorization. Please try again.');
    }

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      return redirectWithError('Failed to complete authorization');
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get account info from provider (if applicable)
    let externalAccountId: string | null = null;
    let externalAccountName: string | null = null;
    let externalWorkspaceId: string | null = null;

    try {
      const accountInfo = await fetchAccountInfo(
        oauthState.provider_id,
        tokens.access_token,
        tokens,
        provider.base_url
      );
      externalAccountId = accountInfo.accountId;
      externalAccountName = accountInfo.accountName;
      externalWorkspaceId = accountInfo.workspaceId;
    } catch (accountError) {
      console.warn('Failed to fetch account info:', accountError);
    }

    // Calculate token expiration
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Store/update firm integration
    const { error: upsertError } = await supabase
      .from('firm_integrations')
      .upsert({
        firm_id: oauthState.firm_id,
        provider_id: oauthState.provider_id,
        status: 'connected',
        status_message: null,
        access_token_encrypted: tokens.access_token,  // Will be encrypted by Supabase Vault
        refresh_token_encrypted: tokens.refresh_token || null,
        token_expires_at: tokenExpiresAt,
        token_scopes: tokens.scope?.split(' ') || oauthConfig.scopes,
        external_account_id: externalAccountId,
        external_account_name: externalAccountName,
        external_workspace_id: externalWorkspaceId,
        connected_at: new Date().toISOString(),
        connected_by: oauthState.user_id,
      }, {
        onConflict: 'firm_id,provider_id',
      });

    if (upsertError) {
      console.error('Failed to store integration:', upsertError);
      return redirectWithError('Failed to save connection');
    }

    // Clean up OAuth state
    await supabase.from('integration_oauth_state').delete().eq('state', state);

    console.warn(`Successfully connected ${oauthState.provider_id} for firm ${oauthState.firm_id}`);

    // Redirect back to app with success
    const redirectUrl = new URL(oauthState.redirect_uri);
    redirectUrl.searchParams.set('integration', oauthState.provider_id);
    redirectUrl.searchParams.set('status', 'connected');

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error: unknown) {
    console.error('Error in integration-oauth-callback:', error);
    return redirectWithError('An unexpected error occurred');
  }
});

/**
 * Redirect to app with error message
 */
function redirectWithError(message: string): Response {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const redirectUrl = new URL(`${supabaseUrl}/settings/integrations`);
  redirectUrl.searchParams.set('error', message);
  return Response.redirect(redirectUrl.toString(), 302);
}

/**
 * Fetch account info from provider
 */
async function fetchAccountInfo(
  providerId: string,
  accessToken: string,
  tokens: TokenResponse,
  _baseUrl: string | null
): Promise<{
  accountId: string | null;
  accountName: string | null;
  workspaceId: string | null;
}> {
  let accountId: string | null = null;
  let accountName: string | null = null;
  let workspaceId: string | null = null;

  switch (providerId) {
    case 'docusign': {
      const response = await fetch('https://account-d.docusign.com/oauth/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        accountId = data.sub;
        accountName = data.name || data.email;
        // DocuSign returns accounts array, use first one
        if (data.accounts?.length > 0) {
          workspaceId = data.accounts[0].account_id;
        }
      }
      break;
    }

    case 'salesforce': {
      // Salesforce includes instance_url and id in token response
      if (tokens.instance_url && tokens.id) {
        const response = await fetch(tokens.id, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          accountId = data.user_id;
          accountName = data.display_name || data.username;
          workspaceId = data.organization_id;
        }
      }
      break;
    }

    case 'hubspot': {
      const response = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
      if (response.ok) {
        const data = await response.json();
        accountId = data.user_id?.toString();
        accountName = data.user;
        workspaceId = data.hub_id?.toString();
      }
      break;
    }

    case 'slack': {
      // Slack includes team info in token response
      if (tokens.team) {
        workspaceId = tokens.team.id;
        accountName = tokens.team.name;
      }
      if (tokens.authed_user) {
        accountId = tokens.authed_user.id;
      }
      break;
    }

    case 'gmail':
    case 'outlook': {
      // For Google/Microsoft, get user profile
      const profileUrl = providerId === 'gmail'
        ? 'https://www.googleapis.com/oauth2/v2/userinfo'
        : 'https://graph.microsoft.com/v1.0/me';
      const response = await fetch(profileUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        accountId = data.id;
        accountName = data.email || data.userPrincipalName;
      }
      break;
    }

    default:
      // Generic: just store the token, no account info
      break;
  }

  return { accountId, accountName, workspaceId };
}
