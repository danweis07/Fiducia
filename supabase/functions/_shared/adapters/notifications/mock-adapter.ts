/**
 * Mock Notification Adapter
 *
 * Sandbox/testing implementation that logs notifications to console
 * and returns success responses without actually delivering.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  NotificationAdapter,
  SendNotificationRequest,
  SendNotificationResponse,
  SendBulkNotificationRequest,
  SendBulkNotificationResponse,
} from './types.ts';

export class MockNotificationAdapter implements NotificationAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-notifications',
    name: 'Mock Notification Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async send(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    console.warn(`[mock-notifications] Sending ${request.channels.join(',')} to user ${request.recipient.userId}: ${request.payload.template}`);

    const messageIds: Partial<Record<string, string>> = {};
    const statuses: Partial<Record<string, string>> = {};

    for (const channel of request.channels) {
      messageIds[channel] = `mock_${crypto.randomUUID().slice(0, 8)}`;
      statuses[channel] = 'sent';
    }

    return {
      messageIds: messageIds as SendNotificationResponse['messageIds'],
      statuses: statuses as SendNotificationResponse['statuses'],
    };
  }

  async sendBulk(request: SendBulkNotificationRequest): Promise<SendBulkNotificationResponse> {
    console.warn(`[mock-notifications] Bulk send ${request.channels.join(',')} to ${request.recipients.length} recipients: ${request.payload.template}`);

    return {
      totalSent: request.recipients.length,
      totalFailed: 0,
      failures: [],
    };
  }
}
