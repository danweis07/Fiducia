-- Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  channels jsonb NOT NULL DEFAULT '{"email":true,"sms":false,"push":true,"in_app":true}'::jsonb,
  categories jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, firm_id)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id, firm_id);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- User Sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_id uuid NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  device_name text,
  device_type text DEFAULT 'unknown',
  browser text,
  os text,
  ip_address text,
  location text,
  is_current boolean NOT NULL DEFAULT false,
  is_revoked boolean NOT NULL DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX idx_user_sessions_user ON user_sessions(user_id, firm_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, firm_id, is_revoked);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sessions" ON user_sessions
  FOR ALL USING (user_id = auth.uid());
