/**
 * Notification Types
 *
 * Platform notification entities.
 */

// =============================================================================
// NOTIFICATIONS
// =============================================================================

export type NotificationType =
  | "transaction"
  | "transfer"
  | "bill_due"
  | "rdc_status"
  | "card_alert"
  | "security"
  | "system"
  | "promotional";

export interface Notification {
  id: string;
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}
