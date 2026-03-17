-- =============================================================================
-- MULTI-FIRM TENANCY MIGRATION
-- Enables Vantage to scale from single firm to SaaS platform
-- =============================================================================

-- =============================================================================
-- FIRMS (Organizations / Tenants)
-- The billing and data isolation boundary
-- =============================================================================

CREATE TABLE IF NOT EXISTS firms (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Identity
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,                  -- e.g., "adam-team" for adam-team.vantage.com
  logo_url TEXT,

  -- Subscription & Billing
  subscription_tier TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_tier IN (
    'trial',        -- 14-day free trial
    'starter',      -- up to 5 users
    'professional', -- up to 25 users
    'enterprise'    -- unlimited users
  )),

  -- Limits based on tier
  max_users INTEGER DEFAULT 3,            -- Trial: 3, Starter: 5, Professional: 25, Enterprise: unlimited
  max_properties INTEGER DEFAULT 100,     -- Trial: 100, Starter: 500, Professional: 5000, Enterprise: unlimited

  -- Billing
  stripe_customer_id TEXT,                -- Stripe customer ID for billing
  billing_email TEXT,

  -- Onboarding
  setup_fee_paid BOOLEAN DEFAULT false,   -- $3,000 implementation fee
  onboarding_completed_at TIMESTAMPTZ,

  -- API Access
  api_key TEXT UNIQUE,                    -- For programmatic access
  api_rate_limit INTEGER DEFAULT 1000,    -- Requests per hour

  -- Feature flags (for gradual rollout)
  features JSONB DEFAULT '{}',            -- e.g., {"ml_enrollment": true, "senior_housing": false}

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firms_subdomain ON firms(subdomain);
CREATE INDEX IF NOT EXISTS idx_firms_subscription ON firms(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_firms_stripe ON firms(stripe_customer_id);

-- =============================================================================
-- FIRM_USERS (User-Firm Membership)
-- Maps Supabase auth.users to firms with roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS firm_users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Foreign keys
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,                   -- References auth.users(id)

  -- Role within firm
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN (
    'owner',    -- Full access, billing, user management
    'admin',    -- User management, all data access
    'broker',   -- Full data access, no user management
    'analyst',  -- Read-only, can add activities
    'viewer'    -- Read-only
  )),

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'invited',   -- Email sent, pending acceptance
    'inactive',  -- Deactivated but preserved
    'suspended'  -- Billing issue
  )),

  -- Profile
  display_name TEXT,
  title TEXT,                              -- Job title
  territory TEXT[],                        -- Assigned markets/regions

  -- Invitation tracking
  invited_by TEXT,                         -- user_id of inviter
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,

  -- Usage tracking
  last_active_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(firm_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_firm_users_firm ON firm_users(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_user ON firm_users(user_id);
CREATE INDEX IF NOT EXISTS idx_firm_users_status ON firm_users(status);
CREATE INDEX IF NOT EXISTS idx_firm_users_role ON firm_users(role);

-- =============================================================================
-- FIRM INVITATIONS
-- Track pending invitations for users not yet in Supabase
-- =============================================================================

CREATE TABLE IF NOT EXISTS firm_invitations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'broker' CHECK (role IN ('owner', 'admin', 'broker', 'analyst', 'viewer')),

  -- Invitation token (for email link)
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),

  -- Tracking
  invited_by TEXT NOT NULL,                -- user_id
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,

  UNIQUE(firm_id, email)
);

