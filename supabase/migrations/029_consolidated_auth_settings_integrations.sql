-- =============================================================================
-- CONSOLIDATED MIGRATION: Auth, Multi-Tenancy, Integrations, Audit Logs
-- Combines migrations 014, 019, 022 into a single defensive migration.
-- All references to potentially-missing tables are wrapped in IF EXISTS guards.
-- =============================================================================

-- =============================================================================
-- PART 1: CORE MULTI-TENANCY TABLES
-- =============================================================================

-- Ensure update_updated_at_column() exists (created in earlier migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- FIRMS (Organizations / Tenants)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS firms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  logo_url TEXT,
  subscription_tier TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_tier IN (
    'trial', 'starter', 'professional', 'enterprise'
  )),
  max_users INTEGER DEFAULT 3,
  max_properties INTEGER DEFAULT 100,
  stripe_customer_id TEXT,
  billing_email TEXT,
  setup_fee_paid BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  api_key TEXT UNIQUE,
  api_rate_limit INTEGER DEFAULT 1000,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_subdomain ON firms(subdomain);
CREATE INDEX IF NOT EXISTS idx_firms_subscription ON firms(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_firms_stripe ON firms(stripe_customer_id);

-- ---------------------------------------------------------------------------
-- FIRM_USERS (User-Firm Membership)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS firm_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN (
    'owner', 'admin', 'broker', 'analyst', 'viewer'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'invited', 'inactive', 'suspended'
  )),
  display_name TEXT,
  title TEXT,
  territory TEXT[],
  invited_by TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  last_active_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_users_firm ON firm_users(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_user ON firm_users(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_status ON firm_users(status);
CREATE INDEX IF NOT EXISTS idx_firm_users_role ON firm_users(role);

-- ---------------------------------------------------------------------------
-- FIRM INVITATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS firm_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('owner', 'admin', 'broker', 'analyst', 'viewer')),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  UNIQUE(firm_id, email)
);

CREATE INDEX IF NOT EXISTS idx_firm_invitations_firm ON firm_invitations(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_email ON firm_invitations(email);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_token ON firm_invitations(token);

-- ---------------------------------------------------------------------------
-- AUDIT_LOG (simple version from 014)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT REFERENCES firms(id),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_firm ON audit_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- ---------------------------------------------------------------------------
-- USAGE METRICS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS usage_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  api_calls INTEGER DEFAULT 0,
  properties_viewed INTEGER DEFAULT 0,
  activities_logged INTEGER DEFAULT 0,
  deals_created INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_firm ON usage_metrics(firm_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);

-- =============================================================================
-- PART 2: HELPER FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS TEXT AS $$
DECLARE
  firm TEXT;
BEGIN
  SELECT firm_id INTO firm
  FROM firm_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
  RETURN firm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_firm_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM firm_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_firm_role() IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- PART 3: RLS POLICIES ON NEW TABLES
-- =============================================================================

-- FIRMS
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on firms" ON firms;
DROP POLICY IF EXISTS "firm_select_own" ON firms;
DROP POLICY IF EXISTS "firm_update_owner" ON firms;

CREATE POLICY "firm_select_own"
  ON firms FOR SELECT
  USING (id = get_user_firm_id());

CREATE POLICY "firm_update_owner"
  ON firms FOR UPDATE
  USING (id = get_user_firm_id() AND get_user_firm_role() = 'owner')
  WITH CHECK (id = get_user_firm_id() AND get_user_firm_role() = 'owner');

-- FIRM_USERS
ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "firm_users_select_own" ON firm_users;
DROP POLICY IF EXISTS "firm_users_insert_admin" ON firm_users;
DROP POLICY IF EXISTS "firm_users_update_admin" ON firm_users;
DROP POLICY IF EXISTS "firm_users_delete_admin" ON firm_users;

CREATE POLICY "firm_users_select_own"
  ON firm_users FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "firm_users_insert_admin"
  ON firm_users FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND can_manage_users());

CREATE POLICY "firm_users_update_admin"
  ON firm_users FOR UPDATE
  USING (firm_id = get_user_firm_id() AND (can_manage_users() OR user_id = auth.uid()))
  WITH CHECK (firm_id = get_user_firm_id() AND (can_manage_users() OR user_id = auth.uid()));

CREATE POLICY "firm_users_delete_admin"
  ON firm_users FOR DELETE
  USING (firm_id = get_user_firm_id() AND can_manage_users() AND user_id != auth.uid());

