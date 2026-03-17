-- Tenant-level cooling-off period overrides per jurisdiction
-- Allows institutions to customize cooling-off days beyond statutory defaults

CREATE TABLE IF NOT EXISTS firm_cooling_off_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  jurisdiction TEXT NOT NULL,       -- ISO country code (e.g., 'DE', 'GB', 'AU')
  cooling_off_days INTEGER NOT NULL CHECK (cooling_off_days >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, jurisdiction)
);

-- RLS
ALTER TABLE firm_cooling_off_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON firm_cooling_off_overrides
  FOR ALL USING (firm_id = current_setting('app.firm_id', true)::uuid);

CREATE INDEX idx_firm_cooling_off_lookup ON firm_cooling_off_overrides(firm_id, jurisdiction);

CREATE TRIGGER update_firm_cooling_off_updated_at
  BEFORE UPDATE ON firm_cooling_off_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