CREATE INDEX IF NOT EXISTS idx_firm_invitations_firm ON firm_invitations(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_email ON firm_invitations(email);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_token ON firm_invitations(token);

-- =============================================================================
-- ADD firm_id TO EXISTING TABLES
-- =============================================================================

-- Student Housing Properties
ALTER TABLE student_housing_properties
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_shp_firm ON student_housing_properties(firm_id);

-- Ownership Groups
ALTER TABLE ownership_groups
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_ownership_groups_firm ON ownership_groups(firm_id);

-- Contacts
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_contacts_firm ON contacts(firm_id);

-- Deals
ALTER TABLE deals
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_deals_firm ON deals(firm_id);

-- Tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_tasks_firm ON tasks(firm_id);

-- Activities
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_activities_firm ON activities(firm_id);

-- Score History
ALTER TABLE score_history
ADD COLUMN IF NOT EXISTS firm_id TEXT REFERENCES firms(id);

CREATE INDEX IF NOT EXISTS idx_score_history_firm ON score_history(firm_id);

-- =============================================================================
-- HELPER FUNCTION: Get Current User's Firm ID
-- Used by RLS policies
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

-- =============================================================================
-- HELPER FUNCTION: Check User Role in Firm
-- =============================================================================

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

-- =============================================================================
-- HELPER FUNCTION: Check if User Can Manage Users
-- =============================================================================

CREATE OR REPLACE FUNCTION can_manage_users()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_firm_role() IN ('owner', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Replace "Allow all" with firm-scoped policies
-- =============================================================================

-- -----------------------------------------------------------------------------
-- FIRMS TABLE POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on firms" ON firms;

-- Users can only view their own firm
CREATE POLICY "firm_select_own"
  ON firms FOR SELECT
  USING (id = get_user_firm_id());

-- Only owners can update firm settings
CREATE POLICY "firm_update_owner"
  ON firms FOR UPDATE
  USING (id = get_user_firm_id() AND get_user_firm_role() = 'owner')
  WITH CHECK (id = get_user_firm_id() AND get_user_firm_role() = 'owner');

-- Firms are created by the signup process (via service role)
-- No INSERT policy for regular users

-- -----------------------------------------------------------------------------
-- FIRM_USERS TABLE POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;

-- Users can view members of their own firm
CREATE POLICY "firm_users_select_own"
  ON firm_users FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Only admins/owners can add users
CREATE POLICY "firm_users_insert_admin"
  ON firm_users FOR INSERT
  WITH CHECK (
    firm_id = get_user_firm_id()
    AND can_manage_users()
  );

-- Only admins/owners can update users (except self)
CREATE POLICY "firm_users_update_admin"
  ON firm_users FOR UPDATE
  USING (
    firm_id = get_user_firm_id()
    AND (can_manage_users() OR user_id = auth.uid())
  )
  WITH CHECK (
    firm_id = get_user_firm_id()
    AND (can_manage_users() OR user_id = auth.uid())
  );

-- Only admins/owners can remove users
CREATE POLICY "firm_users_delete_admin"
  ON firm_users FOR DELETE
  USING (
    firm_id = get_user_firm_id()
    AND can_manage_users()
    AND user_id != auth.uid()  -- Cannot delete self
  );

-- -----------------------------------------------------------------------------
-- STUDENT HOUSING PROPERTIES POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all on student_housing_properties" ON student_housing_properties;

-- All firm members can view properties
CREATE POLICY "properties_select_firm"
  ON student_housing_properties FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);  -- NULL for shared/demo data

-- Brokers and above can create properties
CREATE POLICY "properties_insert_firm"
  ON student_housing_properties FOR INSERT
  WITH CHECK (
    firm_id = get_user_firm_id()
    AND get_user_firm_role() IN ('owner', 'admin', 'broker')
  );

-- Brokers and above can update properties
CREATE POLICY "properties_update_firm"
  ON student_housing_properties FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

-- Only admins/owners can delete properties
CREATE POLICY "properties_delete_admin"
  ON student_housing_properties FOR DELETE
  USING (
    firm_id = get_user_firm_id()
    AND get_user_firm_role() IN ('owner', 'admin')
  );

-- -----------------------------------------------------------------------------
-- OWNERSHIP GROUPS POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all on ownership_groups" ON ownership_groups;

CREATE POLICY "ownership_groups_select_firm"
  ON ownership_groups FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

CREATE POLICY "ownership_groups_insert_firm"
  ON ownership_groups FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "ownership_groups_update_firm"
  ON ownership_groups FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "ownership_groups_delete_admin"
  ON ownership_groups FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- -----------------------------------------------------------------------------
-- CONTACTS POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all on contacts" ON contacts;

CREATE POLICY "contacts_select_firm"
  ON contacts FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

CREATE POLICY "contacts_insert_firm"
  ON contacts FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "contacts_update_firm"
  ON contacts FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "contacts_delete_admin"
  ON contacts FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- -----------------------------------------------------------------------------
-- DEALS POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all on deals" ON deals;

CREATE POLICY "deals_select_firm"
  ON deals FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

CREATE POLICY "deals_insert_firm"
  ON deals FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "deals_update_firm"
  ON deals FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "deals_delete_admin"
  ON deals FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- -----------------------------------------------------------------------------
-- TASKS POLICIES
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow all on tasks" ON tasks;

CREATE POLICY "tasks_select_firm"
  ON tasks FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

CREATE POLICY "tasks_insert_firm"
  ON tasks FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "tasks_update_firm"
  ON tasks FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "tasks_delete_firm"
  ON tasks FOR DELETE
  USING (firm_id = get_user_firm_id());

-- -----------------------------------------------------------------------------
-- ACTIVITIES POLICIES
-- -----------------------------------------------------------------------------

CREATE POLICY "activities_select_firm"
  ON activities FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

CREATE POLICY "activities_insert_firm"
  ON activities FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "activities_update_firm"
  ON activities FOR UPDATE
  USING (firm_id = get_user_firm_id())
  WITH CHECK (firm_id = get_user_firm_id());

-- Activities generally shouldn't be deleted, but allow for admins
CREATE POLICY "activities_delete_admin"
  ON activities FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- -----------------------------------------------------------------------------
-- FIRM INVITATIONS POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE firm_invitations ENABLE ROW LEVEL SECURITY;

-- Only admins can view invitations
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

-- =============================================================================
-- AUDIT LOG TABLE
-- Track important actions for compliance and debugging
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  -- Context
  firm_id TEXT REFERENCES firms(id),
  user_id UUID,

  -- Action
  action TEXT NOT NULL,                   -- 'user.invited', 'property.created', 'deal.stage_changed'
  resource_type TEXT,                     -- 'user', 'property', 'deal', 'contact'
  resource_id TEXT,

  -- Details
  details JSONB DEFAULT '{}',             -- Action-specific data
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_firm ON audit_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_log_select_admin"
  ON audit_log FOR SELECT
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- Audit logs are insert-only via triggers/functions
CREATE POLICY "audit_log_insert"
  ON audit_log FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

-- =============================================================================
-- USAGE TRACKING TABLE
-- Track API usage and feature usage for billing/analytics
-- =============================================================================

CREATE TABLE IF NOT EXISTS usage_metrics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  firm_id TEXT NOT NULL REFERENCES firms(id),

  -- Time bucket
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Counts
  api_calls INTEGER DEFAULT 0,
  properties_viewed INTEGER DEFAULT 0,
  activities_logged INTEGER DEFAULT 0,
  deals_created INTEGER DEFAULT 0,
  reports_generated INTEGER DEFAULT 0,

  -- Active users
  active_users INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_firm ON usage_metrics(firm_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_period ON usage_metrics(period_start, period_end);

ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_metrics_select_owner"
  ON usage_metrics FOR SELECT
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- =============================================================================
-- HELPER: Create Default Firm for Existing Data
-- Run this after migration to assign existing data to a default firm
-- =============================================================================

-- Create a function to migrate existing data to a new firm
CREATE OR REPLACE FUNCTION create_firm_and_migrate_data(
  firm_name TEXT,
  owner_user_id UUID,
  owner_email TEXT
)
RETURNS TEXT AS $$
DECLARE
  new_firm_id TEXT;
BEGIN
  -- Create the firm
  INSERT INTO firms (name, subscription_tier, max_users, max_properties)
  VALUES (firm_name, 'professional', 25, 5000)
  RETURNING id INTO new_firm_id;

  -- Add the owner
  INSERT INTO firm_users (firm_id, user_id, role, status, display_name)
  VALUES (new_firm_id, owner_user_id, 'owner', 'active', owner_email);

  -- Migrate existing data
  UPDATE student_housing_properties SET firm_id = new_firm_id WHERE firm_id IS NULL;
  UPDATE ownership_groups SET firm_id = new_firm_id WHERE firm_id IS NULL;
  UPDATE contacts SET firm_id = new_firm_id WHERE firm_id IS NULL;
  UPDATE deals SET firm_id = new_firm_id WHERE firm_id IS NULL;
  UPDATE tasks SET firm_id = new_firm_id WHERE firm_id IS NULL;
  UPDATE activities SET firm_id = new_firm_id WHERE firm_id IS NULL;

  RETURN new_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: Update updated_at on firms
-- =============================================================================

CREATE TRIGGER update_firms_updated_at
  BEFORE UPDATE ON firms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_firm_users_updated_at
  BEFORE UPDATE ON firm_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS FOR MULTI-TENANT QUERIES
-- =============================================================================

-- Firm dashboard view
CREATE OR REPLACE VIEW firm_dashboard AS
SELECT
  f.id as firm_id,
  f.name as firm_name,
  f.subscription_tier,
  f.max_users,
  f.max_properties,
  (SELECT COUNT(*) FROM firm_users fu WHERE fu.firm_id = f.id AND fu.status = 'active') as active_users,
  (SELECT COUNT(*) FROM student_housing_properties p WHERE p.firm_id = f.id) as property_count,
  (SELECT COUNT(*) FROM deals d WHERE d.firm_id = f.id AND d.stage NOT IN ('closed_won', 'closed_lost')) as active_deals,
  (SELECT SUM(expected_value) FROM deals d WHERE d.firm_id = f.id AND d.stage NOT IN ('closed_won', 'closed_lost')) as pipeline_value
FROM firms f
WHERE f.id = get_user_firm_id();

-- Team performance view (for MD dashboard)
CREATE OR REPLACE VIEW team_performance AS
SELECT
  fu.user_id,
  fu.display_name,
  fu.role,
  fu.territory,
  fu.last_active_at,
  COUNT(DISTINCT a.id) FILTER (WHERE a.created_at > NOW() - INTERVAL '30 days') as activities_30d,
  COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'closed_won' AND d.actual_close_date > NOW() - INTERVAL '90 days') as deals_closed_90d,
  SUM(d.actual_value) FILTER (WHERE d.stage = 'closed_won' AND d.actual_close_date > NOW() - INTERVAL '90 days') as revenue_closed_90d
FROM firm_users fu
LEFT JOIN activities a ON a.created_by = fu.user_id::text AND a.firm_id = fu.firm_id
LEFT JOIN deals d ON d.assigned_broker = fu.display_name AND d.firm_id = fu.firm_id
WHERE fu.firm_id = get_user_firm_id()
  AND fu.status = 'active'
  AND fu.role IN ('broker', 'analyst')
GROUP BY fu.user_id, fu.display_name, fu.role, fu.territory, fu.last_active_at;
