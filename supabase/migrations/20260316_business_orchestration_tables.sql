-- Business Orchestration Tables
-- Creates tables for cash sweeps, invoice processor, approval workflow, and treasury vaults.

-- =============================================================================
-- Cash Sweep Rules
-- =============================================================================
CREATE TABLE IF NOT EXISTS cash_sweep_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  source_account_name TEXT,
  destination_account_id TEXT NOT NULL,
  destination_account_name TEXT,
  threshold_cents BIGINT NOT NULL,
  target_balance_cents BIGINT,
  direction TEXT NOT NULL CHECK (direction IN ('above_threshold', 'below_threshold', 'maintain_balance')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'realtime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  last_executed_at TIMESTAMPTZ,
  next_execution_at TIMESTAMPTZ,
  total_swept_cents BIGINT NOT NULL DEFAULT 0,
  sweep_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_sweep_rules_firm ON cash_sweep_rules(firm_id);
CREATE INDEX idx_cash_sweep_rules_user ON cash_sweep_rules(firm_id, user_id);
ALTER TABLE cash_sweep_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY cash_sweep_rules_tenant_isolation ON cash_sweep_rules
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);

-- =============================================================================
-- Sweep Executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS sweep_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  rule_id UUID NOT NULL REFERENCES cash_sweep_rules(id) ON DELETE CASCADE,
  rule_name TEXT,
  amount_cents BIGINT NOT NULL,
  source_account_name TEXT,
  destination_account_name TEXT,
  direction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'pending')),
  failure_reason TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sweep_executions_firm ON sweep_executions(firm_id);
CREATE INDEX idx_sweep_executions_rule ON sweep_executions(rule_id);
ALTER TABLE sweep_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY sweep_executions_tenant_isolation ON sweep_executions
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);

-- =============================================================================
-- Parsed Invoices (AI-powered invoice processing)
-- =============================================================================
CREATE TABLE IF NOT EXISTS parsed_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  vendor_name TEXT NOT NULL DEFAULT '',
  vendor_address TEXT,
  amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  due_date TEXT,
  invoice_number TEXT,
  remittance_info TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  confidence NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'parsed', 'confirmed', 'paid', 'failed')),
  suggested_account_id TEXT,
  suggested_account_name TEXT,
  available_balance_cents BIGINT,
  scheduled_date TEXT,
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_parsed_invoices_firm ON parsed_invoices(firm_id);
CREATE INDEX idx_parsed_invoices_user ON parsed_invoices(firm_id, user_id);
CREATE INDEX idx_parsed_invoices_status ON parsed_invoices(firm_id, status);
ALTER TABLE parsed_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY parsed_invoices_tenant_isolation ON parsed_invoices
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);

-- =============================================================================
-- Approval Requests (JIT Permissions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  requester_name TEXT,
  requester_email TEXT,
  approver_id UUID REFERENCES auth.users(id),
  approver_name TEXT,
  action_type TEXT NOT NULL,
  action_description TEXT,
  amount_cents BIGINT,
  current_limit_cents BIGINT,
  requested_limit_cents BIGINT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  deny_reason TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_requests_firm ON approval_requests(firm_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(firm_id, status);
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_requests_tenant_isolation ON approval_requests
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);

-- =============================================================================
-- Approval Policies
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  threshold_cents BIGINT NOT NULL,
  approver_roles TEXT[] NOT NULL DEFAULT ARRAY['owner', 'admin'],
  auto_expire_minutes INT NOT NULL DEFAULT 60,
  require_mfa BOOLEAN NOT NULL DEFAULT false,
  notify_channels TEXT[] NOT NULL DEFAULT ARRAY['push', 'email'],
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approval_policies_firm ON approval_policies(firm_id);
ALTER TABLE approval_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_policies_tenant_isolation ON approval_policies
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);

-- =============================================================================
-- Treasury Vaults
-- =============================================================================
CREATE TABLE IF NOT EXISTS treasury_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT 'column',
  balance_cents BIGINT NOT NULL DEFAULT 0,
  apy_bps INT NOT NULL DEFAULT 0,
  accrued_interest_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'pending')),
  linked_account_id TEXT NOT NULL,
  linked_account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treasury_vaults_firm ON treasury_vaults(firm_id);
CREATE INDEX idx_treasury_vaults_user ON treasury_vaults(firm_id, user_id);
ALTER TABLE treasury_vaults ENABLE ROW LEVEL SECURITY;
CREATE POLICY treasury_vaults_tenant_isolation ON treasury_vaults
  USING (firm_id = (current_setting('app.current_firm_id', true))::uuid);
