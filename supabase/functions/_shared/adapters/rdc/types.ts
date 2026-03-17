/**
 * Remote Deposit Capture (mRDC) Adapter Interface
 *
 * Defines the contract for check deposit processing services.
 * Supports multiple providers: Synctera, Unit, Mitek.
 *
 * All monetary values are integer cents.
 * Image data is base64-encoded — adapters handle upload to provider-specific storage.
 * NEVER log image data or raw account numbers.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// COMMON TYPES
// =============================================================================

export type DepositStatus =
  | 'pending'       // Submitted, awaiting processing
  | 'reviewing'     // Provider is analyzing check images
  | 'accepted'      // Check accepted, funds pending
  | 'rejected'      // Check rejected (see rejectionReason)
  | 'clearing'      // Funds in clearing process
  | 'cleared'       // Funds available
  | 'returned';     // Check returned after clearing

export interface CheckImage {
  /** Base64-encoded image data */
  imageBase64: string;
  /** MIME type (image/jpeg, image/png, image/tiff) */
  mimeType?: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface SubmitDepositRequest {
  /** Internal account ID */
  accountId: string;
  /** Deposit amount in cents */
  amountCents: number;
  /** Front of check image */
  frontImage: CheckImage;
  /** Back of check image */
  backImage: CheckImage;
  /** Optional check number printed on check */
  checkNumber?: string;
  /** Depositor user ID for audit */
  userId: string;
  /** Tenant ID for scoping */
  tenantId: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface SubmitDepositResponse {
  /** Provider's deposit/transaction ID */
  providerDepositId: string;
  /** Internal deposit ID (assigned by our system) */
  depositId?: string;
  /** Initial status */
  status: DepositStatus;
  /** Provider-specific reference number */
  referenceNumber?: string;
  /** When the deposit was received by provider */
  receivedAt: string;
  /** Expected availability date (if known) */
  expectedAvailabilityDate?: string;
  /** Provider name for audit */
  provider: string;
}

export interface GetDepositStatusRequest {
  /** Provider's deposit ID */
  providerDepositId: string;
  /** Our internal deposit ID */
  depositId?: string;
}

export interface GetDepositStatusResponse {
  providerDepositId: string;
  status: DepositStatus;
  /** Reason if rejected */
  rejectionReason?: string;
  /** Rejection code (provider-specific) */
  rejectionCode?: string;
  /** Amount confirmed by provider (may differ from submitted) */
  confirmedAmountCents?: number;
  /** When status last changed */
  updatedAt: string;
  /** When funds will be/were available */
  availabilityDate?: string;
  /** When funds were cleared */
  clearedAt?: string;
}

export interface GetDepositLimitsRequest {
  accountId: string;
  userId: string;
  tenantId: string;
}

export interface DepositLimits {
  /** Max single deposit in cents */
  perDepositLimitCents: number;
  /** Max daily deposits in cents */
  dailyLimitCents: number;
  /** Amount already deposited today in cents */
  dailyUsedCents: number;
  /** Max monthly deposits in cents */
  monthlyLimitCents: number;
  /** Amount deposited this month in cents */
  monthlyUsedCents: number;
  /** Max number of deposits per day */
  maxDepositsPerDay: number;
  /** Deposits made today */
  depositsToday: number;
}

export interface ValidateCheckRequest {
  /** Front image to validate */
  frontImage: CheckImage;
  /** Back image to validate */
  backImage: CheckImage;
}

export interface CheckValidationResult {
  /** Whether images pass basic validation */
  valid: boolean;
  /** Quality score 0-100 */
  qualityScore: number;
  /** Issues found during validation */
  issues: CheckValidationIssue[];
  /** OCR-extracted fields (if supported) */
  extractedFields?: {
    amountCents?: number;
    checkNumber?: string;
    routingNumber?: string;
    accountNumber?: string;  // Masked in logs
    payeeName?: string;
    date?: string;
    micrLine?: string;
  };
}

export interface CheckValidationIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  field?: string;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface RDCAdapter extends BaseAdapter {
  /** Submit a check deposit for processing */
  submitDeposit(request: SubmitDepositRequest): Promise<SubmitDepositResponse>;

  /** Get the current status of a deposit */
  getDepositStatus(request: GetDepositStatusRequest): Promise<GetDepositStatusResponse>;

  /** Get deposit limits for a user/account */
  getDepositLimits(request: GetDepositLimitsRequest): Promise<DepositLimits>;

  /** Validate check images before submission (optional pre-check) */
  validateCheck(request: ValidateCheckRequest): Promise<CheckValidationResult>;
}
