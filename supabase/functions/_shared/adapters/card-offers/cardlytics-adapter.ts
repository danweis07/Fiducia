// TODO: Provisional integration — not yet validated in production.
/**
 * Cardlytics Card-Linked Offers Adapter
 *
 * Integrates with Cardlytics' Publisher API — the industry standard for
 * card-linked offers (CLO) used by Chase, Bank of America, and Wells Fargo.
 *
 * Key concepts:
 *   - Merchant Ingestion: Merchant catalog with logos, categories, locations
 *   - Offer Ingestion: Personalized offers based on spending behavior
 *   - Activation: User opts into an offer (links to their card)
 *   - Matched Offers: Offers matched to user's spending profile
 *
 * API Reference: Cardlytics Publisher API
 * Authentication: API Key + Publisher ID
 *
 * Configuration:
 *   CARDLYTICS_API_KEY — API key
 *   CARDLYTICS_PUBLISHER_ID — Publisher (FI) identifier
 *   CARDLYTICS_BASE_URL — Base URL
 *
 * Sandbox mode auto-enabled when no API key is configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  CardOffersAdapter,
  MerchantOffer,
  OfferStatus,
  OfferType,
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
// CARDLYTICS API TYPES
// =============================================================================

interface CardlyticsOffer {
  offer_id: string;
  merchant: {
    merchant_id: string;
    merchant_name: string;
    logo_url?: string;
    category: string;
    locations?: Array<{
      lat: number;
      lng: number;
      address?: string;
      city?: string;
      state?: string;
    }>;
  };
  headline: string;
  body_copy: string;
  reward_type: string;       // PERCENT_BACK | FLAT_BACK | BONUS_POINTS
  reward_value: number;
  minimum_spend?: number;
  maximum_reward?: number;
  activation_status: string; // AVAILABLE | ACTIVATED | REDEEMED | EXPIRED
  expiration_date: string;
  activated_date?: string;
  is_targeted: boolean;
  relevance_score: number;
  tags: string[];
  terms_url?: string;
}

interface CardlyticsRedemption {
  redemption_id: string;
  offer_id: string;
  transaction_id: string;
  transaction_amount: number;
  reward_amount: number;
  reward_type: string;
  merchant_name: string;
  redeemed_at: string;
  payout_status: string;
}

// =============================================================================
// MAPPING
// =============================================================================

function mapCardlyticsStatus(status: string): OfferStatus {
  switch (status) {
    case 'AVAILABLE':   return 'available';
    case 'ACTIVATED':   return 'activated';
    case 'REDEEMED':    return 'redeemed';
    case 'EXPIRED':     return 'expired';
    default:            return 'available';
  }
}

function mapCardlyticsOfferType(type: string): OfferType {
  switch (type) {
    case 'PERCENT_BACK':  return 'cashback_percent';
    case 'FLAT_BACK':     return 'cashback_flat';
    case 'BONUS_POINTS':  return 'bonus_points';
    case 'PERCENT_OFF':   return 'discount_percent';
    case 'FLAT_OFF':      return 'discount_flat';
    default:              return 'cashback_percent';
  }
}

function mapToMerchantOffer(co: CardlyticsOffer): MerchantOffer {
  return {
    offerId: co.offer_id,
    merchant: {
      merchantId: co.merchant.merchant_id,
      name: co.merchant.merchant_name,
      logoUrl: co.merchant.logo_url,
      category: co.merchant.category,
      locations: co.merchant.locations?.map(l => ({
        latitude: l.lat,
        longitude: l.lng,
        address: l.address,
        city: l.city,
        state: l.state,
      })),
    },
    headline: co.headline,
    description: co.body_copy,
    offerType: mapCardlyticsOfferType(co.reward_type),
    rewardValue: co.reward_value,
    minimumSpendCents: co.minimum_spend ? Math.round(co.minimum_spend * 100) : undefined,
    maximumRewardCents: co.maximum_reward ? Math.round(co.maximum_reward * 100) : undefined,
    status: mapCardlyticsStatus(co.activation_status),
    expiresAt: co.expiration_date,
    activatedAt: co.activated_date,
    termsUrl: co.terms_url,
    isPersonalized: co.is_targeted,
    relevanceScore: co.relevance_score,
    tags: co.tags,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class CardlyticsAdapter implements CardOffersAdapter {
  private readonly apiKey: string;
  private readonly publisherId: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'cardlytics',
    name: 'Cardlytics Publisher (CLO)',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(apiKey?: string, publisherId?: string, baseUrl?: string) {
    this.apiKey = apiKey ?? Deno.env.get('CARDLYTICS_API_KEY') ?? '';
    this.publisherId = publisherId ?? Deno.env.get('CARDLYTICS_PUBLISHER_ID') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('CARDLYTICS_BASE_URL') ?? 'https://api.cardlytics.com';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Cardlytics adapter in sandbox mode — no API key configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.apiKey,
        'X-Publisher-Id': this.publisherId,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Cardlytics API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/publisher/v1/health');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Failed' };
    }
  }

  async listOffers(request: ListOffersRequest): Promise<ListOffersResponse> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().listOffers(request);
    }

    const params = new URLSearchParams({
      user_id: request.userId,
      ...(request.cardId ? { card_id: request.cardId } : {}),
      ...(request.status ? { status: request.status.toUpperCase() } : {}),
      ...(request.category ? { category: request.category } : {}),
      ...(request.latitude ? { lat: String(request.latitude) } : {}),
      ...(request.longitude ? { lng: String(request.longitude) } : {}),
      ...(request.radiusMiles ? { radius: String(request.radiusMiles) } : {}),
      limit: String(request.limit ?? 20),
      offset: String(request.offset ?? 0),
    });

    const response = await this.request<{
      offers: CardlyticsOffer[];
      total_count: number;
      nearby_offers?: CardlyticsOffer[];
    }>('GET', `/publisher/v1/offers?${params}`);

    return {
      offers: response.offers.map(mapToMerchantOffer),
      totalCount: response.total_count,
      nearbyOffers: response.nearby_offers?.map(mapToMerchantOffer),
    };
  }

  async activateOffer(request: ActivateOfferRequest): Promise<ActivateOfferResponse> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().activateOffer(request);
    }

    const response = await this.request<{ offer: CardlyticsOffer }>(
      'POST',
      `/publisher/v1/offers/${request.offerId}/activate`,
      { user_id: request.userId, card_id: request.cardId },
    );

    return {
      success: true,
      offer: mapToMerchantOffer(response.offer),
    };
  }

  async deactivateOffer(request: DeactivateOfferRequest): Promise<void> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().deactivateOffer(request);
    }

    await this.request('POST', `/publisher/v1/offers/${request.offerId}/deactivate`, {
      user_id: request.userId,
    });
  }

  async listRedemptions(request: ListRedemptionsRequest): Promise<ListRedemptionsResponse> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().listRedemptions(request);
    }

    const params = new URLSearchParams({
      user_id: request.userId,
      ...(request.fromDate ? { from_date: request.fromDate } : {}),
      ...(request.toDate ? { to_date: request.toDate } : {}),
      limit: String(request.limit ?? 50),
    });

    const response = await this.request<{
      redemptions: CardlyticsRedemption[];
      total_rewards: number;
    }>('GET', `/publisher/v1/redemptions?${params}`);

    return {
      redemptions: response.redemptions.map(r => ({
        redemptionId: r.redemption_id,
        offerId: r.offer_id,
        transactionId: r.transaction_id,
        transactionAmountCents: Math.round(r.transaction_amount * 100),
        rewardAmountCents: Math.round(r.reward_amount * 100),
        rewardType: mapCardlyticsOfferType(r.reward_type),
        merchantName: r.merchant_name,
        redeemedAt: r.redeemed_at,
        payoutStatus: r.payout_status as 'pending',
      })),
      totalRewardsCents: Math.round(response.total_rewards * 100),
    };
  }

  async getOfferSummary(request: GetOfferSummaryRequest): Promise<OfferSummary> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().getOfferSummary(request);
    }

    const response = await this.request<{
      available_count: number;
      activated_count: number;
      monthly_rewards: number;
      total_rewards: number;
      top_offers: CardlyticsOffer[];
    }>('GET', `/publisher/v1/users/${request.userId}/offer-summary`);

    return {
      availableCount: response.available_count,
      activatedCount: response.activated_count,
      monthlyRewardsCents: Math.round(response.monthly_rewards * 100),
      totalRewardsCents: Math.round(response.total_rewards * 100),
      topOffers: response.top_offers.map(mapToMerchantOffer),
    };
  }
}
