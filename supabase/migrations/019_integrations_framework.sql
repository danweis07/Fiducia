-- =============================================================================
-- INTEGRATIONS FRAMEWORK
-- Modular integration system with OAuth support
-- Allows firms to connect third-party services without managing API keys
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE integration_category AS ENUM (
  'documents',       -- PandaDoc, DocuSign, HelloSign
  'crm',             -- Salesforce, HubSpot, Apto
  'communication',   -- Slack, Gmail, Outlook, Nylas
  'data',            -- CoStar, Trepp, Reonomy
  'calendar',        -- Google Calendar, Outlook Calendar
  'accounting'       -- QuickBooks (future)
);

CREATE TYPE integration_auth_type AS ENUM (
  'oauth2',          -- Standard OAuth 2.0 flow
  'api_key',         -- User provides API key
  'webhook_only',    -- Inbound webhooks only (no outbound auth)
  'none'             -- No auth needed (public APIs)
);

CREATE TYPE integration_status AS ENUM (
  'connected',       -- Active and working
  'disconnected',    -- User disconnected
  'expired',         -- Token expired, needs re-auth
  'error',           -- Connection error
  'pending'          -- OAuth in progress
);

-- =============================================================================
-- INTEGRATION PROVIDERS
-- System-defined list of available integrations
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_providers (
  id TEXT PRIMARY KEY,                    -- 'pandadoc', 'docusign', etc.

  -- Display
  name TEXT NOT NULL,                     -- 'PandaDoc'
  description TEXT,
  logo_url TEXT,
  category integration_category NOT NULL,

  -- Authentication
  auth_type integration_auth_type NOT NULL,

  -- OAuth2 configuration (when auth_type = 'oauth2')
  oauth_config JSONB,
  /* Example:
  {
    "authorize_url": "https://app.pandadoc.com/oauth2/authorize",
    "token_url": "https://api.pandadoc.com/oauth2/access_token",
    "scopes": ["read", "write"],
    "response_type": "code"
  }
  */

  -- API configuration
  base_url TEXT,                          -- Base API URL
  api_version TEXT,                       -- Current API version

  -- Features this integration provides
  features TEXT[] NOT NULL,
  /* Examples:
    - 'document_generation'
    - 'e_signature'
    - 'contact_sync'
    - 'deal_sync'
    - 'activity_sync'
    - 'email_tracking'
    - 'notifications'
    - 'market_data'
    - 'loan_data'
  */

  -- Settings schema (JSON Schema for firm-specific settings)
  settings_schema JSONB,

  -- Webhook configuration
  webhook_events TEXT[],                  -- Events this provider sends

  -- Rate limits
  rate_limit_requests INTEGER,            -- Requests per window
  rate_limit_window_seconds INTEGER,      -- Window size

  -- Status
  is_enabled BOOLEAN DEFAULT true,        -- Vantage can disable globally
  is_beta BOOLEAN DEFAULT false,

  -- Documentation
  setup_instructions TEXT,
  docs_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FIRM INTEGRATIONS
-- Which integrations each firm has enabled/connected
-- =============================================================================

CREATE TABLE IF NOT EXISTS firm_integrations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  firm_id TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL REFERENCES integration_providers(id),

  -- Connection status
  status integration_status NOT NULL DEFAULT 'disconnected',
  status_message TEXT,                    -- Error message if status = 'error'

  -- OAuth2 tokens (encrypted at rest via Supabase Vault)
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  token_scopes TEXT[],                    -- Granted scopes

  -- For API key auth
  api_key_encrypted TEXT,

  -- Provider-specific account info
  external_account_id TEXT,               -- User's ID in the external system
  external_account_name TEXT,             -- Display name from provider
  external_workspace_id TEXT,             -- Workspace/org ID if applicable

  -- Firm-specific settings for this integration
  settings JSONB DEFAULT '{}',
  /* Examples:
    PandaDoc: { "default_folder_id": "xxx", "auto_send": false }
    Slack: { "channel_id": "xxx", "notify_on": ["deal_closed", "doc_signed"] }
  */

  -- Sync configuration
  sync_enabled BOOLEAN DEFAULT true,
  sync_direction TEXT DEFAULT 'both',     -- 'inbound', 'outbound', 'both'
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,                  -- 'success', 'partial', 'failed'
  last_sync_error TEXT,
  next_sync_at TIMESTAMPTZ,

  -- Usage tracking
  api_calls_today INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ,

  -- Audit
  connected_at TIMESTAMPTZ,
  connected_by TEXT,                      -- User who connected
  disconnected_at TIMESTAMPTZ,
  disconnected_by TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(firm_id, provider_id)
);

