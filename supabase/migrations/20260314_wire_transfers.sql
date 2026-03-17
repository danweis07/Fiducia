-- Wire Transfers
-- Tables for domestic and international wire transfer management

CREATE TABLE IF NOT EXISTS wire_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('domestic', 'international')),
  from_account_id UUID NOT NULL,
  beneficiary_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  routing_number TEXT,
  account_number_masked TEXT NOT NULL,
  swift_code TEXT,
  iban TEXT,
  bank_country TEXT,
  amount_cents BIGINT NOT NULL,
  fee_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  memo TEXT,
  purpose TEXT NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'returned')),
  estimated_completion_date DATE,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wire_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  domestic_fee_cents BIGINT NOT NULL DEFAULT 2500,
  international_fee_cents BIGINT NOT NULL DEFAULT 4500,
  expedited_domestic_fee_cents BIGINT NOT NULL DEFAULT 3500,
  expedited_international_fee_cents BIGINT NOT NULL DEFAULT 6500,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wire_transfers_firm_user ON wire_transfers(firm_id, user_id);
CREATE INDEX idx_wire_transfers_status ON wire_transfers(status);

ALTER TABLE wire_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE wire_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON wire_transfers
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON wire_fees
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Stop Payments

CREATE TABLE IF NOT EXISTS stop_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  account_masked TEXT NOT NULL,
  check_number_start TEXT NOT NULL,
  check_number_end TEXT,
  payee_name TEXT,
  amount_cents BIGINT,
  amount_range_low_cents BIGINT,
  amount_range_high_cents BIGINT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'matched')),
  fee_cents BIGINT NOT NULL DEFAULT 3500,
  duration TEXT NOT NULL CHECK (duration IN ('6months', '12months', 'permanent')),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_stop_payments_firm_user ON stop_payments(firm_id, user_id);
CREATE INDEX idx_stop_payments_status ON stop_payments(status);

ALTER TABLE stop_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON stop_payments
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));
