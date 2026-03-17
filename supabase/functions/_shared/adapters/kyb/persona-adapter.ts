// TODO: Provisional integration — not yet validated in production.
/**
 * Persona KYB Adapter
 *
 * Integrates with Persona — an identity verification platform providing
 * document verification, selfie matching, database checks, and ongoing
 * monitoring for both individuals and business owners.
 *
 * Persona API: https://docs.withpersona.com
 *
 * Configuration:
 *   PERSONA_API_KEY — API key for authentication
 *   PERSONA_BASE_URL — Base URL (default: https://withpersona.com/api/v1)
 *   PERSONA_TEMPLATE_ID — Default inquiry template ID
 *
 * Sandbox mode auto-enabled when no credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  KYBAdapter,
  BusinessVerification,
  IdentityVerification,
  IdentityVerificationStatus,
  VerificationCheckType,
  RiskLevel,
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
// PERSONA API RESPONSE TYPES
// =============================================================================

interface PersonaInquiry {
  type: string;
  id: string;
  attributes: {
    status: string;
    reference_id: string | null;
    name_first: string | null;
    name_last: string | null;
    email_address: string | null;
    phone_number: string | null;
    birthdate: string | null;
    address_street_1: string | null;
    address_street_2: string | null;
    address_city: string | null;
    address_subdivision: string | null;
    address_postal_code: string | null;
    address_country_code: string | null;
    created_at: string;
    completed_at: string | null;
    expired_at: string | null;
  };
  relationships: {
    verifications: { data: Array<{ type: string; id: string }> };
  };
}

interface PersonaVerification {
  type: string;
  id: string;
  attributes: {
    status: string;
    checks: Array<{
      name: string;
      status: string;
      reasons: string[];
    }>;
    created_at: string;
  };
}

// =============================================================================
// MAPPING HELPERS
// =============================================================================

function mapPersonaStatus(status: string): IdentityVerificationStatus {
  switch (status) {
    case 'completed': return 'passed';
    case 'approved': return 'passed';
    case 'declined': return 'failed';
    case 'failed': return 'failed';
    case 'needs_review': return 'needs_review';
    case 'expired': return 'expired';
    case 'created': return 'pending';
    case 'pending': return 'pending';
    default: return 'pending';
  }
}

function mapPersonaCheckType(checkName: string): VerificationCheckType {
  const lower = checkName.toLowerCase();
  if (lower.includes('document') || lower.includes('id_') || lower.includes('passport')) return 'document';
  if (lower.includes('selfie') || lower.includes('liveness') || lower.includes('face')) return 'selfie';
  if (lower.includes('phone')) return 'phone';
  if (lower.includes('address')) return 'address';
  return 'database';
}

function mapPersonaRiskLevel(status: string): RiskLevel | null {
  switch (status) {
    case 'approved':
    case 'completed': return 'low';
    case 'needs_review': return 'medium';
    case 'declined':
    case 'failed': return 'high';
    default: return null;
  }
}

function maskSSN(ssn: string | undefined | null): string | null {
  if (!ssn) return null;
  return `****${ssn.slice(-4)}`;
}

// =============================================================================
// ADAPTER
// =============================================================================

export class PersonaKYBAdapter implements KYBAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly templateId: string;
  private readonly sandbox: boolean;

  readonly config: AdapterConfig = {
    id: 'persona',
    name: 'Persona Identity Verification',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiKey = Deno.env.get('PERSONA_API_KEY') ?? '';
    this.baseUrl = Deno.env.get('PERSONA_BASE_URL') ?? 'https://withpersona.com/api/v1';
    this.templateId = Deno.env.get('PERSONA_TEMPLATE_ID') ?? '';
    this.sandbox = !this.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (this.sandbox) {
      throw new Error('Persona adapter in sandbox mode — API key not configured');
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
        'Key-Inflection': 'snake_case',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Persona API error (${res.status}): ${errBody}`);
    }

    return res.json();
  }

  async healthCheck(): Promise<AdapterHealth> {
    if (this.sandbox) {
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString(), errorMessage: 'Running in sandbox mode' };
    }

    try {
      await this.request('GET', '/inquiries?page[size]=1');
      return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
    } catch (err) {
      return { adapterId: this.config.id, healthy: false, circuitState: 'open', lastCheckedAt: new Date().toISOString(), errorMessage: err instanceof Error ? err.message : 'Health check failed' };
    }
  }

  async createBusinessVerification(_request: CreateBusinessVerificationRequest): Promise<BusinessVerification> {
    // Persona is primarily for individual identity verification.
    // For business verification, use Middesk adapter.
    throw new Error('Business verification not supported by Persona — use Middesk adapter for business KYB');
  }

  async getBusinessVerification(_request: GetBusinessVerificationRequest): Promise<BusinessVerification> {
    throw new Error('Business verification not supported by Persona — use Middesk adapter');
  }

  async listBusinessVerifications(_request: ListBusinessVerificationsRequest): Promise<ListBusinessVerificationsResponse> {
    return { verifications: [], total: 0 };
  }

  async createIdentityVerification(request: CreateIdentityVerificationRequest): Promise<IdentityVerification> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().createIdentityVerification(request);
    }

    const { identity } = request;
    const response = await this.request<{ data: PersonaInquiry }>('POST', '/inquiries', {
      data: {
        attributes: {
          inquiry_template_id: this.templateId || undefined,
          reference_id: identity.referenceId,
          name_first: identity.firstName,
          name_last: identity.lastName,
          email_address: identity.emailAddress,
          phone_number: identity.phoneNumber,
          birthdate: identity.dateOfBirth,
          address_street_1: identity.address?.line1,
          address_street_2: identity.address?.line2,
          address_city: identity.address?.city,
          address_subdivision: identity.address?.state,
          address_postal_code: identity.address?.postalCode,
          address_country_code: identity.address?.country,
        },
      },
    });

    return mapPersonaInquiry(response.data, identity.ssn);
  }

  async getIdentityVerification(request: GetIdentityVerificationRequest): Promise<IdentityVerification> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().getIdentityVerification(request);
    }

    const response = await this.request<{ data: PersonaInquiry; included: PersonaVerification[] }>(
      'GET',
      `/inquiries/${request.verificationId}?include=verifications`,
    );

    const inquiry = response.data;
    const verificationChecks = (response.included ?? []).flatMap(v =>
      v.attributes.checks.map(c => ({
        checkType: mapPersonaCheckType(c.name),
        status: c.status === 'passed' ? 'passed' as const : c.status === 'failed' ? 'failed' as const : 'pending' as const,
        reasons: c.reasons,
      })),
    );

    const result = mapPersonaInquiry(inquiry, undefined);
    if (verificationChecks.length > 0) {
      result.checks = verificationChecks;
    }

    return result;
  }

  async listIdentityVerifications(request: ListIdentityVerificationsRequest): Promise<ListIdentityVerificationsResponse> {
    if (this.sandbox) {
      const { MockKYBAdapter } = await import('./mock-adapter.ts');
      return new MockKYBAdapter().listIdentityVerifications(request);
    }

    const limit = request.limit ?? 50;
    let path = `/inquiries?page[size]=${limit}`;
    if (request.referenceId) path += `&filter[reference_id]=${request.referenceId}`;

    const response = await this.request<{ data: PersonaInquiry[] }>('GET', path);

    const verifications = response.data.map(inq => mapPersonaInquiry(inq, undefined));
    const filtered = request.status
      ? verifications.filter(v => v.status === request.status)
      : verifications;

    const offset = request.offset ?? 0;
    return {
      verifications: filtered.slice(offset, offset + limit),
      total: filtered.length,
    };
  }
}

function mapPersonaInquiry(inq: PersonaInquiry, ssn: string | undefined | null): IdentityVerification {
  const attrs = inq.attributes;
  return {
    verificationId: inq.id,
    status: mapPersonaStatus(attrs.status),
    referenceId: attrs.reference_id,
    firstName: attrs.name_first,
    lastName: attrs.name_last,
    emailAddress: attrs.email_address,
    phoneNumber: attrs.phone_number,
    dateOfBirth: attrs.birthdate,
    ssnMasked: maskSSN(ssn),
    address: attrs.address_street_1 ? {
      line1: attrs.address_street_1,
      line2: attrs.address_street_2,
      city: attrs.address_city ?? '',
      state: attrs.address_subdivision ?? '',
      postalCode: attrs.address_postal_code ?? '',
      country: attrs.address_country_code ?? 'US',
    } : null,
    checks: [
      { checkType: 'document' as VerificationCheckType, status: 'pending' as const, reasons: [] },
      { checkType: 'selfie' as VerificationCheckType, status: 'pending' as const, reasons: [] },
      { checkType: 'database' as VerificationCheckType, status: 'pending' as const, reasons: [] },
    ],
    riskLevel: mapPersonaRiskLevel(attrs.status),
    createdAt: attrs.created_at,
    completedAt: attrs.completed_at,
    expiresAt: attrs.expired_at,
  };
}
