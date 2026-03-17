/**
 * Treasury Adapter Interface
 *
 * Defines the contract for Banking-as-a-Service (BaaS) treasury integration.
 * Provides financial account management, ACH origination, wire transfers,
 * and ledger operations through modern API banking providers.
 *
 * Providers: Column, Increase, Mercury, Stripe Treasury
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// FINANCIAL ACCOUNT TYPES
// =============================================================================

export type TreasuryAccountType = 'checking' | 'savings' | 'treasury' | 'reserve';
export type TreasuryAccountStatus = 'active' | 'frozen' | 'closed' | 'pending_approval';

export interface TreasuryAccount {
  accountId: string;
  externalId?: string;
  type: TreasuryAccountType;
  name: string;
  accountNumberMasked: string;
  routingNumber: string;
  balanceCents: number;
  availableBalanceCents: number;
  holdAmountCents: number;
  status: TreasuryAccountStatus;
  currency: string;
  createdAt: string;
  closedAt: string | null;
}

// =============================================================================
// ACH TRANSFER TYPES
// =============================================================================

export type ACHDirection = 'credit' | 'debit';
export type ACHStatus = 'pending' | 'submitted' | 'processing' | 'settled' | 'returned' | 'failed' | 'cancelled';

export interface ACHTransferRequest {
  fromAccountId: string;
  toRoutingNumber: string;
  toAccountNumber: string;
  toAccountType: 'checking' | 'savings';
  direction: ACHDirection;
  amountCents: number;
  description: string;
  companyName?: string;
  companyDescriptiveDate?: string;
  effectiveDate?: string;
}

export interface ACHTransfer {
  transferId: string;
  fromAccountId: string;
  direction: ACHDirection;
  amountCents: number;
  description: string;
  status: ACHStatus;
  returnReasonCode: string | null;
  effectiveDate: string | null;
  settledAt: string | null;
  createdAt: string;
}

// =============================================================================
// WIRE TRANSFER TYPES
// =============================================================================

export type WireStatus = 'pending' | 'submitted' | 'completed' | 'reversed' | 'failed';
export type WireType = 'domestic' | 'international';

export interface WireTransferRequest {
  fromAccountId: string;
  type: WireType;
  amountCents: number;
  beneficiaryName: string;
  beneficiaryRoutingNumber: string;
  beneficiaryAccountNumber: string;
  beneficiaryBankName?: string;
  beneficiaryAddress?: string;
  memo?: string;
  swiftCode?: string;
}

export interface WireTransfer {
  wireId: string;
  fromAccountId: string;
  type: WireType;
  amountCents: number;
  beneficiaryName: string;
  status: WireStatus;
  imadNumber: string | null;
  omadNumber: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// =============================================================================
// BOOK TRANSFER TYPES (internal ledger movements)
// =============================================================================

export type BookTransferStatus = 'pending' | 'completed' | 'failed';

export interface BookTransferRequest {
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  description: string;
}

export interface BookTransfer {
  transferId: string;
  fromAccountId: string;
  toAccountId: string;
  amountCents: number;
  description: string;
  status: BookTransferStatus;
  createdAt: string;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export type TreasuryTransactionType = 'ach_credit' | 'ach_debit' | 'wire_credit' | 'wire_debit' | 'book_transfer' | 'fee' | 'interest' | 'adjustment';
export type TreasuryTransactionStatus = 'pending' | 'posted' | 'reversed';

export interface TreasuryTransaction {
  transactionId: string;
  accountId: string;
  type: TreasuryTransactionType;
  amountCents: number;
  description: string;
  status: TreasuryTransactionStatus;
  runningBalanceCents: number | null;
  postedAt: string | null;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListTreasuryAccountsRequest {
  userId: string;
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListTreasuryAccountsResponse {
  accounts: TreasuryAccount[];
  total: number;
}

export interface GetTreasuryAccountRequest {
  userId: string;
  tenantId: string;
  accountId: string;
}

export interface CreateACHTransferRequest {
  userId: string;
  tenantId: string;
  transfer: ACHTransferRequest;
}

export interface CreateWireTransferRequest {
  userId: string;
  tenantId: string;
  transfer: WireTransferRequest;
}

export interface CreateBookTransferRequest {
  userId: string;
  tenantId: string;
  transfer: BookTransferRequest;
}

export interface ListTreasuryTransactionsRequest {
  userId: string;
  tenantId: string;
  accountId?: string;
  type?: TreasuryTransactionType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListTreasuryTransactionsResponse {
  transactions: TreasuryTransaction[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface TreasuryAdapter extends BaseAdapter {
  /** List treasury accounts */
  listAccounts(request: ListTreasuryAccountsRequest): Promise<ListTreasuryAccountsResponse>;

  /** Get a single treasury account */
  getAccount(request: GetTreasuryAccountRequest): Promise<TreasuryAccount>;

  /** Originate an ACH transfer */
  createACHTransfer(request: CreateACHTransferRequest): Promise<ACHTransfer>;

  /** Initiate a wire transfer */
  createWireTransfer(request: CreateWireTransferRequest): Promise<WireTransfer>;

  /** Execute an internal book transfer */
  createBookTransfer(request: CreateBookTransferRequest): Promise<BookTransfer>;

  /** List transactions on treasury accounts */
  listTransactions(request: ListTreasuryTransactionsRequest): Promise<ListTreasuryTransactionsResponse>;
}
