-- Data Migration & Go-Live Toolkit
-- Provides tables for bulk data import, schema mapping, reconciliation,
-- go-live orchestration workflows, and canary deployment support.

-- =============================================================================
-- MIGRATION MAPPING TEMPLATES
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  source_system text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN (
    'members', 'accounts', 'transactions', 'payees', 'cards', 'loans'
  )),
  field_mappings jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mapping_templates_firm
  ON migration_mapping_templates(firm_id);

ALTER TABLE migration_mapping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for mapping templates"
  ON migration_mapping_templates
  USING (firm_id = get_user_firm_id());

-- =============================================================================
-- MIGRATION BATCHES
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  label text NOT NULL,
  source_system text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'validating', 'validated', 'importing', 'completed', 'failed', 'rolled_back'
  )),
  entity_type text NOT NULL CHECK (entity_type IN (
    'members', 'accounts', 'transactions', 'payees', 'cards', 'loans'
  )),
  file_name text,
  file_format text CHECK (file_format IN ('csv', 'json')),
  total_rows int NOT NULL DEFAULT 0,
  valid_rows int NOT NULL DEFAULT 0,
  error_rows int NOT NULL DEFAULT 0,
  dry_run boolean NOT NULL DEFAULT true,
  mapping_template_id uuid REFERENCES migration_mapping_templates(id),
  imported_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  rolled_back_at timestamptz,
  error_summary jsonb DEFAULT '{}'::jsonb,
  reconciliation jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_migration_batches_firm
  ON migration_batches(firm_id);
CREATE INDEX IF NOT EXISTS idx_migration_batches_status
  ON migration_batches(firm_id, status);

ALTER TABLE migration_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for migration batches"
  ON migration_batches
  USING (firm_id = get_user_firm_id());

-- =============================================================================
-- MIGRATION BATCH ROWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  row_number int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'valid', 'invalid', 'imported', 'rolled_back'
  )),
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  mapped_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  target_table text,
  target_id uuid,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batch_rows_batch
  ON migration_batch_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_rows_status
  ON migration_batch_rows(batch_id, status);

ALTER TABLE migration_batch_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for batch rows"
  ON migration_batch_rows
  USING (
    EXISTS (
      SELECT 1 FROM migration_batches mb
      WHERE mb.id = migration_batch_rows.batch_id
        AND mb.firm_id = get_user_firm_id()
    )
  );

-- =============================================================================
-- MIGRATION RECONCILIATION REPORTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS migration_reconciliation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES migration_batches(id) ON DELETE CASCADE,
  report_type text NOT NULL CHECK (report_type IN (
    'pre_import', 'post_import', 'balance_check'
  )),
  source_total_cents bigint NOT NULL DEFAULT 0,
  target_total_cents bigint NOT NULL DEFAULT 0,
  source_row_count int NOT NULL DEFAULT 0,
  target_row_count int NOT NULL DEFAULT 0,
  discrepancies jsonb NOT NULL DEFAULT '[]'::jsonb,
  passed boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_batch
  ON migration_reconciliation_reports(batch_id);

ALTER TABLE migration_reconciliation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for reconciliation reports"
  ON migration_reconciliation_reports
  USING (
    EXISTS (
      SELECT 1 FROM migration_batches mb
      WHERE mb.id = migration_reconciliation_reports.batch_id
        AND mb.firm_id = get_user_firm_id()
    )
  );

-- =============================================================================
-- GO-LIVE WORKFLOWS
-- =============================================================================

CREATE TABLE IF NOT EXISTS golive_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN (
    'not_started', 'in_progress', 'paused', 'completed', 'rolled_back'
  )),
  current_step text,
  steps_completed text[] NOT NULL DEFAULT '{}',
  step_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_by uuid REFERENCES auth.users(id),
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_golive_workflows_firm
  ON golive_workflows(firm_id);

ALTER TABLE golive_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for golive workflows"
  ON golive_workflows
  USING (firm_id = get_user_firm_id());

-- =============================================================================
-- GO-LIVE WORKFLOW EVENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS golive_workflow_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES golive_workflows(id) ON DELETE CASCADE,
  step text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'started', 'completed', 'failed', 'skipped', 'approved', 'rolled_back'
  )),
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_golive_events_workflow
  ON golive_workflow_events(workflow_id);

ALTER TABLE golive_workflow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for golive events"
  ON golive_workflow_events
  USING (
    EXISTS (
      SELECT 1 FROM golive_workflows gw
      WHERE gw.id = golive_workflow_events.workflow_id
        AND gw.firm_id = get_user_firm_id()
    )
  );

-- =============================================================================
-- TENANT DEPLOYMENTS (canary support)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tenant_deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  version text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  rollout_percentage int NOT NULL DEFAULT 100
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'canary', 'rolling_back', 'inactive'
  )),
  error_rate_threshold numeric NOT NULL DEFAULT 0.05,
  auto_rollback boolean NOT NULL DEFAULT true,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_deployments_firm
  ON tenant_deployments(firm_id);

ALTER TABLE tenant_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for deployments"
  ON tenant_deployments
  USING (firm_id = get_user_firm_id());

-- =============================================================================
-- MEMBER MIGRATION FLAGS
-- =============================================================================

ALTER TABLE firm_users
  ADD COLUMN IF NOT EXISTS is_migrated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS migration_batch_id uuid REFERENCES migration_batches(id),
  ADD COLUMN IF NOT EXISTS first_login_completed boolean NOT NULL DEFAULT false;
