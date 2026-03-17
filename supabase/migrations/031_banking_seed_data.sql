-- =============================================================================
-- BANKING SEED DATA
-- Demo/dev data for the digital banking platform.
-- Uses a deterministic "demo" firm so seed is idempotent.
--
-- FIXME: DEVELOPMENT ONLY — Production environments must NOT run this migration.
-- =============================================================================

-- Use a well-known demo firm ID so we can reference it throughout
DO $$
DECLARE
  demo_firm_id TEXT := 'demo-firm-001';
  demo_user_id UUID;
BEGIN

  -- Create demo firm if it doesn't exist
  INSERT INTO firms (id, name, subdomain, subscription_tier, max_users, max_properties, features)
  VALUES (
    demo_firm_id,
    'Demo Credit Union',
    'demo',
    'professional',
    25,
    5000,
    '{"rdc": true, "billPay": true, "cardControls": true, "externalTransfers": true}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;

  -- Get a user_id — use the first existing auth user, or skip if none
  SELECT id INTO demo_user_id FROM auth.users LIMIT 1;

  -- If no auth user exists, we can't seed user-scoped data
  IF demo_user_id IS NULL THEN
    RAISE NOTICE 'No auth.users found — skipping user-scoped banking seed data.';
    RETURN;
  END IF;

  -- Ensure firm_users membership
  INSERT INTO firm_users (firm_id, user_id, role, status, display_name)
  VALUES (demo_firm_id, demo_user_id, 'owner', 'active', 'Demo Member')
  ON CONFLICT (firm_id, user_id) DO NOTHING;

  -- Banking user profile
  INSERT INTO banking_users (id, firm_id, first_name, last_name, email, kyc_status, mfa_enabled)
  VALUES (demo_user_id, demo_firm_id, 'John', 'Doe', 'john.doe@example.com', 'approved', true)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- ACCOUNTS
  -- =========================================================================

  INSERT INTO banking_accounts (id, firm_id, user_id, type, nickname, account_number_encrypted, account_number_masked, routing_number, balance_cents, available_balance_cents, interest_rate_bps, status, opened_at)
  VALUES
    ('acct-1', demo_firm_id, demo_user_id, 'checking', 'Primary Checking', 'enc:9876544523', '****4523', '091000019', 2847523, 2747523, 15, 'active', '2023-06-15T00:00:00Z'),
    ('acct-2', demo_firm_id, demo_user_id, 'savings', 'Emergency Savings', 'enc:1234568901', '****8901', '091000019', 15230050, 15230050, 425, 'active', '2023-06-15T00:00:00Z'),
    ('acct-3', demo_firm_id, demo_user_id, 'money_market', 'High-Yield Money Market', 'enc:5555556745', '****6745', '091000019', 5012300, 5012300, 475, 'active', '2024-01-10T00:00:00Z'),
    ('acct-4', demo_firm_id, demo_user_id, 'cd', '12-Month CD', 'enc:7777772210', '****2210', '091000019', 2500000, 0, 510, 'active', '2025-03-01T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- TRANSACTIONS
  -- =========================================================================

  INSERT INTO banking_transactions (id, account_id, firm_id, type, status, amount_cents, running_balance_cents, description, merchant_name, category, posted_at, created_at)
  VALUES
    ('txn-001', 'acct-1', demo_firm_id, 'debit', 'posted', -4299, 2843224, 'Whole Foods Market #10234', 'Whole Foods Market', 'groceries', '2026-03-09T18:00:00Z', '2026-03-09T14:23:00Z'),
    ('txn-002', 'acct-1', demo_firm_id, 'debit', 'pending', -6500, 2836724, 'Shell Gas Station', 'Shell', 'transportation', NULL, '2026-03-09T08:45:00Z'),
    ('txn-003', 'acct-1', demo_firm_id, 'credit', 'posted', 325000, 3161724, 'Payroll Deposit - Acme Corp', NULL, 'income', '2026-03-07T06:00:00Z', '2026-03-07T06:00:00Z'),
    ('txn-004', 'acct-1', demo_firm_id, 'transfer', 'posted', -50000, 3111724, 'Transfer to Emergency Savings', NULL, 'transfer', '2026-03-07T10:30:00Z', '2026-03-07T10:30:00Z'),
    ('txn-005', 'acct-1', demo_firm_id, 'debit', 'posted', -15499, 3096225, 'Netflix Subscription', 'Netflix', 'entertainment', '2026-03-05T12:00:00Z', '2026-03-05T00:00:00Z'),
    ('txn-006', 'acct-1', demo_firm_id, 'fee', 'posted', -250, 3095975, 'Monthly Service Fee', NULL, 'fees', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    ('txn-007', 'acct-2', demo_firm_id, 'interest', 'posted', 5387, 15235437, 'Interest Payment', NULL, 'interest', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    ('txn-008', 'acct-2', demo_firm_id, 'deposit', 'posted', 50000, 15280050, 'Transfer from Primary Checking', NULL, 'transfer', '2026-03-07T10:30:00Z', '2026-03-07T10:30:00Z'),
    ('txn-009', 'acct-1', demo_firm_id, 'debit', 'posted', -8750, 3087225, 'Starbucks Coffee #4412', 'Starbucks', 'dining', '2026-03-04T12:00:00Z', '2026-03-04T07:15:00Z'),
    ('txn-010', 'acct-1', demo_firm_id, 'debit', 'posted', -125000, 2962225, 'Rent Payment - Maple Apartments', 'Maple Apartments', 'housing', '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
    ('txn-011', 'acct-3', demo_firm_id, 'interest', 'posted', 1983, 5014283, 'Monthly Interest Payment', NULL, 'interest', '2026-03-01T00:00:00Z', '2026-03-01T00:00:00Z'),
    ('txn-012', 'acct-1', demo_firm_id, 'debit', 'reversed', -2999, 2962225, 'Amazon.com - Refund Processed', 'Amazon', 'shopping', '2026-03-02T12:00:00Z', '2026-02-28T16:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- BENEFICIARIES
  -- =========================================================================

  INSERT INTO banking_beneficiaries (id, firm_id, user_id, name, account_number_encrypted, account_number_masked, routing_number, bank_name, type, is_verified)
  VALUES
    ('ben-1', demo_firm_id, demo_user_id, 'Jane Smith', 'enc:1234567890', '****7890', '021000021', 'Chase Bank', 'external', true),
    ('ben-2', demo_firm_id, demo_user_id, 'Acme Landlord LLC', 'enc:9876543344', '****3344', '011401533', 'Bank of America', 'external', true),
    ('ben-3', demo_firm_id, demo_user_id, 'Mom - Personal', 'enc:5555555511', '****5511', '071000013', 'Wells Fargo', 'external', false)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- BILLS
  -- =========================================================================

  INSERT INTO banking_bills (id, firm_id, user_id, payee_name, amount_cents, due_date, status, autopay, from_account_id, paid_at, created_at)
  VALUES
    ('bill-1', demo_firm_id, demo_user_id, 'City Electric Co', 14523, '2026-03-15', 'scheduled', true, 'acct-1', NULL, '2026-02-15T00:00:00Z'),
    ('bill-2', demo_firm_id, demo_user_id, 'Verizon Wireless', 8999, '2026-03-20', 'scheduled', true, 'acct-1', NULL, '2026-02-20T00:00:00Z'),
    ('bill-3', demo_firm_id, demo_user_id, 'State Farm Insurance', 23400, '2026-03-01', 'paid', false, 'acct-1', '2026-03-01T10:00:00Z', '2026-01-01T00:00:00Z'),
    ('bill-4', demo_firm_id, demo_user_id, 'Netflix', 15499, '2026-04-05', 'scheduled', true, 'acct-1', NULL, '2026-03-05T00:00:00Z'),
    ('bill-5', demo_firm_id, demo_user_id, 'Metro Water District', 6782, '2026-03-10', 'scheduled', false, 'acct-1', NULL, '2026-02-10T00:00:00Z'),
    ('bill-6', demo_firm_id, demo_user_id, 'Spotify Premium', 1099, '2026-03-22', 'scheduled', true, 'acct-1', NULL, '2026-02-22T00:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- CARDS
  -- =========================================================================

  INSERT INTO banking_cards (id, account_id, firm_id, user_id, type, last_four, cardholder_name, status, daily_limit_cents, single_transaction_limit_cents, expiration_date, is_contactless, is_virtual)
  VALUES
    ('card-1', 'acct-1', demo_firm_id, demo_user_id, 'debit', '4523', 'JOHN DOE', 'active', 250000, 100000, '06/28', true, false),
    ('card-2', 'acct-1', demo_firm_id, demo_user_id, 'credit', '9876', 'JOHN DOE', 'active', 500000, 250000, '12/27', true, false),
    ('card-3', 'acct-2', demo_firm_id, demo_user_id, 'debit', '8901', 'JOHN DOE', 'locked', 100000, 50000, '03/28', true, false)
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- RDC DEPOSITS
  -- =========================================================================

  INSERT INTO banking_rdc_deposits (id, account_id, firm_id, user_id, amount_cents, check_number, status, cleared_at, created_at)
  VALUES
    ('dep-1', 'acct-1', demo_firm_id, demo_user_id, 75000, '1042', 'cleared', '2026-02-26T06:00:00Z', '2026-02-25T14:00:00Z'),
    ('dep-2', 'acct-1', demo_firm_id, demo_user_id, 25000, '2088', 'accepted', NULL, '2026-03-08T10:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- STATEMENTS
  -- =========================================================================

  INSERT INTO banking_statements (id, account_id, firm_id, period_label, period_start, period_end, format, opening_balance_cents, closing_balance_cents, total_credits_cents, total_debits_cents, transaction_count, generated_at)
  VALUES
    ('stmt-1', 'acct-1', demo_firm_id, 'February 2026', '2026-02-01', '2026-02-28', 'hybrid', 2500000, 2847523, 375000, 27477, 8, '2026-03-01T06:00:00Z'),
    ('stmt-2', 'acct-1', demo_firm_id, 'January 2026', '2026-01-01', '2026-01-31', 'hybrid', 2200000, 2500000, 350000, 50000, 12, '2026-02-01T06:00:00Z'),
    ('stmt-3', 'acct-1', demo_firm_id, 'December 2025', '2025-12-01', '2025-12-31', 'pdf', 2100000, 2200000, 340000, 240000, 15, '2026-01-01T06:00:00Z'),
    ('stmt-4', 'acct-2', demo_firm_id, 'February 2026', '2026-02-01', '2026-02-28', 'hybrid', 15180050, 15230050, 55387, 5387, 3, '2026-03-01T06:00:00Z'),
    ('stmt-5', 'acct-2', demo_firm_id, 'January 2026', '2026-01-01', '2026-01-31', 'data', 15130050, 15180050, 54200, 4200, 2, '2026-02-01T06:00:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- NOTIFICATIONS
  -- =========================================================================

  INSERT INTO banking_notifications (id, user_id, firm_id, type, title, body, is_read, created_at)
  VALUES
    ('notif-1', demo_user_id, demo_firm_id, 'transaction', 'Direct Deposit Received', 'Your payroll deposit of $3,250.00 has been credited to Primary Checking.', false, '2026-03-07T06:01:00Z'),
    ('notif-2', demo_user_id, demo_firm_id, 'bill_due', 'Bill Due Soon', 'Your Metro Water District bill of $67.82 is due on March 10.', false, '2026-03-08T09:00:00Z'),
    ('notif-3', demo_user_id, demo_firm_id, 'security', 'Card Locked', 'Your debit card ending in 8901 has been locked. Contact us if this was not you.', true, '2026-03-05T15:30:00Z'),
    ('notif-4', demo_user_id, demo_firm_id, 'rdc_status', 'RDC Deposit Approved', 'Your mobile deposit of $250.00 has been approved and funds will be available tomorrow.', false, '2026-03-08T10:20:00Z'),
    ('notif-5', demo_user_id, demo_firm_id, 'system', 'Monthly Statement Ready', 'Your February 2026 statement for Primary Checking is now available.', true, '2026-03-01T06:05:00Z')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- CAPABILITIES & THEME
  -- =========================================================================

  INSERT INTO banking_capabilities (firm_id, capabilities)
  VALUES (demo_firm_id, '{
    "rdc": {"enabled": true, "provider": null, "maxAmountCents": 1000000},
    "billPay": {"enabled": true, "provider": null},
    "p2p": {"enabled": false, "provider": null},
    "cardControls": {"enabled": true},
    "externalTransfers": {"enabled": true},
    "wires": {"enabled": true, "cutoffTime": null},
    "mobileDeposit": {"enabled": true}
  }'::jsonb)
  ON CONFLICT (firm_id) DO NOTHING;

  INSERT INTO banking_tenant_theme (firm_id, tenant_name, logo_url, primary_color, accent_color, favicon_url)
  VALUES (demo_firm_id, 'Demo Credit Union', '/assets/logo.svg', '#1a56db', '#059669', '/assets/favicon.ico')
  ON CONFLICT (firm_id) DO NOTHING;

  RAISE NOTICE 'Banking seed data inserted for firm_id=% user_id=%', demo_firm_id, demo_user_id;

END $$;
