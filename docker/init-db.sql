-- =============================================================================
-- Docker Init — Bootstrap auth user + demo data for zero-config startup
--
-- This runs AFTER all migrations in supabase/migrations/ have been applied.
-- Creates a demo auth user so seed data migrations can reference auth.users.
-- =============================================================================

-- Create a demo auth user (Supabase auth.users schema)
-- Password: "demo1234" (bcrypt hash)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'demo@fiducia.dev',
  '$2a$10$PznUGShBkOHeG3QXkqCaOeSvMzjfFW0A6WvhWQvReWpuGXfnJBP7i',
  NOW(),
  NOW(),
  NOW(),
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Demo Member"}'
)
ON CONFLICT (id) DO NOTHING;

-- Create a second demo user (admin)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@fiducia.dev',
  '$2a$10$PznUGShBkOHeG3QXkqCaOeSvMzjfFW0A6WvhWQvReWpuGXfnJBP7i',
  NOW(),
  NOW(),
  NOW(),
  '',
  '{"provider": "email", "providers": ["email"]}',
  '{"name": "Admin User"}'
)
ON CONFLICT (id) DO NOTHING;

-- The existing migrations (031_banking_seed_data.sql, 034_consumer_banking_seed.sql)
-- will pick up these auth users and seed all banking data automatically.

-- NOTE: These are LOCAL DEVELOPMENT sandbox credentials only.
-- They are never used in production and pose no security risk.
DO $$
BEGIN
  RAISE NOTICE '=== Docker init complete ===';
  RAISE NOTICE 'Demo user: demo@fiducia.dev / demo1234';
  RAISE NOTICE 'Admin user: admin@fiducia.dev / demo1234';
END $$;
