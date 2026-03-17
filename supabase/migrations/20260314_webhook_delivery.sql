-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  signing_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  success_rate numeric(5,2),
  last_delivery_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_endpoints_firm ON webhook_endpoints(firm_id);

ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for webhook_endpoints" ON webhook_endpoints
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));

-- Webhook Deliveries (includes dead letter queue)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivering','delivered','failed')),
  response_code integer,
  response_body text,
  retry_count integer NOT NULL DEFAULT 0,
  max_retries integer NOT NULL DEFAULT 3,
  next_retry_at timestamptz,
  error text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_firm ON webhook_deliveries(firm_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(firm_id, status);
CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id);
CREATE INDEX idx_webhook_deliveries_dlq ON webhook_deliveries(firm_id, status, retry_count) WHERE status = 'failed' AND retry_count >= 3;

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for webhook_deliveries" ON webhook_deliveries
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));