CREATE INDEX idx_firm_integrations_firm ON firm_integrations(firm_id);
CREATE INDEX idx_firm_integrations_provider ON firm_integrations(provider_id);
CREATE INDEX idx_firm_integrations_status ON firm_integrations(status);

-- =============================================================================
-- OAUTH STATE
-- Temporary storage for OAuth flow state (CSRF protection)
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_oauth_state (
  state TEXT PRIMARY KEY,                 -- Random state parameter
  firm_id TEXT NOT NULL REFERENCES firms(id),
  provider_id TEXT NOT NULL REFERENCES integration_providers(id),
  user_id TEXT NOT NULL,                  -- User initiating the connection
  redirect_uri TEXT NOT NULL,
  code_verifier TEXT,                     -- For PKCE
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Auto-cleanup expired states
CREATE INDEX idx_oauth_state_expires ON integration_oauth_state(expires_at);

-- =============================================================================
-- INTEGRATION WEBHOOKS
-- Log of incoming webhooks from providers
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_webhook_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  provider_id TEXT NOT NULL REFERENCES integration_providers(id),
  firm_id TEXT REFERENCES firms(id),      -- NULL if can't determine firm

  -- Request details
  event_type TEXT,
  payload JSONB,
  headers JSONB,

  -- Processing
  processed_at TIMESTAMPTZ,
  processing_status TEXT,                 -- 'success', 'failed', 'ignored'
  processing_error TEXT,

  -- Audit
  received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_logs_provider ON integration_webhook_logs(provider_id);
CREATE INDEX idx_webhook_logs_firm ON integration_webhook_logs(firm_id);
CREATE INDEX idx_webhook_logs_received ON integration_webhook_logs(received_at);

-- Partition or cleanup old logs (keep 30 days)
-- In production, consider partitioning by date

-- =============================================================================
-- INTEGRATION SYNC LOGS
-- Track sync operations between Vantage and external systems
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  firm_integration_id TEXT NOT NULL REFERENCES firm_integrations(id) ON DELETE CASCADE,

  -- Sync details
  sync_type TEXT NOT NULL,                -- 'full', 'incremental', 'manual'
  direction TEXT NOT NULL,                -- 'inbound', 'outbound'
  entity_type TEXT,                       -- 'contacts', 'deals', 'documents'

  -- Results
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,

  -- Errors
  errors JSONB,                           -- Array of error details

  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'running'  -- 'running', 'completed', 'failed', 'cancelled'
);

CREATE INDEX idx_sync_logs_integration ON integration_sync_logs(firm_integration_id);
CREATE INDEX idx_sync_logs_started ON integration_sync_logs(started_at);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_oauth_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

-- Providers: everyone can read enabled providers
CREATE POLICY "providers_select_enabled"
  ON integration_providers FOR SELECT
  USING (is_enabled = true);

-- Firm integrations: firm members only
CREATE POLICY "firm_integrations_select"
  ON firm_integrations FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_insert"
  ON firm_integrations FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_update"
  ON firm_integrations FOR UPDATE
  USING (firm_id = get_user_firm_id());

CREATE POLICY "firm_integrations_delete"
  ON firm_integrations FOR DELETE
  USING (firm_id = get_user_firm_id() AND get_user_firm_role() IN ('owner', 'admin'));

-- OAuth state: firm members only
CREATE POLICY "oauth_state_select"
  ON integration_oauth_state FOR SELECT
  USING (firm_id = get_user_firm_id());

CREATE POLICY "oauth_state_insert"
  ON integration_oauth_state FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id());

CREATE POLICY "oauth_state_delete"
  ON integration_oauth_state FOR DELETE
  USING (firm_id = get_user_firm_id());

-- Webhook logs: firm members can see their logs
CREATE POLICY "webhook_logs_select"
  ON integration_webhook_logs FOR SELECT
  USING (firm_id = get_user_firm_id() OR firm_id IS NULL);

