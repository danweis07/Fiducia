/**
 * Instant Payments Adapter Interface
 *
 * Defines the port for real-time payment operations including:
 *   - FedNow (Federal Reserve instant payment rail)
 *   - RTP (The Clearing House Real-Time Payments)
 *   - SEPA Instant (European Payments Council SCT Inst)
 *   - Pix (Banco Central do Brasil instant payment rail)
 *   - UPI (NPCI Unified Payments Interface, India)
 *   - Payment status tracking and webhooks
 *   - Request for Payment (RfP) support
 *
 * Implementations:
 *   - FedNow adapter (ISO 20022 messaging)
 *   - RTP adapter (TCH Real-Time Payments)
 *   - SEPA Instant adapter (EPC SCT Inst / ISO 20022)
 *   - Pix adapter (BCB Pix API)
 *   - UPI adapter (NPCI UPI)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// INSTANT PAYMENT TYPES
// =============================================================================

/** Supported instant payment rails */
export type PaymentRail = 'fednow' | 'rtp' | 'sepa_instant' | 'pix' | 'upi';

/** Payment direction */
export type PaymentDirection = 'inbound' | 'outbound';

/** Payment status — maps to ISO 20022 status codes */
export type InstantPaymentStatus =
  | 'pending'          // Submitted, awaiting processing
  | 'accepted'         // Accepted by receiving institution
  | 'completed'        // Settled and final
  | 'rejected'         // Rejected by network or receiver
  | 'returned'         // Completed but subsequently returned
  | 'failed';          // Technical failure

/** Rejection reason codes (ISO 20022 subset) */
export type RejectionReason =
  | 'account_closed'
  | 'account_blocked'
  | 'insufficient_funds'
  | 'invalid_account'
  | 'invalid_routing'
  | 'amount_exceeds_limit'
  | 'duplicate_payment'
  | 'regulatory_reason'
  | 'receiver_declined'
  | 'timeout'
  | 'technical_error';

/** Request for Payment status */
export type RfPStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface InstantPayment {
  /** Unique payment ID (end-to-end) */
  paymentId: string;
  /** Network-assigned message ID */
  networkMessageId: string | null;
  /** Payment rail used */
  rail: PaymentRail;
  /** Direction */
  direction: PaymentDirection;
  /** Current status */
  status: InstantPaymentStatus;
  /** Amount in cents */
  amountCents: number;
  /** ISO 4217 currency code */
  currency: string;
  /** Sender routing number */
  senderRoutingNumber: string;
  /** Sender account (masked) */
  senderAccountMasked: string;
  /** Sender name */
  senderName: string;
  /** Receiver routing number */
  receiverRoutingNumber: string;
  /** Receiver account (masked) */
  receiverAccountMasked: string;
  /** Receiver name */
  receiverName: string;
  /** Payment description / remittance info */
  description: string;
  /** Rejection reason (if rejected) */
  rejectionReason: RejectionReason | null;
  /** Rejection detail message */
  rejectionDetail: string | null;
  /** Created timestamp (ISO 8601) */
  createdAt: string;
  /** Completed/settled timestamp (ISO 8601) */
  completedAt: string | null;

  // --- ISO 20022 Structured Remittance Data ---

  /** Structured remittance information */
  remittanceInfo?: StructuredRemittanceInfo | null;
}

/** ISO 20022 structured remittance information */
export interface StructuredRemittanceInfo {
  /** Invoice number or reference */
  invoiceNumber?: string;
  /** Tax ID of the sender or receiver */
  taxId?: string;
  /** Purpose of payment code (ISO 20022 ExternalPurpose1Code) */
  purposeCode?: string;
  /** Purpose description (e.g., "Family Support", "Trade Payment") */
  purposeDescription?: string;
  /** End-to-end reference (unique across the payment chain) */
  endToEndReference?: string;
  /** Creditor reference */
  creditorReference?: string;
}

// =============================================================================
// DYNAMIC QR CODE (Pix / UPI / local payment rails)
// =============================================================================

/** QR code type */
export type QRCodeType = 'static' | 'dynamic';

export interface GenerateQRRequest {
  tenantId: string;
  /** Account to receive payment into */
  receiverAccountId: string;
  /** Amount in cents (required for dynamic QR, optional for static) */
  amountCents?: number;
  /** Currency */
  currency?: string;
  /** Description / payment reference */
  description?: string;
  /** QR type (default: dynamic) */
  qrType?: QRCodeType;
  /** Expiration in minutes (default: 30 for dynamic) */
  expirationMinutes?: number;
  /** Payment rail */
  rail?: PaymentRail;
}

export interface GenerateQRResponse {
  /** QR payload string (to be rendered as QR code on client) */
  qrPayload: string;
  /** QR type */
  qrType: QRCodeType;
  /** Payment identifier embedded in the QR */
  paymentReference: string;
  /** When this QR expires (null for static) */
  expiresAt: string | null;
  /** Amount in cents (null for static open-amount) */
  amountCents: number | null;
  /** Currency */
  currency: string;
}

