// TODO: Provisional integration — not yet validated in production.
/**
 * Braze Notification Adapter
 *
 * Integrates with the Braze REST API for multi-channel notification delivery.
 * Supports push, email, SMS (via connected Twilio), and in-app messaging.
 *
 * Required env vars:
 *   BRAZE_API_KEY     — Braze REST API key
 *   BRAZE_REST_URL    — Braze REST endpoint (e.g., https://rest.iad-01.braze.com)
 *   BRAZE_APP_ID      — Braze application ID (for push)
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  NotificationAdapter,
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationRequest,
  SendBulkNotificationResponse,
  NotificationChannel,
  NotificationStatus,
} from './types.ts';

export class BrazeNotificationAdapter implements NotificationAdapter {
  readonly config: AdapterConfig = {
    id: 'braze',
    name: 'Braze Notification Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get apiKey(): string {
    return Deno.env.get('BRAZE_API_KEY') ?? '';
  }

  private get restUrl(): string {
    return Deno.env.get('BRAZE_REST_URL') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      // Braze doesn't have a dedicated health endpoint, check auth via user export
      const res = await fetch(`${this.restUrl}/users/export/ids`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ external_ids: ['__health_check__'], fields_to_export: ['external_id'] }),
      });

      return {
        adapterId: this.config.id,
        healthy: res.status === 200 || res.status === 201,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const { recipient, channels, payload, priority } = request;

    // Build Braze /messages/send payload
    const brazePayload = this.buildBrazePayload(recipient, channels, payload, priority);

    const res = await fetch(`${this.restUrl}/messages/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(brazePayload),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error(`[braze] Send failed: ${res.status} ${errorBody}`);
      const statuses: Partial<Record<NotificationChannel, NotificationStatus>> = {};
      for (const ch of channels) statuses[ch] = 'failed';
      return { messageIds: {}, statuses };
    }

    const body = await res.json();
    const dispatchId = body.dispatch_id ?? crypto.randomUUID();

    const messageIds: Partial<Record<NotificationChannel, string>> = {};
    const statuses: Partial<Record<NotificationChannel, NotificationStatus>> = {};
    for (const ch of channels) {
      messageIds[ch] = `${dispatchId}_${ch}`;
      statuses[ch] = 'sent';
    }

    return { messageIds, statuses };
  }

  async sendBulk(request: SendBulkNotificationRequest): Promise<SendBulkNotificationResponse> {
    // Braze supports bulk via /messages/send with multiple external_ids
    // or via campaign triggers. We use the direct approach.
    let totalSent = 0;
    let totalFailed = 0;
    const failures: SendBulkNotificationResponse['failures'] = [];

    // Batch in groups of 50 (Braze limit)
    const batchSize = 50;
    for (let i = 0; i < request.recipients.length; i += batchSize) {
      const batch = request.recipients.slice(i, i + batchSize);

      for (const recipient of batch) {
        try {
          await this.send({
            tenantId: request.tenantId,
            recipient,
            channels: request.channels,
            payload: request.payload,
            priority: request.priority,
          });
          totalSent++;
        } catch (err) {
          totalFailed++;
          for (const ch of request.channels) {
            failures.push({
              userId: recipient.userId,
              channel: ch,
              error: err instanceof Error ? err.message : 'Send failed',
            });
          }
        }
      }
    }

    return { totalSent, totalFailed, failures };
  }

  private buildBrazePayload(
    recipient: SendNotificationRequest['recipient'],
    channels: NotificationChannel[],
    payload: SendNotificationRequest['payload'],
    priority: SendNotificationRequest['priority'],
  ): Record<string, unknown> {
    const externalUserId = recipient.externalId ?? recipient.userId;

    const brazePayload: Record<string, unknown> = {
      external_user_ids: [externalUserId],
    };

    if (channels.includes('push')) {
      brazePayload.messages = {
        ...((brazePayload.messages as Record<string, unknown>) ?? {}),
        apple_push: {
          alert: {
            title: payload.title ?? payload.template,
            body: payload.body ?? '',
          },
          extra: {
            deep_link: payload.deepLink,
            category: payload.category,
            ...payload.templateData,
          },
          priority: priority === 'critical' ? 10 : 5,
        },
        android_push: {
          title: payload.title ?? payload.template,
          alert: payload.body ?? '',
          extra: {
            deep_link: payload.deepLink,
            category: payload.category,
            ...payload.templateData,
          },
          priority: priority === 'critical' ? 'high' : 'normal',
        },
      };
    }

    if (channels.includes('email')) {
      brazePayload.messages = {
        ...((brazePayload.messages as Record<string, unknown>) ?? {}),
        email: {
          app_id: Deno.env.get('BRAZE_APP_ID') ?? '',
          subject: payload.title ?? payload.template,
          body: payload.body ?? '',
          from: Deno.env.get('BRAZE_FROM_EMAIL') ?? 'noreply@example.com',
          extras: payload.templateData,
        },
      };
    }

    if (channels.includes('sms')) {
      brazePayload.messages = {
        ...((brazePayload.messages as Record<string, unknown>) ?? {}),
        sms: {
          body: payload.body ?? `${payload.title}: ${JSON.stringify(payload.templateData)}`,
          subscription_group_id: Deno.env.get('BRAZE_SMS_SUBSCRIPTION_GROUP') ?? '',
        },
      };
    }

    return brazePayload;
  }
}
