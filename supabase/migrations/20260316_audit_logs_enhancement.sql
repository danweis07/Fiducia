-- =============================================================================
-- Audit Logs Enhancement
--
-- Adds structured params column and indexes for compliance queries.
-- Ensures the audit_logs table is robust for SOC2/FFIEC requirements.
-- =============================================================================

-- Add params column for sanitized request parameters
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS params jsonb DEFAULT '{}';

-- Add resource_type column to categorize audited entities
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_type text;

-- Add resource_id column for the affected entity
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS resource_id text;

-- Add duration_ms for performance audit trail
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS duration_ms integer;

-- Indexes for compliance reporting
CREATE INDEX IF NOT EXISTS idx_audit_logs_firm_time
  ON audit_logs(firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_time
  ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_success
  ON audit_logs(success) WHERE success = false;

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON audit_logs(resource_type, resource_id) WHERE resource_type IS NOT NULL;

-- RLS policies to ensure tenant isolation on audit reads
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access (gateway writes via service role)
CREATE POLICY IF NOT EXISTS "Service role full access on audit_logs"
  ON audit_logs FOR ALL
  USING (auth.role() = 'service_role');

-- Partition hint: for production, consider range-partitioning by created_at
-- COMMENT ON TABLE audit_logs IS 'Immutable audit trail — append only. Partitioned by month in production.';