export interface RequestForPayment {
  /** RfP ID */
  rfpId: string;
  /** Payment rail */
  rail: PaymentRail;
  /** Status */
  status: RfPStatus;
  /** Requested amount in cents */
  amountCents: number;
  /** Currency */
  currency: string;
  /** Requester name */
  requesterName: string;
  /** Requester account (masked) */
  requesterAccountMasked: string;
  /** Payer name */
  payerName: string;
  /** Description / invoice reference */
  description: string;
  /** Expiration (ISO 8601) */
  expiresAt: string;
  /** Created timestamp */
  createdAt: string;
  /** Resulting payment ID if accepted */
  resultingPaymentId: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface SendPaymentRequest {
  tenantId: string;
  /** Source account ID (internal) */
  sourceAccountId: string;
  /** Receiver routing number (ABA for US rails) */
  receiverRoutingNumber: string;
  /** Receiver account number (will be transmitted securely, never logged) */
  receiverAccountNumber: string;
  /** Receiver name */
  receiverName: string;
  /** Amount in cents (or smallest currency unit) */
  amountCents: number;
  /** ISO 4217 currency (default: USD) */
  currency?: string;
  /** Payment description / remittance info */
  description: string;
  /** Preferred rail (null = auto-select fastest available) */
  preferredRail?: PaymentRail | null;
  /** Idempotency key to prevent duplicate sends */
  idempotencyKey: string;

  // --- International rail fields (optional, used by SEPA/Pix/UPI) ---

  /** Receiver IBAN (SEPA Instant) */
  receiverIBAN?: string;
  /** Receiver BIC/SWIFT code (SEPA Instant) */
  receiverBIC?: string;
  /** Pix key — CPF/CNPJ, email, phone, or EVP (Pix) */
  pixKey?: string;
  /** Pix key type */
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'evp';
  /** Receiver UPI Virtual Payment Address (UPI) */
  receiverVPA?: string;
  /** Receiver IFSC code (UPI / India) */
  receiverIFSC?: string;
}

export interface SendPaymentResponse {
  payment: InstantPayment;
}

export interface GetPaymentRequest {
  tenantId: string;
  paymentId: string;
}

export interface ListPaymentsRequest {
  tenantId: string;
  /** Account ID to filter by */
  accountId?: string;
  /** Direction filter */
  direction?: PaymentDirection;
  /** Status filter */
  status?: InstantPaymentStatus;
  /** Start date (ISO 8601) */
  startDate?: string;
  /** End date (ISO 8601) */
  endDate?: string;
  /** Max records */
  limit?: number;
  /** Pagination cursor */
  cursor?: string;
}

export interface ListPaymentsResponse {
  payments: InstantPayment[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface CheckReceiverRequest {
  tenantId: string;
  /** Receiver routing number (US rails) */
  routingNumber: string;
  /** Receiver account number (US rails) */
  accountNumber: string;
  /** Rail to check availability on */
  rail?: PaymentRail;

  // --- International identifiers ---

  /** Receiver IBAN (SEPA) */
  receiverIBAN?: string;
  /** Receiver BIC (SEPA) */
  receiverBIC?: string;
  /** Pix key (Pix) */
  pixKey?: string;
  /** UPI VPA (UPI) */
  receiverVPA?: string;
}

export interface CheckReceiverResponse {
  /** Whether the receiver can accept instant payments */
  eligible: boolean;
  /** Available rails for this receiver */
  availableRails: PaymentRail[];
  /** Receiver institution name */
  institutionName: string | null;
}

export interface SendRfPRequest {
  tenantId: string;
  /** Requester account ID */
  requesterAccountId: string;
  /** Payer routing number */
  payerRoutingNumber: string;
  /** Payer account number */
  payerAccountNumber: string;
  /** Payer name */
  payerName: string;
  /** Requested amount in cents */
  amountCents: number;
  /** Description / invoice reference */
  description: string;
  /** Expiration (ISO 8601) */
  expiresAt: string;
  /** Preferred rail */
  preferredRail?: PaymentRail;
}

export interface SendRfPResponse {
  rfp: RequestForPayment;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Instant Payments adapter — abstracts real-time payment operations.
 *
 * Implementations handle the specifics of each payment rail
 * (FedNow ISO 20022, RTP, etc.) while exposing a uniform interface.
 */
export interface InstantPaymentAdapter extends BaseAdapter {
  /** Send an instant payment */
  sendPayment(request: SendPaymentRequest): Promise<SendPaymentResponse>;

  /** Get payment details and current status */
  getPayment(request: GetPaymentRequest): Promise<InstantPayment>;

  /** List payments with filters */
  listPayments(request: ListPaymentsRequest): Promise<ListPaymentsResponse>;

  /** Check if a receiver can accept instant payments */
  checkReceiver(request: CheckReceiverRequest): Promise<CheckReceiverResponse>;

  /** Send a Request for Payment */
  sendRequestForPayment(request: SendRfPRequest): Promise<SendRfPResponse>;

  /** Generate a dynamic or static QR code for receiving payment (Pix, UPI) */
  generateQR?(request: GenerateQRRequest): Promise<GenerateQRResponse>;
}