-- Sync logs: via parent integration
CREATE POLICY "sync_logs_select"
  ON integration_sync_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM firm_integrations fi
    WHERE fi.id = firm_integration_id AND fi.firm_id = get_user_firm_id()
  ));

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER update_integration_providers_updated_at
  BEFORE UPDATE ON integration_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_firm_integrations_updated_at
  BEFORE UPDATE ON firm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Reset daily API call counter
CREATE OR REPLACE FUNCTION reset_api_calls_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.api_calls_reset_at IS NULL OR NEW.api_calls_reset_at < CURRENT_DATE THEN
    NEW.api_calls_today := 0;
    NEW.api_calls_reset_at := CURRENT_DATE + INTERVAL '1 day';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_api_calls
  BEFORE UPDATE ON firm_integrations
  FOR EACH ROW
  EXECUTE FUNCTION reset_api_calls_if_needed();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Check if a firm has a connected integration
CREATE OR REPLACE FUNCTION is_integration_connected(
  p_firm_id TEXT,
  p_provider_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM firm_integrations
    WHERE firm_id = p_firm_id
      AND provider_id = p_provider_id
      AND status = 'connected'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get enabled features for a firm (based on connected integrations)
CREATE OR REPLACE FUNCTION get_firm_enabled_features(p_firm_id TEXT)
RETURNS TEXT[] AS $$
DECLARE
  features TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT unnest)
  INTO features
  FROM (
    SELECT unnest(ip.features)
    FROM firm_integrations fi
    JOIN integration_providers ip ON ip.id = fi.provider_id
    WHERE fi.firm_id = p_firm_id
      AND fi.status = 'connected'
      AND ip.is_enabled = true
  ) sub;

  RETURN COALESCE(features, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM integration_oauth_state
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Clean up old webhook logs (keep last 30 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM integration_webhook_logs
    WHERE received_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old sync logs (keep last 90 days by default)
CREATE OR REPLACE FUNCTION cleanup_old_sync_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM integration_sync_logs
    WHERE started_at < NOW() - (retention_days || ' days')::INTERVAL
      AND status IN ('completed', 'failed', 'cancelled')
    RETURNING 1
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Combined cleanup function for all integration-related old data
CREATE OR REPLACE FUNCTION cleanup_integration_data(
  webhook_retention_days INTEGER DEFAULT 30,
  sync_retention_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  webhook_logs_deleted INTEGER,
  sync_logs_deleted INTEGER,
  oauth_states_deleted INTEGER
) AS $$
DECLARE
  webhooks INTEGER;
  syncs INTEGER;
  oauth_states INTEGER;
BEGIN
  -- Clean up webhook logs
  SELECT cleanup_old_webhook_logs(webhook_retention_days) INTO webhooks;

  -- Clean up sync logs
  SELECT cleanup_old_sync_logs(sync_retention_days) INTO syncs;

  -- Clean up expired OAuth states
  WITH deleted AS (
    DELETE FROM integration_oauth_state
    WHERE expires_at < NOW()
    RETURNING 1
  )
  SELECT COUNT(*) INTO oauth_states FROM deleted;

  RETURN QUERY SELECT webhooks, syncs, oauth_states;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- Available integrations for a firm (with connection status)
CREATE OR REPLACE VIEW available_integrations AS
SELECT
  ip.id,
  ip.name,
  ip.description,
  ip.logo_url,
  ip.category,
  ip.auth_type,
  ip.features,
  ip.is_beta,
  ip.docs_url,
  fi.status,
  fi.connected_at,
  fi.external_account_name,
  fi.settings,
  fi.last_sync_at
FROM integration_providers ip
LEFT JOIN firm_integrations fi ON fi.provider_id = ip.id
  AND fi.firm_id = get_user_firm_id()
WHERE ip.is_enabled = true
ORDER BY ip.category, ip.name;

-- Integration health dashboard
CREATE OR REPLACE VIEW integration_health AS
SELECT
  fi.firm_id,
  ip.name as provider_name,
  ip.category,
  fi.status,
  fi.last_sync_at,
  fi.last_sync_status,
  fi.api_calls_today,
  ip.rate_limit_requests,
  CASE
    WHEN fi.status = 'error' THEN 'critical'
    WHEN fi.status = 'expired' THEN 'warning'
    WHEN fi.token_expires_at < NOW() + INTERVAL '1 day' THEN 'warning'
    WHEN fi.api_calls_today > ip.rate_limit_requests * 0.8 THEN 'warning'
    ELSE 'healthy'
  END as health_status,
  fi.status_message as issue_details
FROM firm_integrations fi
JOIN integration_providers ip ON ip.id = fi.provider_id
WHERE fi.status != 'disconnected';

-- =============================================================================
-- SEED INTEGRATION PROVIDERS
-- =============================================================================

INSERT INTO integration_providers (
  id, name, description, category, auth_type, base_url, features,
  oauth_config, webhook_events, rate_limit_requests, rate_limit_window_seconds,
  is_enabled, is_beta, docs_url
) VALUES

-- DOCUMENT PROVIDERS
(
  'pandadoc',
  'PandaDoc',
  'Create, send, and track documents for e-signature. Generate contracts from templates with deal data.',
  'documents',
  'oauth2',
  'https://api.pandadoc.com/public/v1',
  ARRAY['document_generation', 'e_signature', 'document_tracking'],
  '{
    "authorize_url": "https://app.pandadoc.com/oauth2/authorize",
    "token_url": "https://api.pandadoc.com/oauth2/access_token",
    "scopes": ["read+write"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['document_state_changed', 'recipient_completed', 'document_completed'],
  300, 60,
  true, false,
  'https://developers.pandadoc.com'
),
(
  'docusign',
  'DocuSign',
  'Industry-leading e-signature platform. Send documents for signature and track completion.',
  'documents',
  'oauth2',
  'https://na4.docusign.net/restapi/v2.1',
  ARRAY['e_signature', 'document_tracking'],
  '{
    "authorize_url": "https://account-d.docusign.com/oauth/auth",
    "token_url": "https://account-d.docusign.com/oauth/token",
    "scopes": ["signature", "extended"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['envelope-completed', 'envelope-voided', 'recipient-completed'],
  1000, 3600,
  true, false,
  'https://developers.docusign.com'
),
(
  'hellosign',
  'Dropbox Sign (HelloSign)',
  'Simple, fast e-signatures by Dropbox. Great for straightforward signing workflows.',
  'documents',
  'oauth2',
  'https://api.hellosign.com/v3',
  ARRAY['e_signature', 'document_tracking'],
  '{
    "authorize_url": "https://app.hellosign.com/oauth/authorize",
    "token_url": "https://api.hellosign.com/v3/oauth/token",
    "scopes": ["basic_account_info", "signature_request_access"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['signature_request_signed', 'signature_request_all_signed'],
  100, 60,
  true, false,
  'https://developers.hellosign.com'
),

-- CRM PROVIDERS
(
  'salesforce',
  'Salesforce',
  'Sync contacts, accounts, and opportunities with Salesforce CRM.',
  'crm',
  'oauth2',
  'https://login.salesforce.com',
  ARRAY['contact_sync', 'deal_sync', 'activity_sync'],
  '{
    "authorize_url": "https://login.salesforce.com/services/oauth2/authorize",
    "token_url": "https://login.salesforce.com/services/oauth2/token",
    "scopes": ["api", "refresh_token", "offline_access"],
    "response_type": "code",
    "additional_params": {"prompt": "consent"}
  }'::jsonb,
  ARRAY['contact.created', 'contact.updated', 'opportunity.updated'],
  10000, 86400,
  true, false,
  'https://developer.salesforce.com'
),
(
  'hubspot',
  'HubSpot',
  'Sync contacts and deals with HubSpot CRM. Track engagement and activity.',
  'crm',
  'oauth2',
  'https://api.hubapi.com',
  ARRAY['contact_sync', 'deal_sync', 'activity_sync', 'email_tracking'],
  '{
    "authorize_url": "https://app.hubspot.com/oauth/authorize",
    "token_url": "https://api.hubapi.com/oauth/v1/token",
    "scopes": ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.deals.read", "crm.objects.deals.write"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['contact.creation', 'contact.propertyChange', 'deal.propertyChange'],
  100, 10,
  true, false,
  'https://developers.hubspot.com'
),
(
  'apto',
  'Apto',
  'Sync with Apto CRE CRM. Full bidirectional sync of properties, contacts, and deals.',
  'crm',
  'oauth2',
  'https://api.apto.com',
  ARRAY['contact_sync', 'deal_sync', 'property_sync', 'activity_sync'],
  '{
    "authorize_url": "https://app.apto.com/oauth2/authorize",
    "token_url": "https://api.apto.com/oauth2/token",
    "scopes": ["read", "write"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['property.updated', 'deal.updated', 'contact.updated'],
  1000, 3600,
  true, true,
  'https://developers.apto.com'
),

-- COMMUNICATION PROVIDERS
(
  'slack',
  'Slack',
  'Get notifications in Slack when deals close, documents are signed, or properties need attention.',
  'communication',
  'oauth2',
  'https://slack.com/api',
  ARRAY['notifications'],
  '{
    "authorize_url": "https://slack.com/oauth/v2/authorize",
    "token_url": "https://slack.com/api/oauth.v2.access",
    "scopes": ["chat:write", "channels:read", "users:read"],
    "response_type": "code",
    "scope_delimiter": ","
  }'::jsonb,
  NULL,
  50, 60,
  true, false,
  'https://api.slack.com'
),
(
  'gmail',
  'Gmail',
  'Automatically log emails with contacts. Track email opens and engagement.',
  'communication',
  'oauth2',
  'https://gmail.googleapis.com',
  ARRAY['email_tracking', 'activity_sync'],
  '{
    "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
    "token_url": "https://oauth2.googleapis.com/token",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
    "response_type": "code",
    "access_type": "offline"
  }'::jsonb,
  ARRAY['message.received'],
  250, 1,
  true, false,
  'https://developers.google.com/gmail'
),
(
  'outlook',
  'Microsoft Outlook',
  'Sync emails and calendar with Outlook. Log communications automatically.',
  'communication',
  'oauth2',
  'https://graph.microsoft.com/v1.0',
  ARRAY['email_tracking', 'activity_sync', 'calendar_sync'],
  '{
    "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "scopes": ["Mail.Read", "Mail.Send", "Calendars.ReadWrite", "offline_access"],
    "response_type": "code"
  }'::jsonb,
  NULL,
  10000, 600,
  true, false,
  'https://docs.microsoft.com/graph'
),
(
  'nylas',
  'Nylas',
  'Unified email and calendar API. Connect any email provider with one integration.',
  'communication',
  'oauth2',
  'https://api.nylas.com',
  ARRAY['email_tracking', 'activity_sync', 'calendar_sync'],
  '{
    "authorize_url": "https://api.nylas.com/oauth/authorize",
    "token_url": "https://api.nylas.com/oauth/token",
    "scopes": ["email.read_only", "email.send", "calendar"],
    "response_type": "code"
  }'::jsonb,
  ARRAY['message.created', 'event.created'],
  100, 60,
  true, true,
  'https://developer.nylas.com'
),

-- DATA PROVIDERS (API Key based)
(
  'costar',
  'CoStar',
  'Access CoStar market data, comps, and property information.',
  'data',
  'api_key',
  'https://api.costar.com',
  ARRAY['market_data', 'comps', 'property_data'],
  NULL,
  NULL,
  1000, 86400,
  true, false,
  'https://www.costar.com/developers'
),
(
  'trepp',
  'Trepp',
  'Access CMBS loan data, servicer reports, and debt information.',
  'data',
  'api_key',
  'https://api.trepp.com',
  ARRAY['loan_data', 'debt_data'],
  NULL,
  NULL,
  500, 86400,
  true, false,
  'https://www.trepp.com/api'
),
(
  'reonomy',
  'Reonomy',
  'Property ownership, transaction history, and contact data enrichment.',
  'data',
  'api_key',
  'https://api.reonomy.com',
  ARRAY['ownership_data', 'property_data', 'contact_enrichment'],
  NULL,
  NULL,
  1000, 86400,
  true, false,
  'https://developers.reonomy.com'
)

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  oauth_config = EXCLUDED.oauth_config,
  features = EXCLUDED.features,
  updated_at = NOW();
