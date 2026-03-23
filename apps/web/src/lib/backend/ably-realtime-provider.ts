/**
 * Ably Realtime Provider
 *
 * Implements the pub/sub channel messaging interface using Ably.
 * Ably provides low-latency WebSocket messaging with guaranteed ordering,
 * making it suitable for instant payment status updates (FedNow, RTP).
 *
 * For Postgres table-change subscriptions, delegates to a fallback provider
 * (typically SupabaseRealtimeProvider) since Ably doesn't do DB change capture.
 *
 * Configure via environment variables:
 *   VITE_ABLY_API_KEY — Ably API key (client-side safe, with limited capabilities)
 *   VITE_ABLY_AUTH_URL — Optional token auth endpoint for secure key exchange
 */

import type {
  RealtimeProvider,
  RealtimeSubscription,
  ChannelSubscription,
  ChannelMessage,
  PublishOptions,
  PresenceState,
  Unsubscribe,
} from "./types";

// ---------------------------------------------------------------------------
// Ably client types (minimal subset to avoid hard dependency on ably SDK)
// ---------------------------------------------------------------------------

interface AblyMessage {
  id?: string;
  name?: string;
  data?: unknown;
  timestamp?: number;
  extras?: Record<string, unknown>;
}

interface AblyChannel {
  subscribe(event: string, callback: (msg: AblyMessage) => void): void;
  subscribe(callback: (msg: AblyMessage) => void): void;
  unsubscribe(event: string, callback: (msg: AblyMessage) => void): void;
  unsubscribe(callback: (msg: AblyMessage) => void): void;
  publish(event: string, data: unknown): Promise<void>;
  detach(): Promise<void>;
  presence: {
    enter(data?: unknown): Promise<void>;
    get(): Promise<Array<{ clientId: string; data?: unknown; timestamp?: number }>>;
  };
}

interface AblyClient {
  channels: { get(name: string): AblyChannel };
  close(): void;
  connection: { on(event: string, callback: () => void): void };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface AblyRealtimeConfig {
  /** Ably API key (publishable / client-side scoped) */
  apiKey?: string;
  /** Token auth URL — preferred for production (returns Ably TokenRequest) */
  authUrl?: string;
  /** Optional client ID for presence */
  clientId?: string;
  /** Fallback provider for Postgres table-change subscriptions */
  tableChangeProvider?: RealtimeProvider;
}

export class AblyRealtimeProvider implements RealtimeProvider {
  readonly type = "ably" as const;

  private client: AblyClient | null = null;
  private channels = new Map<string, AblyChannel>();
  private config: AblyRealtimeConfig;
  private initPromise: Promise<void> | null = null;
  private tableChangeProvider: RealtimeProvider | undefined;

  constructor(config: AblyRealtimeConfig) {
    this.config = config;
    this.tableChangeProvider = config.tableChangeProvider;
  }

  // -----------------------------------------------------------------------
  // Lazy initialization — Ably SDK is loaded dynamically
  // -----------------------------------------------------------------------

  private async ensureClient(): Promise<AblyClient> {
    if (this.client) return this.client;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        // Dynamic import — uses a variable so Vite/Rollup won't try to resolve
        // the module at build time. Ably is an optional peer dependency.
        const ablyModuleName = "ably";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ably = await (new Function("m", "return import(m)") as (m: string) => Promise<any>)(
          ablyModuleName,
        );
        const Realtime = Ably.default?.Realtime ?? Ably.Realtime;

        const opts: Record<string, unknown> = {};
        if (this.config.authUrl) {
          opts.authUrl = this.config.authUrl;
        } else if (this.config.apiKey) {
          opts.key = this.config.apiKey;
        } else {
          const envKey = import.meta.env.VITE_ABLY_API_KEY;
          const envAuth = import.meta.env.VITE_ABLY_AUTH_URL;
          if (envAuth) {
            opts.authUrl = envAuth;
          } else if (envKey) {
            opts.key = envKey;
          } else {
            throw new Error("Ably: no API key or auth URL configured");
          }
        }

        if (this.config.clientId) opts.clientId = this.config.clientId;

        this.client = new Realtime(opts) as AblyClient;
      })();
    }

    await this.initPromise;
    return this.client!;
  }

  private async getChannel(name: string): Promise<AblyChannel> {
    if (this.channels.has(name)) return this.channels.get(name)!;
    const client = await this.ensureClient();
    const ch = client.channels.get(name);
    this.channels.set(name, ch);
    return ch;
  }

  // -----------------------------------------------------------------------
  // Table-change subscriptions — delegate to fallback
  // -----------------------------------------------------------------------

  subscribe(config: RealtimeSubscription): Unsubscribe {
    if (this.tableChangeProvider) {
      return this.tableChangeProvider.subscribe(config);
    }
    // No-op if no fallback — Ably doesn't do Postgres CDC
    config.onError?.(
      new Error(
        "Ably provider does not support table-change subscriptions without a fallback provider",
      ),
    );
    return { unsubscribe: () => {} };
  }

  // -----------------------------------------------------------------------
  // Presence — delegate to fallback or use Ably presence
  // -----------------------------------------------------------------------

  trackPresence(channel: string, state: Record<string, unknown>): void {
    if (this.tableChangeProvider?.trackPresence) {
      this.tableChangeProvider.trackPresence(channel, state);
      return;
    }
    // Fire-and-forget Ably presence
    this.getChannel(channel)
      .then((ch) => ch.presence.enter(state))
      .catch(() => {});
  }

  getPresence(channel: string): PresenceState[] {
    if (this.tableChangeProvider?.getPresence) {
      return this.tableChangeProvider.getPresence(channel);
    }
    return [];
  }

  // -----------------------------------------------------------------------
  // Pub/sub channel messaging
  // -----------------------------------------------------------------------

  subscribeChannel(config: ChannelSubscription): Unsubscribe {
    let detached = false;

    const handler = (msg: AblyMessage) => {
      try {
        const message: ChannelMessage = {
          id: msg.id ?? crypto.randomUUID(),
          channel: config.channel,
          event: msg.name ?? config.event ?? "*",
          data: (typeof msg.data === "object" && msg.data !== null
            ? msg.data
            : { value: msg.data }) as Record<string, unknown>,
          timestamp: msg.timestamp
            ? new Date(msg.timestamp).toISOString()
            : new Date().toISOString(),
          metadata: msg.extras,
        };
        config.onMessage(message);
      } catch (err) {
        config.onError?.(err instanceof Error ? err : new Error("Ably message handler error"));
      }
    };

    // Subscribe asynchronously
    this.getChannel(config.channel)
      .then((ch) => {
        if (detached) return;
        if (config.event) {
          ch.subscribe(config.event, handler);
        } else {
          ch.subscribe(handler);
        }
      })
      .catch((err) => {
        config.onError?.(err instanceof Error ? err : new Error("Ably subscribe failed"));
      });

    return {
      unsubscribe: () => {
        detached = true;
        const ch = this.channels.get(config.channel);
        if (!ch) return;
        if (config.event) {
          ch.unsubscribe(config.event, handler);
        } else {
          ch.unsubscribe(handler);
        }
      },
    };
  }

  async publish(options: PublishOptions): Promise<void> {
    const ch = await this.getChannel(options.channel);
    await ch.publish(options.event, options.data);
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  disconnect(): void {
    for (const ch of this.channels.values()) {
      ch.detach().catch(() => {});
    }
    this.channels.clear();
    this.client?.close();
    this.client = null;
    this.initPromise = null;
  }
}
