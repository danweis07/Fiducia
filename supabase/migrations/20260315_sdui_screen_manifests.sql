-- =============================================================================
-- Server-Driven UI: Personas & Screen Manifests
-- =============================================================================
-- Enables per-persona, per-screen component manifests so the backend can
-- dictate frontend layout based on computed user personas.

-- User Personas: rule-based persona definitions per tenant
CREATE TABLE IF NOT EXISTS user_personas (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id       TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  persona_id    TEXT NOT NULL,           -- e.g. 'business_owner', 'high_net_worth'
  label         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  rules         JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority      INTEGER NOT NULL DEFAULT 0,  -- higher = evaluated first
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, persona_id)
);

-- Screen Manifests: component layout per screen + persona
CREATE TABLE IF NOT EXISTS screen_manifests (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id       TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  screen_key    TEXT NOT NULL,            -- e.g. 'home', 'accounts', 'cards'
  persona_id    TEXT NOT NULL DEFAULT 'default',
  label         TEXT NOT NULL,
  components    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  version       INTEGER NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, screen_key, persona_id)
);

-- Persona assignment cache: stores computed persona per user for fast lookups
CREATE TABLE IF NOT EXISTS user_persona_assignments (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  firm_id       TEXT NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id    TEXT NOT NULL,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  traits        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- snapshot of traits used for computation
  UNIQUE(firm_id, user_id)
);

-- RLS policies
ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE screen_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_persona_assignments ENABLE ROW LEVEL SECURITY;

-- Service role can access everything (gateway uses service role)
CREATE POLICY "service_role_user_personas" ON user_personas
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_screen_manifests" ON screen_manifests
  FOR ALL TO service_role USING (true);

CREATE POLICY "service_role_persona_assignments" ON user_persona_assignments
  FOR ALL TO service_role USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_screen_manifests_lookup ON screen_manifests(firm_id, screen_key, persona_id) WHERE is_active = true;
CREATE INDEX idx_user_personas_firm ON user_personas(firm_id, priority DESC) WHERE is_active = true;
CREATE INDEX idx_persona_assignments_lookup ON user_persona_assignments(firm_id, user_id);
