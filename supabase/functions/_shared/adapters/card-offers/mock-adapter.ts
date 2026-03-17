/**
 * Mock Card-Linked Offers Adapter
 *
 * Sandbox implementation with realistic merchant offers,
 * cashback deals, and location-based presentment.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardOffersAdapter,
  MerchantOffer,
  OfferRedemption,
  ListOffersRequest,
  ListOffersResponse,
  ActivateOfferRequest,
  ActivateOfferResponse,
  DeactivateOfferRequest,
  ListRedemptionsRequest,
  ListRedemptionsResponse,
  GetOfferSummaryRequest,
  OfferSummary,
} from './types.ts';

// =============================================================================
// MOCK OFFER DATA
// =============================================================================

const MOCK_OFFERS: MerchantOffer[] = [
  {
    offerId: 'off_starbucks_5',
    merchant: { merchantId: 'mch_starbucks', name: 'Starbucks', logoUrl: 'https://logo.clearbit.com/starbucks.com', category: 'food_dining' },
    headline: '5% cash back at Starbucks',
    description: 'Earn 5% cash back on all purchases at Starbucks locations. Minimum spend $10.',
    offerType: 'cashback_percent',
    rewardValue: 500,
    minimumSpendCents: 1000,
    maximumRewardCents: 2500,
    status: 'available',
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    isPersonalized: true,
    relevanceScore: 95,
    tags: ['coffee', 'food', 'popular'],
  },
  {
    offerId: 'off_amazon_3',
    merchant: { merchantId: 'mch_amazon', name: 'Amazon', logoUrl: 'https://logo.clearbit.com/amazon.com', category: 'shopping' },
    headline: '3% cash back at Amazon',
    description: 'Get 3% back on Amazon.com purchases. Excludes Amazon Fresh and Whole Foods.',
    offerType: 'cashback_percent',
    rewardValue: 300,
    maximumRewardCents: 5000,
    status: 'available',
    expiresAt: new Date(Date.now() + 45 * 86400000).toISOString(),
    isPersonalized: true,
    relevanceScore: 92,
    tags: ['shopping', 'online', 'popular'],
  },
  {
    offerId: 'off_target_10',
    merchant: { merchantId: 'mch_target', name: 'Target', logoUrl: 'https://logo.clearbit.com/target.com', category: 'shopping', locations: [{ latitude: 37.7749, longitude: -122.4194, city: 'San Francisco', state: 'CA' }] },
    headline: '$10 back when you spend $75 at Target',
    description: 'Get $10 cash back on your next Target purchase of $75 or more.',
    offerType: 'cashback_flat',
    rewardValue: 1000,
    minimumSpendCents: 7500,
    status: 'available',
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    isPersonalized: false,
    relevanceScore: 85,
    tags: ['shopping', 'retail', 'in-store'],
  },
  {
    offerId: 'off_uber_15',
    merchant: { merchantId: 'mch_uber', name: 'Uber', logoUrl: 'https://logo.clearbit.com/uber.com', category: 'transportation' },
    headline: '15% off your next 3 Uber rides',
    description: 'Save 15% on your next 3 Uber rides. Maximum discount $5 per ride.',
    offerType: 'discount_percent',
    rewardValue: 1500,
    maximumRewardCents: 500,
    status: 'available',
    expiresAt: new Date(Date.now() + 21 * 86400000).toISOString(),
    isPersonalized: true,
    relevanceScore: 78,
    tags: ['transportation', 'rideshare'],
  },
  {
    offerId: 'off_wholefds_8',
    merchant: { merchantId: 'mch_wholefoods', name: 'Whole Foods Market', logoUrl: 'https://logo.clearbit.com/wholefoodsmarket.com', category: 'groceries', locations: [{ latitude: 37.7849, longitude: -122.4094, city: 'San Francisco', state: 'CA' }] },
    headline: '8% cash back at Whole Foods',
    description: 'Earn 8% back on all Whole Foods purchases. Great for weekly groceries!',
    offerType: 'cashback_percent',
    rewardValue: 800,
    maximumRewardCents: 4000,
    status: 'available',
    expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    isPersonalized: true,
    relevanceScore: 88,
    tags: ['groceries', 'food', 'organic'],
  },
  {
    offerId: 'off_chevron_10c',
    merchant: { merchantId: 'mch_chevron', name: 'Chevron', logoUrl: 'https://logo.clearbit.com/chevron.com', category: 'transportation', locations: [{ latitude: 37.7649, longitude: -122.4294, city: 'San Francisco', state: 'CA' }] },
    headline: '10¢ off per gallon at Chevron',
    description: 'Save 10 cents per gallon on fuel at any Chevron station.',
    offerType: 'discount_flat',
    rewardValue: 10,
    status: 'activated',
    activatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
    isPersonalized: false,
    relevanceScore: 72,
    tags: ['fuel', 'gas', 'transportation'],
  },
  {
    offerId: 'off_netflix_free',
    merchant: { merchantId: 'mch_netflix', name: 'Netflix', logoUrl: 'https://logo.clearbit.com/netflix.com', category: 'entertainment' },
    headline: '$5 back on your Netflix subscription',
    description: 'Get $5 cash back on your next Netflix billing cycle.',
    offerType: 'cashback_flat',
    rewardValue: 500,
    status: 'activated',
    activatedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    isPersonalized: true,
    relevanceScore: 90,
    tags: ['streaming', 'entertainment', 'subscription'],
  },
  {
    offerId: 'off_costco_2',
    merchant: { merchantId: 'mch_costco', name: 'Costco', logoUrl: 'https://logo.clearbit.com/costco.com', category: 'groceries' },
    headline: '2% extra cash back at Costco',
    description: 'Earn an additional 2% cash back on all Costco purchases on top of your regular rewards.',
    offerType: 'cashback_percent',
    rewardValue: 200,
    maximumRewardCents: 10000,
    status: 'available',
    expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    isPersonalized: false,
    relevanceScore: 82,
    tags: ['groceries', 'bulk', 'warehouse'],
  },
];

const MOCK_REDEMPTIONS: OfferRedemption[] = [
  {
    redemptionId: 'rdm_001',
    offerId: 'off_starbucks_5',
    transactionId: 'txn_sb_001',
    transactionAmountCents: 1250,
    rewardAmountCents: 63,
    rewardType: 'cashback_percent',
    merchantName: 'Starbucks',
    redeemedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    payoutStatus: 'credited',
  },
  {
    redemptionId: 'rdm_002',
    offerId: 'off_amazon_3',
    transactionId: 'txn_amz_001',
    transactionAmountCents: 8999,
    rewardAmountCents: 270,
    rewardType: 'cashback_percent',
    merchantName: 'Amazon',
    redeemedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    payoutStatus: 'credited',
  },
  {
    redemptionId: 'rdm_003',
    offerId: 'off_target_10',
    transactionId: 'txn_tgt_001',
    transactionAmountCents: 11234,
    rewardAmountCents: 1000,
    rewardType: 'cashback_flat',
    merchantName: 'Target',
    redeemedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    payoutStatus: 'pending',
  },
];

// In-memory activation store
const activatedOffers = new Set<string>(['off_chevron_10c', 'off_netflix_free']);

export class MockCardOffersAdapter implements CardOffersAdapter {
  readonly config: AdapterConfig = {
    id: 'mock',
    name: 'Mock Card-Linked Offers (Sandbox)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async listOffers(request: ListOffersRequest): Promise<ListOffersResponse> {
    let offers = [...MOCK_OFFERS];

    // Apply status filter
    if (request.status) {
      offers = offers.filter(o => o.status === request.status);
    }

    // Apply category filter
    if (request.category) {
      offers = offers.filter(o => o.merchant.category === request.category);
    }

    // Update activation status from in-memory store
    offers = offers.map(o => ({
      ...o,
      status: activatedOffers.has(o.offerId)
        ? (o.status === 'available' ? 'activated' : o.status)
        : o.status,
    }));

    // Nearby offers (if location provided)
    let nearbyOffers: MerchantOffer[] | undefined;
    if (request.latitude && request.longitude) {
      nearbyOffers = offers.filter(o =>
        o.merchant.locations?.some(loc => {
          const dist = haversineDistance(request.latitude!, request.longitude!, loc.latitude, loc.longitude);
          return dist <= (request.radiusMiles ?? 10);
        })
      );
    }

    // Sort by relevance
    offers.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const offset = request.offset ?? 0;
    const limit = request.limit ?? 20;

    return {
      offers: offers.slice(offset, offset + limit),
      totalCount: offers.length,
      nearbyOffers,
    };
  }

  async activateOffer(request: ActivateOfferRequest): Promise<ActivateOfferResponse> {
    activatedOffers.add(request.offerId);
    const offer = MOCK_OFFERS.find(o => o.offerId === request.offerId);
    if (!offer) throw new Error(`Offer not found: ${request.offerId}`);

    return {
      success: true,
      offer: { ...offer, status: 'activated', activatedAt: new Date().toISOString() },
    };
  }

  async deactivateOffer(request: DeactivateOfferRequest): Promise<void> {
    activatedOffers.delete(request.offerId);
  }

  async listRedemptions(request: ListRedemptionsRequest): Promise<ListRedemptionsResponse> {
    let redemptions = [...MOCK_REDEMPTIONS];
    const limit = request.limit ?? 50;

    if (request.fromDate) {
      redemptions = redemptions.filter(r => r.redeemedAt >= request.fromDate!);
    }

    return {
      redemptions: redemptions.slice(0, limit),
      totalRewardsCents: redemptions.reduce((s, r) => s + r.rewardAmountCents, 0),
    };
  }

  async getOfferSummary(_request: GetOfferSummaryRequest): Promise<OfferSummary> {
    return {
      availableCount: MOCK_OFFERS.filter(o => o.status === 'available').length,
      activatedCount: activatedOffers.size,
      monthlyRewardsCents: MOCK_REDEMPTIONS.reduce((s, r) => s + r.rewardAmountCents, 0),
      totalRewardsCents: 4250,
      topOffers: MOCK_OFFERS.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3),
    };
  }
}

// Haversine distance in miles
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
