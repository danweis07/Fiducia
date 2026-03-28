-- Design System Configurator
-- Adds JSONB column for full token-based design system config.
-- Flat columns added for write-through compatibility with direct SQL queries.

ALTER TABLE banking_tenant_theme
  ADD COLUMN IF NOT EXISTS design_system JSONB DEFAULT NULL;

ALTER TABLE banking_tenant_theme
  ADD COLUMN IF NOT EXISTS secondary_color TEXT;

ALTER TABLE banking_tenant_theme
  ADD COLUMN IF NOT EXISTS font_family TEXT DEFAULT 'Inter';

ALTER TABLE banking_tenant_theme
  ADD COLUMN IF NOT EXISTS layout_theme TEXT DEFAULT 'modern';

ALTER TABLE banking_tenant_theme
  ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT '';

COMMENT ON COLUMN banking_tenant_theme.design_system IS
  'Full design system configuration (JSONB). Source of truth for all visual tokens when present.';
