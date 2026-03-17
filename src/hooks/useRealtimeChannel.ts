/**
 * useRealtimeChannel — Subscribe to pub/sub channel messages
 *
 * Provider-agnostic hook that works with Supabase broadcast, Ably, or Kafka
 * depending on the configured realtime provider.
 *
 * Usage:
 *   // Subscribe to all transfer events for current user
 *   const { messages, lastMessage } = useRealtimeChannel<TransferStatusEvent>({
 *     channel: `tenant:${tenantId}:transfers:${userId}`,
 *     event: 'transfer.completed',
 *   });
 *
 *   // Subscribe to balance updates
 *   useRealtimeChannel<BalanceUpdateEvent>({
 *     channel: `tenant:${tenantId}:balances:${userId}`,
 *     onMessage: (msg) => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
 *   });
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { getBackend } from '@/lib/backend';
import type { ChannelMessage } from '@/lib/backend/types';

export interface UseRealtimeChannelOptions {
  /** Channel/topic name to subscribe to */
  channel: string;
  /** Optional event filter */
  event?: string;
  /** Callback for each message (in addition to state updates) */
  onMessage?: (message: ChannelMessage) => void;
  /** Error callback */
  onError?: (error: Error) => void;
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
  /** Max messages to keep in state buffer (default: 50) */
  bufferSize?: number;
}

export interface UseRealtimeChannelResult<T = Record<string, unknown>> {
  /** All buffered messages (newest last) */
  messages: (ChannelMessage & { typedData: T })[];
  /** Most recent message, or null */
  lastMessage: (ChannelMessage & { typedData: T }) | null;
  /** Whether the subscription is currently active */
  isSubscribed: boolean;
}

export function useRealtimeChannel<T = Record<string, unknown>>(
  options: UseRealtimeChannelOptions,
): UseRealtimeChannelResult<T> {
  const { channel, event, onMessage, onError, enabled = true, bufferSize = 50 } = options;

  const [messages, setMessages] = useState<(ChannelMessage & { typedData: T })[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);

  // Keep refs current without re-subscribing
  onMessageRef.current = onMessage;
  onErrorRef.current = onError;

  const handleMessage = useCallback(
    (msg: ChannelMessage) => {
      const typed = { ...msg, typedData: msg.data as unknown as T };
      setMessages((prev) => {
        const next = [...prev, typed];
        return next.length > bufferSize ? next.slice(-bufferSize) : next;
      });
      onMessageRef.current?.(msg);
    },
    [bufferSize],
  );

  useEffect(() => {
    if (!enabled || !channel) {
      setIsSubscribed(false);
      return;
    }

    const backend = getBackend();
    const provider = backend.realtime;

    if (!provider.subscribeChannel) {
      onErrorRef.current?.(new Error('Current realtime provider does not support channel subscriptions'));
      return;
    }

    const sub = provider.subscribeChannel({
      channel,
      event,
      onMessage: handleMessage,
      onError: (err) => onErrorRef.current?.(err),
    });

    setIsSubscribed(true);

    return () => {
      sub.unsubscribe();
      setIsSubscribed(false);
    };
  }, [channel, event, enabled, handleMessage]);

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return { messages, lastMessage, isSubscribed };
}
