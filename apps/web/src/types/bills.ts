/**
 * Bill Pay Types
 *
 * Bill payment entities including billers, payees, payments, and e-bills.
 * All monetary values are stored as integer cents.
 */

import type { RecurringRule } from "./transfers";

// =============================================================================
// BILL PAY
// =============================================================================

export type BillStatus = "scheduled" | "processing" | "paid" | "failed" | "cancelled";

export interface Bill {
  id: string;
  tenantId: string;
  userId: string;
  payeeName: string;
  payeeAccountNumberMasked: string;
  amountCents: number;
  dueDate: string;
  status: BillStatus;
  autopay: boolean;
  recurringRule: RecurringRule | null;
  fromAccountId: string;
  paidAt: string | null;
  createdAt: string;
}

// =============================================================================
// BILL PAY (adapter-backed)
// =============================================================================

export interface BillerInfo {
  billerId: string;
  name: string;
  shortName?: string;
  category: string;
  logoUrl?: string;
  supportsEBill: boolean;
  supportsRushPayment: boolean;
  processingDays: number;
  enrollmentFields: BillerEnrollmentField[];
}

export interface BillerEnrollmentField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  pattern?: string;
  helpText?: string;
  maxLength?: number;
}

export interface BillPayPayee {
  payeeId: string;
  billerId: string;
  nickname?: string;
  billerName: string;
  category: string;
  accountNumberMasked: string;
  eBillStatus: string;
  nextDueDate?: string;
  nextAmountDueCents?: number;
  minimumPaymentCents?: number;
  accountBalanceCents?: number;
  logoUrl?: string;
  enrolledAt: string;
  autopayEnabled: boolean;
}

export interface BillPayPayment {
  paymentId: string;
  payeeId: string;
  fromAccountId: string;
  amountCents: number;
  scheduledDate: string;
  method: string;
  status: "scheduled" | "processing" | "paid" | "failed" | "cancelled";
  confirmationNumber?: string;
  paidAt?: string;
  createdAt: string;
}

export interface EBill {
  eBillId: string;
  payeeId: string;
  amountCents: number;
  minimumPaymentCents?: number;
  dueDate: string;
  statementDate: string;
  status: string;
  balanceCents?: number;
}
