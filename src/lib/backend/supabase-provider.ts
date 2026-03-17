/**
 * Supabase Backend Provider
 *
 * Implements BackendProvider using Supabase for auth, edge functions, and realtime.
 * This is the default provider — all existing behavior is preserved.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  BackendProvider,
  AuthProvider,
  AuthSession,
  AuthResult,
  AuthChangeCallback,
  Unsubscribe,
  GatewayTransport,
  GatewayRawResponse,
  RealtimeProvider,
  RealtimeSubscription,
  ChannelSubscription,
  PresenceState,
  PublishOptions,
} from "./types";
import type {
  TenantContext as TenantContextType,
  TenantUserRole,
  SubscriptionTier,
  TenantFeatures,
} from "@/types";
import { getRolePermissions } from "@/types";

// =============================================================================
// UNTYPED TABLE HELPER
// =============================================================================

/**
 * Helper to access Supabase tables not present in the generated types.
 * Uses `unknown` as an intermediate cast to avoid `any`.
 */
function fromTable(table: string) {
  return (
    supabase as unknown as {
      from: (table: string) => ReturnType<typeof supabase.from>;
    }
  ).from(table);
}

// =============================================================================
// REALTIME PAYLOAD TYPES
// =============================================================================

interface PostgresChangePayload {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

interface BroadcastPayload {
  event?: string;
  payload?: Record<string, unknown>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_FEATURES: TenantFeatures = {
  rdc: true,
  billPay: true,
  p2p: false,
  cardControls: true,
  externalTransfers: true,
  wires: false,
  mobileDeposit: true,
};

// =============================================================================
// AUTH PROVIDER
// =============================================================================

class SupabaseAuthProvider implements AuthProvider {
  async getSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return {
      user: { id: session.user.id, email: session.user.email ?? "" },
      session: {
        user: { id: session.user.id, email: session.user.email ?? "" },
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      },
    };
  }

  onAuthStateChange(callback: AuthChangeCallback): Unsubscribe {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const mappedSession = session?.user
        ? {
            user: { id: session.user.id, email: session.user.email ?? "" },
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            expiresAt: session.expires_at,
          }
        : null;
      // Map Supabase events to our generic events
      const eventMap: Record<string, string> = {
        SIGNED_IN: "SIGNED_IN",
        SIGNED_OUT: "SIGNED_OUT",
        TOKEN_REFRESHED: "TOKEN_REFRESHED",
        USER_UPDATED: "USER_UPDATED",
      };
      const mappedEvent = (eventMap[event] ?? event) as
        | "SIGNED_IN"
        | "SIGNED_OUT"
        | "TOKEN_REFRESHED"
        | "USER_UPDATED";
      callback(mappedEvent, mappedSession as AuthSession | null);
    });
    return { unsubscribe: () => subscription.unsubscribe() };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { error: error ?? new Error("Sign in failed") };
    return {
      user: { id: data.user.id, email: data.user.email ?? "" },
      session: {
        user: { id: data.user.id, email: data.user.email ?? "" },
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token,
      },
      error: null,
    };
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error || !data.user) return { error: error ?? new Error("Sign up failed") };
    return {
      user: { id: data.user.id, email: data.user.email ?? "" },
      error: null,
    };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  async resetPassword(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? `${window.location.origin}/reset-password`,
    });
    return { error };
  }

  async updatePassword(password: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  }

  async getTenantContext(userId: string): Promise<TenantContextType> {
    try {
      const { data: tuData, error: tuError } = await fromTable("firm_users")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (tuError) {
        return {
          tenantId: "default",
          tenantName: "Demo Bank",
          userId,
          userRole: "member",
          displayName: "Customer",
          permissions: getRolePermissions("member"),
          subscriptionTier: "professional",
          features: DEFAULT_FEATURES,
          region: "us" as const,
          country: "US",
          defaultCurrency: "USD",
          sessionTimeoutMinutes: 15,
          sessionGraceMinutes: 2,
        };
      }

      const { data: tData, error: tError } = await fromTable("firms")
        .select("*")
        .eq("id", tuData.firm_id)
        .single();

      if (tError) throw new Error(`Failed to fetch tenant: ${tError.message}`);

      // Update last active
      await fromTable("firm_users")
        .update({ last_active_at: new Date().toISOString() })
        .eq("id", tuData.id);

      return {
        tenantId: tData.id,
        tenantName: tData.name,
        userId,
        userRole: tuData.role as TenantUserRole,
        displayName: tuData.display_name || "User",
        permissions: getRolePermissions(tuData.role as TenantUserRole),
        subscriptionTier: tData.subscription_tier as SubscriptionTier,
        features: tData.features || DEFAULT_FEATURES,
        region: (tData.region ?? "us") as TenantContextType["region"],
        country: (tData.country as string) ?? "US",
        defaultCurrency: (tData.default_currency as string) ?? "USD",
        sessionTimeoutMinutes: (tData.session_timeout_minutes as number) ?? 15,
        sessionGraceMinutes: (tData.session_grace_minutes as number) ?? 2,
      };
    } catch {
      return {
        tenantId: "default",
        tenantName: "Demo Bank",
        userId,
        userRole: "member",
        displayName: "Customer",
        permissions: getRolePermissions("member"),
        subscriptionTier: "professional",
        features: DEFAULT_FEATURES,
        region: "us" as const,
        country: "US",
        defaultCurrency: "USD",
        sessionTimeoutMinutes: 15,
        sessionGraceMinutes: 2,
      };
    }
  }

  async createTenant(
    userId: string,
    email: string,
    name?: string,
  ): Promise<{ error: Error | null }> {
    const tenantName = name || `${email.split("@")[0]}'s Bank`;

    const { data: td, error: te } = await fromTable("firms")
      .insert({ name: tenantName, subscription_tier: "trial", max_users: 3, billing_email: email })
      .select()
      .single();

    if (te) return { error: new Error(`Tenant setup failed: ${te.message}`) };

    const { error: me } = await fromTable("firm_users").insert({
      firm_id: td.id,
      user_id: userId,
      role: "owner",
      status: "active",
      display_name: email.split("@")[0],
      accepted_at: new Date().toISOString(),
    });

    if (me) return { error: new Error(`Membership setup failed: ${me.message}`) };
    return { error: null };
  }
}

