-- =============================================================================
-- CONSUMER BANKING EXTENSIONS
-- Member-facing tables for profile, products, loans, fees, standing
-- instructions, and CD maturity — everything a member sees in the app.
-- =============================================================================

-- =============================================================================
-- 1. MEMBER PROFILE EXTENSIONS
-- =============================================================================

-- Addresses (members can have multiple — home, mailing, work)
CREATE TABLE IF NOT EXISTS banking_member_addresses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('home', 'mailing', 'work', 'other')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_addr_user ON banking_member_addresses(user_id);
CREATE INDEX idx_member_addr_firm ON banking_member_addresses(firm_id);

-- Identity documents on file (member sees "Driver's License — verified")
CREATE TABLE IF NOT EXISTS banking_member_documents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN (
    'drivers_license', 'passport', 'state_id', 'military_id',
    'ssn_card', 'birth_certificate', 'utility_bill', 'other'
  )),
  label TEXT NOT NULL,                       -- "Driver's License"
  document_number_masked TEXT,               -- "****4523"
  issuing_authority TEXT,                     -- "State of California"
  issued_date DATE,
  expiration_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'verified', 'expired', 'rejected'
  )),
  file_url TEXT,                             -- secure storage reference

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_docs_user ON banking_member_documents(user_id);
CREATE INDEX idx_member_docs_firm ON banking_member_documents(firm_id);

-- Member identifiers (SSN masked, member number, tax ID)
CREATE TABLE IF NOT EXISTS banking_member_identifiers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('ssn', 'member_number', 'tax_id', 'ein', 'other')),
  value_masked TEXT NOT NULL,                -- "***-**-4523"
  value_encrypted TEXT NOT NULL,             -- encrypted at rest
  is_primary BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_ident_user ON banking_member_identifiers(user_id);
CREATE INDEX idx_member_ident_firm ON banking_member_identifiers(firm_id);

-- =============================================================================
-- 2. ACCOUNT PRODUCTS (what defines a "High-Yield Savings at 4.25%")
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_account_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  -- Product identity
  name TEXT NOT NULL,                        -- "High-Yield Savings"
  short_name TEXT NOT NULL,                  -- "HY Savings"
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'money_market', 'cd')),

  -- Interest
  interest_rate_bps INTEGER NOT NULL DEFAULT 0,  -- basis points: 425 = 4.25%
  interest_compounding TEXT NOT NULL DEFAULT 'daily' CHECK (interest_compounding IN (
    'daily', 'monthly', 'quarterly', 'annually'
  )),
  interest_posting TEXT NOT NULL DEFAULT 'monthly' CHECK (interest_posting IN (
    'monthly', 'quarterly', 'annually'
  )),
  interest_calculation TEXT NOT NULL DEFAULT 'daily_balance' CHECK (interest_calculation IN (
    'daily_balance', 'average_daily_balance', 'minimum_balance'
  )),

  -- Limits (integer cents)
  minimum_opening_balance_cents BIGINT NOT NULL DEFAULT 0,
  minimum_balance_cents BIGINT NOT NULL DEFAULT 0,
  maximum_balance_cents BIGINT,              -- null = no max
  withdrawal_limit_per_month INTEGER,        -- null = unlimited (Reg D for savings)

  -- CD-specific
  term_months INTEGER,                       -- CD term length
  early_withdrawal_penalty_bps INTEGER,      -- penalty as basis points of interest earned
  auto_renew BOOLEAN NOT NULL DEFAULT false,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acct_products_firm ON banking_account_products(firm_id);
CREATE INDEX idx_acct_products_type ON banking_account_products(type);
CREATE INDEX idx_acct_products_active ON banking_account_products(is_active) WHERE is_active;

-- Link accounts to their product
ALTER TABLE banking_accounts
  ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES banking_account_products(id);

-- =============================================================================
-- 3. CD MATURITY TRACKING
-- =============================================================================

