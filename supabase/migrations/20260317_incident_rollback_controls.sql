-- =============================================================================
-- INCIDENT ROLLBACK & CHANGE CONTROL TABLES
--
-- Supports three demo stories:
--   1. Incident detection → rollback → stakeholder notification
--   2. Control visibility dashboard (deployments, approvals, tests, health)
--   3. Clean audit narrative (change → approved → tested → deployed → monitored)
-- =============================================================================

-- 1. Incidents — tracks detected issues and their resolution lifecycle
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'detected' CHECK (status IN (
    'detected', 'investigating', 'mitigating', 'resolved', 'postmortem'
  )),

  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detected_by TEXT NOT NULL DEFAULT 'system' CHECK (detected_by IN ('system', 'manual')),
  detection_source TEXT CHECK (detection_source IN ('alert_rule', 'health_check', 'sentry', 'manual')),
  alert_rule_name TEXT,
  affected_services TEXT[] DEFAULT '{}',

  assigned_to TEXT,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,

  rollback_deployment_id TEXT,
  notification_sent_at TIMESTAMPTZ,
  stakeholders_notified TEXT[] DEFAULT '{}',

  postmortem_url TEXT,
  timeline JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_incidents_firm ON incidents(firm_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_detected ON incidents(detected_at DESC);

-- 2. Deployment rollbacks — records rollback actions
CREATE TABLE IF NOT EXISTS deployment_rollbacks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL,
  incident_id TEXT REFERENCES incidents(id),

  from_version TEXT NOT NULL,
  to_version TEXT NOT NULL,
  rollback_type TEXT NOT NULL CHECK (rollback_type IN ('full', 'migration', 'functions')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'failed'
  )),

  initiated_by TEXT NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  pre_rollback_snapshot JSONB,
  post_rollback_snapshot JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rollbacks_firm ON deployment_rollbacks(firm_id);
CREATE INDEX IF NOT EXISTS idx_rollbacks_incident ON deployment_rollbacks(incident_id);

-- 3. Change requests — ties together the full change lifecycle
CREATE TABLE IF NOT EXISTS change_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id TEXT NOT NULL,

  title TEXT NOT NULL,
  description TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN (
    'feature', 'bugfix', 'hotfix', 'migration', 'config'
  )),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'testing',
    'deploying', 'deployed', 'monitoring', 'closed'
  )),

  requested_by TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  approval_id TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  test_status TEXT DEFAULT 'pending' CHECK (test_status IN ('pending', 'passed', 'failed', 'skipped')),
  test_results JSONB,

  deployment_version TEXT,
  deployed_at TIMESTAMPTZ,

  monitoring_status TEXT DEFAULT 'healthy' CHECK (monitoring_status IN ('healthy', 'degraded', 'incident')),
  incident_id TEXT REFERENCES incidents(id),

  git_sha TEXT,
  git_branch TEXT,
  pr_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_requests_firm ON change_requests(firm_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_created ON change_requests(created_at DESC);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_incidents_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incidents_updated ON incidents;
CREATE TRIGGER trg_incidents_updated
  BEFORE UPDATE ON incidents FOR EACH ROW
  EXECUTE FUNCTION update_incidents_timestamp();

CREATE OR REPLACE FUNCTION update_change_requests_timestamp()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_change_requests_updated ON change_requests;
CREATE TRIGGER trg_change_requests_updated
  BEFORE UPDATE ON change_requests FOR EACH ROW
  EXECUTE FUNCTION update_change_requests_timestamp();

-- RLS
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_rollbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidents_tenant_isolation ON incidents
  USING (firm_id = current_setting('app.current_tenant', true));

CREATE POLICY rollbacks_tenant_isolation ON deployment_rollbacks
  USING (firm_id = current_setting('app.current_tenant', true));

CREATE POLICY change_requests_tenant_isolation ON change_requests
  USING (firm_id = current_setting('app.current_tenant', true));