// =============================================================================
// GATEWAY TRANSPORT
// =============================================================================

class SupabaseGatewayTransport implements GatewayTransport {
  async invoke(
    action: string,
    params: Record<string, unknown>,
    _options?: { signal?: AbortSignal },
  ): Promise<GatewayRawResponse> {
    const { data, error } = await supabase.functions.invoke("gateway", {
      method: "POST",
      body: JSON.stringify({ action, params }),
    });

    if (error) {
      return {
        error: { code: "INVOKE_ERROR", message: error.message },
      };
    }

    return data as GatewayRawResponse;
  }

  async graphql(query: string, variables?: Record<string, unknown>): Promise<GatewayRawResponse> {
    const { data, error } = await supabase.functions.invoke("gateway", {
      method: "POST",
      body: JSON.stringify({ query, variables }),
    });

    if (error) {
      return { error: { code: "INVOKE_ERROR", message: error.message } };
    }

    return data as GatewayRawResponse;
  }
}

// =============================================================================
// REALTIME PROVIDER
// =============================================================================

class SupabaseRealtimeProvider implements RealtimeProvider {
  readonly type = "supabase" as const;

  subscribe(config: RealtimeSubscription): Unsubscribe {
    const {
      channel: channelName,
      table,
      event = "*",
      filter,
      schema = "public",
      onData,
      onError,
    } = config;

    const filterConfig: Record<string, unknown> = { event, schema, table };
    if (filter) filterConfig.filter = filter;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes" as unknown as "system",
        filterConfig as unknown as { event: string },
        (payload: PostgresChangePayload) => {
          try {
            onData({
              eventType: payload.eventType,
              new: payload.new ?? {},
              old: payload.old ?? {},
            });
          } catch (err) {
            onError?.(err instanceof Error ? err : new Error("Realtime callback error"));
          }
        },
      )
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  }

  trackPresence(channel: string, state: Record<string, unknown>): void {
    const ch = supabase.channel(channel);
    ch.track(state);
  }

  getPresence(channel: string): PresenceState[] {
    const ch = supabase.channel(channel);
    const state = ch.presenceState();
    return Object.values(state)
      .flat()
      .map((s) => ({
        userId: ((s as Record<string, unknown>).id as string) ?? "",
        lastSeen: ((s as Record<string, unknown>).online_at as string) ?? "",
        ...(s as Record<string, unknown>),
      }));
  }

  subscribeChannel(config: ChannelSubscription): Unsubscribe {
    // Use Supabase broadcast for pub/sub channel messaging
    const channel = supabase.channel(config.channel);

    channel
      .on("broadcast", { event: config.event ?? "*" }, (payload: BroadcastPayload) => {
        try {
          config.onMessage({
            id: crypto.randomUUID(),
            channel: config.channel,
            event: payload.event ?? config.event ?? "*",
            data: (payload.payload ?? {}) as Record<string, unknown>,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          config.onError?.(
            err instanceof Error ? err : new Error("Supabase broadcast handler error"),
          );
        }
      })
      .subscribe();

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  }

  async publish(options: PublishOptions): Promise<void> {
    const channel = supabase.channel(options.channel);
    await channel.send({
      type: "broadcast",
      event: options.event,
      payload: options.data,
    });
  }

  disconnect(): void {
    supabase.removeAllChannels();
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export function createSupabaseProvider(): BackendProvider {
  return {
    name: "supabase",
    auth: new SupabaseAuthProvider(),
    gateway: new SupabaseGatewayTransport(),
    realtime: new SupabaseRealtimeProvider(),
  };
}
