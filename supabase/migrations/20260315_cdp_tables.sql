-- =============================================================================
-- CDP (Customer Data Platform) Tables
-- Stores RudderStack CDP configuration, destination routing, and event log
-- per tenant for the internal CDP admin interface.
-- =============================================================================

-- CDP Configuration (one per tenant)
CREATE TABLE IF NOT EXISTS cdp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider TEXT NOT NULL DEFAULT 'rudderstack',
  write_key TEXT,
  data_plane_url TEXT,
  consent_categories JSONB NOT NULL DEFAULT '["functional", "analytics", "marketing"]'::jsonb,
  event_schemas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_id)
);

ALTER TABLE cdp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdp_config_tenant_isolation ON cdp_config
  FOR ALL USING (firm_id = auth.uid()::uuid OR firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- CDP Destinations (many per tenant)
CREATE TABLE IF NOT EXISTS cdp_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,           -- e.g. 'google_analytics', 'hubspot', 'snowflake', 'braze'
  category TEXT NOT NULL,       -- 'marketing', 'crm', 'data_warehouse', 'analytics', 'advertising'
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_filter JSONB NOT NULL DEFAULT '[]'::jsonb,       -- array of event names to route
  consent_required JSONB NOT NULL DEFAULT '[]'::jsonb,   -- consent categories needed
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_destinations_firm ON cdp_destinations(firm_id);

ALTER TABLE cdp_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdp_destinations_tenant_isolation ON cdp_destinations
  FOR ALL USING (firm_id = auth.uid()::uuid OR firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- CDP Event Log (for monitoring / debugging — recent events only)
CREATE TABLE IF NOT EXISTS cdp_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'analytics',
  user_id TEXT,                 -- masked user reference
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,       -- which destinations received this
  status TEXT NOT NULL DEFAULT 'delivered',               -- 'delivered', 'failed', 'filtered'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cdp_event_log_firm ON cdp_event_log(firm_id);
CREATE INDEX idx_cdp_event_log_created ON cdp_event_log(created_at DESC);
CREATE INDEX idx_cdp_event_log_event ON cdp_event_log(event_name);

ALTER TABLE cdp_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY cdp_event_log_tenant_isolation ON cdp_event_log
  FOR ALL USING (firm_id = auth.uid()::uuid OR firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));
