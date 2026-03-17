/**
 * Banking-as-a-Service (BaaS) Partner Adapter Interface
 *
 * Defines the contract for BaaS partner integrations that provide underlying
 * banking license infrastructure for international operations. Partners supply
 * virtual IBANs, local accounts, payment rails access (SEPA, Faster Payments,
 * local clearing), KYC/KYB passthrough under their license, and regulatory
 * compliance reporting.
 *
 * Providers: Solaris (Europe), ClearBank (UK)
 *
 * All monetary values are integer cents.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// ACCOUNT TYPES
// =============================================================================

export type BaaSAccountType = 'virtual_iban' | 'local_account' | 'settlement' | 'escrow';

export type BaaSAccountStatus = 'pending_approval' | 'active' | 'frozen' | 'suspended' | 'closed';

export type BaaSCurrency = 'EUR' | 'GBP' | 'USD' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'CZK';

export interface BaaSAccount {
  accountId: string;
  externalId?: string;
  type: BaaSAccountType;
  name: string;
  /** IBAN for EU accounts, sort code + account number masked for UK */
  ibanMasked: string | null;
  /** UK sort code (6 digits) — null for non-UK accounts */
  sortCode: string | null;
  /** Last 4 digits of account number */
  accountNumberMasked: string;
  balanceCents: number;
  availableBalanceCents: number;
  holdAmountCents: number;
  status: BaaSAccountStatus;
  currency: BaaSCurrency;
  /** ISO 3166-1 alpha-2 country code */
  country: string;
  /** BIC/SWIFT code for the partner bank */
  bic: string;
  /** Name of the BaaS partner providing the account */
  partnerBank: string;
  createdAt: string;
  closedAt: string | null;
}

// =============================================================================
// PAYMENT RAIL TYPES
// =============================================================================

export type BaaSPaymentRailType =
  | 'sepa_credit'
  | 'sepa_instant'
  | 'sepa_direct_debit'
  | 'faster_payments'
  | 'bacs'
  | 'chaps'
  | 'swift'
  | 'local_clearing';

export type BaaSPaymentStatus =
  | 'pending'
  | 'submitted'
  | 'processing'
  | 'settled'
  | 'returned'
  | 'failed'
  | 'cancelled';

export interface BaaSPaymentRail {
  railType: BaaSPaymentRailType;
  /** Whether this rail is currently available */
  available: boolean;
  /** Supported currencies on this rail */
  currencies: BaaSCurrency[];
  /** Maximum single payment amount in cents */
  maxAmountCents: number;
  /** Typical settlement time description */
  settlementTime: string;
  /** Cut-off time in UTC (e.g., "14:00") */
  cutoffTimeUtc: string | null;
}

export interface BaaSPaymentRequest {
  fromAccountId: string;
  railType: BaaSPaymentRailType;
  amountCents: number;
  currency: BaaSCurrency;
  /** Beneficiary IBAN (SEPA) or account number (UK) */
  beneficiaryAccountIdentifier: string;
  /** Beneficiary sort code — required for UK rails */
  beneficiarySortCode?: string;
  /** Beneficiary BIC/SWIFT — required for SWIFT payments */
  beneficiaryBic?: string;
  beneficiaryName: string;
  /** Payment reference / remittance info */
  reference: string;
  /** End-to-end ID for tracking */
  endToEndId?: string;
}

export interface BaaSPayment {
  paymentId: string;
  fromAccountId: string;
  railType: BaaSPaymentRailType;
  amountCents: number;
  currency: BaaSCurrency;
  beneficiaryName: string;
  reference: string;
  endToEndId: string | null;
  status: BaaSPaymentStatus;
  /** Reason code if returned/failed */
  returnReasonCode: string | null;
  submittedAt: string | null;
  settledAt: string | null;
  createdAt: string;
}

// =============================================================================
// KYC / KYB PASSTHROUGH TYPES
// =============================================================================

export type BaaSKYCLevel = 'basic' | 'standard' | 'enhanced';

