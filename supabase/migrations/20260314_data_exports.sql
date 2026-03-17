-- Data Export & Reporting tables
CREATE TABLE IF NOT EXISTS data_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('transactions','accounts','compliance','audit','financial_summary','member_activity','loan_portfolio','deposit_summary')),
  format text NOT NULL CHECK (format IN ('csv','pdf','json','xlsx')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','expired')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  file_url text,
  file_size_bytes bigint,
  row_count integer,
  error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_data_exports_firm ON data_exports(firm_id);
CREATE INDEX idx_data_exports_status ON data_exports(firm_id, status);
CREATE INDEX idx_data_exports_type ON data_exports(firm_id, report_type);

ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for data_exports" ON data_exports
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  report_type text NOT NULL CHECK (report_type IN ('transactions','accounts','compliance','audit','financial_summary','member_activity','loan_portfolio','deposit_summary')),
  default_format text NOT NULL CHECK (default_format IN ('csv','pdf','json','xlsx')),
  default_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_report_templates_firm ON report_templates(firm_id);

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for report_templates" ON report_templates
  FOR ALL USING (firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid()));
