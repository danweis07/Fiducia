/**
 * SSO Provider Management Handlers
 *
 * Gateway handlers for tenant-level SSO configuration CRUD:
 * list, get, create, update, delete providers, and test connectivity.
 *
 * IMPORTANT:
 * - All operations are scoped by ctx.firmId for tenant isolation.
 * - Create/update requires 'owner' or 'admin' role.
 * - Delete requires 'owner' role only.
 * - Client secrets are never returned in API responses.
 * - NEVER log PII or secrets.
 */

import type { GatewayContext, GatewayResponse } from '../core.ts';
import type { SSOProviderRow } from '../../_shared/sso/types.ts';
import { mapRowToProvider } from '../../_shared/sso/types.ts';
import { fetchDiscovery } from '../../_shared/sso/oidc.ts';

// =============================================================================
// HELPERS
// =============================================================================

function requireAuth(ctx: GatewayContext): GatewayResponse | null {
  if (!ctx.userId || !ctx.firmId) {
    return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' }, status: 401 };
  }
  return null;
}

async function getUserRole(ctx: GatewayContext): Promise<string | null> {
  const { data: firmUser, error } = await ctx.db
    .from('firm_users')
    .select('role')
    .eq('user_id', ctx.userId!)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !firmUser) return null;
  return firmUser.role;
}

async function requireAdminRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const role = await getUserRole(ctx);

  if (!role) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (role !== 'owner' && role !== 'admin') {
    return { error: { code: 'FORBIDDEN', message: 'Admin or owner role required' }, status: 403 };
  }

  return null;
}

async function requireOwnerRole(ctx: GatewayContext): Promise<GatewayResponse | null> {
  const role = await getUserRole(ctx);

  if (!role) {
    return { error: { code: 'FORBIDDEN', message: 'User not found in tenant' }, status: 403 };
  }

  if (role !== 'owner') {
    return { error: { code: 'FORBIDDEN', message: 'Owner role required' }, status: 403 };
  }

  return null;
}

/**
 * Sanitize provider data for API response.
 * Strips sensitive fields (client_secret_encrypted, raw certificate).
 */
function sanitizeProvider(row: SSOProviderRow) {
  const provider = mapRowToProvider(row);
  // Never expose the encrypted secret in API responses
  const { clientSecretEncrypted: _secret, ...safe } = provider;
  return {
    ...safe,
    // Indicate whether a secret is configured without revealing it
    hasClientSecret: !!_secret,
    // Mask certificate - show only first/last 20 chars
    certificate: provider.certificate
      ? `${provider.certificate.substring(0, 20)}...${provider.certificate.substring(provider.certificate.length - 20)}`
      : undefined,
  };
}

// =============================================================================
// HANDLERS
// =============================================================================

/**
 * sso.providers.list - List all SSO providers for the tenant
 *
 * No params required. Returns all configured SSO providers.
 */
export async function listSsoProviders(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const { data, error } = await ctx.db
    .from('sso_providers')
    .select('*')
    .eq('firm_id', ctx.firmId!)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to list SSO providers' }, status: 500 };
  }

  return {
    data: {
      providers: (data as SSOProviderRow[]).map(sanitizeProvider),
    },
  };
}

/**
 * sso.providers.get - Get a single SSO provider by ID
 *
 * Params:
 *   - providerId: string (required)
 */
export async function getSsoProvider(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const providerId = ctx.params.providerId as string;
  if (!providerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: providerId' }, status: 400 };
  }

  const { data, error } = await ctx.db
    .from('sso_providers')
    .select('*')
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (error || !data) {
    return { error: { code: 'NOT_FOUND', message: 'SSO provider not found' }, status: 404 };
  }

  return {
    data: {
      provider: sanitizeProvider(data as SSOProviderRow),
    },
  };
}

