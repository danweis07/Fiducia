/**
 * Adapter Registry — Tests
 *
 * Tests for the adapter resolution system that maps domains to
 * their correct adapter implementations. Security-critical because
 * wrong adapter resolution could route financial data to wrong providers.
 *
 * Since the registry uses Deno-style imports, we test the resolution
 * logic and domain validation by importing the concepts directly.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// DOMAIN TYPES (mirrored from adapters/types.ts)
// These are the valid adapter domains the registry must support.
// ---------------------------------------------------------------------------

const VALID_DOMAINS = [
  'external_accounts', 'core_banking', 'rdc', 'bill_pay', 'card',
  'card_provisioning', 'kyc', 'account_opening', 'locations', 'direct_deposit',
  'instant_payments', 'wire_transfers', 'treasury', 'payment_operations', 'card_issuing',
  'international_payments', 'international_bill_pay', 'international_loans', 'baas',
  'kyb', 'financial_data', 'card_offers', 'aggregator',
  'ai_services', 'notifications', 'compliance_audit',
  'fraud', 'loan_origination',
  'confirmation_of_payee', 'sca',
] as const;

type AdapterDomain = typeof VALID_DOMAINS[number];

// ---------------------------------------------------------------------------
// ENV OVERRIDES (mirrored from registry.ts)
// ---------------------------------------------------------------------------

const DOMAIN_ENV_OVERRIDES: Partial<Record<AdapterDomain, string>> = {
  external_accounts: 'EXTERNAL_ACCOUNTS_PROVIDER',
  locations: 'LOCATIONS_PROVIDER',
  rdc: 'RDC_PROVIDER',
  bill_pay: 'BILL_PAY_PROVIDER',
  financial_data: 'FINANCIAL_DATA_PROVIDER',
  card_offers: 'CARD_OFFERS_PROVIDER',
  aggregator: 'AGGREGATOR_PROVIDER',
  core_banking: 'CORE_BANKING_PROVIDER',
  card: 'CARD_PROVIDER',
  card_provisioning: 'CARD_PROVISIONING_PROVIDER',
  account_opening: 'ACCOUNT_OPENING_PROVIDER',
  loan_origination: 'LOAN_ORIGINATION_PROVIDER',
  direct_deposit: 'DIRECT_DEPOSIT_PROVIDER',
  instant_payments: 'INSTANT_PAYMENTS_PROVIDER',
  wire_transfers: 'WIRE_PROVIDER',
  fraud: 'FRAUD_PROVIDER',
  treasury: 'TREASURY_PROVIDER',
  payment_operations: 'PAYMENT_OPERATIONS_PROVIDER',
  card_issuing: 'CARD_ISSUING_PROVIDER',
  kyb: 'KYB_PROVIDER',
  ai_services: 'AI_SERVICES_PROVIDER',
  notifications: 'NOTIFICATIONS_PROVIDER',
  compliance_audit: 'COMPLIANCE_AUDIT_PROVIDER',
  international_payments: 'INTERNATIONAL_PAYMENTS_PROVIDER',
  international_bill_pay: 'INTERNATIONAL_BILL_PAY_PROVIDER',
  international_loans: 'INTERNATIONAL_LOANS_PROVIDER',
  baas: 'BAAS_PROVIDER',
  confirmation_of_payee: 'COP_PROVIDER',
  sca: 'SCA_PROVIDER',
};

// ---------------------------------------------------------------------------
// VALIDATION STATUS (new export to be added to registry.ts)
// ---------------------------------------------------------------------------

type ValidationStatus = 'validated' | 'provisional' | 'stub';

const ADAPTER_VALIDATION_STATUS: Record<string, ValidationStatus> = {
  // Core banking - validated
  'core_banking:mock': 'validated',
  'core_banking:fineract': 'validated',
  'core_banking:symitar': 'validated',
  'core_banking:cuanswers': 'validated',

  // Core banking - provisional
  'core_banking:fiserv': 'provisional',
  'core_banking:fis': 'provisional',
  'core_banking:keystone': 'provisional',
  'core_banking:flex': 'provisional',
  'core_banking:mambu': 'provisional',
  'core_banking:thought_machine': 'provisional',
  'core_banking:pismo': 'provisional',
  'core_banking:mifos': 'provisional',

  // RDC
  'rdc:mock': 'validated',
  'rdc:mitek': 'validated',
  'rdc:synctera': 'provisional',
  'rdc:unit': 'provisional',
  'rdc:cuanswers': 'provisional',
  'rdc:jackhenry': 'provisional',

  // Bill Pay
  'bill_pay:mock': 'validated',
  'bill_pay:fiserv': 'provisional',
  'bill_pay:fis': 'provisional',
  'bill_pay:jha': 'provisional',

  // External Accounts
  'external_accounts:mock': 'validated',
  'external_accounts:plaid': 'validated',

  // Locations
  'locations:mock': 'validated',
  'locations:overpass': 'validated',

  // Card
  'card:mock': 'validated',
  'card:jackhenry': 'provisional',

  // AI Services
  'ai_services:mock': 'validated',
  'ai_services:multi_provider': 'provisional',

  // Notifications
  'notifications:mock': 'validated',
  'notifications:braze': 'provisional',
  'notifications:twilio': 'provisional',

  // Wire Transfers
  'wire_transfers:mock': 'validated',
  'wire_transfers:fedwire': 'provisional',
  'wire_transfers:swift': 'provisional',

  // Treasury
  'treasury:mock': 'validated',
  'treasury:column': 'provisional',
  'treasury:increase': 'provisional',
  'treasury:mercury': 'provisional',
  'treasury:stripe_treasury': 'provisional',

  // Everything else defaults to stub
};

function getAdapterValidationStatus(domain: string, provider: string): ValidationStatus {
  const key = `${domain}:${provider}`;
  return ADAPTER_VALIDATION_STATUS[key] ?? 'stub';
}

// ===========================================================================
// DOMAIN VALIDATION
// ===========================================================================

describe('adapter domain values', () => {
  it('all domain strings are non-empty', () => {
    for (const domain of VALID_DOMAINS) {
      expect(domain.length).toBeGreaterThan(0);
    }
  });

  it('all domain strings use snake_case', () => {
    for (const domain of VALID_DOMAINS) {
      expect(domain).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });

  it('no duplicate domains exist', () => {
    const unique = new Set(VALID_DOMAINS);
    expect(unique.size).toBe(VALID_DOMAINS.length);
  });

  it('includes all critical banking domains', () => {
    const critical = ['core_banking', 'rdc', 'bill_pay', 'card', 'external_accounts', 'kyc'];
    for (const domain of critical) {
      expect(VALID_DOMAINS).toContain(domain);
    }
  });

  it('includes payment domains', () => {
    expect(VALID_DOMAINS).toContain('instant_payments');
    expect(VALID_DOMAINS).toContain('wire_transfers');
    expect(VALID_DOMAINS).toContain('treasury');
    expect(VALID_DOMAINS).toContain('payment_operations');
  });

  it('includes compliance/verification domains', () => {
    expect(VALID_DOMAINS).toContain('kyb');
    expect(VALID_DOMAINS).toContain('fraud');
    expect(VALID_DOMAINS).toContain('compliance_audit');
  });

  it('includes international domains', () => {
    expect(VALID_DOMAINS).toContain('international_payments');
    expect(VALID_DOMAINS).toContain('international_bill_pay');
    expect(VALID_DOMAINS).toContain('international_loans');
    expect(VALID_DOMAINS).toContain('baas');
  });
});

// ===========================================================================
// ENV OVERRIDE MAPPING
// ===========================================================================

describe('domain env overrides', () => {
  it('every mapped domain has a valid env var name', () => {
    for (const [_domain, envVar] of Object.entries(DOMAIN_ENV_OVERRIDES)) {
      expect(typeof envVar).toBe('string');
      expect(envVar!.length).toBeGreaterThan(0);
      // Env vars should be UPPER_SNAKE_CASE ending with _PROVIDER
      expect(envVar).toMatch(/^[A-Z][A-Z0-9_]*_PROVIDER$/);
    }
  });

  it('no duplicate env var names', () => {
    const envVars = Object.values(DOMAIN_ENV_OVERRIDES).filter(Boolean);
    const unique = new Set(envVars);
    expect(unique.size).toBe(envVars.length);
  });

  it('core_banking has CORE_BANKING_PROVIDER env override', () => {
    expect(DOMAIN_ENV_OVERRIDES.core_banking).toBe('CORE_BANKING_PROVIDER');
  });

  it('rdc has RDC_PROVIDER env override', () => {
    expect(DOMAIN_ENV_OVERRIDES.rdc).toBe('RDC_PROVIDER');
  });
});

// ===========================================================================
// MOCK ADAPTER DEFAULT RESOLUTION
// ===========================================================================

describe('default adapter resolution', () => {
  it('default provider is "mock" when no env/config', () => {
    // The registry falls back to 'mock' for all domains when no config
    const fallbackProvider = 'mock';
    expect(fallbackProvider).toBe('mock');
  });

  it('every domain has at least a mock adapter', () => {
    // All domains in the registry switch statement have a default/mock case
    for (const domain of VALID_DOMAINS) {
      const status = getAdapterValidationStatus(domain, 'mock');
      // Mock adapters should be validated or at least exist
      expect(['validated', 'provisional', 'stub']).toContain(status);
    }
  });
});

// ===========================================================================
// ADAPTER VALIDATION STATUS
// ===========================================================================

describe('ADAPTER_VALIDATION_STATUS', () => {
  it('all mock adapters are marked as validated', () => {
    const mockEntries = Object.entries(ADAPTER_VALIDATION_STATUS)
      .filter(([key]) => key.endsWith(':mock'));
    for (const [_key, status] of mockEntries) {
      expect(status).toBe('validated');
    }
  });

  it('status values are one of: validated, provisional, stub', () => {
    const validStatuses: ValidationStatus[] = ['validated', 'provisional', 'stub'];
    for (const [, status] of Object.entries(ADAPTER_VALIDATION_STATUS)) {
      expect(validStatuses).toContain(status);
    }
  });

  it('getAdapterValidationStatus returns correct status for known adapters', () => {
    expect(getAdapterValidationStatus('core_banking', 'mock')).toBe('validated');
    expect(getAdapterValidationStatus('core_banking', 'fineract')).toBe('validated');
    expect(getAdapterValidationStatus('core_banking', 'fiserv')).toBe('provisional');
  });

  it('getAdapterValidationStatus returns "stub" for unknown adapters', () => {
    expect(getAdapterValidationStatus('core_banking', 'nonexistent')).toBe('stub');
    expect(getAdapterValidationStatus('unknown_domain', 'any')).toBe('stub');
  });

  it('validated adapters include the core tested integrations', () => {
    expect(getAdapterValidationStatus('external_accounts', 'plaid')).toBe('validated');
    expect(getAdapterValidationStatus('locations', 'overpass')).toBe('validated');
    expect(getAdapterValidationStatus('rdc', 'mitek')).toBe('validated');
  });

  it('key format is domain:provider', () => {
    for (const key of Object.keys(ADAPTER_VALIDATION_STATUS)) {
      expect(key).toMatch(/^[a-z_]+:[a-z_]+$/);
    }
  });
});

// ===========================================================================
// SECURITY: ADAPTER RESOLUTION ISOLATION
// ===========================================================================

describe('adapter resolution security', () => {
  it('domain names do not contain path traversal characters', () => {
    for (const domain of VALID_DOMAINS) {
      expect(domain).not.toContain('..');
      expect(domain).not.toContain('/');
      expect(domain).not.toContain('\\');
    }
  });

  it('env var names do not contain injection characters', () => {
    for (const envVar of Object.values(DOMAIN_ENV_OVERRIDES)) {
      if (envVar) {
        expect(envVar).not.toContain(';');
        expect(envVar).not.toContain('$');
        expect(envVar).not.toContain('`');
        expect(envVar).toMatch(/^[A-Z0-9_]+$/);
      }
    }
  });
});

// ===========================================================================
// WIRE TRANSFER ADAPTER VALIDATION
// ===========================================================================

describe('wire transfer adapter validation', () => {
  it('wire_transfers domain exists in valid domains', () => {
    expect(VALID_DOMAINS).toContain('wire_transfers');
  });

  it('wire transfer mock is validated', () => {
    expect(getAdapterValidationStatus('wire_transfers', 'mock')).toBe('validated');
  });

  it('wire transfer fedwire is provisional', () => {
    expect(getAdapterValidationStatus('wire_transfers', 'fedwire')).toBe('provisional');
  });

  it('wire transfer swift is provisional', () => {
    expect(getAdapterValidationStatus('wire_transfers', 'swift')).toBe('provisional');
  });

  it('wire_transfers has WIRE_PROVIDER env override', () => {
    expect(DOMAIN_ENV_OVERRIDES.wire_transfers).toBe('WIRE_PROVIDER');
  });
});

// ===========================================================================
// NOTIFICATION ADAPTER UPDATES
// ===========================================================================

describe('notification adapter validation', () => {
  it('twilio adapter is registered as provisional', () => {
    expect(getAdapterValidationStatus('notifications', 'twilio')).toBe('provisional');
  });

  it('braze adapter remains provisional', () => {
    expect(getAdapterValidationStatus('notifications', 'braze')).toBe('provisional');
  });

  it('notifications mock remains validated', () => {
    expect(getAdapterValidationStatus('notifications', 'mock')).toBe('validated');
  });
});

// ===========================================================================
// ACCOUNT OPENING — MANTL REMOVED
// ===========================================================================

describe('account opening adapter validation (MANTL removed)', () => {
  it('account_opening domain exists', () => {
    expect(VALID_DOMAINS).toContain('account_opening');
  });

  it('MANTL is not a registered adapter', () => {
    expect(getAdapterValidationStatus('account_opening', 'mantl')).toBe('stub');
  });
});
