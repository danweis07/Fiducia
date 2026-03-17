-- Secure Messaging
-- Tables for member-to-institution threaded messaging

CREATE TABLE IF NOT EXISTS message_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  department_id UUID REFERENCES message_departments(id),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'archived')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  unread_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('member', 'staff')),
  body TEXT NOT NULL,
  attachment_ids TEXT[] DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_message_threads_firm_user ON message_threads(firm_id, user_id);
CREATE INDEX idx_message_threads_status ON message_threads(status);
CREATE INDEX idx_messages_thread ON messages(thread_id);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON message_threads
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "Tenant isolation" ON message_departments
  FOR ALL USING (firm_id = (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() LIMIT 1));

CREATE POLICY "User sees own messages" ON messages
  FOR ALL USING (thread_id IN (SELECT id FROM message_threads WHERE user_id = auth.uid()));
