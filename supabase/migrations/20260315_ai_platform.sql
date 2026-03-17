-- =============================================================================
-- AI Banking Platform — Database Schema
-- Covers: Prompt framework, conversations, knowledge base (RAG),
--         automation rules, proactive insights, escalations
-- =============================================================================

-- Enable pgvector for embedding storage
create extension if not exists vector with schema extensions;

-- =============================================================================
-- 1. AI SYSTEM PROMPTS (stakeholder-scoped)
-- =============================================================================

create type ai_stakeholder as enum (
  'member',       -- Customer/member-facing chat
  'staff',        -- Credit union staff operations
  'marketing',    -- Marketing content generation
  'audit'         -- Compliance and audit queries
);

create table ai_system_prompts (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  stakeholder   ai_stakeholder not null,
  name          text not null,
  description   text,
  content       text not null,
  is_active     boolean not null default true,
  version       integer not null default 1,
  temperature   numeric(3,2) not null default 0.3,
  max_tokens    integer not null default 1024,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(tenant_id, stakeholder, name)
);

alter table ai_system_prompts enable row level security;

create policy "tenant_isolation" on ai_system_prompts
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- =============================================================================
-- 2. AI CONVERSATIONS & MESSAGES
-- =============================================================================

create type ai_conversation_status as enum (
  'active', 'escalated', 'resolved', 'archived'
);

create table ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id),
  stakeholder   ai_stakeholder not null default 'member',
  status        ai_conversation_status not null default 'active',
  title         text,                        -- auto-generated from first message
  metadata      jsonb not null default '{}', -- provider, model, token usage
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table ai_conversations enable row level security;

create policy "user_conversations" on ai_conversations
  using (user_id = auth.uid());

create index idx_conversations_user on ai_conversations(user_id, created_at desc);
create index idx_conversations_tenant on ai_conversations(tenant_id, status);

create table ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content         text not null,
  tool_calls      jsonb,                     -- function calls made by assistant
  tool_results    jsonb,                     -- results from tool execution
  feedback        text check (feedback in ('positive', 'negative')),
  feedback_comment text,
  token_count     integer,
  latency_ms      integer,
  provider        text,
  model           text,
  created_at      timestamptz not null default now()
);

create index idx_messages_conversation on ai_messages(conversation_id, created_at);

-- =============================================================================
-- 3. KNOWLEDGE BASE (RAG) — per-tenant document store
-- =============================================================================

create type kb_document_status as enum (
  'processing', 'active', 'expired', 'archived', 'error'
);

create type kb_category as enum (
  'products',       -- Rate sheets, account features
  'policies',       -- Overdraft, dispute process, wire cut-offs
  'faqs',           -- General questions
  'compliance',     -- Reg E, Reg CC, truth in savings
  'contact',        -- Branch hours, phone tree, holiday schedule
  'promotions',     -- Current offers, promo CD rates
  'operational'     -- Maintenance windows, known issues
);

create table kb_documents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  title         text not null,
  source_type   text not null default 'manual',  -- manual, cms_sync, config_sync
  source_id     text,                             -- original source reference
  category      kb_category not null,
  content       text not null,                    -- full text content
  metadata      jsonb not null default '{}',      -- author, original_url, etc.
  status        kb_document_status not null default 'processing',
  expires_at    timestamptz,                      -- auto-expire promos etc.
  version       integer not null default 1,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table kb_documents enable row level security;

create policy "tenant_isolation" on kb_documents
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create index idx_kb_documents_tenant on kb_documents(tenant_id, category, status);

-- Document chunks with vector embeddings
create table kb_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid not null references kb_documents(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  chunk_index   integer not null,
  content       text not null,
  embedding     vector(1536),                  -- OpenAI text-embedding-3-small dimension
  token_count   integer,
  metadata      jsonb not null default '{}',   -- section heading, page number, etc.
  created_at    timestamptz not null default now()
);

-- HNSW index for fast similarity search
create index idx_kb_chunks_embedding on kb_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index idx_kb_chunks_tenant on kb_chunks(tenant_id);
create index idx_kb_chunks_document on kb_chunks(document_id);

-- Track what members ask that the AI can't answer
create table kb_gaps (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references tenants(id) on delete cascade,
  query         text not null,
  category      kb_category,
  occurrence_count integer not null default 1,
  last_asked_at timestamptz not null default now(),
  resolved      boolean not null default false,
  resolved_by_document_id uuid references kb_documents(id),
  created_at    timestamptz not null default now()
);

create index idx_kb_gaps_tenant on kb_gaps(tenant_id, resolved, occurrence_count desc);

-- =============================================================================
-- 4. INTENT ACTIONS — maps intents to gateway actions
-- =============================================================================

create table ai_intent_actions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id) on delete cascade,  -- null = global
  intent          text not null,                  -- e.g. 'transfer_money'
  gateway_action  text not null,                  -- e.g. 'transfers.create'
  description     text not null,                  -- human-readable description
  required_params jsonb not null default '[]',    -- parameter schema
  confirmation_required boolean not null default true,
  stakeholders    ai_stakeholder[] not null default '{member}',
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_intent_actions_intent on ai_intent_actions(intent, is_active);

