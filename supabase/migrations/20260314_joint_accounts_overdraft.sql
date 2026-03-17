-- Joint Account Management

CREATE TABLE IF NOT EXISTS account_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  account_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'business_partner', 'other')),
  permissions TEXT NOT NULL DEFAULT 'view_only' CHECK (permissions IN ('full', 'view_only', 'limited')),
  is_primary BOOLEAN DEFAULT false,
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS joint_account_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  account_id UUID NOT NULL,
  account_masked TEXT NOT NULL,
  inviter_id UUID NOT NULL REFERENCES auth.users(id),
  inviter_name TEXT NOT NULL,
  invitee_name TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN ('spouse', 'child', 'parent', 'business_partner', 'other')),
  permissions TEXT NOT NULL DEFAULT 'view_only',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days')
);

CREATE INDEX idx_account_owners_firm_account ON account_owners(firm_id, account_id);
CREATE INDEX idx_account_owners_user ON account_owners(user_id);
CREATE INDEX idx_joint_invitations_firm ON joint_account_invitations(firm_id);

ALTER TABLE account_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE joint_account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON account_owners
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON joint_account_invitations
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Overdraft Protection

CREATE TABLE IF NOT EXISTS overdraft_settings (
  account_id UUID PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  is_enabled BOOLEAN DEFAULT false,
  protection_type TEXT CHECK (protection_type IN ('transfer', 'line_of_credit', 'courtesy_pay')),
  linked_account_id UUID,
  linked_account_masked TEXT,
  courtesy_pay_limit_cents BIGINT,
  opted_into_overdraft_fees BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overdraft_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  account_id UUID NOT NULL,
  transaction_id UUID,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  protection_type TEXT NOT NULL,
  was_protected BOOLEAN DEFAULT false,
  occurred_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_overdraft_settings_firm ON overdraft_settings(firm_id, user_id);
CREATE INDEX idx_overdraft_events_account ON overdraft_events(account_id);

ALTER TABLE overdraft_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE overdraft_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON overdraft_settings
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON overdraft_events
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));
