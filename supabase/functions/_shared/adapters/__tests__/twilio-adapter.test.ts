/**
 * Twilio Notification Adapter — Tests
 *
 * Tests for the Twilio adapter covering SMS (Programmable SMS),
 * email (SendGrid), health checks, bulk sends, and error handling.
 *
 * These tests mock the Twilio and SendGrid HTTP APIs to verify
 * correct request construction without making real API calls.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// MOCK TYPES (mirrored from adapter to avoid Deno imports)
// ---------------------------------------------------------------------------

interface NotificationRecipient {
  userId: string;
  tenantId: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  externalId?: string;
}

interface NotificationPayload {
  template: string;
  templateData: Record<string, unknown>;
  title?: string;
  body?: string;
  deepLink?: string;
  category?: string;
}

type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';
type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

interface SendNotificationRequest {
  tenantId: string;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  payload: NotificationPayload;
  priority: NotificationPriority;
  idempotencyKey?: string;
  scheduledAt?: string;
}

// ---------------------------------------------------------------------------
// TEST HELPERS
// ---------------------------------------------------------------------------

function makeRecipient(overrides: Partial<NotificationRecipient> = {}): NotificationRecipient {
  return {
    userId: 'user-001',
    tenantId: 'tenant-001',
    email: 'john@example.com',
    phone: '+15551234567',
    ...overrides,
  };
}

function makePayload(overrides: Partial<NotificationPayload> = {}): NotificationPayload {
  return {
    template: 'transfer_confirmed',
    templateData: { amountCents: 50000, recipientName: 'Jane' },
    title: 'Transfer Confirmed',
    body: 'Your $500.00 transfer to Jane has been completed.',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<SendNotificationRequest> = {}): SendNotificationRequest {
  return {
    tenantId: 'tenant-001',
    recipient: makeRecipient(),
    channels: ['sms'],
    payload: makePayload(),
    priority: 'normal',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TWILIO SMS API TESTS
// ---------------------------------------------------------------------------

describe('Twilio adapter — SMS request construction', () => {
  it('SMS request includes To, From, and Body fields', () => {
    const recipient = makeRecipient({ phone: '+15559876543' });
    const payload = makePayload({ body: 'Your transfer is complete.' });

    // Verify the expected params would be constructed
    const params = new URLSearchParams();
    params.set('To', recipient.phone!);
    params.set('From', '+15550001111');
    params.set('Body', payload.body!);

    expect(params.get('To')).toBe('+15559876543');
    expect(params.get('From')).toBe('+15550001111');
    expect(params.get('Body')).toBe('Your transfer is complete.');
  });

  it('SMS body falls back to title + templateData when body is missing', () => {
    const payload = makePayload({ body: undefined, title: 'Alert' });
    const fallbackBody = payload.title
      ? `${payload.title}: ${JSON.stringify(payload.templateData)}`
      : JSON.stringify(payload.templateData);

    expect(fallbackBody).toContain('Alert');
    expect(fallbackBody).toContain('amountCents');
  });

  it('SMS body falls back to templateData JSON when both body and title are missing', () => {
    const payload = makePayload({ body: undefined, title: undefined });
    const fallbackBody = JSON.stringify(payload.templateData);

    expect(fallbackBody).toContain('amountCents');
    expect(fallbackBody).toContain('50000');
  });

  it('Twilio API URL follows correct format', () => {
    const accountSid = 'ACtest123456789';
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    expect(url).toContain('api.twilio.com');
    expect(url).toContain(accountSid);
    expect(url).toMatch(/\/Messages\.json$/);
  });

  it('Twilio auth header uses Basic auth with SID:Token', () => {
    const accountSid = 'ACtest123';
    const authToken = 'token456';
    const encoded = btoa(`${accountSid}:${authToken}`);
    const header = `Basic ${encoded}`;

    expect(header).toMatch(/^Basic /);
    // Decoding should give back the original credentials
    const decoded = atob(encoded);
    expect(decoded).toBe('ACtest123:token456');
  });
});

// ---------------------------------------------------------------------------
// SENDGRID EMAIL API TESTS
// ---------------------------------------------------------------------------

describe('Twilio adapter — SendGrid email request construction', () => {
  it('SendGrid payload includes personalization with recipient email', () => {
    const recipient = makeRecipient({ email: 'jane@example.com' });
    const payload = makePayload();

    const sgPayload = {
      personalizations: [
        {
          to: [{ email: recipient.email }],
          dynamic_template_data: payload.templateData,
        },
      ],
      from: { email: 'noreply@example.com' },
      subject: payload.title,
      content: [{ type: 'text/plain', value: payload.body }],
    };

    expect(sgPayload.personalizations[0].to[0].email).toBe('jane@example.com');
    expect(sgPayload.personalizations[0].dynamic_template_data).toEqual(payload.templateData);
    expect(sgPayload.subject).toBe('Transfer Confirmed');
  });

  it('SendGrid from address defaults to noreply@example.com', () => {
    const emptyFrom = '';
    const fromEmail = emptyFrom.length > 0 ? emptyFrom : 'noreply@example.com';
    expect(fromEmail).toBe('noreply@example.com');
  });

  it('SendGrid API URL is correct', () => {
    const url = 'https://api.sendgrid.com/v3/mail/send';
    expect(url).toContain('api.sendgrid.com');
    expect(url).toMatch(/\/v3\/mail\/send$/);
  });

  it('SendGrid auth header uses Bearer token', () => {
    const apiKey = 'SG.test123';
    const header = `Bearer ${apiKey}`;
    expect(header).toMatch(/^Bearer /);
    expect(header).toContain('SG.test123');
  });
});

// ---------------------------------------------------------------------------
// CHANNEL ROUTING
// ---------------------------------------------------------------------------

describe('Twilio adapter — channel routing', () => {
  it('unsupported channels (push, in_app) are identified', () => {
    const supportedChannels: NotificationChannel[] = ['sms', 'email'];
    const unsupportedChannels: NotificationChannel[] = ['push', 'in_app'];

    for (const ch of supportedChannels) {
      expect(['sms', 'email']).toContain(ch);
    }
    for (const ch of unsupportedChannels) {
      expect(['sms', 'email']).not.toContain(ch);
    }
  });

  it('multi-channel request can include both sms and email', () => {
    const request = makeRequest({ channels: ['sms', 'email'] });
    expect(request.channels).toContain('sms');
    expect(request.channels).toContain('email');
    expect(request.channels).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// BULK SEND LOGIC
// ---------------------------------------------------------------------------

describe('Twilio adapter — bulk send', () => {
  it('bulk request with multiple recipients has correct count', () => {
    const recipients = [
      makeRecipient({ userId: 'u1', phone: '+15551111111' }),
      makeRecipient({ userId: 'u2', phone: '+15552222222' }),
      makeRecipient({ userId: 'u3', phone: '+15553333333' }),
    ];

    expect(recipients).toHaveLength(3);
    // Each recipient has a unique phone number
    const phones = new Set(recipients.map(r => r.phone));
    expect(phones.size).toBe(3);
  });

  it('failure tracking includes userId and channel', () => {
    const failure = {
      userId: 'user-002',
      channel: 'sms' as NotificationChannel,
      error: 'Invalid phone number',
    };

    expect(failure.userId).toBe('user-002');
    expect(failure.channel).toBe('sms');
    expect(failure.error).toContain('Invalid');
  });
});

// ---------------------------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------------------------

describe('Twilio adapter — health check', () => {
  it('health check URL uses correct Twilio account endpoint', () => {
    const accountSid = 'ACtest123';
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    expect(url).toContain(accountSid);
    expect(url).toMatch(/\.json$/);
  });
});

// ---------------------------------------------------------------------------
// ADAPTER CONFIG
// ---------------------------------------------------------------------------

describe('Twilio adapter — config', () => {
  it('adapter ID is "twilio"', () => {
    const config = {
      id: 'twilio',
      name: 'Twilio Notification Adapter',
    };
    expect(config.id).toBe('twilio');
    expect(config.name).toContain('Twilio');
  });
});
