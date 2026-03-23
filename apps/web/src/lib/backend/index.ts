/**
 * Backend Provider Registry
 *
 * Selects the backend implementation based on VITE_BACKEND_PROVIDER env var.
 * Default: 'supabase' (backwards compatible).
 *
 * Supported values:
 *   - 'supabase' — Supabase auth + edge functions + realtime (default)
 *   - 'rest'     — Generic REST API with polling realtime
 *
 * Realtime channel provider (pub/sub messaging for instant payments):
 *   Set VITE_REALTIME_CHANNEL_PROVIDER to layer a message broker on top:
 *   - 'ably'   — Ably WebSocket channels
 *   - 'kafka'  — Kafka via WebSocket bridge / REST proxy
 *   - unset    — Uses Supabase broadcast (default)
 *
 * Usage:
 *   import { getBackend } from '@/lib/backend';
 *   const backend = getBackend();
 *   await backend.auth.signInWithPassword(email, password);
 *   backend.realtime.subscribeChannel?.({ channel: 'transfers', onMessage: console.log });
 */

import type { BackendProvider, RealtimeProvider } from "./types";
import { createSupabaseProvider } from "./supabase-provider";
import { createRestProvider } from "./rest-provider";
import { AblyRealtimeProvider } from "./ably-realtime-provider";
import { KafkaRealtimeProvider } from "./kafka-realtime-provider";
import { CompositeRealtimeProvider } from "./composite-realtime-provider";

let _provider: BackendProvider | null = null;

function createChannelProvider(primary: RealtimeProvider): RealtimeProvider {
  const channelType = import.meta.env.VITE_REALTIME_CHANNEL_PROVIDER;
  if (!channelType) return primary;

  switch (channelType) {
    case "ably":
      return new CompositeRealtimeProvider({
        primary,
        channel: new AblyRealtimeProvider({ tableChangeProvider: primary }),
      });
    case "kafka":
      return new CompositeRealtimeProvider({
        primary,
        channel: new KafkaRealtimeProvider({ tableChangeProvider: primary }),
      });
    default:
      return primary;
  }
}

export function getBackend(): BackendProvider {
  if (_provider) return _provider;

  const providerName = import.meta.env.VITE_BACKEND_PROVIDER ?? "supabase";

  let base: BackendProvider;
  switch (providerName) {
    case "rest":
      base = createRestProvider();
      break;
    case "supabase":
    default:
      base = createSupabaseProvider();
      break;
  }

  // Layer channel provider if configured
  const realtime = createChannelProvider(base.realtime);
  _provider = realtime === base.realtime ? base : { ...base, realtime };

  return _provider;
}

/** Reset the cached provider (useful for tests) */
export function resetBackend(): void {
  _provider = null;
}

export type { BackendProvider } from "./types";
export type {
  AuthProvider,
  AuthUser,
  AuthSession,
  AuthResult,
  AuthChangeCallback,
  Unsubscribe,
  GatewayTransport,
  GatewayRawResponse,
  RealtimeProvider,
  RealtimeSubscription,
  ChannelSubscription,
  ChannelMessage,
  PublishOptions,
  RealtimeConnectorType,
  PresenceState,
} from "./types";
export { AblyRealtimeProvider } from "./ably-realtime-provider";
export type { AblyRealtimeConfig } from "./ably-realtime-provider";
export { KafkaRealtimeProvider } from "./kafka-realtime-provider";
export type { KafkaRealtimeConfig } from "./kafka-realtime-provider";
export { CompositeRealtimeProvider } from "./composite-realtime-provider";
export type { CompositeRealtimeConfig } from "./composite-realtime-provider";
