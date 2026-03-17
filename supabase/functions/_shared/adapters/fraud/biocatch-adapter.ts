// TODO: Provisional integration — not yet validated in production.
/**
 * BioCatch Advanced Fraud Detection Adapter
 *
 * Integrates with BioCatch behavioral biometrics platform for:
 *   - Continuous behavioral authentication
 *   - Session risk scoring
 *   - Elder/vulnerable member scam detection
 *   - Account takeover prevention
 *   - Remote access detection
 *
 * Requirements:
 *   - BIOCATCH_API_URL: BioCatch API endpoint
 *   - BIOCATCH_CUSTOMER_ID: BioCatch customer (institution) ID
 *   - BIOCATCH_API_KEY: API authentication key
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  FraudAdapter,
  RiskAssessment,
  RiskLevel,
  FraudSignal,
  FraudSignalType,
  ScamType,
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
// BIOCATCH RESPONSE TYPE MAPPINGS
// =============================================================================

function mapBioCatchRiskLevel(score: number): RiskLevel {
  if (score >= 800) return 'critical';
  if (score >= 600) return 'high';
  if (score >= 300) return 'medium';
  return 'low';
}

function mapBioCatchSignalType(bioCatchType: string): FraudSignalType {
  switch (bioCatchType) {
    case 'BEHAVIORAL': return 'behavioral_anomaly';
    case 'SESSION': return 'session_anomaly';
    case 'DEVICE': return 'device_anomaly';
    case 'VELOCITY': return 'velocity_anomaly';
    case 'SOCIAL_ENGINEERING':
    case 'SCAM': return 'scam_indicator';
    case 'ATO': return 'account_takeover';
    case 'BOT': return 'bot_detected';
    default: return 'behavioral_anomaly';
  }
}

function mapBioCatchScamType(bioCatchScam: string | null): ScamType | null {
  if (!bioCatchScam) return null;
  switch (bioCatchScam) {
    case 'VOICE_SCAM': return 'voice_scam';
    case 'RAT':
    case 'REMOTE_ACCESS': return 'remote_access';
    case 'SOCIAL_ENGINEERING': return 'social_engineering';
    case 'ROMANCE': return 'romance_scam';
    case 'IMPERSONATION': return 'impersonation';
    case 'APP':
    case 'AUTHORIZED_PUSH': return 'authorized_push';
    default: return 'unknown';
  }
}

function mapDecision(score: number): 'allow' | 'challenge' | 'block' {
  if (score >= 800) return 'block';
  if (score >= 500) return 'challenge';
  return 'allow';
}

// =============================================================================
// ADAPTER
// =============================================================================

export class BioCatchAdapter implements FraudAdapter {
  private readonly apiUrl: string;
  private readonly customerId: string;
  private readonly apiKey: string;

  readonly config: AdapterConfig = {
    id: 'biocatch',
    name: 'BioCatch Behavioral Biometrics',
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 },
    timeout: { requestTimeoutMs: 10000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  constructor() {
    this.apiUrl = Deno.env.get('BIOCATCH_API_URL') ?? '';
    this.customerId = Deno.env.get('BIOCATCH_CUSTOMER_ID') ?? '';
    this.apiKey = Deno.env.get('BIOCATCH_API_KEY') ?? '';
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Customer-Id': this.customerId,
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        headers: this.headers(),
        signal: AbortSignal.timeout(5000),
      });
      return {
        adapterId: this.config.id,
        healthy: response.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'open',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'BioCatch health check failed',
      };
    }
  }

  async assessSession(request: AssessSessionRequest): Promise<AssessSessionResponse> {
    const response = await fetch(`${this.apiUrl}/v2/sessions/assess`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        sessionId: request.sessionId,
        userId: request.customerId,
        activityType: request.activity.toUpperCase(),
        sessionToken: request.biometricToken,
        clientIp: request.ipAddress,
        userAgent: request.userAgent,
        deviceFingerprint: request.deviceFingerprint,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`BioCatch session assessment failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const riskScore: number = result.riskScore ?? 0;
    const signals: FraudSignal[] = (result.signals ?? []).map((s: Record<string, unknown>) => ({
      type: mapBioCatchSignalType(s.type as string),
      confidence: (s.confidence as number) ?? 0,
      description: (s.description as string) ?? '',
      metadata: (s.rawData as Record<string, unknown>) ?? {},
    }));

    const assessment: RiskAssessment = {
      assessmentId: result.assessmentId ?? `BC-${Date.now()}`,
      sessionId: request.sessionId,
      customerId: request.customerId,
      riskScore,
      riskLevel: mapBioCatchRiskLevel(riskScore),
      signals,
      scamDetected: result.scamDetected === true,
      scamType: mapBioCatchScamType(result.scamType ?? null),
      recommendedAction: mapDecision(riskScore),
      vulnerableMemberIndicator: result.vulnerableUser === true,
      assessedAt: new Date().toISOString(),
    };

    return { assessment };
  }

  async screenTransaction(request: ScreenTransactionRequest): Promise<ScreenTransactionResponse> {
    const response = await fetch(`${this.apiUrl}/v2/transactions/screen`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        sessionId: request.sessionId,
        userId: request.customerId,
        transactionId: request.transactionId,
        amount: request.amountCents,
        destinationMasked: request.destinationAccountMasked,
        isNewRecipient: request.isNewRecipient,
        transactionType: request.transactionType.toUpperCase(),
        sessionToken: request.biometricToken,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`BioCatch transaction screening failed (${response.status}): ${errorBody}`);
    }

    const result = await response.json();
    const riskScore: number = result.riskScore ?? 0;

    const txResult: TransactionRiskResult = {
      transactionId: request.transactionId,
      riskScore,
      riskLevel: mapBioCatchRiskLevel(riskScore),
      signals: (result.signals ?? []).map((s: Record<string, unknown>) => ({
        type: mapBioCatchSignalType(s.type as string),
        confidence: (s.confidence as number) ?? 0,
        description: (s.description as string) ?? '',
        metadata: (s.rawData as Record<string, unknown>) ?? {},
      })),
      decision: mapDecision(riskScore),
      decisionReason: result.decisionReason ?? '',
      scamDetected: result.scamDetected === true,
      scamType: mapBioCatchScamType(result.scamType ?? null),
    };

    return { result: txResult };
  }

  async listAlerts(request: ListAlertsRequest): Promise<ListAlertsResponse> {
    const params = new URLSearchParams();
    if (request.customerId) params.set('userId', request.customerId);
    if (request.severity) params.set('severity', request.severity.toUpperCase());
    if (request.unreviewedOnly) params.set('reviewed', 'false');
    if (request.startDate) params.set('startDate', request.startDate);
    if (request.endDate) params.set('endDate', request.endDate);
    if (request.limit) params.set('limit', String(request.limit));

    const response = await fetch(`${this.apiUrl}/v2/alerts?${params}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`BioCatch listAlerts failed (${response.status})`);
    }

    const result = await response.json();
    const alerts: FraudAlert[] = (result.alerts ?? []).map((a: Record<string, unknown>) => ({
      alertId: a.alertId as string,
      customerId: a.userId as string,
      severity: (a.severity as string)?.toLowerCase() as RiskLevel ?? 'medium',
      type: mapBioCatchSignalType(a.type as string),
      description: (a.description as string) ?? '',
      reviewed: a.reviewed === true,
      reviewNotes: (a.reviewNotes as string) ?? null,
      createdAt: a.createdAt as string,
      reviewedAt: (a.reviewedAt as string) ?? null,
    }));

    return { alerts, total: result.total ?? alerts.length };
  }

  async reviewAlert(request: ReviewAlertRequest): Promise<ReviewAlertResponse> {
    const response = await fetch(`${this.apiUrl}/v2/alerts/${request.alertId}/review`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        fraudConfirmed: request.fraudConfirmed,
        notes: request.notes,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`BioCatch reviewAlert failed (${response.status})`);
    }

    const result = await response.json();
    return {
      alert: {
        alertId: request.alertId,
        customerId: result.userId ?? '',
        severity: (result.severity as string)?.toLowerCase() as RiskLevel ?? 'medium',
        type: mapBioCatchSignalType(result.type as string ?? 'BEHAVIORAL'),
        description: result.description ?? '',
        reviewed: true,
        reviewNotes: request.notes,
        createdAt: result.createdAt ?? '',
        reviewedAt: new Date().toISOString(),
      },
    };
  }

  async reportFraud(request: ReportFraudRequest): Promise<ReportFraudResponse> {
    const response = await fetch(`${this.apiUrl}/v2/fraud-reports`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        userId: request.customerId,
        sessionId: request.sessionId,
        transactionId: request.transactionId,
        fraudType: request.fraudType.toUpperCase(),
        description: request.description,
      }),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`BioCatch reportFraud failed (${response.status})`);
    }

    const result = await response.json();
    return {
      alert: {
        alertId: result.alertId ?? `BC-FR-${Date.now()}`,
        customerId: request.customerId,
        severity: 'high',
        type: request.fraudType,
        description: request.description,
        reviewed: false,
        reviewNotes: null,
        createdAt: new Date().toISOString(),
        reviewedAt: null,
      },
    };
  }
}
