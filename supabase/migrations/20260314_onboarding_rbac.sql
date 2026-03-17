-- Tenant Onboarding
CREATE TABLE IF NOT EXISTS tenant_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL UNIQUE REFERENCES firms(id) ON DELETE CASCADE,
  current_step text NOT NULL DEFAULT 'institution_profile',
  steps_completed text[] NOT NULL DEFAULT '{}',
  step_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_complete boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for onboarding" ON tenant_onboarding
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));

-- Admin RBAC
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  permissions text[] NOT NULL DEFAULT '{}',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_roles_firm ON admin_roles(firm_id);

ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for admin_roles" ON admin_roles
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS admin_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  role_id text NOT NULL,
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

CREATE INDEX idx_admin_role_assignments_user ON admin_role_assignments(user_id, firm_id);

ALTER TABLE admin_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for role_assignments" ON admin_role_assignments
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));
