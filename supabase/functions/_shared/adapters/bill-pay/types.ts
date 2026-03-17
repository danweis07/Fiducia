/**
 * Bill Pay Adapter Interface
 *
 * Defines the contract for bill payment processing services.
 * Supports multiple providers: Fiserv (CheckFree), FIS (Metavante).
 *
 * All monetary values are integer cents.
 * Account numbers are always masked in responses.
 *
 * Core flows:
 *   1. Biller search → find payees (utility companies, credit cards, etc.)
 *   2. Payee enrollment → link a biller to user's account
 *   3. Payment scheduling → one-time or recurring payments
 *   4. Payment lifecycle → Scheduled → Processing → Paid / Failed
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// BILLER DIRECTORY
// =============================================================================

export interface Biller {
  /** Provider's biller ID */
  billerId: string;
  /** Biller name (e.g., "AT&T", "Pacific Gas & Electric") */
  name: string;
  /** Short name for display */
  shortName?: string;
  /** Biller category */
  category: BillerCategory;
  /** Biller logo URL (if available) */
  logoUrl?: string;
  /** Whether e-bill (electronic bill presentment) is supported */
  supportsEBill: boolean;
  /** Whether same-day / rush payments are supported */
  supportsRushPayment: boolean;
  /** Typical processing time in business days */
  processingDays: number;
  /** Required fields to enroll this biller */
  enrollmentFields: EnrollmentField[];
}

export type BillerCategory =
  | 'utilities'       // Electric, gas, water
  | 'telecom'         // Phone, internet, cable
  | 'insurance'       // Health, auto, home
  | 'credit_card'     // Credit cards
  | 'mortgage'        // Mortgage lenders
  | 'auto_loan'       // Auto loans
  | 'student_loan'    // Student loans
  | 'government'      // Tax, DMV, court
  | 'medical'         // Healthcare providers
  | 'subscription'    // Streaming, SaaS
  | 'other';

export interface EnrollmentField {
  /** Field identifier */
  name: string;
  /** Display label */
  label: string;
  /** Field type */
  type: 'text' | 'number' | 'email' | 'phone' | 'zip' | 'account_number';
  /** Whether the field is required */
  required: boolean;
  /** Validation regex pattern */
  pattern?: string;
  /** Help text */
  helpText?: string;
  /** Max length */
  maxLength?: number;
}

// =============================================================================
// PAYEES (ENROLLED BILLERS)
// =============================================================================

export interface Payee {
  /** Internal payee ID */
  payeeId: string;
  /** Reference to biller directory */
  billerId: string;
  /** User-assigned nickname */
  nickname?: string;
  /** Biller name */
  billerName: string;
  /** Category */
  category: BillerCategory;
  /** User's account number with the biller (masked) */
  accountNumberMasked: string;
  /** E-bill enrollment status */
  eBillStatus: 'not_enrolled' | 'pending' | 'active' | 'suspended';
  /** Next e-bill due date (if enrolled) */
  nextDueDate?: string;
  /** Next e-bill amount in cents (if known) */
  nextAmountDueCents?: number;
  /** Minimum payment in cents (for credit cards) */
  minimumPaymentCents?: number;
  /** Account balance in cents (if e-bill provides it) */
  accountBalanceCents?: number;
  /** Logo URL */
  logoUrl?: string;
  /** When this payee was enrolled */
  enrolledAt: string;
  /** Is autopay enabled */
  autopayEnabled: boolean;
}

// =============================================================================
// PAYMENTS
// =============================================================================

export type PaymentStatus =
  | 'scheduled'      // Payment is scheduled for future date
  | 'processing'     // Payment is being processed
  | 'paid'           // Payment completed successfully
  | 'failed'         // Payment failed
  | 'canceled'       // Payment was canceled by user
  | 'returned';      // Payment was returned/bounced

export type PaymentMethod = 'electronic' | 'check' | 'rush';

export interface Payment {
  /** Internal payment ID */
  paymentId: string;
  /** Provider's payment ID */
  providerPaymentId: string;
  /** Payee this payment is for */
  payeeId: string;
  /** Source account for payment */
  fromAccountId: string;
  /** Payment amount in cents */
  amountCents: number;
  /** Payment status */
  status: PaymentStatus;
  /** Scheduled payment date */
  scheduledDate: string;
  /** Actual processing date */
  processedDate?: string;
  /** Delivery date (when biller receives it) */
  deliveryDate?: string;
  /** Payment method */
  method: PaymentMethod;
  /** Confirmation number */
  confirmationNumber?: string;
  /** Memo/note */
  memo?: string;
  /** Recurring payment rule */
  recurringRule?: RecurringRule;
  /** When the payment was created */
  createdAt: string;
  /** Failure reason (if failed) */
  failureReason?: string;
}