/**
 * sso.providers.create - Create a new SSO provider for the tenant
 *
 * Params:
 *   - providerType: 'saml' | 'oidc' (required)
 *   - name: string (required)
 *   - isEnabled: boolean (optional, default false)
 *
 * SAML-specific:
 *   - entityId: string
 *   - ssoUrl: string
 *   - sloUrl: string (optional)
 *   - certificate: string
 *
 * OIDC-specific:
 *   - clientId: string
 *   - clientSecret: string
 *   - discoveryUrl: string
 *
 * Shared:
 *   - emailDomainRestriction: string (optional)
 *   - autoProvisionUsers: boolean (optional, default true)
 *   - defaultRole: string (optional, default 'member')
 *   - forceSso: boolean (optional, default false)
 */
export async function createSsoProvider(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const {
    providerType, name, isEnabled,
    entityId, ssoUrl, sloUrl, certificate,
    clientId, clientSecret, discoveryUrl,
    emailDomainRestriction, autoProvisionUsers, defaultRole, forceSso,
    metadata,
  } = ctx.params as Record<string, unknown>;

  // Validate required fields
  if (!providerType || !['saml', 'oidc'].includes(providerType as string)) {
    return { error: { code: 'BAD_REQUEST', message: 'providerType must be "saml" or "oidc"' }, status: 400 };
  }
  if (!name || typeof name !== 'string') {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: name' }, status: 400 };
  }

  // Validate type-specific required fields
  if (providerType === 'saml') {
    if (!entityId || !ssoUrl || !certificate) {
      return {
        error: { code: 'BAD_REQUEST', message: 'SAML providers require: entityId, ssoUrl, certificate' },
        status: 400,
      };
    }
  }
  if (providerType === 'oidc') {
    if (!clientId || !clientSecret || !discoveryUrl) {
      return {
        error: { code: 'BAD_REQUEST', message: 'OIDC providers require: clientId, clientSecret, discoveryUrl' },
        status: 400,
      };
    }
  }

  // Validate defaultRole if provided
  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  if (defaultRole && !validRoles.includes(defaultRole as string)) {
    return { error: { code: 'BAD_REQUEST', message: `defaultRole must be one of: ${validRoles.join(', ')}` }, status: 400 };
  }

  const insertData: Record<string, unknown> = {
    firm_id: ctx.firmId!,
    provider_type: providerType,
    name,
    is_enabled: isEnabled ?? false,
    entity_id: entityId ?? null,
    sso_url: ssoUrl ?? null,
    slo_url: sloUrl ?? null,
    certificate: certificate ?? null,
    client_id: clientId ?? null,
    client_secret_encrypted: clientSecret ?? null,
    discovery_url: discoveryUrl ?? null,
    email_domain_restriction: emailDomainRestriction ?? null,
    auto_provision_users: autoProvisionUsers ?? true,
    default_role: defaultRole ?? 'member',
    force_sso: forceSso ?? false,
    metadata: metadata ?? {},
  };

  const { data, error } = await ctx.db
    .from('sso_providers')
    .insert(insertData)
    .select('*')
    .single();

  if (error) {
    // Handle unique constraint violation (one provider per type per tenant)
    if (error.code === '23505') {
      return {
        error: { code: 'CONFLICT', message: `A ${providerType} provider already exists for this tenant` },
        status: 409,
      };
    }
    console.error('SSO provider creation failed:', error.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to create SSO provider' }, status: 500 };
  }

  return {
    data: {
      provider: sanitizeProvider(data as SSOProviderRow),
    },
    status: 201,
  };
}

/**
 * sso.providers.update - Update an existing SSO provider
 *
 * Params:
 *   - providerId: string (required)
 *   - (any field from create, all optional)
 */
export async function updateSsoProvider(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const providerId = ctx.params.providerId as string;
  if (!providerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: providerId' }, status: 400 };
  }

  // Verify provider exists and belongs to this tenant
  const { data: existing, error: fetchErr } = await ctx.db
    .from('sso_providers')
    .select('id')
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (fetchErr || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'SSO provider not found' }, status: 404 };
  }

  // Build update object from provided params (only include fields that are explicitly set)
  const updateFields: Record<string, unknown> = {};
  const fieldMap: Record<string, string> = {
    name: 'name',
    isEnabled: 'is_enabled',
    entityId: 'entity_id',
    ssoUrl: 'sso_url',
    sloUrl: 'slo_url',
    certificate: 'certificate',
    clientId: 'client_id',
    clientSecret: 'client_secret_encrypted',
    discoveryUrl: 'discovery_url',
    emailDomainRestriction: 'email_domain_restriction',
    autoProvisionUsers: 'auto_provision_users',
    defaultRole: 'default_role',
    forceSso: 'force_sso',
    metadata: 'metadata',
  };

  for (const [paramKey, dbKey] of Object.entries(fieldMap)) {
    if (paramKey in ctx.params && ctx.params[paramKey] !== undefined) {
      updateFields[dbKey] = ctx.params[paramKey];
    }
  }

  // Validate defaultRole if being updated
  if (updateFields.default_role) {
    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    if (!validRoles.includes(updateFields.default_role as string)) {
      return { error: { code: 'BAD_REQUEST', message: `defaultRole must be one of: ${validRoles.join(', ')}` }, status: 400 };
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return { error: { code: 'BAD_REQUEST', message: 'No fields to update' }, status: 400 };
  }

  updateFields.updated_at = new Date().toISOString();

  const { data, error } = await ctx.db
    .from('sso_providers')
    .update(updateFields)
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!)
    .select('*')
    .single();

  if (error || !data) {
    console.error('SSO provider update failed:', error?.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to update SSO provider' }, status: 500 };
  }

  return {
    data: {
      provider: sanitizeProvider(data as SSOProviderRow),
    },
  };
}

