/**
 * Loan Types
 *
 * Loan entities, products, schedules, payments, and origination.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// LOAN PRODUCTS
// =============================================================================

export type LoanType =
  | "personal"
  | "auto"
  | "mortgage"
  | "heloc"
  | "credit_builder"
  | "student"
  | "business"
  | "line_of_credit"
  | "other";

export type RateType = "fixed" | "variable";

export interface LoanProduct {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  loanType: LoanType;
  interestRateBps: number;
  rateType: RateType;
  minTermMonths: number;
  maxTermMonths: number;
  minAmountCents: number;
  maxAmountCents: number;
  originationFeeBps: number;
  latePaymentFeeCents: number;
  latePaymentGraceDays: number;
  isActive: boolean;
}

// =============================================================================
// LOANS
// =============================================================================

export type LoanStatus =
  | "pending"
  | "approved"
  | "active"
  | "delinquent"
  | "default"
  | "paid_off"
  | "closed"
  | "charged_off";

export interface Loan {
  id: string;
  userId: string;
  productId: string;
  productName?: string;
  loanNumberMasked: string;
  principalCents: number;
  interestRateBps: number;
  termMonths: number;
  disbursedAt: string | null;
  outstandingBalanceCents: number;
  principalPaidCents: number;
  interestPaidCents: number;
  nextPaymentDueDate: string | null;
  nextPaymentAmountCents: number | null;
  paymentsRemaining: number | null;
  autopayAccountId: string | null;
  status: LoanStatus;
  daysPastDue: number;
  firstPaymentDate: string | null;
  maturityDate: string | null;
  paidOffAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LoanScheduleStatus = "upcoming" | "due" | "paid" | "partial" | "late" | "waived";

export interface LoanScheduleItem {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  principalCents: number;
  interestCents: number;
  feeCents: number;
  totalCents: number;
  paidCents: number;
  paidAt: string | null;
  status: LoanScheduleStatus;
}

export type LoanPaymentMethod = "internal" | "external_ach" | "check" | "cash" | "autopay";
export type LoanPaymentStatus = "pending" | "processing" | "completed" | "failed" | "reversed";

export interface LoanPayment {
  id: string;
  loanId: string;
  amountCents: number;
  principalPortionCents: number;
  interestPortionCents: number;
  feePortionCents: number;
  extraPrincipalCents: number;
  fromAccountId: string | null;
  paymentMethod: LoanPaymentMethod;
  status: LoanPaymentStatus;
  scheduledDate: string | null;
  processedAt: string | null;
  createdAt: string;
}

// =============================================================================
// LOAN ORIGINATION (LoanVantage)
// =============================================================================

export type LoanApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "approved"
  | "conditionally_approved"
  | "denied"
  | "withdrawn"
  | "funded";

export interface LoanApplicant {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  role: "primary" | "co_applicant" | "guarantor";
}

export interface LoanApplication {
  id: string;
  status: LoanApplicationStatus;
  productId: string;
  requestedAmountCents: number;
  approvedAmountCents?: number;
  termMonths?: number;
  interestRateBps?: number;
  applicants: LoanApplicant[];
  decisionDate?: string;
  decisionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DocumentEntityType = "Party" | "Loan";
export type DocumentEntityContext = "Applicant" | "Application";

export interface LoanDocumentEntity {
  id: string;
  context: DocumentEntityContext;
}

export interface LoanDocumentFile {
  fileName: string;
  fileContent: string;
}

export interface LoanOriginationDocument {
  idDocument: string;
  documentTemplateType: number;
  documentEntityType: DocumentEntityType;
  documentEntity: LoanDocumentEntity;
  statementDate?: string;
  dueDate?: string;
  requestedDate?: string;
  documentFile?: LoanDocumentFile;
}
