-- =============================================================================
-- BANKING DOMAIN TABLES
-- Core tables for digital banking: accounts, transactions, transfers,
-- beneficiaries, bills, cards, RDC deposits, statements, notifications.
--
-- All monetary values stored as INTEGER CENTS.
-- All tables scoped by firm_id for multi-tenant isolation.
-- Account numbers stored encrypted; only masked values in query results.
-- =============================================================================

-- =============================================================================
-- BANKING USERS (extends auth.users with banking profile)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  -- Profile (PII — restricted classification)
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,

  -- Status
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN (
    'pending', 'in_review', 'approved', 'rejected', 'expired'
  )),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Preferences
  preferred_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'America/New_York',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_users_firm ON banking_users(firm_id);
CREATE INDEX idx_banking_users_email ON banking_users(email);

-- =============================================================================
-- ACCOUNTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Account info
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'money_market', 'cd')),
  nickname TEXT,
  account_number_encrypted TEXT NOT NULL,     -- encrypted at rest
  account_number_masked TEXT NOT NULL,        -- ****1234
  routing_number TEXT NOT NULL,

  -- Balances (integer cents)
  balance_cents BIGINT NOT NULL DEFAULT 0,
  available_balance_cents BIGINT NOT NULL DEFAULT 0,

  -- Rates
  interest_rate_bps INTEGER NOT NULL DEFAULT 0,  -- basis points: 425 = 4.25%

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'frozen', 'closed', 'pending'
  )),

  -- Dates
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_accounts_firm ON banking_accounts(firm_id);
CREATE INDEX idx_banking_accounts_user ON banking_accounts(user_id);
CREATE INDEX idx_banking_accounts_type ON banking_accounts(type);
CREATE INDEX idx_banking_accounts_status ON banking_accounts(status);

-- =============================================================================
-- TRANSACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id TEXT NOT NULL REFERENCES banking_accounts(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  -- Transaction details
  type TEXT NOT NULL CHECK (type IN (
    'debit', 'credit', 'transfer', 'deposit', 'withdrawal',
    'fee', 'interest', 'rdc_deposit', 'bill_payment',
    'p2p_send', 'p2p_receive'
  )),
  amount_cents BIGINT NOT NULL,              -- positive = credit, negative = debit
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'income', 'groceries', 'dining', 'transportation', 'utilities',
    'housing', 'entertainment', 'healthcare', 'shopping', 'education',
    'travel', 'fees', 'transfer', 'deposit', 'interest', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'posted', 'declined', 'reversed'
  )),

  -- Merchant info
  merchant_name TEXT,
  merchant_category TEXT,

  -- Running balance after this transaction
  running_balance_cents BIGINT,

  -- Timestamps
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_txn_account ON banking_transactions(account_id);
CREATE INDEX idx_banking_txn_firm ON banking_transactions(firm_id);
CREATE INDEX idx_banking_txn_type ON banking_transactions(type);
CREATE INDEX idx_banking_txn_status ON banking_transactions(status);
CREATE INDEX idx_banking_txn_category ON banking_transactions(category);
CREATE INDEX idx_banking_txn_created ON banking_transactions(created_at DESC);
CREATE INDEX idx_banking_txn_posted ON banking_transactions(posted_at DESC);
-- Full text search on description + merchant
CREATE INDEX idx_banking_txn_search ON banking_transactions
  USING gin(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(merchant_name, '')));

-- =============================================================================
-- BENEFICIARIES (before transfers — transfers references this table)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_beneficiaries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Beneficiary info
  name TEXT NOT NULL,
  nickname TEXT,
  account_number_encrypted TEXT NOT NULL,
  account_number_masked TEXT NOT NULL,        -- ****1234
  routing_number TEXT,
  bank_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external', 'wire')),
  is_verified BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_beneficiaries_firm ON banking_beneficiaries(firm_id);
CREATE INDEX idx_banking_beneficiaries_user ON banking_beneficiaries(user_id);

-- =============================================================================
-- TRANSFERS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_transfers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Endpoints
  from_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
  to_account_id TEXT REFERENCES banking_accounts(id),              -- null for external
  to_beneficiary_id TEXT REFERENCES banking_beneficiaries(id),     -- for external transfers

  -- Details
  type TEXT NOT NULL CHECK (type IN ('internal', 'external', 'wire', 'p2p')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  memo TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'cancelled'
  )),

  -- Scheduling
  scheduled_date DATE,
  recurring_rule JSONB,  -- { frequency, endDate, nextExecutionDate }

  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_transfers_firm ON banking_transfers(firm_id);
