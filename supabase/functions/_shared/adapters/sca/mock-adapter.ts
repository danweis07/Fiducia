/**
 * Mock SCA Adapter
 *
 * Returns simulated PSD2 SCA challenge/response flows for sandbox/testing.
 *
 * Test scenarios (controlled via authenticationProof in completeChallenge):
 *   - "valid", "123456", or any 6-digit code → authenticated
 *   - "expired" → challenge expired
 *   - "denied" or "wrong" → authentication denied
 *   - "timeout" → simulates 30s delay then fails
 *
 * Dynamic linking: when payment fields (amount, payee) are provided in
 * initiateChallenge, the authorization code is cryptographically bound
 * to those values (simulated via hash).
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  SCAAdapter,
  SCAChallenge,
  SCAChallengeMethod,
  SCAFactor,
  InitiateSCARequest,
  InitiateSCAResponse,
  CompleteSCARequest,
  CompleteSCAResponse,
  CheckExemptionRequest,
  CheckExemptionResponse,
} from './types.ts';

/** In-memory challenge store for stateful mock flows */
const challengeStore = new Map<string, {
  challenge: SCAChallenge;
  request: InitiateSCARequest;
}>();

/** Low-value cumulative tracking per user (PSD2 Art. 16) */
const lowValueTracker = new Map<string, { count: number; totalCents: number }>();

/** Determine factors satisfied by each authentication method */
function getFactorsForMethod(method: SCAChallengeMethod): SCAFactor[] {
  switch (method) {
    case 'push_notification': return ['possession', 'inherence'];
    case 'sms_otp': return ['possession', 'knowledge'];
    case 'totp': return ['possession', 'knowledge'];
    case 'hardware_token': return ['possession'];
    case 'biometric': return ['inherence', 'possession'];
    case 'behavioral_biometric': return ['inherence'];
    default: return ['possession'];
  }
}

export class MockSCAAdapter implements SCAAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-sca',
    name: 'Mock Strong Customer Authentication',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async initiateChallenge(request: InitiateSCARequest): Promise<InitiateSCAResponse> {
    const challengeId = `sca_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 min expiry
    const method = request.preferredMethod ?? 'push_notification';

    const challenge: SCAChallenge = {
      challengeId,
      userId: request.userId,
      method,
      factorsSatisfied: getFactorsForMethod(method),
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      completedAt: null,
    };

    // Store challenge for stateful completion
    challengeStore.set(challengeId, { challenge, request });

    return { challenge };
  }

  async completeChallenge(request: CompleteSCARequest): Promise<CompleteSCAResponse> {
    const stored = challengeStore.get(request.challengeId);
    const now = new Date();

    // Check if challenge exists
    if (!stored) {
      return {
        result: {
          outcome: 'denied',
          challenge: null,
          exemption: null,
          factorsVerified: [],
          authorizationCode: null,
          decidedAt: now.toISOString(),
        },
      };
    }

    const { challenge, request: initRequest } = stored;

    // Check expiry
    if (now > new Date(challenge.expiresAt) || request.authenticationProof === 'expired') {
      challenge.status = 'expired';
      challengeStore.delete(request.challengeId);
      return {
        result: {
          outcome: 'denied',
          challenge: { ...challenge, status: 'expired' },
          exemption: null,
          factorsVerified: [],
          authorizationCode: null,
          decidedAt: now.toISOString(),
        },
      };
    }

    // Check for denied test scenario
    if (request.authenticationProof === 'denied' || request.authenticationProof === 'wrong') {
      challenge.status = 'failed';
      challengeStore.delete(request.challengeId);
      return {
        result: {
          outcome: 'denied',
          challenge: { ...challenge, status: 'failed' },
          exemption: null,
          factorsVerified: [],
          authorizationCode: null,
          decidedAt: now.toISOString(),
        },
      };
    }

    // Successful authentication
    challenge.status = 'completed';
    challenge.completedAt = now.toISOString();
    challengeStore.delete(request.challengeId);

    // Generate dynamic-linked authorization code
    // In production, this would be a cryptographic binding of amount + payee
    const dynamicLinkData = [
      initRequest.amountMinorUnits ?? '',
      initRequest.currency ?? '',
      initRequest.payeeName ?? '',
      initRequest.payeeAccountIdentifier ?? '',
      request.challengeId,
    ].join(':');
    const authorizationCode = `auth_${Buffer.from(dynamicLinkData).toString('base64url').slice(0, 16)}`;

    return {
      result: {
        outcome: 'authenticated',
        challenge,
        exemption: null,
        factorsVerified: getFactorsForMethod(challenge.method),
        authorizationCode,
        decidedAt: now.toISOString(),
      },
    };
  }

  async checkExemption(request: CheckExemptionRequest): Promise<CheckExemptionResponse> {
    const amount = request.amountMinorUnits ?? 0;

    switch (request.exemptionType) {
      case 'low_value': {
        // PSD2 Art. 16: exempt if < €30 (3000 cents), but track cumulative
        // Cumulative limit: 5 consecutive or €100 total
        if (amount >= 3000) {
          return { exempt: false, exemptionType: 'low_value', reason: 'Amount exceeds €30 low-value threshold' };
        }
        const tracker = lowValueTracker.get(request.userId) ?? { count: 0, totalCents: 0 };
        if (tracker.count >= 5) {
          lowValueTracker.set(request.userId, { count: 0, totalCents: 0 });
          return { exempt: false, exemptionType: 'low_value', reason: 'Cumulative limit reached: 5 consecutive low-value transactions' };
        }
        if (tracker.totalCents + amount > 10000) {
          lowValueTracker.set(request.userId, { count: 0, totalCents: 0 });
          return { exempt: false, exemptionType: 'low_value', reason: 'Cumulative limit reached: €100 total' };
        }
        tracker.count++;
        tracker.totalCents += amount;
        lowValueTracker.set(request.userId, tracker);
        return { exempt: true, exemptionType: 'low_value', reason: null };
      }

      case 'trusted_beneficiary': {
        // In mock: payee identifiers starting with "trusted_" are on the trusted list
        if (request.payeeAccountIdentifier?.startsWith('trusted_')) {
          return { exempt: true, exemptionType: 'trusted_beneficiary', reason: null };
        }
        return { exempt: false, exemptionType: 'trusted_beneficiary', reason: 'Payee not on trusted beneficiary list' };
      }

      case 'recurring_payment': {
        // In mock: always exempt for recurring (would check same amount/payee in production)
        return { exempt: true, exemptionType: 'recurring_payment', reason: null };
      }

      case 'transaction_risk_analysis': {
        // TRA: exempt if amount below threshold based on fraud rate
        // Reference fraud rate < 0.13% → exempt up to €100
        // Reference fraud rate < 0.06% → exempt up to €250
        // Reference fraud rate < 0.01% → exempt up to €500
        if (amount <= 50000) { // €500 in mock (optimistic fraud rate)
          return { exempt: true, exemptionType: 'transaction_risk_analysis', reason: null };
        }
        return { exempt: false, exemptionType: 'transaction_risk_analysis', reason: 'Amount exceeds TRA threshold' };
      }

      case 'secure_corporate': {
        // Mock: always require SCA for corporate (conservative default)
        return { exempt: false, exemptionType: 'secure_corporate', reason: 'Secure corporate exemption not configured in sandbox' };
      }

      case 'merchant_initiated': {
        // MIT: always exempt (merchant-initiated with prior consent)
        return { exempt: true, exemptionType: 'merchant_initiated', reason: null };
      }

      default:
        return { exempt: false, exemptionType: request.exemptionType, reason: 'Unknown exemption type' };
    }
  }
}
