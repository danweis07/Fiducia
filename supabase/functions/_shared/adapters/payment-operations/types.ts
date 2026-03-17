/**
 * Payment Operations Adapter Interface
 *
 * Defines the contract for payment operations and money movement orchestration.
 * Provides payment order management, counterparty management, reconciliation,
 * and multi-rail payment routing (ACH, wire, RTP, check).
 *
 * Providers: Modern Treasury
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// PAYMENT ORDER TYPES
// =============================================================================

export type PaymentOrderDirection = 'credit' | 'debit';
export type PaymentOrderType = 'ach' | 'wire' | 'rtp' | 'check' | 'eft';
export type PaymentOrderStatus =
  | 'pending_approval'
  | 'approved'
  | 'processing'
  | 'sent'
  | 'completed'
  | 'returned'
  | 'failed'
  | 'cancelled';

export type PaymentOrderPriority = 'normal' | 'high';

export interface PaymentOrder {
  paymentOrderId: string;
  direction: PaymentOrderDirection;
  type: PaymentOrderType;
  amountCents: number;
  currency: string;
  description: string;
  status: PaymentOrderStatus;
  priority: PaymentOrderPriority;
  originatingAccountId: string;
  receivingAccountId: string | null;
  counterpartyId: string | null;
  referenceNumbers: string[];
  effectiveDate: string | null;
  processAfterDate: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// COUNTERPARTY TYPES
// =============================================================================

export type CounterpartyType = 'business' | 'individual';

export interface CounterpartyAccount {
  accountNumber: string;
  accountNumberMasked: string;
  routingNumber: string;
  accountType: 'checking' | 'savings' | 'other';
}

export interface Counterparty {
  counterpartyId: string;
  name: string;
  type: CounterpartyType;
  email: string | null;
  accounts: CounterpartyAccount[];
  metadata: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RECONCILIATION TYPES
// =============================================================================

export type ReconciliationStatus = 'unreconciled' | 'reconciled' | 'partially_reconciled';

export interface ExpectedPayment {
  expectedPaymentId: string;
  amountLowerBoundCents: number;
  amountUpperBoundCents: number;
  direction: PaymentOrderDirection;
  description: string | null;
  status: ReconciliationStatus;
  counterpartyId: string | null;
  reconciledTransactionId: string | null;
  dateLowerBound: string | null;
  dateUpperBound: string | null;
  createdAt: string;
}

// =============================================================================
// LEDGER TYPES
// =============================================================================

export type LedgerEntryDirection = 'credit' | 'debit';
export type LedgerEntryStatus = 'pending' | 'posted' | 'archived';

export interface LedgerAccount {
  ledgerAccountId: string;
  name: string;
  normalBalance: LedgerEntryDirection;
  balanceCents: number;
  pendingBalanceCents: number;
  postedBalanceCents: number;
  currency: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface LedgerEntry {
  ledgerEntryId: string;
  ledgerAccountId: string;
  amountCents: number;
  direction: LedgerEntryDirection;
  status: LedgerEntryStatus;
  description: string | null;
  metadata: Record<string, string>;
  effectiveDate: string;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreatePaymentOrderRequest {
  userId: string;
  tenantId: string;
  order: {
    direction: PaymentOrderDirection;
    type: PaymentOrderType;
    amountCents: number;
    currency?: string;
    description: string;
    originatingAccountId: string;
    counterpartyId?: string;
    receivingAccountId?: string;
    priority?: PaymentOrderPriority;
    effectiveDate?: string;
    metadata?: Record<string, string>;
  };
}

export interface GetPaymentOrderRequest {
  userId: string;
  tenantId: string;
  paymentOrderId: string;
}

export interface ListPaymentOrdersRequest {
  userId: string;
  tenantId: string;
  status?: PaymentOrderStatus;
  direction?: PaymentOrderDirection;
  type?: PaymentOrderType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListPaymentOrdersResponse {
  orders: PaymentOrder[];
  total: number;
}

export interface CreateCounterpartyRequest {
  userId: string;
  tenantId: string;
  counterparty: {
    name: string;
    type: CounterpartyType;
    email?: string;
    accounts: CounterpartyAccount[];
    metadata?: Record<string, string>;
  };
}

export interface ListCounterpartiesRequest {
  userId: string;
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListCounterpartiesResponse {
  counterparties: Counterparty[];
  total: number;
}

export interface CreateExpectedPaymentRequest {
  userId: string;
  tenantId: string;
  expectedPayment: {
    amountLowerBoundCents: number;
    amountUpperBoundCents: number;
    direction: PaymentOrderDirection;
    description?: string;
    counterpartyId?: string;
    dateLowerBound?: string;
    dateUpperBound?: string;
  };
}

export interface ListExpectedPaymentsRequest {
  userId: string;
  tenantId: string;
  status?: ReconciliationStatus;
  limit?: number;
  offset?: number;
}

export interface ListExpectedPaymentsResponse {
  expectedPayments: ExpectedPayment[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface PaymentOperationsAdapter extends BaseAdapter {
  /** Create a payment order */
  createPaymentOrder(request: CreatePaymentOrderRequest): Promise<PaymentOrder>;

  /** Get a payment order by ID */
  getPaymentOrder(request: GetPaymentOrderRequest): Promise<PaymentOrder>;

  /** List payment orders */
  listPaymentOrders(request: ListPaymentOrdersRequest): Promise<ListPaymentOrdersResponse>;

  /** Create a counterparty */
  createCounterparty(request: CreateCounterpartyRequest): Promise<Counterparty>;

  /** List counterparties */
  listCounterparties(request: ListCounterpartiesRequest): Promise<ListCounterpartiesResponse>;

  /** Create an expected payment for reconciliation */
  createExpectedPayment(request: CreateExpectedPaymentRequest): Promise<ExpectedPayment>;

  /** List expected payments */
  listExpectedPayments(request: ListExpectedPaymentsRequest): Promise<ListExpectedPaymentsResponse>;
}
