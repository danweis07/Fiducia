-- =============================================================================
-- Compliance Audit Integration (Vanta / Drata)
--
-- Seeds integration_providers for compliance audit platforms and adds a
-- compliance_sync_log table for tracking evidence sync operations.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Seed Vanta and Drata into integration_providers
-- ---------------------------------------------------------------------------
INSERT INTO integration_providers (id, name, category, auth_type, base_url, api_version, features, docs_url, settings_schema)
VALUES
  (
    'vanta',
    'Vanta',
    'platform',
    'api_key',
    'https://api.vanta.com/v1',
    'v1',
    '["compliance_audit", "evidence_sync", "incident_reporting", "compliance_status"]'::jsonb,
    'https://developer.vanta.com/docs',
    '{
      "type": "object",
      "properties": {
        "autoSyncEnabled": { "type": "boolean", "default": false, "description": "Automatically sync audit logs daily" },
        "syncFrequencyHours": { "type": "integer", "default": 24, "minimum": 1, "maximum": 168, "description": "Hours between automatic syncs" },
        "frameworks": { "type": "array", "items": { "type": "string", "enum": ["SOC2", "PCI_DSS", "GLBA", "NCUA", "FFIEC", "ISO27001", "NIST_CSF"] }, "default": ["SOC2"], "description": "Target compliance frameworks" },
        "evidenceCategories": { "type": "array", "items": { "type": "string" }, "default": ["access_control", "change_management", "incident_response"], "description": "Evidence categories to sync" }
      }
    }'::jsonb
  ),
  (
    'drata',
    'Drata',
    'platform',
    'api_key',
    'https://public-api.drata.com',
    'v1',
    '["compliance_audit", "evidence_sync", "incident_reporting", "compliance_status"]'::jsonb,
    'https://developers.drata.com/docs',
    '{
      "type": "object",
      "properties": {
        "autoSyncEnabled": { "type": "boolean", "default": false, "description": "Automatically sync audit logs daily" },
        "syncFrequencyHours": { "type": "integer", "default": 24, "minimum": 1, "maximum": 168, "description": "Hours between automatic syncs" },
        "frameworks": { "type": "array", "items": { "type": "string", "enum": ["SOC2", "PCI_DSS", "GLBA", "NCUA", "FFIEC", "ISO27001", "NIST_CSF"] }, "default": ["SOC2"], "description": "Target compliance frameworks" },
        "evidenceCategories": { "type": "array", "items": { "type": "string" }, "default": ["access_control", "change_management", "incident_response"], "description": "Evidence categories to sync" }
      }
    }'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  features = EXCLUDED.features,
  docs_url = EXCLUDED.docs_url,
  settings_schema = EXCLUDED.settings_schema;

-- ---------------------------------------------------------------------------
-- 2. Compliance Sync Log — tracks evidence push operations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider      text NOT NULL CHECK (provider IN ('vanta', 'drata', 'mock')),
  batch_id      text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed', 'skipped')),
  record_count  integer NOT NULL DEFAULT 0,
  synced_count  integer NOT NULL DEFAULT 0,
  failed_count  integer NOT NULL DEFAULT 0,
  error_message text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  initiated_by  uuid REFERENCES auth.users(id),
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_compliance_sync_log_firm_id ON compliance_sync_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_sync_log_provider ON compliance_sync_log(provider);
CREATE INDEX IF NOT EXISTS idx_compliance_sync_log_status ON compliance_sync_log(status);
CREATE INDEX IF NOT EXISTS idx_compliance_sync_log_created_at ON compliance_sync_log(created_at DESC);

-- RLS
ALTER TABLE compliance_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_sync_log_tenant_isolation ON compliance_sync_log
  FOR ALL USING (firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 3. Compliance Incidents — tracks incidents reported to compliance platforms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compliance_incidents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id               uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  incident_id           text NOT NULL,
  provider              text NOT NULL CHECK (provider IN ('vanta', 'drata', 'mock')),
  provider_incident_id  text,
  title                 text NOT NULL,
  severity              text NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  source                text NOT NULL,
  status                text NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'investigating', 'resolved', 'dismissed')),
  detected_at           timestamptz NOT NULL,
  resolved_at           timestamptz,
  reported_by           uuid REFERENCES auth.users(id),
  dashboard_url         text,
  metadata              jsonb DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, incident_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_firm_id ON compliance_incidents(firm_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_severity ON compliance_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_created_at ON compliance_incidents(created_at DESC);

-- RLS
ALTER TABLE compliance_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY compliance_incidents_tenant_isolation ON compliance_incidents
  FOR ALL USING (firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));