CREATE INDEX idx_banking_transfers_user ON banking_transfers(user_id);
CREATE INDEX idx_banking_transfers_from ON banking_transfers(from_account_id);
CREATE INDEX idx_banking_transfers_status ON banking_transfers(status);
CREATE INDEX idx_banking_transfers_scheduled ON banking_transfers(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- =============================================================================
-- BILLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_bills (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Payee info
  payee_name TEXT NOT NULL,
  payee_account_number_masked TEXT,

  -- Payment details
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'processing', 'paid', 'failed', 'cancelled'
  )),
  autopay BOOLEAN NOT NULL DEFAULT false,
  recurring_rule JSONB,

  -- Source account
  from_account_id TEXT NOT NULL REFERENCES banking_accounts(id),

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_bills_firm ON banking_bills(firm_id);
CREATE INDEX idx_banking_bills_user ON banking_bills(user_id);
CREATE INDEX idx_banking_bills_status ON banking_bills(status);
CREATE INDEX idx_banking_bills_due ON banking_bills(due_date);

-- =============================================================================
-- CARDS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_cards (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id TEXT NOT NULL REFERENCES banking_accounts(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Card details
  type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
  last_four TEXT NOT NULL CHECK (length(last_four) = 4),
  cardholder_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'locked', 'lost', 'stolen', 'expired', 'cancelled'
  )),

  -- Limits (integer cents)
  daily_limit_cents BIGINT NOT NULL DEFAULT 250000,
  single_transaction_limit_cents BIGINT NOT NULL DEFAULT 100000,

  -- Details
  expiration_date TEXT NOT NULL,             -- "MM/YY"
  is_contactless BOOLEAN NOT NULL DEFAULT true,
  is_virtual BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_cards_firm ON banking_cards(firm_id);
CREATE INDEX idx_banking_cards_account ON banking_cards(account_id);
CREATE INDEX idx_banking_cards_user ON banking_cards(user_id);
CREATE INDEX idx_banking_cards_status ON banking_cards(status);

-- =============================================================================
-- RDC DEPOSITS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_rdc_deposits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id TEXT NOT NULL REFERENCES banking_accounts(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Deposit info
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  front_image_url TEXT,                      -- secure storage reference (never raw base64)
  back_image_url TEXT,
  check_number TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'reviewing', 'accepted', 'rejected', 'cleared'
  )),
  rejection_reason TEXT,
  cleared_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_rdc_firm ON banking_rdc_deposits(firm_id);
CREATE INDEX idx_banking_rdc_account ON banking_rdc_deposits(account_id);
CREATE INDEX idx_banking_rdc_user ON banking_rdc_deposits(user_id);
CREATE INDEX idx_banking_rdc_status ON banking_rdc_deposits(status);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'transaction', 'transfer', 'bill_due', 'rdc_status',
    'card_alert', 'security', 'system', 'promotional'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_notif_user ON banking_notifications(user_id);
CREATE INDEX idx_banking_notif_firm ON banking_notifications(firm_id);
CREATE INDEX idx_banking_notif_read ON banking_notifications(is_read) WHERE NOT is_read;
CREATE INDEX idx_banking_notif_created ON banking_notifications(created_at DESC);