export type BaaSKYCStatus =
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'expired';

export interface BaaSKYCResult {
  kycId: string;
  /** External reference in partner's system */
  partnerReferenceId: string;
  personId: string;
  level: BaaSKYCLevel;
  status: BaaSKYCStatus;
  /** ISO country where KYC was performed */
  jurisdiction: string;
  /** Regulatory framework (e.g., 'PSD2', 'MLD5', 'FCA') */
  regulatoryFramework: string;
  /** List of completed verification checks */
  completedChecks: string[];
  /** Reason if rejected */
  rejectionReason: string | null;
  /** When the KYC result expires and needs renewal */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// COMPLIANCE STATUS TYPES
// =============================================================================

export type BaaSComplianceLevel = 'compliant' | 'minor_issues' | 'major_issues' | 'non_compliant';

export interface BaaSComplianceStatus {
  tenantId: string;
  /** Overall compliance status with the BaaS partner */
  level: BaaSComplianceLevel;
  /** Regulatory frameworks being monitored */
  frameworks: string[];
  /** Active compliance issues requiring attention */
  openIssues: BaaSComplianceIssue[];
  /** Last regulatory report submission date */
  lastReportDate: string | null;
  /** Next regulatory report due date */
  nextReportDueDate: string | null;
  /** Transaction monitoring status */
  transactionMonitoringActive: boolean;
  /** Sanctions screening status */
  sanctionsScreeningActive: boolean;
  updatedAt: string;
}

export interface BaaSComplianceIssue {
  issueId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  /** Deadline to resolve */
  dueDate: string | null;
  createdAt: string;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface ListBaaSAccountsRequest {
  userId: string;
  tenantId: string;
  status?: BaaSAccountStatus;
  currency?: BaaSCurrency;
  limit?: number;
  offset?: number;
}

export interface ListBaaSAccountsResponse {
  accounts: BaaSAccount[];
  total: number;
}

export interface CreateBaaSAccountRequest {
  userId: string;
  tenantId: string;
  type: BaaSAccountType;
  currency: BaaSCurrency;
  country: string;
  name: string;
}

export interface GetBaaSAccountRequest {
  userId: string;
  tenantId: string;
  accountId: string;
}

export interface InitiateBaaSPaymentRequest {
  userId: string;
  tenantId: string;
  payment: BaaSPaymentRequest;
}

export interface GetBaaSKYCStatusRequest {
  userId: string;
  tenantId: string;
  personId: string;
}

export interface GetBaaSComplianceStatusRequest {
  userId: string;
  tenantId: string;
}

export interface ListBaaSPaymentRailsRequest {
  userId: string;
  tenantId: string;
  currency?: BaaSCurrency;
}

export interface ListBaaSPaymentRailsResponse {
  rails: BaaSPaymentRail[];
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface BaaSAdapter extends BaseAdapter {
  /** List partner bank accounts */
  listAccounts(request: ListBaaSAccountsRequest): Promise<ListBaaSAccountsResponse>;

  /** Create a new partner bank account (virtual IBAN or local account) */
  createAccount(request: CreateBaaSAccountRequest): Promise<BaaSAccount>;

  /** Get a single partner bank account */
  getAccount(request: GetBaaSAccountRequest): Promise<BaaSAccount>;

  /** Initiate a payment through partner payment rails */
  initiatePayment(request: InitiateBaaSPaymentRequest): Promise<BaaSPayment>;

  /** Get KYC/KYB status for a person under partner's license */
  getKYCStatus(request: GetBaaSKYCStatusRequest): Promise<BaaSKYCResult>;

  /** Get compliance status and regulatory reporting overview */
  getComplianceStatus(request: GetBaaSComplianceStatusRequest): Promise<BaaSComplianceStatus>;

  /** List available payment rails and their status */
  listPaymentRails(request: ListBaaSPaymentRailsRequest): Promise<ListBaaSPaymentRailsResponse>;
}
