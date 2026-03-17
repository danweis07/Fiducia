/**
 * Integration & Location Types
 *
 * Integration configuration, branch/ATM locations, and password policy.
 */

// =============================================================================
// INTEGRATION CONFIG
// =============================================================================

export type IntegrationDomain = 'core_banking' | 'rdc' | 'bill_pay' | 'card' | 'kyc' | 'aml_screening' | 'p2p' | 'account_opening';

export interface IntegrationConfig {
  id: string;
  tenantId: string;
  domain: IntegrationDomain;
  provider: string;
  isActive: boolean;
  config: Record<string, unknown>;  // Provider-specific config (no secrets — those are in Vault)
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ATM / BRANCH LOCATIONS
// =============================================================================

export type LocationType = 'atm' | 'branch' | 'shared_branch';

export interface BranchLocation {
  id: string;
  name: string;
  type: LocationType;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string | null;
  distanceMiles: number | null;
  hours: Record<string, string> | null;
  services: string[];
  isOpen: boolean;
  isDepositAccepting: boolean;
  network: string | null;
}

// =============================================================================
// PASSWORD POLICY (tenant-configurable)
// =============================================================================

export interface PasswordPolicy {
  id: string | null;
  firmId: string | null;
  username: {
    minLength: number;
    maxLength: number;
    allowEmail: boolean;
    pattern: string;
    patternDescription: string;
  };
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireDigit: boolean;
    requireSpecialChar: boolean;
    specialChars: string;
    disallowUsername: boolean;
    historyCount: number;
    expiryDays: number;
  };
  lockout: {
    maxFailedAttempts: number;
    lockoutDurationMinutes: number;
  };
  updatedAt: string | null;
}