export interface RecurringRule {
  /** Frequency */
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annually';
  /** Day of month (1-31) for monthly */
  dayOfMonth?: number;
  /** Day of week (0-6) for weekly */
  dayOfWeek?: number;
  /** End date (null = indefinite) */
  endDate?: string;
  /** Number of remaining payments */
  remainingPayments?: number;
}

// =============================================================================
// E-BILL
// =============================================================================

export interface EBill {
  /** E-bill ID */
  eBillId: string;
  /** Payee ID */
  payeeId: string;
  /** Bill amount in cents */
  amountCents: number;
  /** Minimum payment in cents */
  minimumPaymentCents?: number;
  /** Due date */
  dueDate: string;
  /** Statement date */
  statementDate: string;
  /** Status */
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  /** Balance in cents (for credit cards/revolving) */
  balanceCents?: number;
  /** Statement URL/reference */
  statementUrl?: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface SearchBillersRequest {
  /** Search query (biller name or category) */
  query: string;
  /** Filter by category */
  category?: BillerCategory;
  /** Zip code for regional billers */
  zipCode?: string;
  /** Max results */
  limit?: number;
}

export interface SearchBillersResponse {
  billers: Biller[];
  totalCount: number;
}

export interface EnrollPayeeRequest {
  /** Biller ID from directory */
  billerId: string;
  /** User's account number with the biller */
  accountNumber: string;
  /** Optional nickname */
  nickname?: string;
  /** Additional enrollment fields (biller-specific) */
  enrollmentFields?: Record<string, string>;
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId: string;
}

export interface EnrollPayeeResponse {
  payee: Payee;
}

export interface ListPayeesRequest {
  userId: string;
  tenantId: string;
}

export interface ListPayeesResponse {
  payees: Payee[];
}

export interface SchedulePaymentRequest {
  /** Payee to pay */
  payeeId: string;
  /** Source account */
  fromAccountId: string;
  /** Amount in cents */
  amountCents: number;
  /** Scheduled date (YYYY-MM-DD) */
  scheduledDate: string;
  /** Payment method preference */
  method?: PaymentMethod;
  /** Memo */
  memo?: string;
  /** Recurring rule (for recurring payments) */
  recurringRule?: RecurringRule;
  /** User ID */
  userId: string;
  /** Tenant ID */
  tenantId: string;
}

export interface SchedulePaymentResponse {
  payment: Payment;
}

export interface CancelPaymentRequest {
  paymentId: string;
  providerPaymentId: string;
}

export interface CancelPaymentResponse {
  success: boolean;
  payment: Payment;
}

export interface GetPaymentStatusRequest {
  paymentId: string;
  providerPaymentId: string;
}

export interface ListPaymentsRequest {
  userId: string;
  tenantId: string;
  payeeId?: string;
  status?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentsResponse {
  payments: Payment[];
  totalCount: number;
}

export interface ListEBillsRequest {
  userId: string;
  tenantId: string;
  payeeId?: string;
  status?: 'unpaid' | 'paid' | 'overdue';
}

export interface ListEBillsResponse {
  eBills: EBill[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface BillPayAdapter extends BaseAdapter {
  /** Search the biller directory */
  searchBillers(request: SearchBillersRequest): Promise<SearchBillersResponse>;

  /** Enroll a payee (link a biller to user's account) */
  enrollPayee(request: EnrollPayeeRequest): Promise<EnrollPayeeResponse>;

  /** List user's enrolled payees */
  listPayees(request: ListPayeesRequest): Promise<ListPayeesResponse>;

  /** Schedule a payment (one-time or recurring) */
  schedulePayment(request: SchedulePaymentRequest): Promise<SchedulePaymentResponse>;

  /** Cancel a scheduled payment */
  cancelPayment(request: CancelPaymentRequest): Promise<CancelPaymentResponse>;

  /** Get payment status */
  getPaymentStatus(request: GetPaymentStatusRequest): Promise<Payment>;

  /** List payment history */
  listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse>;

  /** List e-bills for enrolled payees */
  listEBills(request: ListEBillsRequest): Promise<ListEBillsResponse>;
}
