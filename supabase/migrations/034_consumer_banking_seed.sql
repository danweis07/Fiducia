-- FIXME: DEVELOPMENT ONLY — Do not run in production.
-- =============================================================================
-- SEED DATA: Consumer banking extensions
-- Adds demo data for products, loans, fees, addresses, standing instructions,
-- and CD maturity for the demo member.
-- =============================================================================

DO $$
DECLARE
  demo_firm_id TEXT := 'demo-firm-001';
  demo_user_id UUID;
BEGIN

  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;
  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No auth.users found — skipping consumer banking seed.';
    RETURN;
  END IF;

  -- =========================================================================
  -- MEMBER ADDRESSES
  -- =========================================================================

  INSERT INTO banking_member_addresses (id, user_id, firm_id, type, is_primary, line1, line2, city, state, zip, country, verified_at)
  VALUES
    ('addr-1', demo_user_id, demo_firm_id, 'home', true, '742 Evergreen Terrace', 'Apt 3B', 'Springfield', 'IL', '62704', 'US', '2023-06-15T00:00:00Z'),
    ('addr-2', demo_user_id, demo_firm_id, 'mailing', false, 'PO Box 1234', NULL, 'Springfield', 'IL', '62705', 'US', NULL)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- MEMBER DOCUMENTS
  -- =========================================================================

  INSERT INTO banking_member_documents (id, user_id, firm_id, type, label, document_number_masked, issuing_authority, issued_date, expiration_date, status)
  VALUES
    ('doc-1', demo_user_id, demo_firm_id, 'drivers_license', 'Illinois Driver''s License', '****4523', 'State of Illinois', '2022-03-15', '2028-03-15', 'verified'),
    ('doc-2', demo_user_id, demo_firm_id, 'passport', 'US Passport', '****7890', 'US Department of State', '2021-07-01', '2031-07-01', 'verified')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- MEMBER IDENTIFIERS
  -- =========================================================================

  INSERT INTO banking_member_identifiers (id, user_id, firm_id, type, value_masked, value_encrypted, is_primary)
  VALUES
    ('ident-1', demo_user_id, demo_firm_id, 'ssn', '***-**-4523', 'enc:123-45-4523', true),
    ('ident-2', demo_user_id, demo_firm_id, 'member_number', 'M-00012847', 'enc:M-00012847', false)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- ACCOUNT PRODUCTS
  -- =========================================================================

  INSERT INTO banking_account_products (id, firm_id, name, short_name, description, type, interest_rate_bps, interest_compounding, interest_posting, interest_calculation, minimum_opening_balance_cents, minimum_balance_cents, maximum_balance_cents, withdrawal_limit_per_month, term_months, early_withdrawal_penalty_bps, auto_renew, is_active)
  VALUES
    ('prod-checking', demo_firm_id, 'Essential Checking', 'Checking', 'No-fee everyday checking with debit card', 'checking', 15, 'daily', 'monthly', 'daily_balance', 2500, 0, NULL, NULL, NULL, NULL, false, true),
    ('prod-savings', demo_firm_id, 'High-Yield Savings', 'HY Savings', 'Earn 4.25% APY on your savings with no minimum balance', 'savings', 425, 'daily', 'monthly', 'daily_balance', 0, 0, NULL, 6, NULL, NULL, false, true),
    ('prod-mm', demo_firm_id, 'Premium Money Market', 'Money Market', 'Higher rates with check-writing privileges', 'money_market', 475, 'daily', 'monthly', 'average_daily_balance', 250000, 100000, NULL, 6, NULL, NULL, false, true),
    ('prod-cd-12', demo_firm_id, '12-Month Certificate', '12-Mo CD', 'Lock in a great rate for 12 months', 'cd', 510, 'daily', 'monthly', 'daily_balance', 100000, 100000, NULL, NULL, 12, 9000, true, true),
    ('prod-cd-24', demo_firm_id, '24-Month Certificate', '24-Mo CD', 'Our best rate — 24 month term', 'cd', 485, 'daily', 'monthly', 'daily_balance', 100000, 100000, NULL, NULL, 24, 18000, true, true)
  ON CONFLICT (id) DO NOTHING;

  -- Link existing accounts to products
  UPDATE banking_accounts SET product_id = 'prod-checking' WHERE id = 'acct-1' AND product_id IS NULL;
  UPDATE banking_accounts SET product_id = 'prod-savings' WHERE id = 'acct-2' AND product_id IS NULL;
  UPDATE banking_accounts SET product_id = 'prod-mm' WHERE id = 'acct-3' AND product_id IS NULL;
  UPDATE banking_accounts SET product_id = 'prod-cd-12', maturity_date = '2026-03-01', maturity_action = 'renew_same_term', original_term_months = 12 WHERE id = 'acct-4' AND product_id IS NULL;

  -- =========================================================================
  -- LOAN PRODUCTS
  -- =========================================================================

  INSERT INTO banking_loan_products (id, firm_id, name, short_name, description, loan_type, interest_rate_bps, rate_type, min_term_months, max_term_months, min_amount_cents, max_amount_cents, origination_fee_bps, late_payment_fee_cents, late_payment_grace_days, is_active)
  VALUES
    ('lprod-auto', demo_firm_id, 'New Auto Loan', 'Auto', 'Finance your new vehicle at a competitive rate', 'auto', 649, 'fixed', 24, 84, 500000, 10000000, 0, 2500, 15, true),
    ('lprod-personal', demo_firm_id, 'Personal Loan', 'Personal', 'Unsecured personal loan for any purpose', 'personal', 999, 'fixed', 12, 60, 100000, 5000000, 100, 3500, 15, true),
    ('lprod-mortgage', demo_firm_id, '30-Year Fixed Mortgage', 'Mortgage', 'Fixed-rate home financing', 'mortgage', 695, 'fixed', 180, 360, 5000000, 100000000, 50, 5000, 15, true),
    ('lprod-heloc', demo_firm_id, 'Home Equity Line of Credit', 'HELOC', 'Borrow against your home equity', 'heloc', 850, 'variable', 60, 240, 1000000, 25000000, 0, 2500, 15, true)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- LOANS (member has an auto loan)
  -- =========================================================================

  INSERT INTO banking_loans (id, firm_id, user_id, product_id, loan_number_masked, principal_cents, interest_rate_bps, term_months, disbursed_at, outstanding_balance_cents, principal_paid_cents, interest_paid_cents, next_payment_due_date, next_payment_amount_cents, payments_remaining, autopay_account_id, status, days_past_due, first_payment_date, maturity_date)
  VALUES
    ('loan-1', demo_firm_id, demo_user_id, 'lprod-auto', '****3456', 2800000, 649, 60, '2024-06-15T00:00:00Z', 2156000, 644000, 87200, '2026-04-01', 55432, 39, 'acct-1', 'active', 0, '2024-08-01', '2029-06-01')
  ON CONFLICT (id) DO NOTHING;

  -- Loan schedule (next few installments)
  INSERT INTO banking_loan_schedule (id, loan_id, firm_id, installment_number, due_date, principal_cents, interest_cents, total_cents, paid_cents, paid_at, status)
  VALUES
    ('sched-20', 'loan-1', demo_firm_id, 20, '2026-03-01', 43761, 11671, 55432, 55432, '2026-03-01T08:00:00Z', 'paid'),
    ('sched-21', 'loan-1', demo_firm_id, 21, '2026-04-01', 43998, 11434, 55432, 0, NULL, 'due'),
    ('sched-22', 'loan-1', demo_firm_id, 22, '2026-05-01', 44236, 11196, 55432, 0, NULL, 'upcoming'),
    ('sched-23', 'loan-1', demo_firm_id, 23, '2026-06-01', 44476, 10956, 55432, 0, NULL, 'upcoming'),
    ('sched-24', 'loan-1', demo_firm_id, 24, '2026-07-01', 44717, 10715, 55432, 0, NULL, 'upcoming'),
    ('sched-25', 'loan-1', demo_firm_id, 25, '2026-08-01', 44959, 10473, 55432, 0, NULL, 'upcoming')
  ON CONFLICT (id) DO NOTHING;

  -- Recent loan payments
  INSERT INTO banking_loan_payments (id, loan_id, firm_id, user_id, amount_cents, principal_portion_cents, interest_portion_cents, from_account_id, payment_method, status, processed_at, created_at)
  VALUES
    ('lpay-18', 'loan-1', demo_firm_id, demo_user_id, 55432, 43290, 12142, 'acct-1', 'autopay', 'completed', '2026-01-02T08:00:00Z', '2026-01-01T00:00:00Z'),
    ('lpay-19', 'loan-1', demo_firm_id, demo_user_id, 55432, 43524, 11908, 'acct-1', 'autopay', 'completed', '2026-02-03T08:00:00Z', '2026-02-01T00:00:00Z'),
    ('lpay-20', 'loan-1', demo_firm_id, demo_user_id, 55432, 43761, 11671, 'acct-1', 'autopay', 'completed', '2026-03-03T08:00:00Z', '2026-03-01T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- CHARGE DEFINITIONS
  -- =========================================================================

  INSERT INTO banking_charge_definitions (id, firm_id, name, description, charge_type, applies_to, amount_cents, is_percentage, frequency, waivable, waive_if_balance_above_cents, max_per_day, is_active)
  VALUES
    ('chg-maint', demo_firm_id, 'Monthly Maintenance Fee', 'Waived when balance stays above $1,500', 'monthly_maintenance', 'checking', 500, false, 'monthly', true, 150000, NULL, true),
    ('chg-overdraft', demo_firm_id, 'Overdraft Fee', 'Charged when account goes below $0', 'overdraft', 'checking', 2500, false, 'per_occurrence', true, NULL, 3, true),
    ('chg-nsf', demo_firm_id, 'NSF / Returned Item', 'Non-sufficient funds fee', 'nsf', 'checking', 2500, false, 'per_occurrence', true, NULL, 3, true),
    ('chg-wire', demo_firm_id, 'Domestic Wire Fee', 'Per outgoing domestic wire transfer', 'wire_fee', 'all', 2500, false, 'per_occurrence', false, NULL, NULL, true),
    ('chg-wire-intl', demo_firm_id, 'International Wire Fee', 'Per outgoing international wire transfer', 'wire_fee', 'all', 4500, false, 'per_occurrence', false, NULL, NULL, true),
    ('chg-paper', demo_firm_id, 'Paper Statement Fee', 'Monthly fee for paper statements', 'paper_statement', 'all', 300, false, 'monthly', true, NULL, NULL, true),
    ('chg-stop', demo_firm_id, 'Stop Payment Fee', 'Per stop payment request', 'stop_payment', 'checking', 3000, false, 'per_occurrence', false, NULL, NULL, true),
    ('chg-atm', demo_firm_id, 'Out-of-Network ATM Fee', 'Per out-of-network ATM withdrawal', 'atm_fee', 'checking', 250, false, 'per_occurrence', false, NULL, NULL, true)
  ON CONFLICT (id) DO NOTHING;

  -- Applied charges (member sees these)
  INSERT INTO banking_charges (id, firm_id, user_id, account_id, charge_definition_id, amount_cents, status, applied_at, created_at)
  VALUES
    ('chrg-1', demo_firm_id, demo_user_id, 'acct-1', 'chg-maint', 0, 'waived', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    ('chrg-2', demo_firm_id, demo_user_id, 'acct-1', 'chg-maint', 0, 'waived', '2026-02-01T00:00:00Z', '2026-02-01T00:00:00Z'),
    ('chrg-3', demo_firm_id, demo_user_id, 'acct-1', 'chg-maint', 500, 'applied', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- STANDING INSTRUCTIONS
  -- =========================================================================

  INSERT INTO banking_standing_instructions (id, firm_id, user_id, from_account_id, to_account_id, to_loan_id, transfer_type, amount_cents, name, frequency, day_of_month, start_date, next_execution_date, status, total_executions, last_executed_at)
  VALUES
    ('si-1', demo_firm_id, demo_user_id, 'acct-1', 'acct-2', NULL, 'account_to_account', 50000, 'Weekly Savings Transfer', 'weekly', NULL, '2025-01-06', '2026-03-17', 'active', 62, '2026-03-10T08:00:00Z'),
    ('si-2', demo_firm_id, demo_user_id, 'acct-1', NULL, 'loan-1', 'loan_payment', 55432, 'Auto Loan Autopay', 'monthly', 1, '2024-08-01', '2026-04-01', 'active', 20, '2026-03-01T08:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- Fix the weekly standing instruction — needs day_of_week not day_of_month
  UPDATE banking_standing_instructions SET day_of_week = 1 WHERE id = 'si-1';

  RAISE NOTICE 'Consumer banking seed data inserted for firm_id=% user_id=%', demo_firm_id, demo_user_id;

END $$;