-- =============================================================================
-- 5. AUTOMATION RULES — member-defined AI rules
-- =============================================================================

create type automation_rule_status as enum (
  'active', 'paused', 'completed', 'failed', 'deleted'
);

create type automation_trigger_type as enum (
  'transaction',      -- on any transaction
  'balance_threshold', -- when balance crosses threshold
  'schedule',         -- time-based (daily, weekly, monthly)
  'direct_deposit',   -- when payroll/direct deposit arrives
  'recurring_payment' -- before recurring payment executes
);

create table automation_rules (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  name            text not null,                  -- "Round up purchases"
  description     text not null,                  -- original natural language input
  trigger_type    automation_trigger_type not null,
  trigger_config  jsonb not null default '{}',    -- threshold, schedule, filters
  action_type     text not null,                  -- gateway action to execute
  action_params   jsonb not null default '{}',    -- parameters for the action
  status          automation_rule_status not null default 'active',
  total_executions integer not null default 0,
  last_executed_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table automation_rules enable row level security;

create policy "user_rules" on automation_rules
  using (user_id = auth.uid());

create index idx_automation_rules_user on automation_rules(user_id, status);
create index idx_automation_rules_trigger on automation_rules(trigger_type, status)
  where status = 'active';

-- Execution log
create table automation_executions (
  id              uuid primary key default gen_random_uuid(),
  rule_id         uuid not null references automation_rules(id) on delete cascade,
  trigger_event   jsonb not null,                -- what triggered it
  action_result   jsonb,                         -- gateway response
  status          text not null check (status in ('success', 'failed', 'skipped')),
  error_message   text,
  executed_at     timestamptz not null default now()
);

create index idx_automation_executions_rule on automation_executions(rule_id, executed_at desc);

-- =============================================================================
-- 6. PROACTIVE INSIGHTS — AI-generated financial insights
-- =============================================================================

create type insight_type as enum (
  'overdraft_prediction',
  'spending_anomaly',
  'subscription_creep',
  'bill_increase',
  'savings_opportunity',
  'rate_alert',
  'unusual_merchant',
  'payment_failure_risk',
  'monthly_review',
  'goal_coaching',
  'life_event'
);

create type insight_status as enum (
  'pending',      -- generated, not yet delivered
  'delivered',    -- pushed to user
  'acted_on',     -- user took the suggested action
  'dismissed',    -- user dismissed
  'expired'       -- time-sensitive insight expired
);

create table ai_insights (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  type            insight_type not null,
  title           text not null,
  message         text not null,
  severity        text not null default 'info' check (severity in ('critical', 'warning', 'info', 'positive')),
  data            jsonb not null default '{}',    -- insight-specific data
  suggested_action jsonb,                         -- { type, label, params } for one-tap action
  status          insight_status not null default 'pending',
  delivered_at    timestamptz,
  acted_at        timestamptz,
  dismissed_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz not null default now()
);

alter table ai_insights enable row level security;

create policy "user_insights" on ai_insights
  using (user_id = auth.uid());

create index idx_insights_user on ai_insights(user_id, status, created_at desc);
create index idx_insights_pending on ai_insights(tenant_id, status)
  where status = 'pending';

-- =============================================================================
-- 7. AI ESCALATIONS — human-in-the-loop queue
-- =============================================================================

create type escalation_status as enum (
  'pending', 'assigned', 'in_progress', 'resolved', 'closed'
);

create type escalation_priority as enum (
  'low', 'normal', 'high', 'urgent'
);

create table ai_escalations (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  conversation_id uuid references ai_conversations(id),
  user_id         uuid not null references auth.users(id),
  assigned_to     uuid references auth.users(id),    -- staff member
  reason          text not null,
  summary         text not null,                      -- AI-generated context summary
  transcript      jsonb not null default '[]',        -- conversation history
  sentiment       text check (sentiment in ('positive', 'neutral', 'frustrated', 'angry')),
  priority        escalation_priority not null default 'normal',
  status          escalation_status not null default 'pending',
  resolution_notes text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

alter table ai_escalations enable row level security;

create policy "tenant_isolation" on ai_escalations
  using (tenant_id = current_setting('app.tenant_id', true)::uuid);

create index idx_escalations_tenant on ai_escalations(tenant_id, status, priority);
create index idx_escalations_assigned on ai_escalations(assigned_to, status)
  where assigned_to is not null;

-- =============================================================================
-- 8. HELPER FUNCTIONS
-- =============================================================================

-- Similarity search function for RAG retrieval
create or replace function match_kb_chunks(
  query_embedding vector(1536),
  match_tenant_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    kc.id,
    kc.document_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from kb_chunks kc
  join kb_documents kd on kd.id = kc.document_id
  where kc.tenant_id = match_tenant_id
    and kd.status = 'active'
    and (kd.expires_at is null or kd.expires_at > now())
    and 1 - (kc.embedding <=> query_embedding) > match_threshold
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;
