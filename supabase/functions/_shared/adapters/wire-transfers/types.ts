/**
 * Wire Transfer Adapter — Types
 *
 * Defines the interface for domestic (FedWire) and international (SWIFT gpi)
 * wire transfer providers.
 *
 * All monetary values are integer cents. ISO 20022 message types are used
 * where applicable to align with FedWire (migrated July 2025) and SWIFT v5.
 *
 * IMPORTANT: Account numbers and routing numbers MUST be masked in all
 * responses and logs. Raw values are only sent to the upstream provider.
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// WIRE STATUS & TYPE
// =============================================================================

export type WireDirection = 'outbound' | 'inbound';

export type WireType = 'domestic' | 'international';

export type WireStatus =
  | 'pending'       // Wire created, awaiting submission
  | 'submitted'     // Submitted to the network (FedWire/SWIFT)
  | 'processing'    // Accepted by the network, in transit
  | 'completed'     // Credited to beneficiary
  | 'failed'        // Rejected by the network
  | 'cancelled'     // Cancelled by originator before settlement
  | 'returned';     // Returned after settlement

// =============================================================================
// WIRE ORIGINATION REQUEST
// =============================================================================

export interface WireOriginationRequest {
  /** Idempotency key to prevent duplicate wires */
  idempotencyKey: string;
  /** Tenant ID for multi-tenant routing */
  tenantId: string;
  /** Source account ID (internal) */
  fromAccountId: string;
  /** Wire type — determines which network to use */
  type: WireType;

  // Beneficiary
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  /** Masked version for responses (e.g., "****1234") */
  beneficiaryAccountMasked?: string;
  beneficiaryBankName: string;

  // Domestic (FedWire)
  /** ABA routing number (domestic only) */
  routingNumber?: string;

  // International (SWIFT)
  /** SWIFT/BIC code (international only) */
  swiftBic?: string;
  /** IBAN (international, where applicable) */
  iban?: string;
  /** Beneficiary bank country (ISO 3166-1 alpha-2) */
  bankCountry?: string;
  /** Currency (ISO 4217, e.g., "USD", "EUR") */
  currency?: string;

  // Amount
  amountCents: number;

  // Metadata
  memo?: string;
  /** Purpose code per regulatory requirements */
  purpose: string;
  /** Originator reference (internal tracking ID) */
  originatorReference?: string;
}

// =============================================================================
// WIRE TRANSFER (response)
// =============================================================================

export interface WireTransferResult {
  /** Provider-assigned wire ID */
  wireId: string;
  /** Our internal reference */
  referenceNumber: string;
  type: WireType;
  status: WireStatus;
  amountCents: number;
  feeCents: number;
  currency: string;

  beneficiaryName: string;
  beneficiaryBankName: string;
  beneficiaryAccountMasked: string;

  /** ISO 20022 message type (e.g., "pacs.008" for FedWire, "pacs.008" for SWIFT gCCT) */
  isoMessageType?: string;
  /** UETR — Universal End-to-End Transaction Reference (SWIFT gpi) */
  uetr?: string;
  /** IMAD — Input Message Accountability Data (FedWire) */
  imad?: string;
  /** OMAD — Output Message Accountability Data (FedWire) */
  omad?: string;

  estimatedCompletionDate: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// FEE SCHEDULE & LIMITS
// =============================================================================

export interface WireFeeSchedule {
  domesticFeeCents: number;
  internationalFeeCents: number;
  expeditedDomesticFeeCents: number;
  expeditedInternationalFeeCents: number;
}

export interface WireLimits {
  dailyLimitCents: number;
  perTransactionLimitCents: number;
  usedTodayCents: number;
  remainingDailyCents: number;
}

// =============================================================================
// STATUS INQUIRY (SWIFT gpi tracker)
// =============================================================================

export interface WireStatusInquiry {
  wireId: string;
  uetr?: string;
  status: WireStatus;
  /** Payment event trail (SWIFT gpi tracker confirmations) */
  statusHistory: Array<{
    status: WireStatus;
    timestamp: string;
    institution?: string;
    reason?: string;
  }>;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

export interface WireTransferAdapter extends BaseAdapter {
  /** Unique adapter identifier (e.g., "fedwire", "swift", "mock") */
  readonly name: string;

  /** Originate (send) a wire transfer */
  originate(request: WireOriginationRequest): Promise<WireTransferResult>;

  /** Get the status of a wire transfer */
  getStatus(wireId: string): Promise<WireStatusInquiry>;

  /** Cancel a pending wire (before settlement) */
  cancel(wireId: string): Promise<{ success: boolean; reason?: string }>;

  /** Get fee schedule for the tenant */
  getFees(tenantId: string): Promise<WireFeeSchedule>;

  /** Get wire limits for the user/tenant */
  getLimits(tenantId: string): Promise<WireLimits>;
}