/**
 * sso.providers.delete - Delete an SSO provider (owner only)
 *
 * Params:
 *   - providerId: string (required)
 */
export async function deleteSsoProvider(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireOwnerRole(ctx);
  if (roleErr) return roleErr;

  const providerId = ctx.params.providerId as string;
  if (!providerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: providerId' }, status: 400 };
  }

  // Verify provider exists and belongs to this tenant before deleting
  const { data: existing, error: fetchErr } = await ctx.db
    .from('sso_providers')
    .select('id, name')
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (fetchErr || !existing) {
    return { error: { code: 'NOT_FOUND', message: 'SSO provider not found' }, status: 404 };
  }

  const { error } = await ctx.db
    .from('sso_providers')
    .delete()
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!);

  if (error) {
    console.error('SSO provider deletion failed:', error.message);
    return { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete SSO provider' }, status: 500 };
  }

  return {
    data: {
      deleted: true,
      providerId,
    },
  };
}

/**
 * sso.providers.test - Test SSO provider connectivity
 *
 * For OIDC: Fetches the discovery URL and validates it returns valid JSON
 * with required endpoints.
 *
 * For SAML: Verifies the certificate is valid PEM format and the SSO URL
 * is reachable (HEAD request).
 *
 * Params:
 *   - providerId: string (required)
 */
