/**
 * Twilio Notification Adapter
 *
 * Integrates with the Twilio REST API for SMS and email (via SendGrid)
 * notification delivery. Complements Braze/Airship for direct transactional
 * messaging where a full engagement platform is not needed.
 *
 * Channels supported:
 *   - SMS  — via Twilio Messaging API (Programmable SMS)
 *   - Email — via Twilio SendGrid Mail Send API v3
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID       — Twilio Account SID
 *   TWILIO_AUTH_TOKEN         — Twilio Auth Token
 *   TWILIO_FROM_NUMBER        — Default sender phone number (E.164)
 *
 * Optional env vars (for email via SendGrid):
 *   SENDGRID_API_KEY          — SendGrid API key
 *   SENDGRID_FROM_EMAIL       — Default sender email address
 *   SENDGRID_FROM_NAME        — Default sender display name
 *
 * Sandbox:
 *   Twilio provides free test credentials at https://www.twilio.com/console
 *   Use "magic" phone numbers for testing without delivering real SMS.
 *   SendGrid free tier: 100 emails/day at https://signup.sendgrid.com/
 *
 * Docs:
 *   SMS:   https://www.twilio.com/docs/messaging/api/message-resource
 *   Email: https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  NotificationAdapter,
  NotificationChannel,
  NotificationStatus,
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationRequest,
  SendBulkNotificationResponse,
} from './types.ts';

// =============================================================================
// TWILIO ADAPTER
// =============================================================================

export class TwilioNotificationAdapter implements NotificationAdapter {
  readonly config: AdapterConfig = {
    id: 'twilio',
    name: 'Twilio Notification Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get accountSid(): string {
    return Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
  }

  private get authToken(): string {
    return Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
  }

  private get fromNumber(): string {
    return Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
  }

  private get sendgridApiKey(): string {
    return Deno.env.get('SENDGRID_API_KEY') ?? '';
  }

  private get sendgridFromEmail(): string {
    return Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'noreply@example.com';
  }

  private get sendgridFromName(): string {
    return Deno.env.get('SENDGRID_FROM_NAME') ?? '';
  }

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      // Verify Twilio credentials via account lookup
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}.json`,
        {
          headers: {
            'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
          },
        },
      );

      return {
        adapterId: this.config.id,
        healthy: res.status === 200,
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

  // ---------------------------------------------------------------------------
  // SEND (single recipient)
  // ---------------------------------------------------------------------------

  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const { recipient, channels, payload } = request;

    const messageIds: Partial<Record<NotificationChannel, string>> = {};
    const statuses: Partial<Record<NotificationChannel, NotificationStatus>> = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'sms': {
            const sid = await this.sendSms(
              recipient.phone ?? '',
              this.buildSmsBody(payload),
            );
            messageIds.sms = sid;
            statuses.sms = 'sent';
            break;
          }
          case 'email': {
            const sgMessageId = await this.sendEmail(
              recipient.email ?? '',
              payload.title ?? payload.template,
              payload.body ?? '',
              payload.templateData,
            );
            messageIds.email = sgMessageId;
            statuses.email = 'sent';
            break;
          }
          case 'push':
          case 'in_app':
            // Twilio adapter delegates push/in_app to Braze or Airship.
            // Log and skip — these channels are no-ops for this adapter.
            console.warn(`[twilio] Channel "${channel}" not supported — delegate to Braze/Airship`);
            statuses[channel] = 'failed';
            break;
        }
      } catch (err) {
        console.error(`[twilio] ${channel} send failed:`, err instanceof Error ? err.message : err);
        statuses[channel] = 'failed';
      }
    }

    return { messageIds, statuses };
  }

  // ---------------------------------------------------------------------------
  // SEND BULK
  // ---------------------------------------------------------------------------

  async sendBulk(request: SendBulkNotificationRequest): Promise<SendBulkNotificationResponse> {
    let totalSent = 0;
    let totalFailed = 0;
    const failures: SendBulkNotificationResponse['failures'] = [];

    for (const recipient of request.recipients) {
      try {
        const result = await this.send({
          tenantId: request.tenantId,
          recipient,
          channels: request.channels,
          payload: request.payload,
          priority: request.priority,
        });

        const anyFailed = Object.values(result.statuses).some((s) => s === 'failed');
        if (anyFailed) {
          totalFailed++;
          for (const ch of request.channels) {
            if (result.statuses[ch] === 'failed') {
              failures.push({ userId: recipient.userId, channel: ch, error: 'Send failed' });
            }
          }
        } else {
          totalSent++;
        }
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

    return { totalSent, totalFailed, failures };
  }

  // ---------------------------------------------------------------------------
  // TWILIO SMS
  // ---------------------------------------------------------------------------

  private async sendSms(to: string, body: string): Promise<string> {
    if (!to) throw new Error('Recipient phone number is required for SMS');
    if (!this.accountSid || !this.authToken) throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.set('To', to);
    params.set('From', this.fromNumber);
    params.set('Body', body);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Twilio SMS error (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    return data.sid;
  }

  // ---------------------------------------------------------------------------
  // SENDGRID EMAIL
  // ---------------------------------------------------------------------------

  private async sendEmail(
    to: string,
    subject: string,
    body: string,
    templateData: Record<string, unknown>,
  ): Promise<string> {
    if (!to) throw new Error('Recipient email is required');
    if (!this.sendgridApiKey) throw new Error('SENDGRID_API_KEY is required for email');

    const sgPayload = {
      personalizations: [
        {
          to: [{ email: to }],
          dynamic_template_data: templateData,
        },
      ],
      from: {
        email: this.sendgridFromEmail,
        ...(this.sendgridFromName ? { name: this.sendgridFromName } : {}),
      },
      subject,
      content: [
        { type: 'text/plain', value: body },
      ],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sgPayload),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`SendGrid error (${res.status}): ${errorBody}`);
    }

    // SendGrid returns message ID in x-message-id header
    return res.headers.get('x-message-id') ?? `sg_${crypto.randomUUID().slice(0, 8)}`;
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private buildSmsBody(payload: SendNotificationRequest['payload']): string {
    if (payload.body) return payload.body;
    return payload.title
      ? `${payload.title}: ${JSON.stringify(payload.templateData)}`
      : JSON.stringify(payload.templateData);
  }
}
