/**
 * SSO Type Definitions
 *
 * Shared types for SAML 2.0 and OIDC protocol implementations.
 * Used by sso-initiate, sso-callback, and gateway SSO handlers.
 */

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

export interface SSOProvider {
  id: string;
  firmId: string;
  providerType: 'saml' | 'oidc';
  name: string;
  isEnabled: boolean;
  entityId?: string;
  ssoUrl?: string;
  sloUrl?: string;
  certificate?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
  discoveryUrl?: string;
  emailDomainRestriction?: string;
  autoProvisionUsers: boolean;
  defaultRole: string;
  forceSso: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// AUTHENTICATION RESULT
// =============================================================================

/** Normalized result from either SAML or OIDC authentication */
export interface SSOAuthResult {
  email: string;
  nameId?: string;
  firstName?: string;
  lastName?: string;
  groups?: string[];
  attributes: Record<string, string>;
}

// =============================================================================
// SAML CONFIGURATION
// =============================================================================

export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  certificate: string;
  acsUrl: string;
  issuer: string;
}

// =============================================================================
// OIDC CONFIGURATION
// =============================================================================

export interface OIDCConfig {
  clientId: string;
  clientSecret: string;
  discoveryUrl: string;
  redirectUri: string;
  scopes: string[];
}

/** OIDC Discovery document (RFC 8414) */
export interface OIDCDiscovery {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  issuer: string;
  userinfo_endpoint?: string;
}

// =============================================================================
// DATABASE ROW MAPPING
// =============================================================================

/** Raw row from sso_providers table */
export interface SSOProviderRow {
  id: string;
  firm_id: string;
  provider_type: 'saml' | 'oidc';
  name: string;
  is_enabled: boolean;
  entity_id: string | null;
  sso_url: string | null;
  slo_url: string | null;
  certificate: string | null;
  client_id: string | null;
  client_secret_encrypted: string | null;
  discovery_url: string | null;
  email_domain_restriction: string | null;
  auto_provision_users: boolean;
  default_role: string;
  force_sso: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Map database row to domain type */
export function mapRowToProvider(row: SSOProviderRow): SSOProvider {
  return {
    id: row.id,
    firmId: row.firm_id,
    providerType: row.provider_type,
    name: row.name,
    isEnabled: row.is_enabled,
    entityId: row.entity_id ?? undefined,
    ssoUrl: row.sso_url ?? undefined,
    sloUrl: row.slo_url ?? undefined,
    certificate: row.certificate ?? undefined,
    clientId: row.client_id ?? undefined,
    clientSecretEncrypted: row.client_secret_encrypted ?? undefined,
    discoveryUrl: row.discovery_url ?? undefined,
    emailDomainRestriction: row.email_domain_restriction ?? undefined,
    autoProvisionUsers: row.auto_provision_users,
    defaultRole: row.default_role,
    forceSso: row.force_sso,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
