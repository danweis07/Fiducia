/**
 * Mock KYB Adapter
 *
 * Returns synthetic data for development and testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  KYBAdapter,
  BusinessVerification,
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

export class MockKYBAdapter implements KYBAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-kyb',
    name: 'Mock KYB',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
    };
  }

  async createBusinessVerification(request: CreateBusinessVerificationRequest): Promise<BusinessVerification> {
    return {
      verificationId: `bv_mock_${Date.now()}`,
      status: 'in_review',
      businessName: request.business.businessName,
      legalName: request.business.businessName,
      entityType: request.business.entityType ?? null,
      ein: null,
      einMasked: request.business.ein ? `****${request.business.ein.slice(-4)}` : null,
      stateOfIncorporation: request.business.address?.state ?? null,
      dateOfIncorporation: null,
      registeredAddress: request.business.address ?? null,
      website: request.business.website ?? null,
      riskLevel: null,
      riskSignals: [],
      documents: [],
      beneficialOwners: (request.business.beneficialOwners ?? []).map((o, i) => ({
        ownerId: `bo_mock_${i + 1}`,
        name: o.name,
        title: o.title ?? null,
        ownershipPercentage: o.ownershipPercentage ?? null,
        dateOfBirth: null,
        ssnMasked: o.ssn ? `****${o.ssn.slice(-4)}` : null,
        verificationStatus: 'pending' as const,
      })),
      watchlistHits: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
    };
  }

  async getBusinessVerification(request: GetBusinessVerificationRequest): Promise<BusinessVerification> {
    return {
      verificationId: request.verificationId,
      status: 'approved',
      businessName: 'Acme Corp',
      legalName: 'Acme Corporation Inc.',
      entityType: 'corporation',
      ein: null,
      einMasked: '****5678',
      stateOfIncorporation: 'DE',
      dateOfIncorporation: '2020-03-15',
      registeredAddress: { line1: '123 Main St', line2: null, city: 'Wilmington', state: 'DE', postalCode: '19801', country: 'US' },
      website: 'https://acme.example',
      riskLevel: 'low',
      riskSignals: [],
      documents: [{ documentId: 'doc_mock_1', type: 'articles_of_incorporation', status: 'verified', fileName: 'articles.pdf', uploadedAt: '2024-01-15T00:00:00Z' }],
      beneficialOwners: [{ ownerId: 'bo_mock_1', name: 'Jane Smith', title: 'CEO', ownershipPercentage: 75, dateOfBirth: null, ssnMasked: '****1234', verificationStatus: 'verified' }],
      watchlistHits: [],
      createdAt: '2024-01-15T00:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:00Z',
    };
  }

  async listBusinessVerifications(request: ListBusinessVerificationsRequest): Promise<ListBusinessVerificationsResponse> {
    const verification = await this.getBusinessVerification({ userId: request.userId, tenantId: request.tenantId, verificationId: 'bv_mock_1' });
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { verifications: [verification].slice(offset, offset + limit), total: 1 };
  }

  async createIdentityVerification(request: CreateIdentityVerificationRequest): Promise<IdentityVerification> {
    return {
      verificationId: `iv_mock_${Date.now()}`,
      status: 'pending',
      referenceId: request.identity.referenceId ?? null,
      firstName: request.identity.firstName,
      lastName: request.identity.lastName,
      emailAddress: request.identity.emailAddress ?? null,
      phoneNumber: null,
      dateOfBirth: null,
      ssnMasked: request.identity.ssn ? `****${request.identity.ssn.slice(-4)}` : null,
      address: request.identity.address ?? null,
      checks: [
        { checkType: 'document', status: 'pending', reasons: [] },
        { checkType: 'selfie', status: 'pending', reasons: [] },
        { checkType: 'database', status: 'pending', reasons: [] },
      ],
      riskLevel: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      expiresAt: null,
    };
  }

  async getIdentityVerification(request: GetIdentityVerificationRequest): Promise<IdentityVerification> {
    return {
      verificationId: request.verificationId,
      status: 'passed',
      referenceId: 'ref_mock_1',
      firstName: 'Jane',
      lastName: 'Smith',
      emailAddress: 'jane@example.com',
      phoneNumber: null,
      dateOfBirth: null,
      ssnMasked: '****1234',
      address: { line1: '456 Oak Ave', line2: null, city: 'San Francisco', state: 'CA', postalCode: '94102', country: 'US' },
      checks: [
        { checkType: 'document', status: 'passed', reasons: [] },
        { checkType: 'selfie', status: 'passed', reasons: [] },
        { checkType: 'database', status: 'passed', reasons: [] },
      ],
      riskLevel: 'low',
      createdAt: '2024-02-01T00:00:00Z',
      completedAt: '2024-02-01T00:05:00Z',
      expiresAt: null,
    };
  }

  async listIdentityVerifications(request: ListIdentityVerificationsRequest): Promise<ListIdentityVerificationsResponse> {
    const verification = await this.getIdentityVerification({ userId: request.userId, tenantId: request.tenantId, verificationId: 'iv_mock_1' });
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;
    return { verifications: [verification].slice(offset, offset + limit), total: 1 };
  }
}
