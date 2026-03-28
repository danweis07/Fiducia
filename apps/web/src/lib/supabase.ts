/**
 * @deprecated This module is deprecated. Use the backend provider abstraction instead:
 *
 *   import { useBackend } from "@/lib/backend";
 *
 * The backend provider pattern (src/lib/backend/) supports swappable backends
 * (Supabase, REST, Realtime) and is the approved way to access backend services.
 * Direct Supabase imports will be flagged by ESLint. See the no-restricted-imports
 * rule in eslint.config.js for details.
 */
// Re-export from the integration client for backwards compatibility
export { supabase } from "@/integrations/supabase/client";

// Database types for activities table
export interface DbActivity {
  id: string;
  property_id: string;
  broker: string;
  activity_type: string;
  summary: string;
  sentiment: string | null;
  deal_trigger: string | null;
  created_at: string;
}

// Supabase is always configured via the integration client
export const isSupabaseConfigured = (): boolean => {
  return true;
};
