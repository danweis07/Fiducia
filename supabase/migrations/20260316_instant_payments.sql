-- =============================================================================
-- Instant Payments (FedNow / RTP) — ISO 20022 Messaging Support
-- =============================================================================

-- Instant payment transactions
CREATE TABLE IF NOT EXISTS instant_payments (
  id              TEXT PRIMARY KEY,
  firm_id         UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  source_account_id UUID NOT NULL,
  rail            TEXT NOT NULL CHECK (rail IN ('fednow', 'rtp')),
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'accepted', 'completed', 'rejected', 'returned', 'failed')),
  amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
  currency        TEXT NOT NULL DEFAULT 'USD',

  -- Sender details (masked for security)
  sender_routing_number   TEXT NOT NULL DEFAULT '',
  sender_account_masked   TEXT NOT NULL DEFAULT '',
  sender_name             TEXT NOT NULL DEFAULT '',

  -- Receiver details (masked for security)
  receiver_routing_number TEXT NOT NULL DEFAULT '',
  receiver_account_masked TEXT NOT NULL DEFAULT '',
  receiver_name           TEXT NOT NULL DEFAULT '',

  -- Payment metadata
  description             TEXT NOT NULL DEFAULT '',
  network_message_id      TEXT,
  idempotency_key         TEXT,
  rejection_reason        TEXT,
  rejection_detail        TEXT,

  -- ISO 20022 metadata
  iso20022_message_type   TEXT,  -- e.g., 'pacs.008.001.10', 'pain.001.001.11'

  -- Timestamps
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_instant_payments_firm_user
  ON instant_payments(firm_id, user_id);
CREATE INDEX IF NOT EXISTS idx_instant_payments_status
  ON instant_payments(status);
CREATE INDEX IF NOT EXISTS idx_instant_payments_rail
  ON instant_payments(rail);
CREATE INDEX IF NOT EXISTS idx_instant_payments_created
  ON instant_payments(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_instant_payments_idempotency
  ON instant_payments(firm_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- RLS policy
ALTER TABLE instant_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY instant_payments_tenant_isolation ON instant_payments
  USING (firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- Request for Payment (RfP)
CREATE TABLE IF NOT EXISTS instant_payment_rfps (
  id                      TEXT PRIMARY KEY,
  firm_id                 UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id                 UUID NOT NULL,
  requester_account_id    UUID NOT NULL,
  rail                    TEXT NOT NULL CHECK (rail IN ('fednow', 'rtp')),
  status                  TEXT NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  amount_cents            BIGINT NOT NULL CHECK (amount_cents > 0),
  currency                TEXT NOT NULL DEFAULT 'USD',
  requester_name          TEXT NOT NULL DEFAULT '',
  requester_account_masked TEXT NOT NULL DEFAULT '',
  payer_name              TEXT NOT NULL DEFAULT '',
  description             TEXT NOT NULL DEFAULT '',
  expires_at              TIMESTAMPTZ NOT NULL,
  resulting_payment_id    TEXT REFERENCES instant_payments(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instant_rfps_firm_user
  ON instant_payment_rfps(firm_id, user_id);

ALTER TABLE instant_payment_rfps ENABLE ROW LEVEL SECURITY;

CREATE POLICY instant_rfps_tenant_isolation ON instant_payment_rfps
  USING (firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- Participant directory (FedNow/RTP enabled institutions)
CREATE TABLE IF NOT EXISTS instant_payment_participants (
  routing_number    TEXT PRIMARY KEY,
  institution_name  TEXT NOT NULL,
  fednow_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  rtp_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ISO 20022 message log (audit trail for all ISO messages sent/received)
CREATE TABLE IF NOT EXISTS iso20022_message_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id             UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  payment_id          TEXT,
  direction           TEXT NOT NULL CHECK (direction IN ('outbound', 'inbound')),
  message_type        TEXT NOT NULL,  -- e.g., 'pain.001.001.11', 'pacs.008.001.10', 'pacs.002.001.12'
  message_id          TEXT NOT NULL,  -- ISO 20022 MsgId
  status              TEXT NOT NULL DEFAULT 'sent',
  raw_xml_hash        TEXT,           -- SHA-256 hash of XML (we don't store raw XML with PII)
  response_status     TEXT,           -- pacs.002 status code if applicable
  error_detail        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_iso20022_log_firm
  ON iso20022_message_log(firm_id);
CREATE INDEX IF NOT EXISTS idx_iso20022_log_payment
  ON iso20022_message_log(payment_id);
CREATE INDEX IF NOT EXISTS idx_iso20022_log_type
  ON iso20022_message_log(message_type);

ALTER TABLE iso20022_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY iso20022_log_tenant_isolation ON iso20022_message_log
  USING (firm_id IN (
    SELECT firm_id FROM firm_users WHERE user_id = auth.uid()
  ));

-- Trigger: update updated_at on instant_payments
CREATE OR REPLACE FUNCTION update_instant_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_instant_payments_updated
  BEFORE UPDATE ON instant_payments
  FOR EACH ROW EXECUTE FUNCTION update_instant_payment_timestamp();

CREATE TRIGGER trg_instant_rfps_updated
  BEFORE UPDATE ON instant_payment_rfps
  FOR EACH ROW EXECUTE FUNCTION update_instant_payment_timestamp();
