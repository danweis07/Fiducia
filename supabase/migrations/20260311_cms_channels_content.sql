-- =============================================================================
-- CMS: Content Management System with Channel Delivery & API Token Access
-- =============================================================================

-- Content channels (web, mobile, email, push, sms, etc.)
CREATE TABLE IF NOT EXISTS cms_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,            -- e.g. 'web_portal', 'mobile_app', 'email', 'push', 'sms'
  label         TEXT NOT NULL,            -- e.g. 'Web Portal'
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  config        JSONB DEFAULT '{}',       -- channel-specific config (e.g. sender email, push topic)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, slug)
);

-- Content items
CREATE TABLE IF NOT EXISTS cms_content (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,            -- URL-friendly identifier
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',  -- Markdown / HTML
  content_type  TEXT NOT NULL DEFAULT 'article',  -- article, announcement, banner, faq, legal, promotion
  status        TEXT NOT NULL DEFAULT 'draft',      -- draft, scheduled, published, archived
  channels      TEXT[] NOT NULL DEFAULT '{}',       -- channel slugs this content targets
  metadata      JSONB DEFAULT '{}',       -- arbitrary KV (hero_image, cta_url, priority, etc.)
  locale        TEXT NOT NULL DEFAULT 'en',
  author_id     UUID,
  published_at  TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,              -- publish at this time
  expires_at    TIMESTAMPTZ,              -- auto-archive after
  version       INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, slug, locale)
);

-- Content version history for audit trail
CREATE TABLE IF NOT EXISTS cms_content_versions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID NOT NULL REFERENCES cms_content(id) ON DELETE CASCADE,
  version       INT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  metadata      JSONB DEFAULT '{}',
  status        TEXT NOT NULL,
  changed_by    UUID,
  change_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API tokens for headless CMS access (external consumers)
CREATE TABLE IF NOT EXISTS cms_api_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id       UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,                        -- human-readable label
  token_hash    TEXT NOT NULL,                        -- SHA-256 hash of the actual token
  token_prefix  TEXT NOT NULL,                        -- first 8 chars for identification (e.g. 'cms_k1a2')
  scopes        TEXT[] NOT NULL DEFAULT '{read}',     -- read, write, publish, admin
  allowed_channels TEXT[] DEFAULT NULL,               -- NULL = all channels, or restrict to specific slugs
  rate_limit    INT NOT NULL DEFAULT 1000,            -- requests per hour
  last_used_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ,                          -- NULL = never expires
  is_revoked    BOOLEAN NOT NULL DEFAULT false,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at    TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cms_content_firm_status ON cms_content(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_cms_content_firm_type ON cms_content(firm_id, content_type);
CREATE INDEX IF NOT EXISTS idx_cms_content_channels ON cms_content USING gin(channels);
CREATE INDEX IF NOT EXISTS idx_cms_content_published ON cms_content(firm_id, published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_cms_api_tokens_firm ON cms_api_tokens(firm_id) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_cms_api_tokens_prefix ON cms_api_tokens(token_prefix);
CREATE INDEX IF NOT EXISTS idx_cms_channels_firm ON cms_channels(firm_id);
CREATE INDEX IF NOT EXISTS idx_cms_content_versions_content ON cms_content_versions(content_id, version DESC);

-- RLS policies
ALTER TABLE cms_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_api_tokens ENABLE ROW LEVEL SECURITY;

-- Tenant-scoped access
CREATE POLICY cms_channels_tenant ON cms_channels
  FOR ALL USING (firm_id = get_user_firm_id());
CREATE POLICY cms_content_tenant ON cms_content
  FOR ALL USING (firm_id = get_user_firm_id());
CREATE POLICY cms_content_versions_tenant ON cms_content_versions
  FOR ALL USING (content_id IN (SELECT id FROM cms_content WHERE firm_id = get_user_firm_id()));
CREATE POLICY cms_api_tokens_tenant ON cms_api_tokens
  FOR ALL USING (firm_id = get_user_firm_id());

-- Seed default channels for existing tenants
INSERT INTO cms_channels (firm_id, slug, label, description)
  SELECT id, channel.slug, channel.label, channel.description
  FROM firms
  CROSS JOIN (VALUES
    ('web_portal',  'Web Portal',    'Main customer web application'),
    ('mobile_app',  'Mobile App',    'iOS and Android mobile application'),
    ('email',       'Email',         'Email campaigns and transactional emails'),
    ('push',        'Push Notifications', 'Mobile push notifications'),
    ('sms',         'SMS',           'Text message communications'),
    ('atm_screen',  'ATM Screen',    'ATM screen banners and messages')
  ) AS channel(slug, label, description)
ON CONFLICT (firm_id, slug) DO NOTHING;
