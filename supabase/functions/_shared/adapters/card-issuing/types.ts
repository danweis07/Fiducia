/**
 * Card Issuing Adapter Interface
 *
 * Defines the contract for modern card issuing and spend management.
 * Provides virtual/physical card creation, spending controls,
 * transaction authorization, and expense categorization.
 *
 * Providers: Lithic, Brex, Ramp
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// CARD TYPES
// =============================================================================

export type IssuedCardType = 'virtual' | 'physical';
export type IssuedCardStatus = 'active' | 'paused' | 'closed' | 'pending_activation' | 'pending_fulfillment';
export type IssuedCardNetwork = 'visa' | 'mastercard';

export interface IssuedCard {
  cardId: string;
  externalId?: string;
  type: IssuedCardType;
  status: IssuedCardStatus;
  network: IssuedCardNetwork;
  lastFour: string;
  cardholderName: string;
  expirationMonth: number;
  expirationYear: number;
  fundingAccountId: string;
  spendLimitCents: number;
  spendLimitInterval: SpendLimitInterval;
  totalSpentCents: number;
  memo: string | null;
  metadata: Record<string, string>;
  createdAt: string;
  closedAt: string | null;
}

export type SpendLimitInterval = 'transaction' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';

// =============================================================================
// SPENDING CONTROLS
// =============================================================================

export interface SpendingControls {
  spendLimitCents: number;
  spendLimitInterval: SpendLimitInterval;
  allowedMerchantCategories: string[];
  blockedMerchantCategories: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  maxTransactionAmountCents: number | null;
}

// =============================================================================
// CARD TRANSACTION TYPES
// =============================================================================

export type CardTransactionType = 'authorization' | 'clearing' | 'refund' | 'reversal' | 'void';
export type CardTransactionStatus = 'pending' | 'settled' | 'declined' | 'reversed' | 'voided';
export type DeclineReason = 'spending_limit' | 'merchant_blocked' | 'country_blocked' | 'card_paused' | 'insufficient_funds' | 'other';

export interface CardTransaction {
  transactionId: string;
  cardId: string;
  type: CardTransactionType;
  amountCents: number;
  merchantName: string | null;
  merchantCategory: string | null;
  merchantCategoryCode: string | null;
  merchantCity: string | null;
  merchantCountry: string | null;
  status: CardTransactionStatus;
  declineReason: DeclineReason | null;
  authorizationCode: string | null;
  settledAt: string | null;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreateCardRequest {
  userId: string;
  tenantId: string;
  card: {
    type: IssuedCardType;
    fundingAccountId: string;
    cardholderName: string;
    memo?: string;
    spendLimitCents: number;
    spendLimitInterval: SpendLimitInterval;
    shippingAddress?: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    metadata?: Record<string, string>;
  };
}

export interface GetCardRequest {
  userId: string;
  tenantId: string;
  cardId: string;
}

export interface ListCardsRequest {
  userId: string;
  tenantId: string;
  status?: IssuedCardStatus;
  type?: IssuedCardType;
  limit?: number;
  offset?: number;
}

export interface ListCardsResponse {
  cards: IssuedCard[];
  total: number;
}

export interface UpdateCardRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  status?: 'active' | 'paused' | 'closed';
  memo?: string;
  spendLimitCents?: number;
  spendLimitInterval?: SpendLimitInterval;
  metadata?: Record<string, string>;
}

export interface UpdateSpendingControlsRequest {
  userId: string;
  tenantId: string;
  cardId: string;
  controls: Partial<SpendingControls>;
}

export interface ListCardTransactionsRequest {
  userId: string;
  tenantId: string;
  cardId?: string;
  status?: CardTransactionStatus;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface ListCardTransactionsResponse {
  transactions: CardTransaction[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface CardIssuingAdapter extends BaseAdapter {
  /** Create a new virtual or physical card */
  createCard(request: CreateCardRequest): Promise<IssuedCard>;

  /** Get card details */
  getCard(request: GetCardRequest): Promise<IssuedCard>;

  /** List cards */
  listCards(request: ListCardsRequest): Promise<ListCardsResponse>;

  /** Update card (status, limits, memo) */
  updateCard(request: UpdateCardRequest): Promise<IssuedCard>;

  /** Update spending controls for a card */
  updateSpendingControls(request: UpdateSpendingControlsRequest): Promise<IssuedCard>;

  /** List card transactions */
  listTransactions(request: ListCardTransactionsRequest): Promise<ListCardTransactionsResponse>;
}
