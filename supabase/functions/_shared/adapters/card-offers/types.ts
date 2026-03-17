/**
 * Card-Linked Offers (CLO) Adapter Interface
 *
 * Defines the contract for card-linked offer services that provide
 * personalized merchant offers and cashback rewards.
 * Providers: Cardlytics (Chase, BoA, Wells Fargo), Dosh.
 *
 * Key concepts:
 *   - Offers: "Spend $50 at Starbucks, get 5% back"
 *   - Activation: User explicitly opts into an offer
 *   - Redemption: Automatic cashback when qualifying purchase is detected
 *   - Presentment: Location/spending-based offer surfacing
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// OFFER TYPES
// =============================================================================

export type OfferStatus = 'available' | 'activated' | 'redeemed' | 'expired';

export type OfferType =
  | 'cashback_percent'      // "5% back"
  | 'cashback_flat'         // "$10 back"
  | 'bonus_points'          // "500 bonus points"
  | 'discount_percent'      // "15% off"
  | 'discount_flat';        // "$5 off"

export interface MerchantOffer {
  /** Offer ID */
  offerId: string;
  /** Merchant info */
  merchant: {
    merchantId: string;
    name: string;
    logoUrl?: string;
    category: string;
    /** Merchant locations for geo-targeting */
    locations?: MerchantLocation[];
  };
  /** Offer headline (e.g., "5% cash back at Starbucks") */
  headline: string;
  /** Detailed description */
  description: string;
  /** Offer type */
  offerType: OfferType;
  /** Reward value: percent (500 = 5%) or flat amount in cents */
  rewardValue: number;
  /** Minimum spend required in cents */
  minimumSpendCents?: number;
  /** Maximum reward in cents */
  maximumRewardCents?: number;
  /** Offer status for this user */
  status: OfferStatus;
  /** When the offer expires */
  expiresAt: string;
  /** When the offer was activated (if activated) */
  activatedAt?: string;
  /** Terms and conditions */
  termsUrl?: string;
  /** Whether this offer is personalized for the user */
  isPersonalized: boolean;
  /** Relevance score (0-100) for sorting */
  relevanceScore: number;
  /** Tags for filtering */
  tags: string[];
}

export interface MerchantLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  distance_miles?: number;
}

export interface OfferRedemption {
  /** Redemption ID */
  redemptionId: string;
  /** Offer that was redeemed */
  offerId: string;
  /** Transaction that triggered redemption */
  transactionId: string;
  /** Original transaction amount in cents */
  transactionAmountCents: number;
  /** Reward amount earned in cents */
  rewardAmountCents: number;
  /** Reward type */
  rewardType: OfferType;
  /** Merchant name */
  merchantName: string;
  /** When the reward was applied */
  redeemedAt: string;
  /** Status of the reward payout */
  payoutStatus: 'pending' | 'credited' | 'reversed';
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListOffersRequest {
  userId: string;
  tenantId: string;
  /** Filter by card ID (some offers are card-specific) */
  cardId?: string;
  /** Filter by status */
  status?: OfferStatus;
  /** Filter by category */
  category?: string;
  /** For geo-targeted offers */
  latitude?: number;
  longitude?: number;
  /** Radius in miles for nearby offers */
  radiusMiles?: number;
  limit?: number;
  offset?: number;
}

export interface ListOffersResponse {
  offers: MerchantOffer[];
  totalCount: number;
  /** Nearby offers (if location provided) */
  nearbyOffers?: MerchantOffer[];
}

export interface ActivateOfferRequest {
  userId: string;
  tenantId: string;
  offerId: string;
  /** Card to link this offer to */
  cardId: string;
}

export interface ActivateOfferResponse {
  success: boolean;
  offer: MerchantOffer;
}

export interface DeactivateOfferRequest {
  userId: string;
  offerId: string;
}

export interface ListRedemptionsRequest {
  userId: string;
  tenantId: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface ListRedemptionsResponse {
  redemptions: OfferRedemption[];
  totalRewardsCents: number;
}

export interface GetOfferSummaryRequest {
  userId: string;
  tenantId: string;
}

export interface OfferSummary {
  /** Total available offers */
  availableCount: number;
  /** Total activated offers */
  activatedCount: number;
  /** Total rewards earned this month in cents */
  monthlyRewardsCents: number;
  /** Total rewards earned all-time in cents */
  totalRewardsCents: number;
  /** Top recommended offers */
  topOffers: MerchantOffer[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface CardOffersAdapter extends BaseAdapter {
  /** List available offers for a user (with optional geo-filtering) */
  listOffers(request: ListOffersRequest): Promise<ListOffersResponse>;

  /** Activate an offer (opt-in) */
  activateOffer(request: ActivateOfferRequest): Promise<ActivateOfferResponse>;

  /** Deactivate an offer */
  deactivateOffer(request: DeactivateOfferRequest): Promise<void>;

  /** List offer redemptions/rewards history */
  listRedemptions(request: ListRedemptionsRequest): Promise<ListRedemptionsResponse>;

  /** Get offer summary (counts, totals, recommendations) */
  getOfferSummary(request: GetOfferSummaryRequest): Promise<OfferSummary>;
}
