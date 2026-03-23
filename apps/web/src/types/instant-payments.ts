/**
 * Instant Payments Domain Types
 *
 * Types for FedNow and RTP instant payment processing,
 * including Request for Payment (RfP) and ISO 20022 support.
 *
 * All monetary values are stored as integer cents.
 */

export type InstantPaymentRail = "fednow" | "rtp";
export type InstantPaymentDirection = "inbound" | "outbound";
export type InstantPaymentStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "rejected"
  | "returned"
  | "failed";
export type RfPStatus = "pending" | "accepted" | "declined" | "expired";

export interface InstantPayment {
  paymentId: string;
  networkMessageId: string | null;
  rail: InstantPaymentRail;
  direction: InstantPaymentDirection;
  status: InstantPaymentStatus;
  amountCents: number;
  currency: string;
  senderRoutingNumber: string;
  senderAccountMasked: string;
  senderName: string;
  receiverRoutingNumber: string;
  receiverAccountMasked: string;
  receiverName: string;
  description: string;
  rejectionReason: string | null;
  rejectionDetail: string | null;
  iso20022MessageType: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface RequestForPayment {
  rfpId: string;
  rail: InstantPaymentRail;
  status: RfPStatus;
  amountCents: number;
  currency: string;
  requesterName: string;
  requesterAccountMasked: string;
  payerName: string;
  description: string;
  expiresAt: string;
  createdAt: string;
  resultingPaymentId: string | null;
}

export interface InstantPaymentLimits {
  fednow: {
    perTransactionLimitCents: number;
    dailyLimitCents: number;
    feeCents: number;
  };
  rtp: {
    perTransactionLimitCents: number;
    dailyLimitCents: number;
    feeCents: number;
  };
}

export interface ReceiverEligibility {
  eligible: boolean;
  availableRails: InstantPaymentRail[];
  institutionName: string | null;
}

export interface ISO20022Export {
  xml: string;
  messageType: string;
  paymentId: string;
}
