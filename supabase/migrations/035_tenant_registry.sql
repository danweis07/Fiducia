-- =============================================================================
-- TENANT REGISTRY (Control Plane)
--
-- Tracks all tenant Supabase projects for cross-tenant deployment.
-- This table lives in the control plane project and is read by CI/CD
-- to determine which projects to deploy migrations and functions to.
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_registry (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Supabase project identity
  project_ref TEXT UNIQUE NOT NULL,              -- Supabase project reference ID
  supabase_url TEXT NOT NULL,                     -- https://<ref>.supabase.co
  anon_key TEXT,                                  -- Public anon key (for frontend config)

  -- Tenant identity
  tenant_name TEXT NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,                 -- e.g., "alpha" for alpha.vantage.com
  custom_domain TEXT,                             -- e.g., "api.bankalpha.com"

  -- Subscription
  subscription_tier TEXT NOT NULL DEFAULT 'starter' CHECK (subscription_tier IN (
    'trial', 'starter', 'professional', 'enterprise'
  )),
  compute_size TEXT DEFAULT 'micro' CHECK (compute_size IN (
    'micro', 'small', 'medium', 'large', 'xl', '2xl', '4xl'
  )),

  -- Version tracking — updated by CI/CD after each deployment
  last_migration_version TEXT,                    -- e.g., "0.1.0"
  last_functions_version TEXT,                    -- e.g., "0.1.0"
  last_migrated_at TIMESTAMPTZ,
  last_deployed_at TIMESTAMPTZ,

  -- Lifecycle
  status TEXT NOT NULL DEFAULT 'provisioning' CHECK (status IN (
    'provisioning',  -- Project being set up
    'active',        -- Accepting traffic, included in deployments
    'paused',        -- Tenant paused (non-payment, etc.) — skipped in deployments
    'decommissioned' -- Tenant removed — skipped in deployments, data retained
  )),
  provisioned_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,

  -- Metadata
  region TEXT NOT NULL DEFAULT 'us-east-1',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_registry_status ON tenant_registry(status);
CREATE INDEX IF NOT EXISTS idx_tenant_registry_subdomain ON tenant_registry(subdomain);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenant_registry_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenant_registry_updated ON tenant_registry;
CREATE TRIGGER trg_tenant_registry_updated
  BEFORE UPDATE ON tenant_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_registry_timestamp();

-- =============================================================================
-- TENANT DEPLOYMENT LOG
--
-- Audit trail of every deployment to every tenant project.
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_deployment_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL REFERENCES tenant_registry(id),
  project_ref TEXT NOT NULL,

  -- What was deployed
  deployment_type TEXT NOT NULL CHECK (deployment_type IN ('migrations', 'functions', 'full')),
  platform_version TEXT NOT NULL,                 -- Version from PLATFORM_VERSION file

  -- Result
  status TEXT NOT NULL CHECK (status IN ('started', 'success', 'failed', 'rolled_back')),
  error_message TEXT,
  duration_ms INTEGER,

  -- Context
  triggered_by TEXT,                              -- 'ci', 'manual', 'provision-script'
  git_sha TEXT,                                   -- Commit SHA that triggered the deploy
  github_run_id TEXT,                             -- GitHub Actions run ID for traceability

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployment_log_tenant ON tenant_deployment_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deployment_log_version ON tenant_deployment_log(platform_version);
CREATE INDEX IF NOT EXISTS idx_deployment_log_created ON tenant_deployment_log(created_at DESC);

-- RLS: Only service role can read/write (this is a control plane table)
ALTER TABLE tenant_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_deployment_log ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS by default, so no policies needed.
-- If you add application-level access, add policies scoped to admin roles.