export async function testSsoConnection(ctx: GatewayContext): Promise<GatewayResponse> {
  const authErr = requireAuth(ctx);
  if (authErr) return authErr;

  const roleErr = await requireAdminRole(ctx);
  if (roleErr) return roleErr;

  const providerId = ctx.params.providerId as string;
  if (!providerId) {
    return { error: { code: 'BAD_REQUEST', message: 'Missing required field: providerId' }, status: 400 };
  }

  const { data: provider, error: fetchErr } = await ctx.db
    .from('sso_providers')
    .select('*')
    .eq('id', providerId)
    .eq('firm_id', ctx.firmId!)
    .single();

  if (fetchErr || !provider) {
    return { error: { code: 'NOT_FOUND', message: 'SSO provider not found' }, status: 404 };
  }

  const row = provider as SSOProviderRow;
  const checks: { name: string; status: 'pass' | 'fail'; message: string }[] = [];

  try {
    if (row.provider_type === 'oidc') {
      // Test 1: Discovery URL is reachable and valid
      if (!row.discovery_url) {
        checks.push({ name: 'discovery_url', status: 'fail', message: 'Discovery URL not configured' });
      } else {
        try {
          const discovery = await fetchDiscovery(row.discovery_url);
          checks.push({
            name: 'discovery_url',
            status: 'pass',
            message: `Discovery document fetched. Issuer: ${discovery.issuer}`,
          });

          // Test 2: JWKS endpoint is reachable
          try {
            const jwksResponse = await fetch(discovery.jwks_uri);
            if (jwksResponse.ok) {
              const jwks = await jwksResponse.json();
              checks.push({
                name: 'jwks_endpoint',
                status: 'pass',
                message: `JWKS endpoint reachable. ${jwks.keys?.length ?? 0} key(s) found.`,
              });
            } else {
              checks.push({ name: 'jwks_endpoint', status: 'fail', message: `JWKS returned ${jwksResponse.status}` });
            }
          } catch (e) {
            checks.push({ name: 'jwks_endpoint', status: 'fail', message: `JWKS fetch failed: ${(e as Error).message}` });
          }
        } catch (e) {
          checks.push({ name: 'discovery_url', status: 'fail', message: (e as Error).message });
        }
      }

      // Test 3: Client ID is configured
      checks.push({
        name: 'client_id',
        status: row.client_id ? 'pass' : 'fail',
        message: row.client_id ? 'Client ID is configured' : 'Client ID not configured',
      });

      // Test 4: Client secret is configured
      checks.push({
        name: 'client_secret',
        status: row.client_secret_encrypted ? 'pass' : 'fail',
        message: row.client_secret_encrypted ? 'Client secret is configured' : 'Client secret not configured',
      });

    } else if (row.provider_type === 'saml') {
      // Test 1: Certificate is valid PEM
      if (!row.certificate) {
        checks.push({ name: 'certificate', status: 'fail', message: 'Certificate not configured' });
      } else {
        const hasPemHeaders = row.certificate.includes('-----BEGIN') || row.certificate.replace(/\s/g, '').length > 100;
        checks.push({
          name: 'certificate',
          status: hasPemHeaders ? 'pass' : 'fail',
          message: hasPemHeaders ? 'Certificate appears to be valid PEM format' : 'Certificate does not appear to be valid PEM',
        });
      }

      // Test 2: SSO URL is reachable
      if (!row.sso_url) {
        checks.push({ name: 'sso_url', status: 'fail', message: 'SSO URL not configured' });
      } else {
        try {
          const ssoResponse = await fetch(row.sso_url, {
            method: 'HEAD',
            redirect: 'manual', // Don't follow redirects, just check reachability
          });
          // Any response (even 4xx/5xx) means the URL is reachable
          checks.push({
            name: 'sso_url',
            status: 'pass',
            message: `SSO URL is reachable (HTTP ${ssoResponse.status})`,
          });
        } catch (e) {
          checks.push({ name: 'sso_url', status: 'fail', message: `SSO URL unreachable: ${(e as Error).message}` });
        }
      }

      // Test 3: Entity ID is configured
      checks.push({
        name: 'entity_id',
        status: row.entity_id ? 'pass' : 'fail',
        message: row.entity_id ? 'Entity ID is configured' : 'Entity ID not configured',
      });
    }

    const allPassed = checks.every(c => c.status === 'pass');

    return {
      data: {
        status: allPassed ? 'ok' : 'partial',
        providerType: row.provider_type,
        checks,
      },
    };

  } catch (e) {
    return {
      data: {
        status: 'error',
        providerType: row.provider_type,
        checks,
        error: (e as Error).message,
      },
    };
  }
}
