/**
 * Card-Linked Offers Types
 *
 * Merchant offers, redemptions, and summaries.
 * All monetary values are stored as integer cents.
 */

// =============================================================================
// CARD-LINKED OFFERS
// =============================================================================

export type OfferStatus = 'available' | 'activated' | 'redeemed' | 'expired';

export type OfferType =
  | 'cashback_percent' | 'cashback_flat' | 'bonus_points'
  | 'discount_percent' | 'discount_flat';

export interface MerchantOffer {
  offerId: string;
  merchant: {
    merchantId: string;
    name: string;
    logoUrl?: string;
    category: string;
    locations?: { latitude: number; longitude: number; city?: string; state?: string }[];
  };
  headline: string;
  description: string;
  offerType: OfferType;
  rewardValue: number;
  minimumSpendCents?: number;
  maximumRewardCents?: number;
  status: OfferStatus;
  expiresAt: string;
  activatedAt?: string;
  termsUrl?: string;
  isPersonalized: boolean;
  relevanceScore: number;
  tags: string[];
}

export interface OfferRedemption {
  redemptionId: string;
  offerId: string;
  transactionId: string;
  transactionAmountCents: number;
  rewardAmountCents: number;
  rewardType: OfferType;
  merchantName: string;
  redeemedAt: string;
  payoutStatus: 'pending' | 'credited' | 'reversed';
}

export interface OfferSummary {
  availableCount: number;
  activatedCount: number;
  monthlyRewardsCents: number;
  totalRewardsCents: number;
}
