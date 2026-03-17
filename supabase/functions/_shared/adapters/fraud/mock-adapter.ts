/**
 * Mock Fraud Detection Adapter
 *
 * Returns synthetic fraud assessment data for sandbox/testing when no
 * BioCatch or other fraud detection credentials are configured.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  FraudAdapter,
  RiskAssessment,
  TransactionRiskResult,
  FraudAlert,
  AssessSessionRequest,
  AssessSessionResponse,
  ScreenTransactionRequest,
  ScreenTransactionResponse,
  ListAlertsRequest,
  ListAlertsResponse,
  ReviewAlertRequest,
  ReviewAlertResponse,
  ReportFraudRequest,
  ReportFraudResponse,
} from './types.ts';

// =============================================================================
// MOCK DATA
// =============================================================================

function mockAlerts(): FraudAlert[] {
  return [
    {
      alertId: 'FA-MOCK-001',
      customerId: 'mock-customer-001',
      severity: 'high',
      type: 'scam_indicator',
      description: 'Possible voice scam detected — member appears coached during large transfer to new recipient',
      reviewed: false,
      reviewNotes: null,
      createdAt: '2026-03-15T09:30:00Z',
      reviewedAt: null,
    },
    {
      alertId: 'FA-MOCK-002',
      customerId: 'mock-customer-002',
      severity: 'medium',
      type: 'session_anomaly',
      description: 'Remote access software detected during online banking session',
      reviewed: true,
      reviewNotes: 'Confirmed legitimate — member was using IT support for accessibility',
      createdAt: '2026-03-14T14:15:00Z',
      reviewedAt: '2026-03-14T16:00:00Z',
    },
    {
      alertId: 'FA-MOCK-003',
      customerId: 'mock-customer-003',
      severity: 'critical',
      type: 'account_takeover',
      description: 'Behavioral biometrics mismatch — typing pattern does not match known profile',
      reviewed: false,
      reviewNotes: null,
      createdAt: '2026-03-15T11:00:00Z',
      reviewedAt: null,
    },
  ];
}

// =============================================================================
// ADAPTER
// =============================================================================

export class MockFraudAdapter implements FraudAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-fraud',
    name: 'Mock Fraud Detection Adapter',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.config.id,
      healthy: true,
      circuitState: 'closed',
      lastCheckedAt: new Date().toISOString(),
      errorMessage: 'Running in sandbox mode',
    };
  }

  async assessSession(request: AssessSessionRequest): Promise<AssessSessionResponse> {
    const assessment: RiskAssessment = {
      assessmentId: `RA-MOCK-${Date.now()}`,
      sessionId: request.sessionId,
      customerId: request.customerId,
      riskScore: 120,
      riskLevel: 'low',
      signals: [
        {
          type: 'behavioral_anomaly',
          confidence: 0.15,
          description: 'Minor deviation in typing cadence — within normal variance',
          metadata: { typingSpeed: 42, baseline: 45 },
        },
      ],
      scamDetected: false,
      scamType: null,
      recommendedAction: 'allow',
      vulnerableMemberIndicator: false,
      assessedAt: new Date().toISOString(),
    };
    return { assessment };
  }

  async screenTransaction(request: ScreenTransactionRequest): Promise<ScreenTransactionResponse> {
    // Simulate higher risk for large transfers to new recipients
    const isHighRisk = request.isNewRecipient && request.amountCents > 100000;
    const result: TransactionRiskResult = {
      transactionId: request.transactionId,
      riskScore: isHighRisk ? 650 : 85,
      riskLevel: isHighRisk ? 'high' : 'low',
      signals: isHighRisk
        ? [
            {
              type: 'velocity_anomaly',
              confidence: 0.72,
              description: 'Large transfer to first-time recipient exceeds typical pattern',
              metadata: { amountCents: request.amountCents, isNewRecipient: true },
            },
            {
              type: 'scam_indicator',
              confidence: 0.45,
              description: 'Transfer pattern consistent with authorized push payment scam',
              metadata: {},
            },
          ]
        : [],
      decision: isHighRisk ? 'challenge' : 'allow',
      decisionReason: isHighRisk
        ? 'Large transfer to new recipient requires additional verification'
        : 'Transaction within normal parameters',
      scamDetected: false,
      scamType: null,
    };
    return { result };
  }

  async listAlerts(request: ListAlertsRequest): Promise<ListAlertsResponse> {
    let alerts = mockAlerts();
    if (request.customerId) alerts = alerts.filter(a => a.customerId === request.customerId);
    if (request.severity) alerts = alerts.filter(a => a.severity === request.severity);
    if (request.unreviewedOnly) alerts = alerts.filter(a => !a.reviewed);
    if (request.startDate) alerts = alerts.filter(a => a.createdAt >= request.startDate!);
    if (request.endDate) alerts = alerts.filter(a => a.createdAt <= request.endDate!);
    const limit = request.limit ?? 50;
    return { alerts: alerts.slice(0, limit), total: alerts.length };
  }

  async reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse> {
    const alerts = mockAlerts();
    const alert = alerts.find(a => a.alertId === request.alertId) ?? alerts[0];
    return {
      alert: {
        ...alert,
        alertId: request.alertId,
        reviewed: true,
        reviewNotes: request.notes,
        reviewedAt: new Date().toISOString(),
      },
    };
  }

  async reportFraud(request: ReportFraudRequest): Promise<ReportFraudResponse> {
    const alert: FraudAlert = {
      alertId: `FA-MOCK-${Date.now()}`,
      customerId: request.customerId,
      severity: 'high',
      type: request.fraudType,
      description: request.description,
      reviewed: false,
      reviewNotes: null,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };
    return { alert };
  }
}
