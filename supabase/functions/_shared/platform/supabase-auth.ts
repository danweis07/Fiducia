/**
 * Supabase Auth Adapter
 *
 * Implements AuthPort by delegating to Supabase GoTrue.
 * Alternative implementations can wrap Auth0, Cognito, Firebase Auth, etc.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10';
import type { AuthPort, AuthUser } from './types.ts';

export class SupabaseAuthAdapter implements AuthPort {
  private client: SupabaseClient;

  constructor(client: SupabaseClient);
  constructor(url: string, serviceRoleKey: string);
  constructor(urlOrClient: string | SupabaseClient, serviceRoleKey?: string) {
    if (typeof urlOrClient === 'string') {
      this.client = createClient(urlOrClient, serviceRoleKey!);
    } else {
      this.client = urlOrClient;
    }
  }

  async getUser(token: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const { data: { user }, error } = await this.client.auth.getUser(token);
      if (error || !user) {
        return { user: null, error: error?.message ?? 'User not found' };
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          appMetadata: user.app_metadata,
          userMetadata: user.user_metadata,
        },
        error: null,
      };
    } catch (err) {
      return {
        user: null,
        error: err instanceof Error ? err.message : 'Auth error',
      };
    }
  }
}