-- FIRM_INVITATIONS
ALTER TABLE firm_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invitations_select_admin" ON firm_invitations;
DROP POLICY IF EXISTS "invitations_insert_admin" ON firm_invitations;
DROP POLICY IF EXISTS "invitations_update_admin" ON firm_invitations;
DROP POLICY IF EXISTS "invitations_delete_admin" ON firm_invitations;

CREATE POLICY "invitations_select_admin"
  ON firm_invitations FOR SELECT
  USING (firm_id = get_user_firm_id() AND can_manage_users());

CREATE POLICY "invitations_insert_admin"
  ON firm_invitations FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND can_manage_users());

CREATE POLICY "invitations_update_admin"
  ON firm_invitations FOR UPDATE
  USING (firm_id = get_user_firm_id() AND can_manage_users())
  WITH CHECK (firm_id = get_user_firm_id() AND can_manage_users());

CREATE POLICY "invitations_delete_admin"
  ON firm_invitations FOR DELETE
  USING (firm_id = get_user_firm_id() AND can_manage_users());

-- AUDIT_LOG
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;

CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

-- USAGE_METRICS
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usage_metrics_select_owner" ON usage_metrics;

CREATE POLICY "usage_metrics_select_owner"
  ON usage_metrics FOR SELECT
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- =============================================================================
-- PART 4: ADD firm_id TO EXISTING TABLES (ONLY IF THEY EXIST)
-- =============================================================================

DO $$
BEGIN
  -- student_housing_properties
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_housing_properties') THEN
    ALTER TABLE student_housing_properties ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_shp_firm ON student_housing_properties(firm_id);
  END IF;

  -- ownership_groups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ownership_groups') THEN
    ALTER TABLE ownership_groups ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_ownership_groups_firm ON ownership_groups(firm_id);
  END IF;

  -- contacts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_contacts_firm ON contacts(firm_id);
  END IF;

  -- deals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_deals_firm ON deals(firm_id);
  END IF;

  -- tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_tasks_firm ON tasks(firm_id);
  END IF;

  -- activities
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    ALTER TABLE activities ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_activities_firm ON activities(firm_id);
  END IF;

  -- score_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'score_history') THEN
    ALTER TABLE score_history ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);
    CREATE INDEX IF NOT EXISTS idx_score_history_firm ON score_history(firm_id);
  END IF;
END $$;

-- =============================================================================
-- PART 5: RLS POLICIES ON EXISTING TABLES (ONLY IF THEY EXIST)
-- =============================================================================

-- student_housing_properties
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_housing_properties') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on student_housing_properties" ON student_housing_properties';

    EXECUTE 'CREATE POLICY "properties_select_firm" ON student_housing_properties FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "properties_insert_firm" ON student_housing_properties FOR INSERT WITH CHECK (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin'', ''broker''))';
    EXECUTE 'CREATE POLICY "properties_update_firm" ON student_housing_properties FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "properties_delete_admin" ON student_housing_properties FOR DELETE USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin''))';
  END IF;
END $$;

-- ownership_groups
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ownership_groups') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on ownership_groups" ON ownership_groups';

    EXECUTE 'CREATE POLICY "ownership_groups_select_firm" ON ownership_groups FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "ownership_groups_insert_firm" ON ownership_groups FOR INSERT WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "ownership_groups_update_firm" ON ownership_groups FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "ownership_groups_delete_admin" ON ownership_groups FOR DELETE USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin''))';
  END IF;
END $$;

-- contacts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on contacts" ON contacts';

    EXECUTE 'CREATE POLICY "contacts_select_firm" ON contacts FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "contacts_insert_firm" ON contacts FOR INSERT WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "contacts_update_firm" ON contacts FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "contacts_delete_admin" ON contacts FOR DELETE USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin''))';
  END IF;
END $$;

-- deals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on deals" ON deals';

    EXECUTE 'CREATE POLICY "deals_select_firm" ON deals FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "deals_insert_firm" ON deals FOR INSERT WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "deals_update_firm" ON deals FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "deals_delete_admin" ON deals FOR DELETE USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin''))';
  END IF;
END $$;

-- tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow all on tasks" ON tasks';

    EXECUTE 'CREATE POLICY "tasks_select_firm" ON tasks FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "tasks_insert_firm" ON tasks FOR INSERT WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "tasks_update_firm" ON tasks FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "tasks_delete_firm" ON tasks FOR DELETE USING (firm_id = get_user_firm_id())';
  END IF;
END $$;

-- activities
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    EXECUTE 'CREATE POLICY "activities_select_firm" ON activities FOR SELECT USING (firm_id = get_user_firm_id() OR firm_id IS NULL)';
    EXECUTE 'CREATE POLICY "activities_insert_firm" ON activities FOR INSERT WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "activities_update_firm" ON activities FOR UPDATE USING (firm_id = get_user_firm_id()) WITH CHECK (firm_id = get_user_firm_id())';
    EXECUTE 'CREATE POLICY "activities_delete_admin" ON activities FOR DELETE USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN (''owner'', ''admin''))';
  END IF;
END $$;

-- =============================================================================
-- PART 6: TRIGGERS ON NEW TABLES
-- =============================================================================

DROP TRIGGER IF EXISTS update_firms_updated_at ON firms;
CREATE TRIGGER update_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_firm_users_updated_at ON firm_users;
CREATE TRIGGER update_firm_users_updated_at
  BEFORE UPDATE ON firm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- PART 7: DATA MIGRATION HELPER (defensive — only updates tables that exist)
-- =============================================================================

