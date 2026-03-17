// TODO: Provisional integration — not yet validated in production.
/**
 * Dosh Card-Linked Offers Adapter
 *
 * Integrates with the Dosh platform — a card-linked offers (CLO) provider
 * serving community banks, credit unions, and fintech platforms.
 *
 * Key differences from Cardlytics:
 *   - Broader merchant network for smaller FIs
 *   - Automatic cashback (no activation required for some offers)
 *   - Simple REST API
 *
 * Configuration:
 *   DOSH_API_KEY — API key
 *   DOSH_BASE_URL — Base URL (default: https://api.dosh.com)
 *   DOSH_PROGRAM_ID — Program identifier for this FI
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
// DOSH API TYPES
// =============================================================================

interface DoshOffer {
  id: string;
  merchant_id: string;
  merchant_name: string;
  merchant_logo?: string;
  merchant_category: string;
  title: string;
  description: string;
  reward_type: 'percent' | 'flat' | 'points';
  reward_amount: number;
  min_transaction_amount?: number;
  max_reward_amount?: number;
  status: 'available' | 'activated' | 'redeemed' | 'expired';
  expires_at: string;
  activated_at?: string;
  is_targeted: boolean;
  score: number;
  tags: string[];
  terms_url?: string;
  locations?: Array<{
    lat: number;
    lon: number;
    address?: string;
    city?: string;
    state?: string;
  }>;
}

interface DoshRedemption {
  id: string;
  offer_id: string;
  transaction_id: string;
  transaction_amount_cents: number;
  reward_amount_cents: number;
  reward_type: string;
  merchant_name: string;
  redeemed_at: string;
  payout_status: 'pending' | 'credited' | 'reversed';
}

// =============================================================================
// MAPPING
// =============================================================================

function mapDoshStatus(status: string): OfferStatus {
  switch (status) {
    case 'available':  return 'available';
    case 'activated':  return 'activated';
    case 'redeemed':   return 'redeemed';
    case 'expired':    return 'expired';
    default:           return 'available';
  }
}

function mapDoshOfferType(type: string): OfferType {
  switch (type) {
    case 'percent': return 'cashback_percent';
    case 'flat':    return 'cashback_flat';
    case 'points':  return 'bonus_points';
    default:        return 'cashback_percent';
  }
}

function mapToDoshOffer(offer: DoshOffer): MerchantOffer {
  return {
    offerId: offer.id,
    merchant: {
      merchantId: offer.merchant_id,
      name: offer.merchant_name,
      logoUrl: offer.merchant_logo,
      category: offer.merchant_category,
      locations: offer.locations?.map(l => ({
        latitude: l.lat,
        longitude: l.lon,
        address: l.address,
        city: l.city,
        state: l.state,
      })),
    },
    headline: offer.title,
    description: offer.description,
    offerType: mapDoshOfferType(offer.reward_type),
    rewardValue: offer.reward_amount,
    minimumSpendCents: offer.min_transaction_amount,
    maximumRewardCents: offer.max_reward_amount,
    status: mapDoshStatus(offer.status),
    expiresAt: offer.expires_at,
    activatedAt: offer.activated_at,
    termsUrl: offer.terms_url,
    isPersonalized: offer.is_targeted,
    relevanceScore: offer.score,
    tags: offer.tags,
  };
}

// =============================================================================
// ADAPTER
// =============================================================================

export class DoshAdapter implements CardOffersAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly programId: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'dosh',
    name: 'Dosh Card-Linked Offers',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor(apiKey?: string, baseUrl?: string, programId?: string) {
    this.apiKey = apiKey ?? Deno.env.get('DOSH_API_KEY') ?? '';
    this.baseUrl = baseUrl ?? Deno.env.get('DOSH_BASE_URL') ?? 'https://api.dosh.com';
    this.programId = programId ?? Deno.env.get('DOSH_PROGRAM_ID') ?? '';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Dosh adapter in sandbox mode — no API key configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Program-Id': this.programId,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Dosh API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Running in sandbox mode',
      };
    }

    try {
      await this.request('GET', '/v1/health');
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
      ...(request.status ? { status: request.status } : {}),
      ...(request.category ? { category: request.category } : {}),
      ...(request.latitude ? { lat: String(request.latitude) } : {}),
      ...(request.longitude ? { lon: String(request.longitude) } : {}),
      ...(request.radiusMiles ? { radius_miles: String(request.radiusMiles) } : {}),
      limit: String(request.limit ?? 20),
      offset: String(request.offset ?? 0),
    });

    const response = await this.request<{
      offers: DoshOffer[];
      total: number;
      nearby?: DoshOffer[];
    }>('GET', `/v1/offers?${params}`);

    return {
      offers: response.offers.map(mapToDoshOffer),
      totalCount: response.total,
      nearbyOffers: response.nearby?.map(mapToDoshOffer),
    };
  }

  async activateOffer(request: ActivateOfferRequest): Promise<ActivateOfferResponse> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().activateOffer(request);
    }

    const response = await this.request<{ offer: DoshOffer }>(
      'POST',
      `/v1/offers/${request.offerId}/activate`,
      { user_id: request.userId, card_id: request.cardId },
    );

    return { success: true, offer: mapToDoshOffer(response.offer) };
  }

  async deactivateOffer(request: DeactivateOfferRequest): Promise<void> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().deactivateOffer(request);
    }

    await this.request('POST', `/v1/offers/${request.offerId}/deactivate`, {
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
      ...(request.fromDate ? { from: request.fromDate } : {}),
      ...(request.toDate ? { to: request.toDate } : {}),
      limit: String(request.limit ?? 50),
    });

    const response = await this.request<{
      redemptions: DoshRedemption[];
      total_rewards_cents: number;
    }>('GET', `/v1/redemptions?${params}`);

    return {
      redemptions: response.redemptions.map(r => ({
        redemptionId: r.id,
        offerId: r.offer_id,
        transactionId: r.transaction_id,
        transactionAmountCents: r.transaction_amount_cents,
        rewardAmountCents: r.reward_amount_cents,
        rewardType: mapDoshOfferType(r.reward_type),
        merchantName: r.merchant_name,
        redeemedAt: r.redeemed_at,
        payoutStatus: r.payout_status,
      })),
      totalRewardsCents: response.total_rewards_cents,
    };
  }

  async getOfferSummary(request: GetOfferSummaryRequest): Promise<OfferSummary> {
    if (this.sandbox) {
      const { MockCardOffersAdapter } = await import('./mock-adapter.ts');
      return new MockCardOffersAdapter().getOfferSummary(request);
    }

    const response = await this.request<{
      available: number;
      activated: number;
      monthly_rewards_cents: number;
      total_rewards_cents: number;
      top_offers: DoshOffer[];
    }>('GET', `/v1/users/${request.userId}/summary`);

    return {
      availableCount: response.available,
      activatedCount: response.activated,
      monthlyRewardsCents: response.monthly_rewards_cents,
      totalRewardsCents: response.total_rewards_cents,
      topOffers: response.top_offers.map(mapToDoshOffer),
    };
  }
}
