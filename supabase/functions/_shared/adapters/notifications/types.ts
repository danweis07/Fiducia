/**
 * Notification Adapter Interface
 *
 * Defines the port for multi-channel notification delivery including:
 *   - Push notifications (FCM/APNS)
 *   - Email (transactional)
 *   - SMS
 *   - In-app notifications
 *
 * Implementations:
 *   - Braze (multi-channel marketing + transactional)
 *   - Twilio (SMS via Programmable SMS, email via SendGrid)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'critical';

export type NotificationStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'bounced';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface NotificationRecipient {
  /** User ID in our system */
  userId: string;
  /** Tenant ID for multi-tenant routing */
  tenantId: string;
  /** Email address (for email channel) */
  email?: string;
  /** Phone number E.164 format (for SMS channel) */
  phone?: string;
  /** Push token (for push channel) */
  pushToken?: string;
  /** External ID in the notification provider (e.g., Braze external_id) */
  externalId?: string;
}

export interface NotificationPayload {
  /** Template identifier (e.g., 'fraud_alert', 'transfer_confirmed') */
  template: string;
  /** Template variables for personalization */
  templateData: Record<string, unknown>;
  /** Notification title (for push/in-app) */
  title?: string;
  /** Notification body (plain text fallback) */
  body?: string;
  /** Deep link URL (for push/in-app) */
  deepLink?: string;
  /** Category for grouping (e.g., 'fraud', 'transaction', 'account') */
  category?: string;
}

export interface SendNotificationRequest {
  tenantId: string;
  recipient: NotificationRecipient;
  channels: NotificationChannel[];
  payload: NotificationPayload;
  priority: NotificationPriority;
  /** Idempotency key to prevent duplicate sends */
  idempotencyKey?: string;
  /** Schedule for future delivery (ISO 8601) */
  scheduledAt?: string;
}

export interface SendNotificationResponse {
  /** Provider-assigned message IDs per channel */
  messageIds: Partial<Record<NotificationChannel, string>>;
  /** Status per channel */
  statuses: Partial<Record<NotificationChannel, NotificationStatus>>;
}

export interface SendBulkNotificationRequest {
  tenantId: string;
  recipients: NotificationRecipient[];
  channels: NotificationChannel[];
  payload: NotificationPayload;
  priority: NotificationPriority;
}

export interface SendBulkNotificationResponse {
  totalSent: number;
  totalFailed: number;
  failures: Array<{ userId: string; channel: NotificationChannel; error: string }>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Notification adapter — abstracts multi-channel notification delivery.
 *
 * Implementations handle provider-specific APIs (Braze REST, Twilio, etc.)
 * while exposing a uniform interface for the autonomous executor.
 */
export interface NotificationAdapter extends BaseAdapter {
  /** Send a notification to a single recipient across specified channels */
  send(request: SendNotificationRequest): Promise<SendNotificationResponse>;

  /** Send a notification to multiple recipients (batch) */
  sendBulk(request: SendBulkNotificationRequest): Promise<SendBulkNotificationResponse>;
}
