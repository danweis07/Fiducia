/**
 * Composite Realtime Provider
 *
 * Combines a primary provider (for Postgres table-change subscriptions)
 * with an optional channel provider (for pub/sub messaging via Ably, Kafka, etc.).
 *
 * This lets the platform keep Supabase Realtime for DB change notifications
 * while adding a dedicated message broker for high-throughput, low-latency
 * events like instant payment status updates.
 *
 * Usage:
 *   const composite = new CompositeRealtimeProvider({
 *     primary: supabaseRealtimeProvider,
 *     channel: ablyRealtimeProvider,
 *   });
 */

import type {
  RealtimeProvider,
  RealtimeSubscription,
  ChannelSubscription,
  PublishOptions,
  PresenceState,
  Unsubscribe,
} from './types';

export interface CompositeRealtimeConfig {
  /** Primary provider for Postgres table-change subscriptions + presence */
  primary: RealtimeProvider;
  /** Optional channel provider for pub/sub messaging (Ably, Kafka, etc.) */
  channel?: RealtimeProvider;
}

export class CompositeRealtimeProvider implements RealtimeProvider {
  readonly type = 'supabase' as const; // Primary is always Supabase-compatible

  private primary: RealtimeProvider;
  private channel: RealtimeProvider | undefined;

  constructor(config: CompositeRealtimeConfig) {
    this.primary = config.primary;
    this.channel = config.channel;
  }

  // Table-change subscriptions → primary (Supabase)
  subscribe(config: RealtimeSubscription): Unsubscribe {
    return this.primary.subscribe(config);
  }

  // Presence → primary (Supabase)
  trackPresence(channel: string, state: Record<string, unknown>): void {
    this.primary.trackPresence?.(channel, state);
  }

  getPresence(channel: string): PresenceState[] {
    return this.primary.getPresence?.(channel) ?? [];
  }

  // Pub/sub channel messaging → channel provider (Ably/Kafka) or primary fallback
  subscribeChannel(config: ChannelSubscription): Unsubscribe {
    const provider = this.channel ?? this.primary;
    if (provider.subscribeChannel) {
      return provider.subscribeChannel(config);
    }
    config.onError?.(new Error('No channel provider configured for pub/sub messaging'));
    return { unsubscribe: () => {} };
  }

  async publish(options: PublishOptions): Promise<void> {
    const provider = this.channel ?? this.primary;
    if (provider.publish) {
      return provider.publish(options);
    }
    throw new Error('No channel provider configured for pub/sub messaging');
  }

  disconnect(): void {
    this.channel?.disconnect?.();
    this.primary.disconnect?.();
  }
}
