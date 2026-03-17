/**
 * Supabase Platform Dependencies Factory
 *
 * Creates the full PlatformDeps for Supabase Edge Functions.
 * This is the single place where all Supabase-specific initialization happens.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { PlatformDeps } from './types.ts';
import { DenoEnvProvider } from './env.ts';
import { SupabaseDatabaseAdapter } from './supabase-db.ts';
import { SupabaseAuthAdapter } from './supabase-auth.ts';
import { SupabaseStorageAdapter } from './supabase-storage.ts';
import { createRedisClient } from './redis.ts';

/**
 * Create the standard Supabase Edge Function dependency container.
 * Uses Deno.env for env vars and supabase-js for DB/Auth/Storage.
 * Optionally connects to Upstash Redis for distributed rate limiting.
 */
export function createSupabaseDeps(): PlatformDeps {
  const env = new DenoEnvProvider();
  const supabaseUrl = env.getRequired('SUPABASE_URL');
  const supabaseKey = env.getRequired('SUPABASE_SERVICE_ROLE_KEY');

  const client = createClient(supabaseUrl, supabaseKey);

  // Redis for distributed rate limiting (optional — falls back to in-memory)
  const cache = createRedisClient(env) ?? undefined;

  return {
    env,
    db: new SupabaseDatabaseAdapter(client),
    auth: new SupabaseAuthAdapter(client),
    storage: new SupabaseStorageAdapter(client),
    cache,
  };
}
