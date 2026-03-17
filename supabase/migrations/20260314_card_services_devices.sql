-- Card Travel Notices

CREATE TABLE IF NOT EXISTS card_travel_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  card_id UUID NOT NULL,
  card_last_four TEXT NOT NULL,
  destinations JSONB NOT NULL DEFAULT '[]',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  contact_phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Card Replacements

CREATE TABLE IF NOT EXISTS card_replacements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  card_id UUID NOT NULL,
  card_last_four TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('lost', 'stolen', 'damaged', 'expired', 'name_change')),
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('standard', 'expedited')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'processing', 'shipped', 'delivered', 'activated', 'cancelled')),
  fee_cents BIGINT NOT NULL DEFAULT 0,
  new_card_last_four TEXT,
  tracking_number TEXT,
  estimated_delivery_date DATE,
  fraud_reported BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_travel_notices_firm_user ON card_travel_notices(firm_id, user_id);
CREATE INDEX idx_card_replacements_firm_user ON card_replacements(firm_id, user_id);

ALTER TABLE card_travel_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_replacements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON card_travel_notices
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON card_replacements
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

-- Device Management

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'unknown' CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  os TEXT NOT NULL,
  browser TEXT,
  is_trusted BOOLEAN DEFAULT false,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  last_ip_address TEXT,
  last_location TEXT,
  registered_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES user_devices(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address TEXT,
  location TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_devices_firm_user ON user_devices(firm_id, user_id);
CREATE INDEX idx_device_activity_device ON device_activity_log(device_id);

ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON user_devices
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "User sees own device activity" ON device_activity_log
  FOR ALL USING (device_id IN (SELECT id FROM user_devices WHERE user_id = auth.uid()));
