/**
 * Member Profile Types
 *
 * Member addresses, documents, and identifiers.
 */

// =============================================================================
// MEMBER PROFILE EXTENSIONS
// =============================================================================

export type AddressType = 'home' | 'mailing' | 'work' | 'other';

export interface MemberAddress {
  id: string;
  userId: string;
  type: AddressType;
  isPrimary: boolean;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type DocumentType =
  | 'drivers_license' | 'passport' | 'state_id' | 'military_id'
  | 'ssn_card' | 'birth_certificate' | 'utility_bill' | 'other';

export type DocumentStatus = 'pending' | 'verified' | 'expired' | 'rejected';

export interface MemberDocument {
  id: string;
  userId: string;
  type: DocumentType;
  label: string;
  documentNumberMasked: string | null;
  issuingAuthority: string | null;
  issuedDate: string | null;
  expirationDate: string | null;
  status: DocumentStatus;
  createdAt: string;
}

export type IdentifierType = 'ssn' | 'member_number' | 'tax_id' | 'ein' | 'other';

export interface MemberIdentifier {
  id: string;
  userId: string;
  type: IdentifierType;
  valueMasked: string;
  isPrimary: boolean;
  createdAt: string;
}
