/**
 * Core Banking Adapter Interface
 *
 * Defines the contract for core banking system integration.
 * Provides account management, transaction processing, and transfer execution.
 * Primary open-source provider: Apache Fineract.
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

export type CoreAccountType =
  | 'checking' | 'savings' | 'money_market' | 'cd'
  | 'fixed_deposit' | 'recurring_deposit' | 'share' | 'loan';
export type CoreAccountStatus = 'active' | 'frozen' | 'closed' | 'pending';

export interface CoreAccount {
  accountId: string;
  externalId?: string;
  type: CoreAccountType;
  nickname: string | null;
  accountNumberMasked: string;
  routingNumber: string;
  currency: string;                    // ISO 4217 (default 'USD')
  iban: string | null;                 // EU/UK/international
  bic: string | null;                  // SWIFT/BIC
  sortCode: string | null;            // UK sort code
  balanceCents: number;
  availableBalanceCents: number;
  status: CoreAccountStatus;
  interestRateBps: number;
  openedAt: string;
  closedAt: string | null;
}

// =============================================================================
// TRANSACTION TYPES
// =============================================================================

export type CoreTransactionType =
  | 'debit' | 'credit' | 'transfer' | 'deposit'
  | 'withdrawal' | 'fee' | 'interest' | 'rdc_deposit'
  | 'bill_payment';

export type CoreTransactionStatus = 'pending' | 'posted' | 'declined' | 'reversed';

export interface CoreTransaction {
  transactionId: string;
  accountId: string;
  type: CoreTransactionType;
  amountCents: number;
  description: string;
  category: string | null;
  status: CoreTransactionStatus;
  merchantName: string | null;
  merchantCategory: string | null;
  runningBalanceCents: number | null;
  postedAt: string | null;
  createdAt: string;
}

// =============================================================================
// TRANSFER TYPES
// =============================================================================

export type CoreTransferStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type CoreTransferType = 'internal' | 'external' | 'wire';

export interface CoreTransferRequest {
  fromAccountId: string;
  toAccountId?: string;
  toBeneficiaryId?: string;
  type: CoreTransferType;
  amountCents: number;
  memo?: string;
  scheduledDate?: string;
}

export interface CoreTransferResult {
  transferId: string;
  status: CoreTransferStatus;
  fromAccountId: string;
  toAccountId: string | null;
  amountCents: number;
  processedAt: string | null;
  createdAt: string;
}

// =============================================================================
// CARD TYPES
// =============================================================================

export type CoreCardStatus = 'active' | 'locked' | 'lost' | 'stolen' | 'expired' | 'cancelled';

export interface CoreCard {
  cardId: string;
  accountId: string;
  type: 'debit' | 'credit';
  lastFour: string;
  cardholderName: string;
  status: CoreCardStatus;
  dailyLimitCents: number;
  singleTransactionLimitCents: number;
  expirationDate: string;
  isContactless: boolean;
  isVirtual: boolean;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListAccountsRequest {
  userId: string;
  tenantId: string;
  limit?: number;
  offset?: number;
}

export interface ListAccountsResponse {
  accounts: CoreAccount[];
  total: number;
}

export interface GetAccountRequest {
  userId: string;
  tenantId: string;
  accountId: string;
}

export interface ListTransactionsRequest {
  userId: string;
  tenantId: string;
  accountId?: string;
  type?: string;
  status?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ListTransactionsResponse {
  transactions: CoreTransaction[];
  total: number;
}

export interface CreateTransferRequest {
  userId: string;
  tenantId: string;
  transfer: CoreTransferRequest;
}

export interface ListCardsRequest {
  userId: string;
  tenantId: string;
}

export interface ListCardsResponse {
  cards: CoreCard[];
}

export interface LockCardRequest {
  userId: string;
  tenantId: string;
  cardId: string;
}

export interface SetCardLimitRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  dailyLimitCents: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface CoreBankingAdapter extends BaseAdapter {
  /** List accounts for a user */
  listAccounts(request: ListAccountsRequest): Promise<ListAccountsResponse>;

  /** Get a single account */
  getAccount(request: GetAccountRequest): Promise<CoreAccount>;

  /** List transactions */
  listTransactions(request: ListTransactionsRequest): Promise<ListTransactionsResponse>;

  /** Create a transfer */
  createTransfer(request: CreateTransferRequest): Promise<CoreTransferResult>;

  /** List cards */
  listCards(request: ListCardsRequest): Promise<ListCardsResponse>;

  /** Lock a card */
  lockCard(request: LockCardRequest): Promise<CoreCard>;

  /** Unlock a card */
  unlockCard(request: LockCardRequest): Promise<CoreCard>;

  /** Set card daily limit */
  setCardLimit(request: SetCardLimitRequest): Promise<CoreCard>;
}
