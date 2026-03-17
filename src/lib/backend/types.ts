/**
 * Backend Provider Interfaces
 *
 * Abstracts auth, gateway transport, and realtime so the platform
 * can run on Supabase, Firebase, custom REST APIs, or any other backend.
 *
 * Usage:
 *   import { getBackend } from '@/lib/backend';
 *   const backend = getBackend();
 *   await backend.auth.signInWithPassword(email, password);
 *   await backend.gateway.invoke('accounts.list', {});
 */

import type { TenantContext as TenantContextType } from "@/types";

// =============================================================================
// AUTH PROVIDER
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface AuthResult {
  user?: AuthUser;
  session?: AuthSession;
  error: Error | null;
}

export type AuthChangeEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED";

export type AuthChangeCallback = (event: AuthChangeEvent, session: AuthSession | null) => void;

export interface Unsubscribe {
  unsubscribe: () => void;
}

export interface AuthProvider {
  /** Get the current session, or null if not authenticated */
  getSession(): Promise<{ user: AuthUser; session: AuthSession } | null>;

  /** Subscribe to auth state changes */
  onAuthStateChange(callback: AuthChangeCallback): Unsubscribe;

  /** Sign in with email and password */
  signInWithPassword(email: string, password: string): Promise<AuthResult>;

  /** Sign up with email and password */
  signUp(email: string, password: string): Promise<AuthResult>;

  /** Sign out */
  signOut(): Promise<void>;

  /** Send password reset email */
  resetPassword(email: string, redirectTo?: string): Promise<{ error: Error | null }>;

  /** Update password (requires active session) */
  updatePassword(password: string): Promise<{ error: Error | null }>;

  /** Fetch tenant context for authenticated user */
  getTenantContext(userId: string): Promise<TenantContextType>;

  /** Create tenant during signup */
  createTenant(userId: string, email: string, name?: string): Promise<{ error: Error | null }>;
}

// =============================================================================
// GATEWAY TRANSPORT
// =============================================================================

export interface GatewayRawResponse {
  data?: unknown;
  error?: { code: string; message: string };
  meta?: { pagination?: { total: number; limit: number; offset: number; hasMore: boolean } };
}

export interface GatewayInvokeOptions {
  /** AbortSignal to cancel the request (passed by TanStack Query automatically) */
  signal?: AbortSignal;
}

export interface GatewayTransport {
  /** Invoke a gateway action with params. Returns the raw response envelope. */
  invoke(
    action: string,
    params: Record<string, unknown>,
    options?: GatewayInvokeOptions,
  ): Promise<GatewayRawResponse>;

  /** Execute a GraphQL query against the gateway. Optional — falls back to invoke. */
  graphql?(query: string, variables?: Record<string, unknown>): Promise<GatewayRawResponse>;
}

// =============================================================================
// REALTIME PROVIDER
// =============================================================================

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

/** Postgres table change subscription (Supabase-native) */
export interface RealtimeSubscription {
  channel: string;
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  schema?: string;
  onData: (payload: {
    eventType: string;
    new: Record<string, unknown>;
    old: Record<string, unknown>;
  }) => void;
  onError?: (error: Error) => void;
}

export interface PresenceState {
  userId: string;
  lastSeen: string;
  [key: string]: unknown;
}

// =============================================================================
// PUB/SUB CHANNEL MESSAGING (provider-agnostic)
// =============================================================================

/** A message received from a pub/sub channel */
export interface ChannelMessage {
  /** Unique message ID (provider-assigned or generated) */
  id: string;
  /** Channel/topic the message arrived on */
  channel: string;
  /** Event name or message type (e.g., 'transfer.status_changed') */
  event: string;
  /** Arbitrary JSON payload */
  data: Record<string, unknown>;
  /** ISO-8601 timestamp of when the message was produced */
  timestamp: string;
  /** Optional metadata (headers, partition key, etc.) */
  metadata?: Record<string, unknown>;
}

/** Configuration for subscribing to a pub/sub channel */
export interface ChannelSubscription {
  /** Channel or topic name (e.g., 'tenant:{id}:transfers') */
  channel: string;
  /** Optional event filter — only receive messages matching this event name */
  event?: string;
  /** Callback invoked for each matching message */
  onMessage: (message: ChannelMessage) => void;
  /** Error callback */
  onError?: (error: Error) => void;
}

/** Configuration for publishing to a pub/sub channel */
export interface PublishOptions {
  /** Channel or topic name */
  channel: string;
  /** Event name */
  event: string;
  /** JSON payload */
  data: Record<string, unknown>;
  /** Optional metadata (e.g., partition key for Kafka) */
  metadata?: Record<string, unknown>;
}

/** Provider name identifier for realtime connectors */
export type RealtimeConnectorType = "supabase" | "ably" | "kafka" | "polling";

export interface RealtimeProvider {
  /** Provider identifier */
  readonly type?: RealtimeConnectorType;

  /** Subscribe to table changes (Postgres-native) */
  subscribe(config: RealtimeSubscription): Unsubscribe;

  /** Track user presence on a channel (optional — not all backends support this) */
  trackPresence?(channel: string, state: Record<string, unknown>): void;

  /** Get presence state for a channel (optional) */
  getPresence?(channel: string): PresenceState[];

  /** Subscribe to a pub/sub channel for arbitrary messages */
  subscribeChannel?(config: ChannelSubscription): Unsubscribe;

  /** Publish a message to a pub/sub channel */
  publish?(options: PublishOptions): Promise<void>;

  /** Disconnect and clean up all subscriptions */
  disconnect?(): void;
}

// =============================================================================
// BACKEND PROVIDER (COMPOSITE)
// =============================================================================

export interface BackendProvider {
  /** Provider name for logging/debugging */
  readonly name: string;

  /** Auth operations */
  auth: AuthProvider;

  /** Gateway transport for RPC calls */
  gateway: GatewayTransport;

  /** Realtime subscriptions */
  realtime: RealtimeProvider;
}
