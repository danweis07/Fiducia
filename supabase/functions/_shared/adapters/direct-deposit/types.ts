/**
 * Direct Deposit Switching Adapter Interface
 *
 * Defines the contract for payroll direct deposit switching services.
 * Supports multiple providers: Pinwheel, Argyle.
 *
 * The user authenticates with their payroll provider (Workday, ADP, etc.)
 * inside a widget, which then updates routing/account numbers automatically.
 *
 * All monetary values are integer cents.
 * NEVER log raw account numbers or payroll credentials.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// COMMON TYPES
// =============================================================================

export type SwitchStatus =
  | 'pending'          // Switch request created, widget not yet opened
  | 'awaiting_login'   // Widget opened, user has not logged in yet
  | 'processing'       // User logged in, provider is switching deposit
  | 'completed'        // Direct deposit successfully switched
  | 'failed'           // Switch failed (see failureReason)
  | 'cancelled';       // User or system cancelled the switch

export type AllocationType = 'full' | 'partial' | 'fixed_amount';

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface CreateLinkTokenRequest {
  /** Internal user ID */
  userId: string;
  /** Tenant ID for scoping */
  tenantId: string;
  /** Internal account ID to receive deposits */
  accountId: string;
  /** Bank routing number for the target account */
  routingNumber: string;
  /** Full account number (will be sent to provider, never logged) */
  accountNumber: string;
  /** How to allocate the deposit */
  allocationType: AllocationType;
  /** Fixed amount in cents (required when allocationType is 'fixed_amount') */
  allocationAmountCents?: number;
  /** Percentage (1-100, required when allocationType is 'partial') */
  allocationPercentage?: number;
  /** Employer/payroll platform ID from the provider's directory */
  employerPlatformId?: string;
}

export interface CreateLinkTokenResponse {
  /** Token to initialize the provider's widget */
  linkToken: string;
  /** URL to open the widget (if provider uses URL-based flow) */
  widgetUrl: string;
  /** Provider's session/switch ID */
  providerSwitchId: string;
  /** Token expiration time */
  expiresAt: string;
  /** Provider name for audit */
  provider: string;
}

export interface GetSwitchStatusRequest {
  /** Provider's switch/job ID */
  providerSwitchId: string;
}

export interface GetSwitchStatusResponse {
  providerSwitchId: string;
  status: SwitchStatus;
  /** Provider's confirmation ID when completed */
  providerConfirmationId?: string;
  /** Reason if failed */
  failureReason?: string;
  /** When the switch was completed */
  completedAt?: string;
  /** When status last changed */
  updatedAt: string;
}

export interface SearchEmployersRequest {
  /** Search query (employer name) */
  query: string;
  /** Max results to return */
  limit?: number;
}

export interface EmployerResult {
  /** Provider's employer/platform ID */
  platformId: string;
  /** Employer display name */
  name: string;
  /** Logo URL */
  logoUrl?: string;
  /** Payroll provider name (e.g., "ADP", "Workday", "Gusto") */
  payrollProvider: string;
}

export interface SearchEmployersResponse {
  employers: EmployerResult[];
  /** Whether more results exist */
  hasMore: boolean;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface DirectDepositAdapter extends BaseAdapter {
  /**
   * Create a link token to initialize the payroll provider widget.
   * The user will log into their payroll account through this widget
   * to authorize the direct deposit switch.
   */
  createLinkToken(request: CreateLinkTokenRequest): Promise<CreateLinkTokenResponse>;

  /**
   * Get the current status of a direct deposit switch.
   * Used for polling after the user completes the widget flow.
   */
  getSwitchStatus(request: GetSwitchStatusRequest): Promise<GetSwitchStatusResponse>;

  /**
   * Search for supported employers/payroll platforms.
   * Returns employers that can be switched through this provider.
   */
  searchEmployers(request: SearchEmployersRequest): Promise<SearchEmployersResponse>;
}
