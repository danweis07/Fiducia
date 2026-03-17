-- Check Ordering

CREATE TABLE IF NOT EXISTS check_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'standard' CHECK (category IN ('standard', 'premium', 'scenic', 'character')),
  price_per_box_cents BIGINT NOT NULL DEFAULT 2500,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  account_masked TEXT NOT NULL,
  style_id UUID REFERENCES check_styles(id),
  style_name TEXT NOT NULL,
  quantity INT NOT NULL CHECK (quantity IN (50, 100, 150, 200)),
  starting_check_number TEXT NOT NULL,
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('standard', 'expedited', 'overnight')),
  shipping_cost_cents BIGINT NOT NULL DEFAULT 0,
  total_cost_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  tracking_number TEXT,
  estimated_delivery_date DATE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_check_orders_firm_user ON check_orders(firm_id, user_id);

ALTER TABLE check_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON check_styles
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON check_orders
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Direct Deposit Switching

CREATE TABLE IF NOT EXISTS supported_employers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  payroll_provider TEXT NOT NULL,
  is_supported BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS direct_deposit_switches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL,
  account_masked TEXT NOT NULL,
  employer_id UUID REFERENCES supported_employers(id),
  employer_name TEXT NOT NULL,
  allocation_type TEXT NOT NULL CHECK (allocation_type IN ('full', 'partial', 'fixed_amount')),
  allocation_amount_cents BIGINT,
  allocation_percentage INT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_login', 'processing', 'completed', 'failed', 'cancelled')),
  widget_url TEXT,
  provider_confirmation_id TEXT,
  completed_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_dd_switches_firm_user ON direct_deposit_switches(firm_id, user_id);

ALTER TABLE direct_deposit_switches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON direct_deposit_switches
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));