CREATE OR REPLACE FUNCTION create_firm_and_migrate_data(
  firm_name TEXT,
  owner_user_id UUID,
  owner_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  new_firm_id TEXT;
BEGIN
  INSERT INTO firms (name, subscription_tier, max_users, max_properties)
  VALUES (firm_name, 'professional', 25, 5000)
  RETURNING id INTO new_firm_id;

  INSERT INTO firm_users (firm_id, user_id, role, status, display_name)
  VALUES (new_firm_id, owner_user_id, 'owner', 'active', owner_email);

  -- Only migrate tables that exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_housing_properties') THEN
    EXECUTE format('UPDATE student_housing_properties SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ownership_groups') THEN
    EXECUTE format('UPDATE ownership_groups SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    EXECUTE format('UPDATE contacts SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    EXECUTE format('UPDATE deals SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    EXECUTE format('UPDATE tasks SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    EXECUTE format('UPDATE activities SET firm_id = %L WHERE firm_id IS NULL', new_firm_id);
  END IF;

  RETURN new_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 8: VIEWS (conditional — only include deals columns if deals table exists)
-- =============================================================================

-- Firm dashboard: built dynamically based on what tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW firm_dashboard AS
      SELECT
        f.id as firm_id,
        f.name as firm_name,
        f.subscription_tier,
        f.max_users,
        f.max_properties,
        (SELECT COUNT(*) FROM firm_users fu WHERE fu.firm_id = f.id AND fu.status = ''active'') as active_users,
        (SELECT COUNT(*) FROM student_housing_properties p WHERE p.firm_id = f.id) as property_count,
        (SELECT COUNT(*) FROM deals d WHERE d.firm_id = f.id AND d.stage NOT IN (''closed_won'', ''closed_lost'')) as active_deals,
        (SELECT SUM(expected_value) FROM deals d WHERE d.firm_id = f.id AND d.stage NOT IN (''closed_won'', ''closed_lost'')) as pipeline_value
      FROM firms f
      WHERE f.id = get_user_firm_id()
    ';
  ELSE
    EXECUTE '
      CREATE OR REPLACE VIEW firm_dashboard AS
      SELECT
        f.id as firm_id,
        f.name as firm_name,
        f.subscription_tier,
        f.max_users,
        f.max_properties,
        (SELECT COUNT(*) FROM firm_users fu WHERE fu.firm_id = f.id AND fu.status = ''active'') as active_users,
        COALESCE((SELECT COUNT(*) FROM student_housing_properties p WHERE p.firm_id = f.id), 0) as property_count,
        0::bigint as active_deals,
        0::numeric as pipeline_value
      FROM firms f
      WHERE f.id = get_user_firm_id()
    ';
  END IF;
END $$;

-- Team performance: only created if deals + activities exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    EXECUTE '
      CREATE OR REPLACE VIEW team_performance AS
      SELECT
        fu.user_id,
        fu.display_name,
        fu.role,
        fu.territory,
        fu.last_active_at,
        COUNT(DISTINCT a.id) FILTER (WHERE a.created_at > NOW() - INTERVAL ''30 days'') as activities_30d,
        COUNT(DISTINCT d.id) FILTER (WHERE d.stage = ''closed_won'' AND d.actual_close_date > NOW() - INTERVAL ''90 days'') as deals_closed_90d,
        SUM(d.actual_value) FILTER (WHERE d.stage = ''closed_won'' AND d.actual_close_date > NOW() - INTERVAL ''90 days'') as revenue_closed_90d
      FROM firm_users fu
      LEFT JOIN activities a ON a.created_by = fu.user_id::text AND a.firm_id = fu.firm_id
      LEFT JOIN deals d ON d.assigned_broker = fu.display_name AND d.firm_id = fu.firm_id
      WHERE fu.firm_id = get_user_firm_id()
        AND fu.status = ''active''
        AND fu.role IN (''broker'', ''analyst'')
      GROUP BY fu.user_id, fu.display_name, fu.role, fu.territory, fu.last_active_at
    ';
  END IF;
END $$;


-- =============================================================================
-- =============================================================================
-- PART 9: INTEGRATIONS FRAMEWORK (from migration 019)
-- =============================================================================
-- =============================================================================

-- ---------------------------------------------------------------------------
-- ENUMS (safe to create — will error if they already exist, so use DO block)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_category') THEN
    CREATE TYPE integration_category AS ENUM (
      'documents', 'crm', 'communication', 'data', 'calendar', 'accounting'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_auth_type') THEN
    CREATE TYPE integration_auth_type AS ENUM (
      'oauth2', 'api_key', 'webhook_only', 'none'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'integration_status') THEN
    CREATE TYPE integration_status AS ENUM (
      'connected', 'disconnected', 'expired', 'error', 'pending'
    );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- INTEGRATION PROVIDERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  category integration_category NOT NULL,
  auth_type integration_auth_type NOT NULL,
  oauth_config JSONB,
  base_url TEXT,
  api_version TEXT,
  features TEXT[] NOT NULL,
  settings_schema JSONB,
  webhook_events TEXT[],
  rate_limit_requests INTEGER,
  rate_limit_window_seconds INTEGER,
  is_enabled BOOLEAN DEFAULT true,
  is_beta BOOLEAN DEFAULT false,
  setup_instructions TEXT,
  docs_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- FIRM INTEGRATIONS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS firm_integrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES integration_providers(id),
  status integration_status NOT NULL DEFAULT 'disconnected',
  status_message TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  token_scopes TEXT[],
  api_key_encrypted TEXT,
  external_account_id TEXT,
  external_account_name TEXT,
  external_workspace_id TEXT,
  settings JSONB DEFAULT '{}',
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both',
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ,
  api_calls_today INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  connected_by TEXT,
  disconnected_at TIMESTAMPTZ,
  disconnected_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(firm_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_integrations_firm ON firm_integrations(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_integrations_provider ON firm_integrations(provider_id);
CREATE INDEX IF NOT EXISTS idx_firm_integrations_status ON firm_integrations(status);

-- ---------------------------------------------------------------------------
-- OAUTH STATE (CSRF protection for OAuth flows)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_oauth_state (
  state TEXT PRIMARY KEY,
  firm_id TEXT NOT NULL REFERENCES firms(id),
  provider_id TEXT NOT NULL REFERENCES integration_providers(id),
  user_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_verifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

CREATE INDEX IF NOT EXISTS idx_oauth_state_expires ON integration_oauth_state(expires_at);

-- ---------------------------------------------------------------------------
-- INTEGRATION WEBHOOK LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider_id TEXT NOT NULL REFERENCES integration_providers(id),
  firm_id TEXT REFERENCES firms(id),
  event_type TEXT,
  payload JSONB,
  headers JSONB,
  processed_at TIMESTAMPTZ,
  processing_status TEXT,
  processing_error TEXT,
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_provider ON integration_webhook_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_firm ON integration_webhook_logs(firm_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON integration_webhook_logs(received_at);

-- ---------------------------------------------------------------------------
-- INTEGRATION SYNC LOGS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_integration_id TEXT NOT NULL REFERENCES firm_integrations(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  entity_type TEXT,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(firm_integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON integration_sync_logs(started_at);

-- ---------------------------------------------------------------------------
-- RLS ON INTEGRATION TABLES
-- ---------------------------------------------------------------------------

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_oauth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "providers_select_enabled" ON integration_providers;
CREATE POLICY "providers_select_enabled"
  ON integration_providers FOR SELECT
  USING (is_enabled = true);

DROP POLICY IF EXISTS "firm_integrations_select" ON firm_integrations;
DROP POLICY IF EXISTS "firm_integrations_insert" ON firm_integrations;
DROP POLICY IF EXISTS "firm_integrations_update" ON firm_integrations;
DROP POLICY IF EXISTS "firm_integrations_delete" ON firm_integrations;

CREATE POLICY "firm_integrations_select"
  ON firm_integrations FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_insert"
  ON firm_integrations FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_update"
  ON firm_integrations FOR UPDATE
  USING (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_delete"
  ON firm_integrations FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

DROP POLICY IF EXISTS "oauth_state_select" ON integration_oauth_state;
DROP POLICY IF EXISTS "oauth_state_insert" ON integration_oauth_state;
DROP POLICY IF EXISTS "oauth_state_delete" ON integration_oauth_state;

CREATE POLICY "oauth_state_select"
  ON integration_oauth_state FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "oauth_state_insert"
  ON integration_oauth_state FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "oauth_state_delete"
  ON integration_oauth_state FOR DELETE
  USING (firm_id = get_user_firm_id());

DROP POLICY IF EXISTS "webhook_logs_select" ON integration_webhook_logs;
CREATE POLICY "webhook_logs_select"
  ON integration_webhook_logs FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

DROP POLICY IF EXISTS "sync_logs_select" ON integration_sync_logs;
CREATE POLICY "sync_logs_select"
  ON integration_sync_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_integrations fi
    WHERE fi.id = firm_integration_id AND fi.firm_id = get_user_firm_id()
  ));

-- ---------------------------------------------------------------------------
-- INTEGRATION TRIGGERS
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS update_integration_providers_updated_at ON integration_providers;
CREATE TRIGGER update_integration_providers_updated_at
  BEFORE UPDATE ON integration_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_firm_integrations_updated_at ON firm_integrations;
CREATE TRIGGER update_firm_integrations_updated_at
  BEFORE UPDATE ON firm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION reset_api_calls_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_calls_reset_at IS NULL OR NEW.api_calls_reset_at < CURRENT_DATE THEN
    NEW.api_calls_today := 0;
    NEW.api_calls_reset_at := CURRENT_DATE + INTERVAL '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_api_calls ON firm_integrations;
CREATE TRIGGER trigger_reset_api_calls
  BEFORE UPDATE ON firm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION reset_api_calls_if_needed();

-- ---------------------------------------------------------------------------
-- INTEGRATION HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_integration_connected(
  p_firm_id TEXT,
  p_provider_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM firm_integrations
    WHERE firm_id = p_firm_id
      AND provider_id = p_provider_id
      AND status = 'connected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_firm_enabled_features(p_firm_id TEXT)
RETURNS TEXT[] AS $$
DECLARE
  features TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT unnest)
  INTO features
  FROM (
    SELECT unnest(ip.features)
    FROM firm_integrations fi
    JOIN integration_providers ip ON ip.id = fi.provider_id
    WHERE fi.firm_id = p_firm_id
      AND fi.status = 'connected'
      AND ip.is_enabled = true
  ) sub;
  RETURN COALESCE(features, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM integration_oauth_state WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM integration_webhook_logs
    WHERE received_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_sync_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM integration_sync_logs
    WHERE started_at < NOW() - (retention_days || ' days')::INTERVAL
      AND status IN ('completed', 'failed', 'cancelled')
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_integration_data(
  webhook_retention_days INTEGER DEFAULT 30,
  sync_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  webhook_logs_deleted INTEGER,
  sync_logs_deleted INTEGER,
  oauth_states_deleted INTEGER
) AS $$
DECLARE
  webhooks INTEGER;
  syncs INTEGER;
  oauth_st INTEGER;
BEGIN
  SELECT cleanup_old_webhook_logs(webhook_retention_days) INTO webhooks;
  SELECT cleanup_old_sync_logs(sync_retention_days) INTO syncs;
  WITH deleted AS (
    DELETE FROM integration_oauth_state WHERE expires_at < NOW() RETURNING 1
  )
  SELECT COUNT(*) INTO oauth_st FROM deleted;
  RETURN QUERY SELECT webhooks, syncs, oauth_st;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- INTEGRATION VIEWS
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW available_integrations AS
SELECT
  ip.id,
  ip.name,
  ip.description,
  ip.logo_url,
  ip.category,
  ip.auth_type,
  ip.features,
  ip.is_beta,
  ip.docs_url,
  fi.status,
  fi.connected_at,
  fi.external_account_name,
  fi.settings,
  fi.last_sync_at
FROM integration_providers ip
LEFT JOIN firm_integrations fi ON fi.provider_id = ip.id
  AND fi.firm_id = get_user_firm_id()
WHERE ip.is_enabled = true
ORDER BY ip.category, ip.name;

CREATE OR REPLACE VIEW integration_health AS
SELECT
  fi.firm_id,
  ip.name as provider_name,
  ip.category,
  fi.status,
  fi.last_sync_at,
  fi.last_sync_status,
  fi.api_calls_today,
  ip.rate_limit_requests,
  CASE
    WHEN fi.status = 'error' THEN 'critical'
    WHEN fi.status = 'expired' THEN 'warning'
    WHEN fi.token_expires_at < NOW() + INTERVAL '1 day' THEN 'warning'
    WHEN fi.api_calls_today > ip.rate_limit_requests * 0.8 THEN 'warning'
    ELSE 'healthy'
  END as health_status,
  fi.status_message as issue_details
FROM firm_integrations fi
JOIN integration_providers ip ON ip.id = fi.provider_id
WHERE fi.status != 'disconnected';

-- ---------------------------------------------------------------------------
-- SEED INTEGRATION PROVIDERS
-- ---------------------------------------------------------------------------

INSERT INTO integration_providers (
  id, name, description, category, auth_type, base_url, features,
  oauth_config, webhook_events, rate_limit_requests, rate_limit_window_seconds,
  is_enabled, is_beta, docs_url
) VALUES
-- DOCUMENT PROVIDERS
(
  'pandadoc', 'PandaDoc',
  'Create, send, and track documents for e-signature. Generate contracts from templates with deal data.',
  'documents', 'oauth2', 'https://api.pandadoc.com/public/v1',
  ARRAY['document_generation', 'e_signature', 'document_tracking'],
  '{"authorize_url":"https://app.pandadoc.com/oauth2/authorize","token_url":"https://api.pandadoc.com/oauth2/access_token","scopes":["read+write"],"response_type":"code"}'::jsonb,
  ARRAY['document_state_changed', 'recipient_completed', 'document_completed'],
  300, 60, true, false, 'https://developers.pandadoc.com'
),
(
  'docusign', 'DocuSign',
  'Industry-leading e-signature platform. Send documents for signature and track completion.',
  'documents', 'oauth2', 'https://na4.docusign.net/restapi/v2.1',
  ARRAY['e_signature', 'document_tracking'],
  '{"authorize_url":"https://account-d.docusign.com/oauth/auth","token_url":"https://account-d.docusign.com/oauth/token","scopes":["signature","extended"],"response_type":"code"}'::jsonb,
  ARRAY['envelope-completed', 'envelope-voided', 'recipient-completed'],
  1000, 3600, true, false, 'https://developers.docusign.com'
),
(
  'hellosign', 'Dropbox Sign (HelloSign)',
  'Simple, fast e-signatures by Dropbox. Great for straightforward signing workflows.',
  'documents', 'oauth2', 'https://api.hellosign.com/v3',
  ARRAY['e_signature', 'document_tracking'],
  '{"authorize_url":"https://app.hellosign.com/oauth/authorize","token_url":"https://api.hellosign.com/v3/oauth/token","scopes":["basic_account_info","signature_request_access"],"response_type":"code"}'::jsonb,
  ARRAY['signature_request_signed', 'signature_request_all_signed'],
  100, 60, true, false, 'https://developers.hellosign.com'
),
-- CRM PROVIDERS
(
  'salesforce', 'Salesforce',
  'Sync contacts, accounts, and opportunities with Salesforce CRM.',
  'crm', 'oauth2', 'https://login.salesforce.com',
  ARRAY['contact_sync', 'deal_sync', 'activity_sync'],
  '{"authorize_url":"https://login.salesforce.com/services/oauth2/authorize","token_url":"https://login.salesforce.com/services/oauth2/token","scopes":["api","refresh_token","offline_access"],"response_type":"code","additional_params":{"prompt":"consent"}}'::jsonb,
  ARRAY['contact.created', 'contact.updated', 'opportunity.updated'],
  10000, 86400, true, false, 'https://developer.salesforce.com'
),
(
  'hubspot', 'HubSpot',
  'Sync contacts and deals with HubSpot CRM. Track engagement and activity.',
  'crm', 'oauth2', 'https://api.hubapi.com',
  ARRAY['contact_sync', 'deal_sync', 'activity_sync', 'email_tracking'],
  '{"authorize_url":"https://app.hubspot.com/oauth/authorize","token_url":"https://api.hubapi.com/oauth/v1/token","scopes":["crm.objects.contacts.read","crm.objects.contacts.write","crm.objects.deals.read","crm.objects.deals.write"],"response_type":"code"}'::jsonb,
  ARRAY['contact.creation', 'contact.propertyChange', 'deal.propertyChange'],
  100, 10, true, false, 'https://developers.hubspot.com'
),
(
  'apto', 'Apto',
  'Sync with Apto CRE CRM. Full bidirectional sync of properties, contacts, and deals.',
  'crm', 'oauth2', 'https://api.apto.com',
  ARRAY['contact_sync', 'deal_sync', 'property_sync', 'activity_sync'],
  '{"authorize_url":"https://app.apto.com/oauth2/authorize","token_url":"https://api.apto.com/oauth2/token","scopes":["read","write"],"response_type":"code"}'::jsonb,
  ARRAY['property.updated', 'deal.updated', 'contact.updated'],
  1000, 3600, true, true, 'https://developers.apto.com'
),
-- COMMUNICATION PROVIDERS
(
  'slack', 'Slack',
  'Get notifications in Slack when deals close, documents are signed, or properties need attention.',
  'communication', 'oauth2', 'https://slack.com/api',
  ARRAY['notifications'],
  '{"authorize_url":"https://slack.com/oauth/v2/authorize","token_url":"https://slack.com/api/oauth.v2.access","scopes":["chat:write","channels:read","users:read"],"response_type":"code","scope_delimiter":","}'::jsonb,
  NULL, 50, 60, true, false, 'https://api.slack.com'
),
(
  'gmail', 'Gmail',
  'Automatically log emails with contacts. Track email opens and engagement.',
  'communication', 'oauth2', 'https://gmail.googleapis.com',
  ARRAY['email_tracking', 'activity_sync'],
  '{"authorize_url":"https://accounts.google.com/o/oauth2/v2/auth","token_url":"https://oauth2.googleapis.com/token","scopes":["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send"],"response_type":"code","access_type":"offline"}'::jsonb,
  ARRAY['message.received'], 250, 1, true, false, 'https://developers.google.com/gmail'
),
(
  'outlook', 'Microsoft Outlook',
  'Sync emails and calendar with Outlook. Log communications automatically.',
  'communication', 'oauth2', 'https://graph.microsoft.com/v1.0',
  ARRAY['email_tracking', 'activity_sync', 'calendar_sync'],
  '{"authorize_url":"https://login.microsoftonline.com/common/oauth2/v2.0/authorize","token_url":"https://login.microsoftonline.com/common/oauth2/v2.0/token","scopes":["Mail.Read","Mail.Send","Calendars.ReadWrite","offline_access"],"response_type":"code"}'::jsonb,
  NULL, 10000, 600, true, false, 'https://docs.microsoft.com/graph'
),
(
  'nylas', 'Nylas',
  'Unified email and calendar API. Connect any email provider with one integration.',
  'communication', 'oauth2', 'https://api.nylas.com',
  ARRAY['email_tracking', 'activity_sync', 'calendar_sync'],
  '{"authorize_url":"https://api.nylas.com/oauth/authorize","token_url":"https://api.nylas.com/oauth/token","scopes":["email.read_only","email.send","calendar"],"response_type":"code"}'::jsonb,
  ARRAY['message.created', 'event.created'], 100, 60, true, true, 'https://developer.nylas.com'
),
-- DATA PROVIDERS (API Key based)
(
  'costar', 'CoStar',
  'Access CoStar market data, comps, and property information.',
  'data', 'api_key', 'https://api.costar.com',
  ARRAY['market_data', 'comps', 'property_data'],
  NULL, NULL, 1000, 86400, true, false, 'https://www.costar.com/developers'
),
(
  'trepp', 'Trepp',
  'Access CMBS loan data, servicer reports, and debt information.',
  'data', 'api_key', 'https://api.trepp.com',
  ARRAY['loan_data', 'debt_data'],
  NULL, NULL, 500, 86400, true, false, 'https://www.trepp.com/api'
),
(
  'reonomy', 'Reonomy',
  'Property ownership, transaction history, and contact data enrichment.',
  'data', 'api_key', 'https://api.reonomy.com',
  ARRAY['ownership_data', 'property_data', 'contact_enrichment'],
  NULL, NULL, 1000, 86400, true, false, 'https://developers.reonomy.com'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  oauth_config = EXCLUDED.oauth_config,
  features = EXCLUDED.features,
  updated_at = NOW();


-- =============================================================================
-- =============================================================================
-- PART 10: AUDIT LOGS — RICH VERSION (from migration 022)
-- =============================================================================
-- =============================================================================

-- Enums (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_severity') THEN
    CREATE TYPE audit_severity AS ENUM ('debug', 'info', 'warn', 'error');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_action') THEN
    CREATE TYPE audit_action AS ENUM (
      'create', 'update', 'delete', 'view', 'export', 'import',
      'login', 'logout', 'permission_change', 'score_calculate',
      'bulk_operation', 'system_event'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_entity') THEN
    CREATE TYPE audit_entity AS ENUM (
      'property', 'deal', 'task', 'activity', 'contact',
      'user', 'firm', 'score', 'document', 'settings', 'system'
    );
  END IF;
END $$;

-- NOTE: firm_id is TEXT to match firms.id (which is TEXT, not UUID)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity audit_severity NOT NULL DEFAULT 'info',
  action audit_action NOT NULL,
  entity_type audit_entity NOT NULL,
  entity_id TEXT,
  user_id UUID,
  firm_id TEXT REFERENCES firms(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_id ON audit_logs(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_lookup ON audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_timestamp ON audit_logs(firm_id, timestamp DESC) WHERE firm_id IS NOT NULL;

COMMENT ON TABLE audit_logs IS 'Stores audit trail for user actions and system events';

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only system can delete audit logs" ON audit_logs;

CREATE POLICY "Firm admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    firm_id IN (
      SELECT fu.firm_id FROM firm_users fu
      WHERE fu.user_id = auth.uid()
        AND fu.role IN ('owner', 'admin')
        AND fu.status = 'active'
    )
  );

CREATE POLICY "Service can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only system can delete audit logs"
  ON audit_logs FOR DELETE
  USING (false);

-- ---------------------------------------------------------------------------
-- AUDIT LOG TRIGGER FUNCTION
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  action_type audit_action;
  ent_type audit_entity;
  ent_id TEXT;
  log_message TEXT;
  log_metadata JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'deals' THEN ent_type := 'deal';
    WHEN 'tasks' THEN ent_type := 'task';
    WHEN 'contacts' THEN ent_type := 'contact';
    WHEN 'documents' THEN ent_type := 'document';
    WHEN 'student_housing_properties' THEN ent_type := 'property';
    ELSE ent_type := 'system';
  END CASE;

  IF TG_OP = 'DELETE' THEN
    ent_id := OLD.id::TEXT;
    log_metadata := to_jsonb(OLD);
  ELSE
    ent_id := NEW.id::TEXT;
    log_metadata := to_jsonb(NEW);
  END IF;

  log_message := format('%s %s %s', action_type, ent_type, ent_id);

  INSERT INTO audit_logs (
    action, entity_type, entity_id, user_id, firm_id, message, metadata
  ) VALUES (
    action_type, ent_type, ent_id, auth.uid(),
    COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.firm_id ELSE NEW.firm_id END,
      NULL
    ),
    log_message, log_metadata
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- RECENT AUDIT LOGS VIEW
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_recent_audit_logs AS
SELECT
  al.id,
  al.timestamp,
  al.severity,
  al.action,
  al.entity_type,
  al.entity_id,
  al.message,
  al.metadata,
  al.user_id,
  fu.display_name AS user_name,
  al.firm_id,
  f.name AS firm_name
FROM audit_logs al
LEFT JOIN firm_users fu ON al.user_id = fu.user_id AND al.firm_id = fu.firm_id
LEFT JOIN firms f ON al.firm_id = f.id
ORDER BY al.timestamp DESC;

GRANT SELECT ON v_recent_audit_logs TO authenticated;

-- =============================================================================
-- DONE
-- =============================================================================
