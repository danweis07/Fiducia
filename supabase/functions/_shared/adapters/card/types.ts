/**
 * Card Management Adapter Interface
 *
 * Defines the port for card management operations including:
 *   - Card inquiry and search
 *   - Card status management (lock/unlock/hot card)
 *   - Spending limit configuration
 *   - Card transaction history
 *   - Card activation and reorder
 *
 * Implementations:
 *   - Jack Henry jXchange EFT Card Services (SOAP)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CARD TYPES
// =============================================================================

/** EFT card classification */
export type CardType = 'debit' | 'credit' | 'atm';

/** Card status — maps to jXchange EFTCardStatType canonical values */
export type CardStatus =
  | 'active'
  | 'inactive'
  | 'hot_card'       // Lost/stolen — blocked
  | 'warm_card'      // Suspected fraud — temporarily restricted
  | 'closed'
  | 'expired'
  | 'issued'         // Issued but not yet activated
  | 'order_in_process'
  | 'pin_mail'       // PIN mailed, awaiting activation
  | 'deposit_only';  // Restricted to deposit transactions only

/** Card transaction type from EFT history */
export type CardTransactionType =
  | 'pos'          // Point of sale
  | 'atm_withdrawal'
  | 'atm_deposit'
  | 'atm_inquiry'
  | 'transfer'
  | 'debit_card'
  | 'other';

/** Card transaction status */
export type CardTransactionStatus =
  | 'approved'
  | 'declined'
  | 'pending'
  | 'reversed'
  | 'settled';

// =============================================================================
// CARD DATA MODELS
// =============================================================================

export interface Card {
  /** Card number (masked — last 4 only) */
  cardNumberMasked: string;
  /** Card suffix number (identifies cardholder when multiple cards share a number) */
  cardSuffix: string | null;
  /** Card type */
  type: CardType;
  /** Current status */
  status: CardStatus;
  /** Product code */
  productCode: string | null;
  /** Product description */
  productDescription: string | null;
  /** Name embossed on card */
  embossedName: string;
  /** Secondary embossed name */
  secondaryEmbossedName: string | null;
  /** Customer ID */
  customerId: string;
  /** Card expiration date (ISO 8601) */
  expirationDate: string | null;
  /** Original issue date (ISO 8601) */
  originalIssueDate: string | null;
  /** Last activity date (ISO 8601) */
  lastActivityDate: string | null;
  /** ATM daily withdrawal limit in cents */
  atmDailyLimitCents: number | null;
  /** POS daily purchase limit in cents */
  posDailyLimitCents: number | null;
  /** Whether foreign transactions are allowed */
  foreignTransactionsAllowed: boolean;
  /** Whether digital wallet is allowed */
  digitalWalletAllowed: boolean;
  /** Number of invalid PIN attempts today */
  invalidPinAttempts: number;
}

export interface CardTransaction {
  /** Transaction sequence ID */
  transactionId: string;
  /** Card number (masked) */
  cardNumberMasked: string;
  /** Transaction type */
  type: CardTransactionType;
  /** Transaction status */
  status: CardTransactionStatus;
  /** Transaction amount in cents */
  amountCents: number;
  /** Merchant name (for POS transactions) */
  merchantName: string | null;
  /** Standard industry code (SIC/MCC) */
  merchantCategoryCode: string | null;
  /** Transaction date (ISO 8601) */
  transactionDate: string;
  /** Settlement date (ISO 8601) */
  settlementDate: string | null;
  /** Transaction description */
  description: string;
  /** Whether this is a recurring transaction */
  isRecurring: boolean;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListCardsRequest {
  tenantId: string;
  /** Customer ID to search cards for */
  customerId: string;
  /** Optional status filter */
  status?: CardStatus;
}

export interface ListCardsResponse {
  cards: Card[];
  total: number;
}

export interface GetCardRequest {
  tenantId: string;
  /** Full card number (will be passed securely, never logged) */
  cardNumber: string;
  cardSuffix?: string;
}

export interface LockCardRequest {
  tenantId: string;
  cardNumber: string;
  cardSuffix?: string;
  /** Lock reason — maps to ISO 8583 CardStatRsnType */
  reason: 'lost' | 'stolen' | 'fraud_suspected' | 'do_not_honor';
  /** Free-text reason message */
  reasonMessage?: string;
}

export interface UnlockCardRequest {
  tenantId: string;
  cardNumber: string;
  cardSuffix?: string;
}

export interface SetCardLimitRequest {
  tenantId: string;
  cardNumber: string;
  cardSuffix?: string;
  /** ATM daily withdrawal limit in cents (null = no change) */
  atmDailyLimitCents?: number | null;
  /** POS daily purchase limit in cents (null = no change) */
  posDailyLimitCents?: number | null;
  /** Temporary limit end date (ISO 8601, null = permanent) */
  temporaryEndDate?: string | null;
}

export interface ListCardTransactionsRequest {
  tenantId: string;
  cardNumber: string;
  cardSuffix?: string;
  /** Start date filter (ISO 8601) */
  startDate?: string;
  /** End date filter (ISO 8601) */
  endDate?: string;
  /** Max records to return */
  limit?: number;
}

export interface ListCardTransactionsResponse {
  transactions: CardTransaction[];
  total: number;
  hasMore: boolean;
}

export interface ActivateCardRequest {
  tenantId: string;
  cardNumber: string;
  cardSuffix?: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Card management adapter — abstracts EFT card operations.
 *
 * Implementations handle the specifics of each card processor's API
 * (jXchange SOAP, REST, etc.) while exposing a uniform interface.
 */
export interface CardAdapter extends BaseAdapter {
  /** List cards for a customer */
  listCards(request: ListCardsRequest): Promise<ListCardsResponse>;

  /** Get detailed card information */
  getCard(request: GetCardRequest): Promise<Card>;

  /** Lock a card (report lost/stolen/fraud) */
  lockCard(request: LockCardRequest): Promise<Card>;

  /** Unlock/reactivate a card */
  unlockCard(request: UnlockCardRequest): Promise<Card>;

  /** Set ATM/POS spending limits */
  setCardLimit(request: SetCardLimitRequest): Promise<Card>;

  /** Get card transaction history */
  listCardTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse>;

  /** Activate a newly issued card */
  activateCard(request: ActivateCardRequest): Promise<Card>;
}