-- =============================================================================
-- ACCOUNT STATEMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_statements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  account_id TEXT NOT NULL REFERENCES banking_accounts(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  -- Period
  period_label TEXT NOT NULL,                -- "February 2026"
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Format
  format TEXT NOT NULL DEFAULT 'hybrid' CHECK (format IN ('pdf', 'data', 'hybrid')),

  -- Summary (integer cents)
  opening_balance_cents BIGINT NOT NULL DEFAULT 0,
  closing_balance_cents BIGINT NOT NULL DEFAULT 0,
  total_credits_cents BIGINT NOT NULL DEFAULT 0,
  total_debits_cents BIGINT NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,

  -- PDF download
  download_url TEXT,

  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_banking_stmt_account ON banking_statements(account_id);
CREATE INDEX idx_banking_stmt_firm ON banking_statements(firm_id);
CREATE INDEX idx_banking_stmt_period ON banking_statements(period_start DESC);

-- =============================================================================
-- BANKING CAPABILITIES (per-tenant feature config)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_capabilities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL UNIQUE REFERENCES firms(id) ON DELETE CASCADE,

  -- Feature flags (JSONB for flexibility)
  capabilities JSONB NOT NULL DEFAULT '{
    "rdc": {"enabled": true, "provider": null, "maxAmountCents": 1000000},
    "billPay": {"enabled": true, "provider": null},
    "p2p": {"enabled": false, "provider": null},
    "cardControls": {"enabled": true},
    "externalTransfers": {"enabled": true},
    "wires": {"enabled": true, "cutoffTime": null},
    "mobileDeposit": {"enabled": true}
  }'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- TENANT THEME (branding config)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_tenant_theme (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL UNIQUE REFERENCES firms(id) ON DELETE CASCADE,

  tenant_name TEXT NOT NULL DEFAULT 'Digital Credit Union',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1a56db',
  accent_color TEXT NOT NULL DEFAULT '#059669',
  favicon_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Banking Users
ALTER TABLE banking_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_users_select_own"
  ON banking_users FOR SELECT
  USING (firm_id = get_user_firm_id() AND id = auth.uid());

CREATE POLICY "banking_users_update_own"
  ON banking_users FOR UPDATE
  USING (firm_id = get_user_firm_id() AND id = auth.uid())
  WITH CHECK (firm_id = get_user_firm_id() AND id = auth.uid());

-- Accounts: users see their own accounts within their firm
ALTER TABLE banking_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_accounts_select"
  ON banking_accounts FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_accounts_insert"
  ON banking_accounts FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Transactions: users see transactions on their accounts
ALTER TABLE banking_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_txn_select"
  ON banking_transactions FOR SELECT
  USING (
    firm_id = get_user_firm_id()
    AND account_id IN (
      SELECT id FROM banking_accounts WHERE user_id = auth.uid()
    )
  );

-- Transfers: users see their own transfers
ALTER TABLE banking_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_transfers_select"
  ON banking_transfers FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_transfers_insert"
  ON banking_transfers FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_transfers_update"
  ON banking_transfers FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Beneficiaries: users manage their own
ALTER TABLE banking_beneficiaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_beneficiaries_select"
  ON banking_beneficiaries FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_beneficiaries_insert"
  ON banking_beneficiaries FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_beneficiaries_delete"
  ON banking_beneficiaries FOR DELETE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Bills: users manage their own
ALTER TABLE banking_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_bills_select"
  ON banking_bills FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_bills_insert"
  ON banking_bills FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_bills_update"
  ON banking_bills FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Cards: users see cards on their accounts
ALTER TABLE banking_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_cards_select"
  ON banking_cards FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_cards_update"
  ON banking_cards FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- RDC: users see their own deposits
ALTER TABLE banking_rdc_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_rdc_select"
  ON banking_rdc_deposits FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_rdc_insert"
  ON banking_rdc_deposits FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Notifications: users see their own
ALTER TABLE banking_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_notif_select"
  ON banking_notifications FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_notif_update"
  ON banking_notifications FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

CREATE POLICY "banking_notif_insert"
  ON banking_notifications FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

-- Statements: users see statements for their accounts
ALTER TABLE banking_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_stmt_select"
  ON banking_statements FOR SELECT
  USING (
    firm_id = get_user_firm_id()
    AND account_id IN (
      SELECT id FROM banking_accounts WHERE user_id = auth.uid()
    )
  );

-- Capabilities: all firm members can read
ALTER TABLE banking_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_capabilities_select"
  ON banking_capabilities FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Theme: all firm members can read
ALTER TABLE banking_tenant_theme ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banking_theme_select"
  ON banking_tenant_theme FOR SELECT
  USING (firm_id = get_user_firm_id());

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_banking_users_updated_at
  BEFORE UPDATE ON banking_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banking_accounts_updated_at
  BEFORE UPDATE ON banking_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banking_capabilities_updated_at
  BEFORE UPDATE ON banking_capabilities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_banking_theme_updated_at
  BEFORE UPDATE ON banking_tenant_theme
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
