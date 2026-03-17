-- P2P Transfers (Zelle)

CREATE TABLE IF NOT EXISTS p2p_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  enrollment_type TEXT NOT NULL CHECK (enrollment_type IN ('email', 'phone')),
  enrollment_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, enrollment_type, enrollment_value)
);

CREATE TABLE IF NOT EXISTS p2p_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('send', 'receive', 'request')),
  sender_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('email', 'phone', 'token')),
  recipient_value TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'expired')),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_p2p_enrollments_firm_user ON p2p_enrollments(firm_id, user_id);
CREATE INDEX idx_p2p_transactions_firm_user ON p2p_transactions(firm_id, user_id);

ALTER TABLE p2p_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON p2p_enrollments
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON p2p_transactions
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Savings Goals

CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  icon_emoji TEXT,
  target_amount_cents BIGINT NOT NULL,
  current_amount_cents BIGINT NOT NULL DEFAULT 0,
  account_id UUID NOT NULL,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  auto_contribute BOOLEAN DEFAULT false,
  auto_contribute_amount_cents BIGINT,
  auto_contribute_frequency TEXT CHECK (auto_contribute_frequency IN ('weekly', 'biweekly', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual', 'automatic', 'withdrawal')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_savings_goals_firm_user ON savings_goals(firm_id, user_id);
CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON savings_goals
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "User sees own contributions" ON goal_contributions
  FOR ALL USING (goal_id IN (SELECT id FROM savings_goals WHERE user_id = auth.uid()));
