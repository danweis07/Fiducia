// TODO: Provisional integration — not yet validated in production.
/**
 * Middesk KYB Adapter
 *
 * Integrates with Middesk — a business verification platform providing
 * automated business identity verification, registration lookups,
 * beneficial owner identification, and ongoing monitoring.
 *
 * Middesk API: https://docs.middesk.com
 *
 * Configuration:
 *   MIDDESK_API_KEY — API key for authentication
 *   MIDDESK_BASE_URL — Base URL (default: https://api.middesk.com/v1)
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  KYBAdapter,
  BusinessVerification,
  BusinessVerificationStatus,
  BusinessEntityType,
  RiskLevel,
  IdentityVerification,
  CreateBusinessVerificationRequest,
  GetBusinessVerificationRequest,
  ListBusinessVerificationsRequest,
  ListBusinessVerificationsResponse,
  CreateIdentityVerificationRequest,
  GetIdentityVerificationRequest,
  ListIdentityVerificationsRequest,
  ListIdentityVerificationsResponse,
} from './types.ts';

// =============================================================================
// MIDDESK API RESPONSE TYPES
// =============================================================================

interface MiddeskBusiness {
  id: string;
  name: string;
  status: string;
  review: { status: string; completed_at: string | null } | null;
  formation: {
    entity_type: string | null;
    state: string | null;
    date: string | null;
  } | null;
  tin: { tin: string | null; verified: boolean } | null;
  addresses: Array<{
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  }>;
  website: { url: string | null } | null;
  people: Array<{
    id: string;
    name: string;
    title: string | null;
    ownership_percentage: number | null;
    date_of_birth: string | null;
    ssn_last4: string | null;
    verification_status: string;
  }>;
  watchlist: {
    hits: Array<{
      list_name: string;
      entity_name: string;
      match_score: number;
      details: string;
    }>;
  } | null;
  documents: Array<{
    id: string;
    type: string;
    status: string;
    filename: string | null;
    created_at: string;
  }>;
  risk_profile: {
    level: string;
    signals: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
  } | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapMiddeskStatus(status: string, reviewStatus: string | null): BusinessVerificationStatus {
  if (reviewStatus === 'approved') return 'approved';
  if (reviewStatus === 'rejected') return 'declined';
  if (reviewStatus === 'in_review') return 'in_review';
  switch (status) {
    case 'open': return 'in_review';
    case 'approved': return 'approved';
    case 'rejected': return 'declined';
    default: return 'pending';
  }
}

function mapMiddeskEntityType(type: string | null): BusinessEntityType | null {
  if (!type) return null;
  const lower = type.toLowerCase();
  if (lower.includes('corporation') || lower.includes('corp')) return 'corporation';
  if (lower.includes('llc') || lower.includes('limited liability')) return 'llc';
  if (lower.includes('partnership')) return 'partnership';
  if (lower.includes('sole') || lower.includes('proprietor')) return 'sole_proprietorship';
  if (lower.includes('nonprofit') || lower.includes('non-profit')) return 'nonprofit';
  return 'other';
}

function mapMiddeskRiskLevel(level: string): RiskLevel {
  switch (level) {
    case 'low': return 'low';
    case 'medium': return 'medium';
    case 'high': return 'high';
    case 'critical': return 'critical';
    default: return 'medium';
  }
}

function maskEIN(ein: string | null): string | null {
  if (!ein) return null;
  return `****${ein.slice(-4)}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MiddeskKYBAdapter implements KYBAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'middesk',
    name: 'Middesk KYB',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('MIDDESK_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('MIDDESK_BASE_URL') ?? 'https://api.middesk.com/v1';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Middesk adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Middesk API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/businesses?limit=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async createBusinessVerification(request: CreateBusinessVerificationRequest): Promise<BusinessVerification> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().createBusinessVerification(request);
    }

    const { business } = request;
    const response = await this.request<MiddeskBusiness>('POST', '/businesses', {
      name: business.businessName,
      tin: business.ein ? { tin: business.ein } : undefined,
      addresses: business.address ? [{
        address_line1: business.address.line1,
        address_line2: business.address.line2,
        city: business.address.city,
        state: business.address.state,
        postal_code: business.address.postalCode,
        country: business.address.country,
      }] : undefined,
      website: business.website ? { url: business.website } : undefined,
      people: business.beneficialOwners?.map(o => ({
        name: o.name,
        title: o.title,
        ownership_percentage: o.ownershipPercentage,
        date_of_birth: o.dateOfBirth,
      })),
    });

    return mapMiddeskBusiness(response);
  }

  async getBusinessVerification(request: GetBusinessVerificationRequest): Promise<BusinessVerification> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().getBusinessVerification(request);
    }

    const response = await this.request<MiddeskBusiness>('GET', `/businesses/${request.verificationId}`);
    return mapMiddeskBusiness(response);
  }

  async listBusinessVerifications(request: ListBusinessVerificationsRequest): Promise<ListBusinessVerificationsResponse> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().listBusinessVerifications(request);
    }

    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    const response = await this.request<{ data: MiddeskBusiness[]; total: number }>('GET', `/businesses?limit=${limit}&offset=${offset}`);

    return {
      verifications: response.data.map(mapMiddeskBusiness),
      total: response.total,
    };
  }

  async createIdentityVerification(_request: CreateIdentityVerificationRequest): Promise<IdentityVerification> {
    // Middesk is primarily for business verification, not individual identity
    // Delegate to Persona or another identity provider
    throw new Error('Identity verification not supported by Middesk — use Persona adapter for individual identity verification');
  }

  async getIdentityVerification(_request: GetIdentityVerificationRequest): Promise<IdentityVerification> {
    throw new Error('Identity verification not supported by Middesk — use Persona adapter');
  }

  async listIdentityVerifications(_request: ListIdentityVerificationsRequest): Promise<ListIdentityVerificationsResponse> {
    return { verifications: [], total: 0 };
  }
}

function mapMiddeskBusiness(b: MiddeskBusiness): BusinessVerification {
  const primaryAddress = b.addresses[0] ?? null;

  return {
    verificationId: b.id,
    status: mapMiddeskStatus(b.status, b.review?.status ?? null),
    businessName: b.name,
    legalName: b.name,
    entityType: mapMiddeskEntityType(b.formation?.entity_type ?? null),
    ein: null,
    einMasked: maskEIN(b.tin?.tin ?? null),
    stateOfIncorporation: b.formation?.state ?? null,
    dateOfIncorporation: b.formation?.date ?? null,
    registeredAddress: primaryAddress ? {
      line1: primaryAddress.address_line1,
      line2: primaryAddress.address_line2,
      city: primaryAddress.city,
      state: primaryAddress.state,
      postalCode: primaryAddress.postal_code,
      country: primaryAddress.country,
    } : null,
    website: b.website?.url ?? null,
    riskLevel: b.risk_profile ? mapMiddeskRiskLevel(b.risk_profile.level) : null,
    riskSignals: (b.risk_profile?.signals ?? []).map(s => ({
      signalType: s.type,
      severity: mapMiddeskRiskLevel(s.severity),
      description: s.description,
    })),
    documents: b.documents.map(d => ({
      documentId: d.id,
      type: d.type,
      status: d.status === 'verified' ? 'verified' as const : d.status === 'rejected' ? 'rejected' as const : 'pending' as const,
      fileName: d.filename,
      uploadedAt: d.created_at,
    })),
    beneficialOwners: b.people.map(p => ({
      ownerId: p.id,
      name: p.name,
      title: p.title,
      ownershipPercentage: p.ownership_percentage,
      dateOfBirth: null,
      ssnMasked: p.ssn_last4 ? `****${p.ssn_last4}` : null,
      verificationStatus: p.verification_status === 'verified' ? 'verified' as const : p.verification_status === 'failed' ? 'failed' as const : 'pending' as const,
    })),
    watchlistHits: (b.watchlist?.hits ?? []).map(h => ({
      listName: h.list_name,
      entityName: h.entity_name,
      matchScore: h.match_score,
      details: h.details,
    })),
    createdAt: b.created_at,
    updatedAt: b.updated_at,
    completedAt: b.review?.completed_at ?? null,
  };
}
