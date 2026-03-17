-- ============================================================================
-- Migration: Audit Logs Table
-- Description: Creates a table for storing audit logs and user action tracking
-- ============================================================================

-- Create severity enum
CREATE TYPE audit_severity AS ENUM ('debug', 'info', 'warn', 'error');

-- Create action enum
CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'view',
  'export',
  'import',
  'login',
  'logout',
  'permission_change',
  'score_calculate',
  'bulk_operation',
  'system_event'
);

-- Create entity enum
CREATE TYPE audit_entity AS ENUM (
  'property',
  'deal',
  'task',
  'activity',
  'contact',
  'user',
  'firm',
  'score',
  'document',
  'settings',
  'system'
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  severity audit_severity NOT NULL DEFAULT 'info',
  action audit_action NOT NULL,
  entity_type audit_entity NOT NULL,
  entity_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_firm_id ON audit_logs(firm_id) WHERE firm_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_entity_lookup ON audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;

-- Create a composite index for common query patterns
CREATE INDEX idx_audit_logs_firm_timestamp ON audit_logs(firm_id, timestamp DESC) WHERE firm_id IS NOT NULL;

-- Add table comment
COMMENT ON TABLE audit_logs IS 'Stores audit trail for user actions and system events';

-- Enable Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own firm's audit logs (admin/owner only)
CREATE POLICY "Firm admins can view audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    firm_id IN (
      SELECT firm_id FROM firm_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Anyone can insert logs (the service writes logs)
CREATE POLICY "Service can insert audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Only system can delete logs (for cleanup)
CREATE POLICY "Only system can delete audit logs"
  ON audit_logs
  FOR DELETE
  USING (false);

-- Create a function to automatically log changes to important tables
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
  action_type audit_action;
  entity_type audit_entity;
  entity_id TEXT;
  log_message TEXT;
  log_metadata JSONB;
BEGIN
  -- Determine action type
  IF TG_OP = 'INSERT' THEN
    action_type := 'create';
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'delete';
  END IF;

  -- Determine entity type from table name
  CASE TG_TABLE_NAME
    WHEN 'deals' THEN entity_type := 'deal';
    WHEN 'tasks' THEN entity_type := 'task';
    WHEN 'contacts' THEN entity_type := 'contact';
    WHEN 'documents' THEN entity_type := 'document';
    WHEN 'student_housing_properties' THEN entity_type := 'property';
    ELSE entity_type := 'system';
  END CASE;

  -- Get entity ID
  IF TG_OP = 'DELETE' THEN
    entity_id := OLD.id::TEXT;
    log_metadata := to_jsonb(OLD);
  ELSE
    entity_id := NEW.id::TEXT;
    log_metadata := to_jsonb(NEW);
  END IF;

  -- Create log message
  log_message := format('%s %s %s', action_type, entity_type, entity_id);

  -- Insert audit log
  INSERT INTO audit_logs (
    action,
    entity_type,
    entity_id,
    user_id,
    firm_id,
    message,
    metadata
  ) VALUES (
    action_type,
    entity_type,
    entity_id,
    auth.uid(),
    COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN OLD.firm_id ELSE NEW.firm_id END,
      NULL
    ),
    log_message,
    log_metadata
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for important tables (optional - can be enabled as needed)
-- Note: Uncomment these to enable automatic audit logging for specific tables

-- CREATE TRIGGER audit_deals_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON deals
--   FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- CREATE TRIGGER audit_tasks_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON tasks
--   FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- CREATE TRIGGER audit_contacts_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON contacts
--   FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- Create a view for easy querying of recent logs
CREATE OR REPLACE VIEW v_recent_audit_logs AS
SELECT
  al.id,
  al.timestamp,
  al.severity,
  al.action,
  al.entity_type,
  al.entity_id,
  al.message,
  al.metadata,
  al.user_id,
  fu.display_name AS user_name,
  al.firm_id,
  f.name AS firm_name
FROM audit_logs al
LEFT JOIN firm_users fu ON al.user_id = fu.user_id AND al.firm_id = fu.firm_id
LEFT JOIN firms f ON al.firm_id = f.id
ORDER BY al.timestamp DESC;

-- Grant access to the view
GRANT SELECT ON v_recent_audit_logs TO authenticated;