ALTER TABLE banking_accounts
  ADD COLUMN IF NOT EXISTS maturity_date DATE,
  ADD COLUMN IF NOT EXISTS maturity_action TEXT CHECK (maturity_action IN (
    'renew_same_term', 'renew_new_term', 'transfer_to_savings', 'transfer_to_checking', 'notify_only'
  )),
  ADD COLUMN IF NOT EXISTS maturity_transfer_account_id TEXT REFERENCES banking_accounts(id),
  ADD COLUMN IF NOT EXISTS original_term_months INTEGER,
  ADD COLUMN IF NOT EXISTS penalty_withdrawn_cents BIGINT DEFAULT 0;

-- =============================================================================
-- 4. LOAN DOMAIN
-- =============================================================================

-- Loan products (what the CU offers: "30-Year Fixed Mortgage", "Auto Loan")
CREATE TABLE IF NOT EXISTS banking_loan_products (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                        -- "Auto Loan"
  short_name TEXT NOT NULL,                  -- "Auto"
  description TEXT,
  loan_type TEXT NOT NULL CHECK (loan_type IN (
    'personal', 'auto', 'mortgage', 'heloc', 'credit_builder',
    'student', 'business', 'line_of_credit', 'other'
  )),

  -- Rate
  interest_rate_bps INTEGER NOT NULL,        -- 649 = 6.49%
  rate_type TEXT NOT NULL DEFAULT 'fixed' CHECK (rate_type IN ('fixed', 'variable')),
  rate_floor_bps INTEGER,                    -- variable rate floor
  rate_ceiling_bps INTEGER,                  -- variable rate ceiling

  -- Terms
  min_term_months INTEGER NOT NULL DEFAULT 12,
  max_term_months INTEGER NOT NULL DEFAULT 360,
  min_amount_cents BIGINT NOT NULL DEFAULT 100000,   -- $1,000
  max_amount_cents BIGINT NOT NULL DEFAULT 50000000, -- $500,000

  -- Fees
  origination_fee_bps INTEGER NOT NULL DEFAULT 0,
  late_payment_fee_cents BIGINT NOT NULL DEFAULT 2500, -- $25
  late_payment_grace_days INTEGER NOT NULL DEFAULT 15,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_products_firm ON banking_loan_products(firm_id);
CREATE INDEX idx_loan_products_type ON banking_loan_products(loan_type);

-- Loan accounts (member's actual loan)
CREATE TABLE IF NOT EXISTS banking_loans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id TEXT NOT NULL REFERENCES banking_loan_products(id),

  -- Loan details
  loan_number_masked TEXT NOT NULL,          -- "****7890"
  principal_cents BIGINT NOT NULL,           -- original loan amount
  interest_rate_bps INTEGER NOT NULL,        -- actual rate (may differ from product)
  term_months INTEGER NOT NULL,
  disbursed_at TIMESTAMPTZ,

  -- Current state
  outstanding_balance_cents BIGINT NOT NULL DEFAULT 0,
  principal_paid_cents BIGINT NOT NULL DEFAULT 0,
  interest_paid_cents BIGINT NOT NULL DEFAULT 0,
  next_payment_due_date DATE,
  next_payment_amount_cents BIGINT,
  payments_remaining INTEGER,

  -- Payment source
  autopay_account_id TEXT REFERENCES banking_accounts(id),

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'active', 'delinquent', 'default',
    'paid_off', 'closed', 'charged_off'
  )),
  days_past_due INTEGER NOT NULL DEFAULT 0,

  -- Dates
  first_payment_date DATE,
  maturity_date DATE,
  paid_off_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loans_firm ON banking_loans(firm_id);
CREATE INDEX idx_loans_user ON banking_loans(user_id);
CREATE INDEX idx_loans_status ON banking_loans(status);
CREATE INDEX idx_loans_next_due ON banking_loans(next_payment_due_date);

