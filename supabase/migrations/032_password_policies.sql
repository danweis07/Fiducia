-- =============================================================================
-- PASSWORD POLICY TABLE
-- Per-tenant configurable password and username rules for digital activation.
-- Admins manage these through the TenantSettings admin page.
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_password_policies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL UNIQUE REFERENCES firms(id) ON DELETE CASCADE,

  -- Username rules
  username_min_length INTEGER NOT NULL DEFAULT 6,
  username_max_length INTEGER NOT NULL DEFAULT 32,
  username_allow_email BOOLEAN NOT NULL DEFAULT false,
  username_pattern TEXT NOT NULL DEFAULT '^[a-zA-Z0-9_]+$',
  username_pattern_description TEXT NOT NULL DEFAULT 'Alphanumeric characters and underscores only',

  -- Password rules
  password_min_length INTEGER NOT NULL DEFAULT 8,
  password_max_length INTEGER NOT NULL DEFAULT 128,
  require_uppercase BOOLEAN NOT NULL DEFAULT true,
  require_lowercase BOOLEAN NOT NULL DEFAULT true,
  require_digit BOOLEAN NOT NULL DEFAULT true,
  require_special_char BOOLEAN NOT NULL DEFAULT true,
  special_chars TEXT NOT NULL DEFAULT '!@#$%^&*()_+-=[]{}|;:,.<>?',
  disallow_username BOOLEAN NOT NULL DEFAULT true,
  password_history_count INTEGER NOT NULL DEFAULT 0,

  -- Expiration & lockout
  password_expiry_days INTEGER NOT NULL DEFAULT 0,       -- 0 = never expires
  max_failed_attempts INTEGER NOT NULL DEFAULT 5,
  lockout_duration_minutes INTEGER NOT NULL DEFAULT 30,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: admins can read/write; members can read (for validation UI)
ALTER TABLE banking_password_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_policy_select"
  ON banking_password_policies FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "password_policy_insert_admin"
  ON banking_password_policies FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

CREATE POLICY "password_policy_update_admin"
  ON banking_password_policies FOR UPDATE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'))
  WITH CHECK (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

CREATE TRIGGER update_banking_password_policies_updated_at
  BEFORE UPDATE ON banking_password_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default policy for demo firm
INSERT INTO banking_password_policies (firm_id)
VALUES ('demo-firm-001')
ON CONFLICT (firm_id) DO NOTHING;
