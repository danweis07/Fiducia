/**
 * Kafka Realtime Provider (via REST Proxy / WebSocket bridge)
 *
 * Implements pub/sub channel messaging for Kafka topics.
 * Browsers can't speak Kafka wire protocol directly, so this provider
 * connects through a WebSocket bridge (e.g., Confluent REST Proxy,
 * a custom WS→Kafka gateway, or a Kafka-compatible SSE endpoint).
 *
 * For Postgres table-change subscriptions, delegates to a fallback provider.
 *
 * Configure via environment variables:
 *   VITE_KAFKA_WS_URL       — WebSocket bridge endpoint
 *   VITE_KAFKA_REST_URL     — REST proxy endpoint (Confluent-style)
 *   VITE_KAFKA_CONSUMER_GROUP — Consumer group ID
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
// Configuration
// ---------------------------------------------------------------------------

export interface KafkaRealtimeConfig {
  /** WebSocket bridge URL (preferred for low-latency subscriptions) */
  wsUrl?: string;
  /** REST proxy URL (Confluent-style, used for publish and polling fallback) */
  restUrl?: string;
  /** Consumer group ID */
  consumerGroup?: string;
  /** Auth token or API key for the bridge */
  authToken?: string;
  /** Fallback provider for Postgres table-change subscriptions */
  tableChangeProvider?: RealtimeProvider;
}

// ---------------------------------------------------------------------------
// Internal WS message format (bridge protocol)
// ---------------------------------------------------------------------------

interface KafkaBridgeMessage {
  type: "message" | "subscribed" | "error";
  topic?: string;
  key?: string;
  value?: Record<string, unknown>;
  partition?: number;
  offset?: number;
  timestamp?: string;
  headers?: Record<string, string>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export class KafkaRealtimeProvider implements RealtimeProvider {
  readonly type = "kafka" as const;

  private ws: WebSocket | null = null;
  private config: KafkaRealtimeConfig;
  private tableChangeProvider: RealtimeProvider | undefined;
  private subscriptions = new Map<string, Set<(msg: KafkaBridgeMessage) => void>>();
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private closed = false;

  constructor(config: KafkaRealtimeConfig) {
    this.config = config;
    this.tableChangeProvider = config.tableChangeProvider;
  }

  // -----------------------------------------------------------------------
  // WebSocket connection management
  // -----------------------------------------------------------------------

  private getWsUrl(): string {
    return this.config.wsUrl ?? import.meta.env.VITE_KAFKA_WS_URL ?? "";
  }

  private getRestUrl(): string {
    return this.config.restUrl ?? import.meta.env.VITE_KAFKA_REST_URL ?? "";
  }

  private async ensureConnection(): Promise<WebSocket> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return this.ws;

    if (!this.connectPromise) {
      this.connectPromise = new Promise<void>((resolve, reject) => {
        const wsUrl = this.getWsUrl();
        if (!wsUrl) {
          reject(new Error("Kafka: no WebSocket bridge URL configured"));
          return;
        }

        const url = new URL(wsUrl);
        const token = this.config.authToken ?? import.meta.env.VITE_KAFKA_AUTH_TOKEN;
        if (token) url.searchParams.set("token", token);

        const group =
          this.config.consumerGroup ?? import.meta.env.VITE_KAFKA_CONSUMER_GROUP ?? "fiducia-web";
        url.searchParams.set("group", group);

        const ws = new WebSocket(url.toString());

        ws.onopen = () => {
          this.ws = ws;
          this.reconnectAttempt = 0;

          // Re-subscribe to all topics after reconnect
          for (const topic of this.subscriptions.keys()) {
            ws.send(JSON.stringify({ type: "subscribe", topic }));
          }

          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const msg: KafkaBridgeMessage = JSON.parse(event.data as string);
            if (msg.type === "message" && msg.topic) {
              const handlers = this.subscriptions.get(msg.topic);
              handlers?.forEach((handler) => handler(msg));
            }
          } catch {
            // Ignore malformed messages
          }
        };

        ws.onclose = () => {
          this.ws = null;
          this.connectPromise = null;
          if (!this.closed) this.scheduleReconnect();
        };

        ws.onerror = () => {
          this.ws = null;
          this.connectPromise = null;
          reject(new Error("Kafka WebSocket connection failed"));
          if (!this.closed) this.scheduleReconnect();
        };
      });
    }

