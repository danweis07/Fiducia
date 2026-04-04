// Integration Token Refresh
// Refreshes OAuth tokens for connected integrations

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { fetchWithRetry } from '../_shared/retry.ts';

interface OAuthConfig {
  token_url: string;
}

interface RefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { providerId, firmId } = await req.json();

    if (!providerId) {
      return new Response(
        JSON.stringify({ error: 'providerId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Build query - if firmId provided use it, otherwise this is internal call
    let query = supabase
      .from('firm_integrations')
      .select(`
        *,
        integration_providers (
          oauth_config
        )
      `)
      .eq('provider_id', providerId);

    if (firmId) {
      query = query.eq('firm_id', firmId);
    }

    const { data: integration, error: fetchError } = await query.single();

    if (fetchError || !integration) {
      return new Response(
        JSON.stringify({ error: 'Integration not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!integration.refresh_token_encrypted) {
      return new Response(
        JSON.stringify({ error: 'No refresh token available' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const oauthConfig = (integration.integration_providers as { oauth_config: OAuthConfig })?.oauth_config;
    if (!oauthConfig?.token_url) {
      return new Response(
        JSON.stringify({ error: 'OAuth not configured for this provider' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get OAuth client credentials
    const clientId = Deno.env.get(`${providerId.toUpperCase()}_CLIENT_ID`);
    const clientSecret = Deno.env.get(`${providerId.toUpperCase()}_CLIENT_SECRET`);

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'OAuth credentials not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Refresh the token (with retry for transient failures)
    const tokenParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token_encrypted,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetchWithRetry(
      oauthConfig.token_url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: tokenParams.toString(),
      },
      { context: `Token refresh for ${providerId}` }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token refresh failed:', tokenResponse.status);

      // Mark integration as expired
      await supabase
        .from('firm_integrations')
        .update({
          status: 'expired',
          status_message: 'Token refresh failed. Please reconnect.',
        })
        .eq('id', integration.id);

      return new Response(
        JSON.stringify({ error: 'Token refresh failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const tokens: RefreshResponse = await tokenResponse.json();

    // Calculate new expiration
    const tokenExpiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // Update stored tokens
    const updates: Record<string, unknown> = {
      access_token_encrypted: tokens.access_token,
      token_expires_at: tokenExpiresAt,
      status: 'connected',
      status_message: null,
    };

    // Only update refresh token if a new one was provided
    if (tokens.refresh_token) {
      updates.refresh_token_encrypted = tokens.refresh_token;
    }

    const { error: updateError } = await supabase
      .from('firm_integrations')
      .update(updates)
      .eq('id', integration.id);

    if (updateError) {
      throw new Error(`Failed to update tokens: ${updateError.message}`);
    }

    console.warn(`Successfully refreshed token for ${providerId} (firm: ${integration.firm_id})`);

    return new Response(
      JSON.stringify({ success: true, expiresAt: tokenExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: unknown) {
    console.error('Error in integration-token-refresh:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
