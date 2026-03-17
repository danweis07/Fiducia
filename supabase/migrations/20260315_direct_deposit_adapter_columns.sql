-- Add adapter integration columns to direct_deposit_switches
-- These columns store provider-specific identifiers from the payroll
-- switching adapter (Pinwheel, Argyle, etc.)

ALTER TABLE direct_deposit_switches
  ADD COLUMN IF NOT EXISTS provider_switch_id TEXT,
  ADD COLUMN IF NOT EXISTS link_token TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'mock';

-- Add platform_id to supported_employers for provider directory mapping
ALTER TABLE supported_employers
  ADD COLUMN IF NOT EXISTS platform_id TEXT;

CREATE INDEX IF NOT EXISTS idx_dd_switches_provider_id
  ON direct_deposit_switches(provider_switch_id)
  WHERE provider_switch_id IS NOT NULL;
