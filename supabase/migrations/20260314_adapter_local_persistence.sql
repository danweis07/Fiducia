-- =============================================================================
-- Local Persistence for Adapter-Backed Features
--
-- These tables cache/store data from external adapter providers locally.
-- Provides resilience if adapters are temporarily unavailable and supports
-- audit trails for financial operations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Bill Pay: Enrolled Payees (local cache of adapter payee enrollments)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_billpay_payees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  biller_id TEXT NOT NULL,
  biller_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  account_number_masked TEXT NOT NULL,
  nickname TEXT,
  ebill_status TEXT NOT NULL DEFAULT 'not_enrolled',
  autopay_enabled BOOLEAN NOT NULL DEFAULT false,
  provider_payee_id TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billpay_payees_firm_user ON banking_billpay_payees(firm_id, user_id);

-- ---------------------------------------------------------------------------
-- Bill Pay: Scheduled/Completed Payments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_billpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  payee_id UUID NOT NULL REFERENCES banking_billpay_payees(id),
  from_account_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  scheduled_date DATE NOT NULL,
  method TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'scheduled',
  confirmation_number TEXT,
  provider_payment_id TEXT,
  memo TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billpay_payments_firm_user ON banking_billpay_payments(firm_id, user_id);
CREATE INDEX IF NOT EXISTS idx_billpay_payments_status ON banking_billpay_payments(status);

-- ---------------------------------------------------------------------------
-- Financial Data: User Budgets (persisted so they survive adapter outages)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  limit_cents BIGINT NOT NULL CHECK (limit_cents > 0),
  period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_budgets_firm_user ON banking_budgets(firm_id, user_id);

-- ---------------------------------------------------------------------------
-- Card Offers: Activated Offers (tracks what the user has opted into)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_card_offer_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  offer_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  provider_activation_id TEXT,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deactivated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_activations_firm_user ON banking_card_offer_activations(firm_id, user_id);
CREATE INDEX IF NOT EXISTS idx_offer_activations_offer ON banking_card_offer_activations(offer_id);

-- ---------------------------------------------------------------------------
-- Card Offers: Redemption History
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_card_offer_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  offer_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  transaction_amount_cents BIGINT NOT NULL,
  reward_amount_cents BIGINT NOT NULL,
  reward_type TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_firm_user ON banking_card_offer_redemptions(firm_id, user_id);

-- ---------------------------------------------------------------------------
-- Financial Data: Recurring Transaction Cache
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS banking_recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_logo_url TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  average_amount_cents BIGINT NOT NULL,
  last_amount_cents BIGINT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  next_expected_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_charge_date DATE,
  charge_count INTEGER NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_firm_user ON banking_recurring_transactions(firm_id, user_id);

-- ---------------------------------------------------------------------------
-- AI Services: Usage Tracking (for cost monitoring and billing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL,
  user_id UUID,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  action TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_firm ON ai_usage_log(firm_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS Policies
-- ---------------------------------------------------------------------------
ALTER TABLE banking_billpay_payees ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_billpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_card_offer_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_card_offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banking_recurring_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data within their tenant
CREATE POLICY billpay_payees_tenant_isolation ON banking_billpay_payees
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY billpay_payments_tenant_isolation ON banking_billpay_payments
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY budgets_tenant_isolation ON banking_budgets
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY offer_activations_tenant_isolation ON banking_card_offer_activations
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY offer_redemptions_tenant_isolation ON banking_card_offer_redemptions
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY recurring_tenant_isolation ON banking_recurring_transactions
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id'
    AND user_id = auth.uid());

CREATE POLICY ai_usage_tenant_isolation ON ai_usage_log
  FOR ALL USING (firm_id::text = current_setting('request.jwt.claims', true)::json->>'firm_id');
