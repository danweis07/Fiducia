-- =============================================================================
-- Open Banking Consent Management (CFPB Section 1033)
--
-- Tracks third-party data access consents granted by members.
-- Supports the 2026 CFPB mandate requiring consumer-authorized
-- data sharing with revocable consent.
--
-- Tables:
--   open_banking_consents     — Active/revoked consent records
--   open_banking_access_logs  — Audit trail of third-party data access
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE open_banking_consent_status AS ENUM (
  'active',
  'revoked',
  'expired',
  'suspended'
);

CREATE TYPE open_banking_scope AS ENUM (
  'account_info',
  'balances',
  'transactions',
  'transfer_initiate',
  'identity'
);

-- =============================================================================
-- OPEN BANKING CONSENTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS open_banking_consents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Third-party provider info
  provider_name   text NOT NULL,
  provider_id     text NOT NULL,
  provider_logo   text,
  provider_url    text,
  -- Consent details
  status          open_banking_consent_status NOT NULL DEFAULT 'active',
  scopes          open_banking_scope[] NOT NULL DEFAULT '{}',
  -- Account-level granularity: which accounts the consent covers
  account_ids     uuid[] NOT NULL DEFAULT '{}',
  -- CFPB Section 1033 required fields
  consent_granted_at  timestamptz NOT NULL DEFAULT now(),
  consent_expires_at  timestamptz,
  consent_revoked_at  timestamptz,
  last_accessed_at    timestamptz,
  access_frequency    text DEFAULT 'on_demand',
  -- Metadata
  connection_id   text,
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_revocation CHECK (
    (status != 'revoked') OR (consent_revoked_at IS NOT NULL)
  )
);

-- Indexes for common queries
CREATE INDEX idx_ob_consents_tenant_user ON open_banking_consents(tenant_id, user_id);
CREATE INDEX idx_ob_consents_status ON open_banking_consents(status) WHERE status = 'active';
CREATE INDEX idx_ob_consents_provider ON open_banking_consents(provider_id);
CREATE INDEX idx_ob_consents_expires ON open_banking_consents(consent_expires_at) WHERE consent_expires_at IS NOT NULL;

-- RLS policies
ALTER TABLE open_banking_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consents"
  ON open_banking_consents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on consents"
  ON open_banking_consents FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- OPEN BANKING ACCESS LOGS — audit trail for third-party data access
-- =============================================================================

CREATE TABLE IF NOT EXISTS open_banking_access_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  consent_id      uuid NOT NULL REFERENCES open_banking_consents(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  -- Access details
  provider_id     text NOT NULL,
  provider_name   text NOT NULL,
  scope           open_banking_scope NOT NULL,
  endpoint        text NOT NULL,
  -- Request metadata
  request_id      text,
  ip_address      inet,
  response_code   integer,
  data_points     integer DEFAULT 0,
  -- Timing
  accessed_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ob_access_logs_consent ON open_banking_access_logs(consent_id);
CREATE INDEX idx_ob_access_logs_user ON open_banking_access_logs(tenant_id, user_id);
CREATE INDEX idx_ob_access_logs_time ON open_banking_access_logs(accessed_at);

-- RLS
ALTER TABLE open_banking_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs"
  ON open_banking_access_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on access logs"
  ON open_banking_access_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =============================================================================
-- AUTO-EXPIRE STALE CONSENTS (run via pg_cron or scheduled function)
-- =============================================================================

CREATE OR REPLACE FUNCTION expire_stale_consents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count integer;
BEGIN
  UPDATE open_banking_consents
  SET status = 'expired', updated_at = now()
  WHERE status = 'active'
    AND consent_expires_at IS NOT NULL
    AND consent_expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
