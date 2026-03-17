-- Firm-level payment limits for all payment channels
-- Used by instant-payments, international-payments, and international-bill-pay handlers

CREATE TABLE IF NOT EXISTS firm_payment_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  channel TEXT NOT NULL, -- 'instant_payment', 'international_payment', 'international_payout', 'international_bill_pay'
  per_transaction_limit_cents BIGINT NOT NULL DEFAULT 10000000, -- $100k
  daily_limit_cents BIGINT NOT NULL DEFAULT 25000000,           -- $250k
  monthly_limit_cents BIGINT NOT NULL DEFAULT 100000000,        -- $1M
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, channel)
);

-- RLS
ALTER TABLE firm_payment_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON firm_payment_limits
  FOR ALL USING (firm_id = current_setting('app.firm_id', true)::uuid);

-- Index for fast lookups
CREATE INDEX idx_firm_payment_limits_lookup ON firm_payment_limits(firm_id, channel);

-- Auto-update updated_at
CREATE TRIGGER update_firm_payment_limits_updated_at
  BEFORE UPDATE ON firm_payment_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
