/**
 * KYB (Know Your Business) Adapter Interface
 *
 * Defines the contract for business verification and identity verification.
 * Provides business entity lookup, document verification, beneficial owner
 * identification, and ongoing monitoring.
 *
 * Providers: Middesk (business verification), Persona (identity verification)
 *
 * Note: KYB is distinct from KYC — KYB focuses on verifying business entities,
 * their beneficial owners, and regulatory compliance status. Identity verification
 * of individual users/owners is also included via providers like Persona.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// BUSINESS VERIFICATION TYPES
// =============================================================================

export type BusinessVerificationStatus = 'pending' | 'in_review' | 'approved' | 'declined' | 'requires_attention';
export type BusinessEntityType = 'corporation' | 'llc' | 'partnership' | 'sole_proprietorship' | 'nonprofit' | 'other';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface BusinessVerification {
  verificationId: string;
  status: BusinessVerificationStatus;
  businessName: string;
  legalName: string | null;
  entityType: BusinessEntityType | null;
  ein: string | null;
  einMasked: string | null;
  stateOfIncorporation: string | null;
  dateOfIncorporation: string | null;
  registeredAddress: Address | null;
  website: string | null;
  riskLevel: RiskLevel | null;
  riskSignals: RiskSignal[];
  documents: VerificationDocument[];
  beneficialOwners: BeneficialOwner[];
  watchlistHits: WatchlistHit[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RiskSignal {
  signalType: string;
  severity: RiskLevel;
  description: string;
}

export interface VerificationDocument {
  documentId: string;
  type: string;
  status: 'pending' | 'verified' | 'rejected';
  fileName: string | null;
  uploadedAt: string;
}

export interface BeneficialOwner {
  ownerId: string;
  name: string;
  title: string | null;
  ownershipPercentage: number | null;
  dateOfBirth: string | null;
  ssnMasked: string | null;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

export interface WatchlistHit {
  listName: string;
  entityName: string;
  matchScore: number;
  details: string;
}

// =============================================================================
// IDENTITY VERIFICATION TYPES
// =============================================================================

export type IdentityVerificationStatus = 'pending' | 'passed' | 'failed' | 'needs_review' | 'expired';
export type VerificationCheckType = 'document' | 'selfie' | 'database' | 'phone' | 'address';

export interface IdentityVerification {
  verificationId: string;
  status: IdentityVerificationStatus;
  referenceId: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  phoneNumber: string | null;
  dateOfBirth: string | null;
  ssnMasked: string | null;
  address: Address | null;
  checks: VerificationCheck[];
  riskLevel: RiskLevel | null;
  createdAt: string;
  completedAt: string | null;
  expiresAt: string | null;
}

export interface VerificationCheck {
  checkType: VerificationCheckType;
  status: 'passed' | 'failed' | 'pending' | 'not_applicable';
  reasons: string[];
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreateBusinessVerificationRequest {
  userId: string;
  tenantId: string;
  business: {
    businessName: string;
    ein?: string;
    entityType?: BusinessEntityType;
    website?: string;
    address?: Address;
    beneficialOwners?: Array<{
      name: string;
      title?: string;
      ownershipPercentage?: number;
      dateOfBirth?: string;
      ssn?: string;
    }>;
  };
}

export interface GetBusinessVerificationRequest {
  userId: string;
  tenantId: string;
  verificationId: string;
}

export interface ListBusinessVerificationsRequest {
  userId: string;
  tenantId: string;
  status?: BusinessVerificationStatus;
  limit?: number;
  offset?: number;
}

export interface ListBusinessVerificationsResponse {
  verifications: BusinessVerification[];
  total: number;
}

export interface CreateIdentityVerificationRequest {
  userId: string;
  tenantId: string;
  identity: {
    referenceId?: string;
    firstName: string;
    lastName: string;
    emailAddress?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    ssn?: string;
    address?: Address;
  };
}

export interface GetIdentityVerificationRequest {
  userId: string;
  tenantId: string;
  verificationId: string;
}

export interface ListIdentityVerificationsRequest {
  userId: string;
  tenantId: string;
  status?: IdentityVerificationStatus;
  referenceId?: string;
  limit?: number;
  offset?: number;
}

export interface ListIdentityVerificationsResponse {
  verifications: IdentityVerification[];
  total: number;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface KYBAdapter extends BaseAdapter {
  /** Submit a business for verification */
  createBusinessVerification(request: CreateBusinessVerificationRequest): Promise<BusinessVerification>;

  /** Get business verification status */
  getBusinessVerification(request: GetBusinessVerificationRequest): Promise<BusinessVerification>;

  /** List business verifications */
  listBusinessVerifications(request: ListBusinessVerificationsRequest): Promise<ListBusinessVerificationsResponse>;

  /** Submit an individual for identity verification */
  createIdentityVerification(request: CreateIdentityVerificationRequest): Promise<IdentityVerification>;

  /** Get identity verification status */
  getIdentityVerification(request: GetIdentityVerificationRequest): Promise<IdentityVerification>;

  /** List identity verifications */
  listIdentityVerifications(request: ListIdentityVerificationsRequest): Promise<ListIdentityVerificationsResponse>;
}
