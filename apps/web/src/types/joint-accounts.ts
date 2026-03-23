/**
 * Joint Account Management Types
 *
 * Joint account owners and invitations.
 */

// =============================================================================
// JOINT ACCOUNT MANAGEMENT
// =============================================================================

export type JointOwnerPermission = "full" | "view_only" | "limited";
export type JointOwnerRelationship = "spouse" | "child" | "parent" | "business_partner" | "other";
export type JointInvitationStatus = "pending" | "accepted" | "declined" | "expired" | "cancelled";

export interface JointAccountOwner {
  id: string;
  accountId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship: JointOwnerRelationship;
  permissions: JointOwnerPermission;
  isPrimary: boolean;
  addedAt: string;
}

export interface JointAccountInvitation {
  id: string;
  accountId: string;
  accountMasked: string;
  inviterName: string;
  inviteeName: string;
  inviteeEmail: string;
  relationship: JointOwnerRelationship;
  permissions: JointOwnerPermission;
  status: JointInvitationStatus;
  sentAt: string;
  respondedAt: string | null;
  expiresAt: string;
}
