-- =============================================================================
-- DATA MIGRATION TOOLKIT
-- =============================================================================

-- Migration batches: each file upload = one batch
CREATE TABLE IF NOT EXISTS migration_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  label text NOT NULL,
  source_system text NOT NULL, -- e.g. 'Symitar', 'CU*Answers', 'FIS', 'Fiserv', 'Jack Henry'
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','validating','validated','importing','completed','failed','rolled_back')),
  entity_type text NOT NULL CHECK (entity_type IN ('members','accounts','transactions','payees','cards','loans')),
  file_name text NOT NULL,
  file_format text NOT NULL DEFAULT 'csv' CHECK (file_format IN ('csv','json')),
  total_rows int NOT NULL DEFAULT 0,
  valid_rows int NOT NULL DEFAULT 0,
  error_rows int NOT NULL DEFAULT 0,
  dry_run boolean NOT NULL DEFAULT true,
  mapping_template_id uuid,
  imported_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  error_summary jsonb DEFAULT '{}',
  reconciliation jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Individual rows within a batch
CREATE TABLE IF NOT EXISTS migration_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','valid','invalid','imported','rolled_back')),
  source_data jsonb NOT NULL DEFAULT '{}',
  mapped_data jsonb NOT NULL DEFAULT '{}',
  target_table text,
  target_id uuid,
  errors jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reusable field mapping templates
CREATE TABLE IF NOT EXISTS migration_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_system text NOT NULL,
  entity_type text NOT NULL,
  field_mappings jsonb NOT NULL DEFAULT '[]', -- [{sourceField, targetField, transform?, default?}]
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK after table exists
ALTER TABLE migration_batches
  ADD CONSTRAINT fk_mapping_template
  FOREIGN KEY (mapping_template_id)
  REFERENCES migration_mapping_templates(id)
  ON DELETE SET NULL;

-- Reconciliation reports
CREATE TABLE IF NOT EXISTS migration_reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN ('pre_import','post_import','balance_check')),
  source_total_cents bigint NOT NULL DEFAULT 0,
  target_total_cents bigint NOT NULL DEFAULT 0,
  source_row_count int NOT NULL DEFAULT 0,
  target_row_count int NOT NULL DEFAULT 0,
  discrepancies jsonb NOT NULL DEFAULT '[]',
  passed boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- GO-LIVE ORCHESTRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS golive_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','paused','completed','rolled_back')),
  current_step text,
  steps_completed text[] NOT NULL DEFAULT '{}',
  step_results jsonb NOT NULL DEFAULT '{}',
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS golive_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES golive_workflows(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  step text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('started','completed','failed','skipped','approved','rolled_back')),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- =============================================================================
-- CANARY DEPLOYMENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  version text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','canary','rolling_back','inactive')),
  error_rate_threshold numeric NOT NULL DEFAULT 0.05,
  auto_rollback boolean NOT NULL DEFAULT true,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- MEMBER TRANSITION SUPPORT
-- =============================================================================

ALTER TABLE firm_users ADD COLUMN IF NOT EXISTS is_migrated boolean DEFAULT false;
ALTER TABLE firm_users ADD COLUMN IF NOT EXISTS migration_batch_id uuid;
ALTER TABLE firm_users ADD COLUMN IF NOT EXISTS first_login_completed boolean DEFAULT false;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_migration_batches_firm ON migration_batches(firm_id);
CREATE INDEX IF NOT EXISTS idx_migration_batches_status ON migration_batches(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_batch_rows_batch ON migration_batch_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_migration_batch_rows_status ON migration_batch_rows(batch_id, status);
CREATE INDEX IF NOT EXISTS idx_migration_mapping_templates_firm ON migration_mapping_templates(firm_id);
CREATE INDEX IF NOT EXISTS idx_migration_reconciliation_batch ON migration_reconciliation_reports(batch_id);
CREATE INDEX IF NOT EXISTS idx_golive_workflows_firm ON golive_workflows(firm_id);
CREATE INDEX IF NOT EXISTS idx_golive_workflow_events_workflow ON golive_workflow_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tenant_deployments_firm ON tenant_deployments(firm_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_batch_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_mapping_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE migration_reconciliation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE golive_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE golive_workflow_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_deployments ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only access data for their own firm
CREATE POLICY migration_batches_tenant_isolation ON migration_batches
  FOR ALL USING (firm_id = get_user_firm_id());

CREATE POLICY migration_batch_rows_tenant_isolation ON migration_batch_rows
  FOR ALL USING (firm_id = get_user_firm_id());

CREATE POLICY migration_mapping_templates_tenant_isolation ON migration_mapping_templates
  FOR ALL USING (firm_id = get_user_firm_id() OR is_shared = true);

CREATE POLICY migration_reconciliation_reports_tenant_isolation ON migration_reconciliation_reports
  FOR ALL USING (firm_id = get_user_firm_id());

CREATE POLICY golive_workflows_tenant_isolation ON golive_workflows
  FOR ALL USING (firm_id = get_user_firm_id());

CREATE POLICY golive_workflow_events_tenant_isolation ON golive_workflow_events
  FOR ALL USING (firm_id = get_user_firm_id());

CREATE POLICY tenant_deployments_tenant_isolation ON tenant_deployments
  FOR ALL USING (firm_id = get_user_firm_id());
