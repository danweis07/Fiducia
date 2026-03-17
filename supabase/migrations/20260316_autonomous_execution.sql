-- =============================================================================
-- Autonomous Execution Infrastructure
--
-- Adds service accounts, execution policies, event ingestion, and
-- execution log tables to support AI agent autonomous loops.
--
-- Service accounts provide machine-identity auth for agents.
-- Execution policies define per-action permission boundaries.
-- The event inbox captures inbound events from core banking / fraud / etc.
-- The execution log tracks every autonomous action for audit.
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE service_account_status AS ENUM ('active', 'suspended', 'revoked');
CREATE TYPE execution_policy_approval AS ENUM ('auto_approve', 'human_required', 'disabled');
CREATE TYPE event_inbox_status AS ENUM ('pending', 'processing', 'processed', 'failed', 'dead_letter');
CREATE TYPE autonomous_execution_status AS ENUM ('pending', 'approved', 'executing', 'completed', 'failed', 'rejected', 'timed_out');

-- =============================================================================
-- SERVICE ACCOUNTS — machine identity for AI agents
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  -- API key hash (bcrypt) — the raw key is shown once at creation time
  api_key_hash    text NOT NULL,
  -- Last 4 chars of key for identification
  api_key_suffix  text NOT NULL,
  status          service_account_status NOT NULL DEFAULT 'active',
  -- Scoped permissions: array of gateway action patterns (e.g., 'cards.lock', 'transfers.create')
  allowed_actions text[] NOT NULL DEFAULT '{}',
  -- Maximum executions per hour (0 = unlimited)
  rate_limit_per_hour integer NOT NULL DEFAULT 100,
  -- IP allowlist (empty = any)
  ip_allowlist    text[] NOT NULL DEFAULT '{}',
  -- Metadata
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz,
  total_invocations bigint NOT NULL DEFAULT 0
);

CREATE INDEX idx_service_accounts_tenant ON service_accounts(tenant_id);
CREATE INDEX idx_service_accounts_status ON service_accounts(tenant_id, status);

ALTER TABLE service_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service accounts scoped to tenant" ON service_accounts
  FOR ALL USING (tenant_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- EXECUTION POLICIES — per-action permission boundaries for autonomous agents
-- =============================================================================

CREATE TABLE IF NOT EXISTS execution_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  -- The gateway action this policy governs (e.g., 'cards.lock', 'transfers.create')
  action          text NOT NULL,
  -- Approval mode
  approval        execution_policy_approval NOT NULL DEFAULT 'human_required',
  -- Conditions for auto-approve (JSONB) — e.g., max amount, allowed reasons, time windows
  conditions      jsonb NOT NULL DEFAULT '{}',
  -- Maximum auto-approvals per hour for this action
  max_auto_per_hour integer NOT NULL DEFAULT 50,
  -- Whether to send notification when auto-approved
  notify_on_auto  boolean NOT NULL DEFAULT true,
  -- Notification channels for human review requests
  review_channels text[] NOT NULL DEFAULT '{email}',
  -- Description for admin UI
  description     text,
  -- Priority (lower = evaluated first for same action)
  priority        integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, action, priority)
);

CREATE INDEX idx_execution_policies_tenant ON execution_policies(tenant_id, is_active);
CREATE INDEX idx_execution_policies_action ON execution_policies(tenant_id, action, is_active);

ALTER TABLE execution_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Execution policies scoped to tenant" ON execution_policies
  FOR ALL USING (tenant_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- EVENT INBOX — inbound events from core banking, fraud, etc.
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_inbox (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  -- Event source (e.g., 'symitar', 'jackhenry', 'alloy', 'internal')
  source          text NOT NULL,
  -- Event type (e.g., 'transaction.posted', 'fraud.alert', 'balance.changed')
  event_type      text NOT NULL,
  -- The event payload
  payload         jsonb NOT NULL,
  -- Target user (if applicable)
  user_id         uuid REFERENCES auth.users(id),
  -- Processing status
  status          event_inbox_status NOT NULL DEFAULT 'pending',
  -- Processing metadata
  processed_at    timestamptz,
  processed_by    text,            -- service account name or 'executor'
  error_message   text,
  retry_count     integer NOT NULL DEFAULT 0,
  max_retries     integer NOT NULL DEFAULT 3,
  -- Deduplication key (source + external ID)
  idempotency_key text,
  created_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, idempotency_key)
);

CREATE INDEX idx_event_inbox_pending ON event_inbox(tenant_id, status, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_event_inbox_user ON event_inbox(tenant_id, user_id, created_at);
CREATE INDEX idx_event_inbox_type ON event_inbox(tenant_id, event_type, status);

ALTER TABLE event_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event inbox scoped to tenant" ON event_inbox
  FOR ALL USING (tenant_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- AUTONOMOUS EXECUTION LOG — tracks every agent action
-- =============================================================================

CREATE TABLE IF NOT EXISTS autonomous_executions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  -- What triggered this execution
  trigger_event_id  uuid REFERENCES event_inbox(id),
  automation_rule_id uuid REFERENCES automation_rules(id),
  service_account_id uuid REFERENCES service_accounts(id),
  -- The gateway action being executed
  action            text NOT NULL,
  -- Parameters passed to the action
  action_params     jsonb NOT NULL DEFAULT '{}',
  -- The user this action is being performed on behalf of
  target_user_id    uuid REFERENCES auth.users(id),
  -- Execution status
  status            autonomous_execution_status NOT NULL DEFAULT 'pending',
  -- Which execution policy was applied
  policy_id         uuid REFERENCES execution_policies(id),
  policy_approval   execution_policy_approval,
  -- Result
  result            jsonb,
  error_message     text,
  -- Timing
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_autonomous_executions_tenant ON autonomous_executions(tenant_id, created_at DESC);
CREATE INDEX idx_autonomous_executions_status ON autonomous_executions(tenant_id, status);
CREATE INDEX idx_autonomous_executions_rule ON autonomous_executions(automation_rule_id);
CREATE INDEX idx_autonomous_executions_event ON autonomous_executions(trigger_event_id);
CREATE INDEX idx_autonomous_executions_user ON autonomous_executions(target_user_id, created_at DESC);

ALTER TABLE autonomous_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autonomous executions scoped to tenant" ON autonomous_executions
  FOR ALL USING (tenant_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- =============================================================================
-- AGENT KILL SWITCH — tenant-level toggle to disable all autonomous execution
-- =============================================================================

ALTER TABLE firms ADD COLUMN IF NOT EXISTS autonomous_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS autonomous_paused_at timestamptz;
ALTER TABLE firms ADD COLUMN IF NOT EXISTS autonomous_paused_by uuid REFERENCES auth.users(id);
