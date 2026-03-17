-- Transaction Disputes (Reg E)
-- Tables for filing, tracking, and resolving transaction disputes

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_id UUID NOT NULL,
  transaction_amount_cents BIGINT NOT NULL,
  transaction_date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('unauthorized', 'duplicate', 'incorrect_amount', 'merchandise_not_received', 'service_not_rendered', 'other')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'provisional_credit_issued', 'resolved_favor_customer', 'resolved_favor_merchant', 'cancelled')),
  provisional_credit_amount_cents BIGINT,
  provisional_credit_date DATE,
  provisional_credit_deadline DATE NOT NULL,
  investigation_deadline DATE NOT NULL,
  contact_phone TEXT,
  contact_email TEXT,
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('receipt', 'correspondence', 'screenshot', 'other')),
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispute_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_disputes_firm_user ON disputes(firm_id, user_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_dispute_docs_dispute ON dispute_documents(dispute_id);
CREATE INDEX idx_dispute_timeline_dispute ON dispute_timeline_events(dispute_id);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON disputes
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "User sees own dispute docs" ON dispute_documents
  FOR ALL USING (dispute_id IN (SELECT id FROM disputes WHERE user_id = auth.uid()));

CREATE POLICY "User sees own dispute timeline" ON dispute_timeline_events
  FOR ALL USING (dispute_id IN (SELECT id FROM disputes WHERE user_id = auth.uid()));