-- Loan repayment schedule (member sees their amortization table)
CREATE TABLE IF NOT EXISTS banking_loan_schedule (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loan_id TEXT NOT NULL REFERENCES banking_loans(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  principal_cents BIGINT NOT NULL,
  interest_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  total_cents BIGINT NOT NULL,               -- principal + interest + fees

  -- What actually happened
  paid_cents BIGINT NOT NULL DEFAULT 0,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming', 'due', 'paid', 'partial', 'late', 'waived'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_sched_loan ON banking_loan_schedule(loan_id);
CREATE INDEX idx_loan_sched_firm ON banking_loan_schedule(firm_id);
CREATE INDEX idx_loan_sched_due ON banking_loan_schedule(due_date);
CREATE INDEX idx_loan_sched_status ON banking_loan_schedule(status);

-- Loan payments (member's payment history)
CREATE TABLE IF NOT EXISTS banking_loan_payments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loan_id TEXT NOT NULL REFERENCES banking_loans(id) ON DELETE CASCADE,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  amount_cents BIGINT NOT NULL,
  principal_portion_cents BIGINT NOT NULL DEFAULT 0,
  interest_portion_cents BIGINT NOT NULL DEFAULT 0,
  fee_portion_cents BIGINT NOT NULL DEFAULT 0,
  extra_principal_cents BIGINT NOT NULL DEFAULT 0,  -- extra payment toward principal

  from_account_id TEXT REFERENCES banking_accounts(id),
  payment_method TEXT NOT NULL DEFAULT 'internal' CHECK (payment_method IN (
    'internal', 'external_ach', 'check', 'cash', 'autopay'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'reversed'
  )),

  scheduled_date DATE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_payments_loan ON banking_loan_payments(loan_id);
CREATE INDEX idx_loan_payments_firm ON banking_loan_payments(firm_id);
CREATE INDEX idx_loan_payments_user ON banking_loan_payments(user_id);

-- =============================================================================
-- 5. CHARGES & FEES ENGINE
-- =============================================================================

-- Fee definitions (admin creates: "Monthly Maintenance Fee", "Overdraft Fee")
CREATE TABLE IF NOT EXISTS banking_charge_definitions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                        -- "Monthly Maintenance Fee"
  description TEXT,
  charge_type TEXT NOT NULL CHECK (charge_type IN (
    'monthly_maintenance', 'overdraft', 'nsf', 'wire_fee',
    'paper_statement', 'atm_fee', 'early_withdrawal',
    'late_payment', 'account_closure', 'foreign_transaction',
    'stop_payment', 'returned_check', 'custom'
  )),
  applies_to TEXT NOT NULL CHECK (applies_to IN (
    'checking', 'savings', 'money_market', 'cd', 'loan', 'all'
  )),

  -- Amount
  amount_cents BIGINT NOT NULL,              -- flat fee in cents
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  percentage_bps INTEGER,                    -- if percentage-based, basis points

  -- Frequency
  frequency TEXT NOT NULL DEFAULT 'one_time' CHECK (frequency IN (
    'one_time', 'monthly', 'quarterly', 'annually', 'per_occurrence'
  )),

  -- Rules
  waivable BOOLEAN NOT NULL DEFAULT true,
  waive_if_balance_above_cents BIGINT,       -- auto-waive if balance exceeds
  max_per_day INTEGER,                       -- max times charged per day (e.g., overdraft cap)

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charge_defs_firm ON banking_charge_definitions(firm_id);
CREATE INDEX idx_charge_defs_type ON banking_charge_definitions(charge_type);

-- Charges applied to a member's account (member sees "Oct 1 — Monthly Maintenance Fee — $5.00")
CREATE TABLE IF NOT EXISTS banking_charges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id TEXT REFERENCES banking_accounts(id),
  loan_id TEXT REFERENCES banking_loans(id),
  charge_definition_id TEXT NOT NULL REFERENCES banking_charge_definitions(id),
  transaction_id TEXT REFERENCES banking_transactions(id),   -- linked transaction

  amount_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'applied', 'waived', 'reversed', 'disputed'
  )),
  waived_reason TEXT,
  waived_at TIMESTAMPTZ,

  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_charges_firm ON banking_charges(firm_id);
CREATE INDEX idx_charges_user ON banking_charges(user_id);
CREATE INDEX idx_charges_account ON banking_charges(account_id);
CREATE INDEX idx_charges_loan ON banking_charges(loan_id);
CREATE INDEX idx_charges_status ON banking_charges(status);

-- =============================================================================
-- 6. STANDING INSTRUCTIONS (recurring automated transfers)
-- =============================================================================

CREATE TABLE IF NOT EXISTS banking_standing_instructions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- What to transfer
  from_account_id TEXT NOT NULL REFERENCES banking_accounts(id),
  to_account_id TEXT REFERENCES banking_accounts(id),
  to_beneficiary_id TEXT REFERENCES banking_beneficiaries(id),
  to_loan_id TEXT REFERENCES banking_loans(id),              -- auto loan payment
  transfer_type TEXT NOT NULL CHECK (transfer_type IN (
    'account_to_account', 'account_to_beneficiary', 'loan_payment'
  )),

  -- How much
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  name TEXT NOT NULL,                        -- "Weekly savings transfer"

  -- Schedule
  frequency TEXT NOT NULL CHECK (frequency IN (
    'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'
  )),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),        -- for weekly
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),     -- for monthly+
  start_date DATE NOT NULL,
  end_date DATE,                             -- null = indefinite
  next_execution_date DATE NOT NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'completed', 'cancelled', 'failed'
  )),
  total_executions INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  last_failure_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_standing_firm ON banking_standing_instructions(firm_id);
