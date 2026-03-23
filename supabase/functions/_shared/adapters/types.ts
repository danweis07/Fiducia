/**
 * Base Adapter Infrastructure
 *
 * Defines the foundational patterns for all external service adapters:
 * retry, timeout, circuit breaker, and adapter lifecycle.
 */

// =============================================================================
// RETRY CONFIGURATION
// =============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Initial delay in ms before first retry (default: 1000) */
  initialDelayMs: number;
  /** Maximum delay cap in ms (default: 10000) */
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

// =============================================================================
// TIMEOUT CONFIGURATION
// =============================================================================

export interface TimeoutConfig {
  /** Request timeout in ms (default: 30000) */
  requestTimeoutMs: number;
}

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  requestTimeoutMs: 30000,
};

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Number of failures before opening the circuit (default: 5) */
  failureThreshold: number;
  /** Time in ms before attempting to half-open (default: 60000) */
  resetTimeoutMs: number;
  /** Number of successes in half-open to close the circuit (default: 2) */
  successThreshold: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 60000,
  successThreshold: 2,
};

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt: number | null;
}

// =============================================================================
// ADAPTER BASE
// =============================================================================

export interface AdapterConfig {
  /** Unique adapter identifier (e.g., 'plaid', 'mock') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Retry configuration */
  retry: RetryConfig;
  /** Timeout configuration */
  timeout: TimeoutConfig;
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfig;
}

export interface AdapterHealth {
  adapterId: string;
  healthy: boolean;
  circuitState: CircuitState;
  lastCheckedAt: string;
  errorMessage?: string;
}

/**
 * Base interface all adapters must implement.
 */
export interface BaseAdapter {
  readonly config: AdapterConfig;
  /** Check adapter health / connectivity */
  healthCheck(): Promise<AdapterHealth>;
}

// =============================================================================
// ADAPTER DOMAIN TYPES
// =============================================================================

/** Supported adapter domains */
export type AdapterDomain =
  // Banking domains
  | 'external_accounts' | 'core_banking' | 'rdc' | 'bill_pay' | 'card' | 'card_provisioning' | 'kyc' | 'account_opening' | 'locations' | 'direct_deposit'
  // Payments
  | 'instant_payments'
  // Wire transfers (FedWire / SWIFT)
  | 'wire_transfers'
  // Treasury & payments
  | 'treasury' | 'payment_operations'
  // Card issuing
  | 'card_issuing'
  // International payments & global operations
  | 'international_payments' | 'international_bill_pay' | 'international_loans' | 'baas'
  // Compliance & verification
  | 'kyb' | 'aml_screening'
  // Loan origination
  | 'loan_origination'
  // Financial data & insights
  | 'financial_data' | 'card_offers'
  // Data aggregation & open banking
  | 'aggregator'
  // Fraud & risk
  | 'fraud' | 'fraud_graph'
  // Search
  | 'search'
  // Confirmation of Payee, SCA, Multi-Currency & Alias Resolution
  | 'confirmation_of_payee' | 'sca' | 'multi_currency' | 'alias_resolution'
  // Platform domains
  | 'cms' | 'messaging' | 'notifications'
  // AI domains
  | 'ai_services'
  // Compliance audit
  | 'compliance_audit'
  // Global clearing & cross-border
  | 'global_clearing'
  // Stablecoin settlement
  | 'stablecoin'
  // Engagement banking (PFM, insights, journeys)
  | 'engagement'
  // E-signatures (DocuSign, PandaDoc, etc.)
  | 'e_signature';

/** Adapter resolution result */
export interface AdapterResolution<T extends BaseAdapter = BaseAdapter> {
  adapter: T;
  provider: string;
  domain: AdapterDomain;
  /** Production validation status of the resolved adapter */
  validationStatus?: 'validated' | 'provisional' | 'stub' | 'mock';
}
