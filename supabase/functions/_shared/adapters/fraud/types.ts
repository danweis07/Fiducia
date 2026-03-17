/**
 * Advanced Fraud Detection Adapter Interface
 *
 * Defines the port for behavioral biometric and fraud detection operations:
 *   - Session risk scoring (behavioral biometrics)
 *   - Transaction fraud screening
 *   - Elder/vulnerable member scam detection
 *   - Device trust and anomaly detection
 *   - Fraud alert management
 *
 * Implementations:
 *   - BioCatch (behavioral biometrics + scam detection)
 *   - Mock adapter (sandbox/testing)
 */

import type { BaseAdapter } from '../types.ts';

// =============================================================================
// FRAUD DETECTION TYPES
// =============================================================================

/** Risk level classification */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/** Fraud signal category */
export type FraudSignalType =
  | 'behavioral_anomaly'    // Unusual typing/mouse/touch patterns
  | 'session_anomaly'       // Unusual session behavior (remote access, coaching)
  | 'device_anomaly'        // New/spoofed device, VPN, emulator
  | 'velocity_anomaly'      // Unusual transaction frequency or amounts
  | 'scam_indicator'        // Signs of social engineering / elder scam
  | 'account_takeover'      // Credential compromise indicators
  | 'bot_detected';         // Automated/scripted activity

/** Scam type classification (maps to BioCatch scam detection categories) */
export type ScamType =
  | 'voice_scam'            // Member being coached via phone
  | 'remote_access'         // Remote desktop / screen share detected
  | 'social_engineering'    // Manipulation patterns detected
  | 'romance_scam'          // Unusual transfer patterns to new recipients
  | 'impersonation'         // Someone pretending to be the member
  | 'authorized_push'       // Member manipulated into sending money
  | 'unknown';

/** Session activity type being evaluated */
export type SessionActivity =
  | 'login'
  | 'transfer'
  | 'bill_pay'
  | 'beneficiary_add'
  | 'profile_change'
  | 'card_activation'
  | 'password_change';

// =============================================================================
// DATA MODELS
// =============================================================================

export interface FraudSignal {
  /** Signal type */
  type: FraudSignalType;
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
  /** Human-readable description */
  description: string;
  /** Raw signal data from provider */
  metadata: Record<string, unknown>;
}

export interface RiskAssessment {
  /** Assessment ID */
  assessmentId: string;
  /** Session ID being assessed */
  sessionId: string;
  /** Customer ID */
  customerId: string;
  /** Overall risk score (0 - 1000, higher = riskier) */
  riskScore: number;
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Individual fraud signals detected */
  signals: FraudSignal[];
  /** Whether a scam pattern was detected */
  scamDetected: boolean;
  /** Scam type if detected */
  scamType: ScamType | null;
  /** Recommended action */
  recommendedAction: 'allow' | 'challenge' | 'block' | 'review';
  /** Whether the member appears to be a vulnerable individual (elderly, etc.) */
  vulnerableMemberIndicator: boolean;
  /** Assessment timestamp */
  assessedAt: string;
}

export interface TransactionRiskResult {
  /** Transaction reference */
  transactionId: string;
  /** Risk score (0 - 1000) */
  riskScore: number;
  /** Risk level */
  riskLevel: RiskLevel;
  /** Fraud signals */
  signals: FraudSignal[];
  /** Whether to allow, challenge, or block */
  decision: 'allow' | 'challenge' | 'block';
  /** Reason for decision */
  decisionReason: string;
  /** Scam indicators */
  scamDetected: boolean;
  scamType: ScamType | null;
}

export interface FraudAlert {
  /** Alert ID */
  alertId: string;
  /** Customer ID */
  customerId: string;
  /** Alert severity */
  severity: RiskLevel;
  /** Alert type */
  type: FraudSignalType;
  /** Description */
  description: string;
  /** Whether this has been reviewed */
  reviewed: boolean;
  /** Reviewer notes */
  reviewNotes: string | null;
  /** Created timestamp */
  createdAt: string;
  /** Reviewed timestamp */
  reviewedAt: string | null;
}

// =============================================================================
// REQUEST / RESPONSE TYPES
// =============================================================================

export interface AssessSessionRequest {
  tenantId: string;
  /** Browser/app session ID */
  sessionId: string;
  /** Customer ID */
  customerId: string;
  /** Activity being performed */
  activity: SessionActivity;
  /** BioCatch session token (collected by client-side SDK) */
  biometricToken?: string;
  /** Client IP address */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Device fingerprint */
  deviceFingerprint?: string;
}

export interface AssessSessionResponse {
  assessment: RiskAssessment;
}

export interface ScreenTransactionRequest {
  tenantId: string;
  /** Session ID for behavioral context */
  sessionId: string;
  /** Customer ID */
  customerId: string;
  /** Transaction ID */
  transactionId: string;
  /** Transaction amount in cents */
  amountCents: number;
  /** Destination account (masked for logging) */
  destinationAccountMasked: string;
  /** Whether destination is a new/first-time recipient */
  isNewRecipient: boolean;
  /** Transaction type */
  transactionType: 'transfer' | 'bill_pay' | 'instant_payment' | 'wire';
  /** BioCatch session token */
  biometricToken?: string;
}

export interface ScreenTransactionResponse {
  result: TransactionRiskResult;
}

export interface ListAlertsRequest {
  tenantId: string;
  /** Filter by customer ID */
  customerId?: string;
  /** Filter by severity */
  severity?: RiskLevel;
  /** Only unreviewed alerts */
  unreviewedOnly?: boolean;
  /** Start date (ISO 8601) */
  startDate?: string;
  /** End date (ISO 8601) */
  endDate?: string;
  /** Max records */
  limit?: number;
}

export interface ListAlertsResponse {
  alerts: FraudAlert[];
  total: number;
}

export interface ReviewAlertRequest {
  tenantId: string;
  alertId: string;
  /** Whether fraud was confirmed */
  fraudConfirmed: boolean;
  /** Reviewer notes */
  notes: string;
}

export interface ReviewAlertResponse {
  alert: FraudAlert;
}

export interface ReportFraudRequest {
  tenantId: string;
  /** Customer ID */
  customerId: string;
  /** Related session ID */
  sessionId?: string;
  /** Related transaction ID */
  transactionId?: string;
  /** Fraud type */
  fraudType: FraudSignalType;
  /** Description from member or staff */
  description: string;
}

export interface ReportFraudResponse {
  alert: FraudAlert;
}

// =============================================================================
// ADAPTER INTERFACE
// =============================================================================

/**
 * Fraud detection adapter — abstracts behavioral biometric and fraud detection.
 *
 * Implementations handle provider-specific APIs (BioCatch, etc.) while
 * exposing a uniform interface for session risk scoring, transaction
 * screening, and elder scam detection.
 */
export interface FraudAdapter extends BaseAdapter {
  /** Assess a session for fraud risk using behavioral biometrics */
  assessSession(request: AssessSessionRequest): Promise<AssessSessionResponse>;

  /** Screen a transaction for fraud before processing */
  screenTransaction(request: ScreenTransactionRequest): Promise<ScreenTransactionResponse>;

  /** List fraud alerts for review */
  listAlerts(request: ListAlertsRequest): Promise<ListAlertsResponse>;

  /** Review/disposition a fraud alert */
  reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse>;

  /** Report suspected fraud (member or staff initiated) */
  reportFraud(request: ReportFraudRequest): Promise<ReportFraudResponse>;
}