CREATE INDEX idx_standing_user ON banking_standing_instructions(user_id);
CREATE INDEX idx_standing_next ON banking_standing_instructions(next_execution_date) WHERE status = 'active';
CREATE INDEX idx_standing_status ON banking_standing_instructions(status);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Member addresses
ALTER TABLE banking_member_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_addr_select" ON banking_member_addresses FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "member_addr_insert" ON banking_member_addresses FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "member_addr_update" ON banking_member_addresses FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "member_addr_delete" ON banking_member_addresses FOR DELETE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Member documents
ALTER TABLE banking_member_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_docs_select" ON banking_member_documents FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "member_docs_insert" ON banking_member_documents FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Member identifiers
ALTER TABLE banking_member_identifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "member_ident_select" ON banking_member_identifiers FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Account products (all members can read)
ALTER TABLE banking_account_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acct_products_select" ON banking_account_products FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Loan products (all members can read)
ALTER TABLE banking_loan_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_products_select" ON banking_loan_products FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Loans
ALTER TABLE banking_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select" ON banking_loans FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Loan schedule
ALTER TABLE banking_loan_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_sched_select" ON banking_loan_schedule FOR SELECT
  USING (firm_id = get_user_firm_id() AND loan_id IN (
    SELECT id FROM banking_loans WHERE user_id = auth.uid()
  ));

-- Loan payments
ALTER TABLE banking_loan_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loan_payments_select" ON banking_loan_payments FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "loan_payments_insert" ON banking_loan_payments FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Charge definitions (all members can read — fee transparency)
ALTER TABLE banking_charge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charge_defs_select" ON banking_charge_definitions FOR SELECT
  USING (firm_id = get_user_firm_id());

-- Charges applied
ALTER TABLE banking_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "charges_select" ON banking_charges FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- Standing instructions
ALTER TABLE banking_standing_instructions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "standing_select" ON banking_standing_instructions FOR SELECT
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "standing_insert" ON banking_standing_instructions FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id() AND user_id = auth.uid());
CREATE POLICY "standing_update" ON banking_standing_instructions FOR UPDATE
  USING (firm_id = get_user_firm_id() AND user_id = auth.uid());

-- =============================================================================
-- UPDATED_AT TRIGGERS
-- =============================================================================

CREATE TRIGGER update_member_addresses_updated_at
  BEFORE UPDATE ON banking_member_addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_acct_products_updated_at
  BEFORE UPDATE ON banking_account_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loan_products_updated_at
  BEFORE UPDATE ON banking_loan_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON banking_loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charge_defs_updated_at
  BEFORE UPDATE ON banking_charge_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standing_updated_at
  BEFORE UPDATE ON banking_standing_instructions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