    await this.connectPromise;
    return this.ws!;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), 30_000);
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnection().catch(() => {});
    }, delay);
  }

  // -----------------------------------------------------------------------
  // Table-change subscriptions — delegate to fallback
  // -----------------------------------------------------------------------

  subscribe(config: RealtimeSubscription): Unsubscribe {
    if (this.tableChangeProvider) {
      return this.tableChangeProvider.subscribe(config);
    }
    config.onError?.(
      new Error(
        "Kafka provider does not support table-change subscriptions without a fallback provider",
      ),
    );
    return { unsubscribe: () => {} };
  }

  // -----------------------------------------------------------------------
  // Presence — delegate to fallback
  // -----------------------------------------------------------------------

  trackPresence(channel: string, state: Record<string, unknown>): void {
    this.tableChangeProvider?.trackPresence?.(channel, state);
  }

  getPresence(channel: string): PresenceState[] {
    return this.tableChangeProvider?.getPresence?.(channel) ?? [];
  }

  // -----------------------------------------------------------------------
  // Pub/sub channel messaging via WebSocket bridge
  // -----------------------------------------------------------------------

  subscribeChannel(config: ChannelSubscription): Unsubscribe {
    const topic = config.channel;
    let detached = false;

    const handler = (msg: KafkaBridgeMessage) => {
      if (detached) return;

      // Filter by event name if specified
      const eventName = msg.headers?.["event"] ?? msg.key ?? "*";
      if (config.event && config.event !== eventName && eventName !== "*") return;

      try {
        const message: ChannelMessage = {
          id:
            msg.offset !== undefined ? `${msg.partition ?? 0}:${msg.offset}` : crypto.randomUUID(),
          channel: topic,
          event: eventName,
          data: msg.value ?? {},
          timestamp: msg.timestamp ?? new Date().toISOString(),
          metadata: {
            ...(msg.headers ? { headers: msg.headers } : {}),
            ...(msg.partition !== undefined ? { partition: msg.partition } : {}),
            ...(msg.offset !== undefined ? { offset: msg.offset } : {}),
          },
        };
        config.onMessage(message);
      } catch (err) {
        config.onError?.(err instanceof Error ? err : new Error("Kafka message handler error"));
      }
    };

    // Register handler
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(handler);

    // Subscribe on the WS bridge
    this.ensureConnection()
      .then((ws) => {
        if (detached) return;
        try {
          ws.send(JSON.stringify({ type: "subscribe", topic }));
        } catch (sendErr) {
          config.onError?.(sendErr instanceof Error ? sendErr : new Error("Kafka send failed"));
        }
      })
      .catch((err) => {
        config.onError?.(err instanceof Error ? err : new Error("Kafka subscribe failed"));
      });

    return {
      unsubscribe: () => {
        detached = true;
        const handlers = this.subscriptions.get(topic);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            this.subscriptions.delete(topic);
            // Unsubscribe from topic on the bridge
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ type: "unsubscribe", topic }));
            }
          }
        }
      },
    };
  }

  async publish(options: PublishOptions): Promise<void> {
    const restUrl = this.getRestUrl();

    if (restUrl) {
      // Use REST proxy for publishing (more reliable for writes)
      const token = this.config.authToken ?? import.meta.env.VITE_KAFKA_AUTH_TOKEN;
      const res = await fetch(`${restUrl}/topics/${encodeURIComponent(options.channel)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/vnd.kafka.json.v2+json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          records: [
            {
              key: options.event,
              value: options.data,
              headers: options.metadata,
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`Kafka REST publish failed: ${res.status} ${res.statusText}`);
      }
      return;
    }

    // Fall back to WebSocket bridge for publishing
    const ws = await this.ensureConnection();
    ws.send(
      JSON.stringify({
        type: "publish",
        topic: options.channel,
        key: options.event,
        value: options.data,
        headers: options.metadata,
      }),
    );
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.subscriptions.clear();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectPromise = null;
  }
}
