/**
 * Secure Messaging Types
 *
 * Message threads, messages, and departments.
 */

// =============================================================================
// SECURE MESSAGING
// =============================================================================

export type MessagePriority = "normal" | "urgent";
export type ThreadStatus = "open" | "closed" | "archived";

export interface MessageThread {
  id: string;
  subject: string;
  status: ThreadStatus;
  priority: MessagePriority;
  departmentId: string | null;
  departmentName: string | null;
  userId: string;
  lastMessageAt: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderType: "member" | "staff";
  body: string;
  attachmentIds: string[];
  isRead: boolean;
  createdAt: string;
}

export interface MessageDepartment {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}
