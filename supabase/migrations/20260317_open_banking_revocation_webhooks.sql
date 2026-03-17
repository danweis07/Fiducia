-- Open Banking consent revocation webhook tracking (CFPB 1033.421(d))
-- Records webhook delivery attempts for audit and retry

-- Provider registry with webhook URLs
CREATE TABLE IF NOT EXISTS open_banking_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  revocation_webhook_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, provider_id)
);

ALTER TABLE open_banking_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON open_banking_providers
  FOR ALL USING (tenant_id = current_setting('app.firm_id', true)::uuid);

-- Webhook delivery tracking
CREATE TABLE IF NOT EXISTS open_banking_revocation_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  consent_id UUID NOT NULL,
  provider_id TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'failed')),
  response_code INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE open_banking_revocation_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON open_banking_revocation_webhooks
  FOR ALL USING (tenant_id = current_setting('app.firm_id', true)::uuid);

CREATE INDEX idx_revocation_webhooks_retry
  ON open_banking_revocation_webhooks(status, attempts)
  WHERE status = 'failed' AND attempts < 5;

CREATE INDEX idx_revocation_webhooks_consent
  ON open_banking_revocation_webhooks(tenant_id, consent_id);
