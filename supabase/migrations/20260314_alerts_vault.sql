-- Spending Alert Rules

CREATE TABLE IF NOT EXISTS spending_alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('balance_below', 'balance_above', 'transaction_above', 'daily_spending_above', 'category_spending', 'large_withdrawal', 'international_transaction')),
  account_id UUID,
  account_masked TEXT,
  threshold_cents BIGINT,
  category_id TEXT,
  category_name TEXT,
  channels TEXT[] NOT NULL DEFAULT '{push}',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS spending_alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  rule_id UUID REFERENCES spending_alert_rules(id) ON DELETE SET NULL,
  rule_name TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  message TEXT NOT NULL,
  amount_cents BIGINT,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  acknowledged BOOLEAN DEFAULT false
);

CREATE INDEX idx_spending_alerts_firm_user ON spending_alert_rules(firm_id, user_id);
CREATE INDEX idx_alert_history_firm_user ON spending_alert_history(firm_id, user_id);

ALTER TABLE spending_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE spending_alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON spending_alert_rules
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON spending_alert_history
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Document Vault

CREATE TABLE IF NOT EXISTS vault_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tax_form', 'statement', 'receipt', 'insurance', 'legal', 'identification', 'other')),
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vault_docs_firm_user ON vault_documents(firm_id, user_id);
CREATE INDEX idx_vault_docs_category ON vault_documents(category) WHERE NOT is_deleted;

ALTER TABLE vault_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON vault_documents
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));
