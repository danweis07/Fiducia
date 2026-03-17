-- =============================================================================
-- SSO PROVIDER CONFIGURATION
-- Stores per-tenant SAML and OIDC provider settings for Single Sign-On
-- =============================================================================

-- SSO Provider Configuration
-- Stores per-tenant SAML and OIDC provider settings

CREATE TABLE IF NOT EXISTS sso_providers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,

  -- SAML config
  entity_id TEXT,
  sso_url TEXT,
  slo_url TEXT,
  certificate TEXT,

  -- OIDC config
  client_id TEXT,
  client_secret_encrypted TEXT,
  discovery_url TEXT,

  -- Shared config
  email_domain_restriction TEXT,
  auto_provision_users BOOLEAN DEFAULT true,
  default_role TEXT DEFAULT 'member' CHECK (default_role IN ('owner','admin','member','viewer')),
  force_sso BOOLEAN DEFAULT false,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, provider_type)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sso_providers_firm ON sso_providers(firm_id);
CREATE INDEX IF NOT EXISTS idx_sso_providers_enabled ON sso_providers(is_enabled) WHERE is_enabled = true;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE sso_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sso_providers_select" ON sso_providers FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "sso_providers_insert" ON sso_providers FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner','admin'));

CREATE POLICY "sso_providers_update" ON sso_providers FOR UPDATE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner','admin'));

CREATE POLICY "sso_providers_delete" ON sso_providers FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() = 'owner');

-- =============================================================================
-- SSO AUTH SESSIONS
-- Temporary state tracking for in-flight SSO flows (CSRF protection)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sso_auth_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES sso_providers(id) ON DELETE CASCADE,
  state TEXT NOT NULL UNIQUE,
  nonce TEXT,
  code_verifier TEXT,
  redirect_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE sso_auth_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only - no user-level access needed for auth flow sessions
CREATE POLICY "sso_sessions_service" ON sso_auth_sessions
  USING (true) WITH CHECK (true);

-- Index for cleanup of expired sessions
CREATE INDEX idx_sso_sessions_expires ON sso_auth_sessions(expires_at);
CREATE INDEX idx_sso_sessions_state ON sso_auth_sessions(state);

-- =============================================================================
-- TRIGGER: Auto-update updated_at on sso_providers
-- =============================================================================

CREATE TRIGGER update_sso_providers_updated_at
  BEFORE UPDATE ON sso_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
