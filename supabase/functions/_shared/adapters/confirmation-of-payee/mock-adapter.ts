/**
 * Mock Confirmation of Payee Adapter
 *
 * Returns simulated name-match results for sandbox/testing.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_TIMEOUT_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  ConfirmationOfPayeeAdapter,
  VerifyPayeeRequest,
  VerifyPayeeResponse,
  GetVerificationRequest,
  GetVerificationResponse,
  CoPScheme,
} from './types.ts';

export class MockConfirmationOfPayeeAdapter implements ConfirmationOfPayeeAdapter {
  readonly config: AdapterConfig = {
    id: 'mock-cop',
    name: 'Mock Confirmation of Payee',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: DEFAULT_TIMEOUT_CONFIG,
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  async healthCheck(): Promise<AdapterHealth> {
    return { adapterId: this.config.id, healthy: true, circuitState: 'closed', lastCheckedAt: new Date().toISOString() };
  }

  async verifyPayee(request: VerifyPayeeRequest): Promise<VerifyPayeeResponse> {
    const scheme = request.scheme ?? this.detectScheme(request);
    const verificationId = `cop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      verification: {
        verificationId,
        scheme,
        matchResult: 'exact_match',
        verifiedName: request.payeeName,
        providedName: request.payeeName,
        closeMatchReason: null,
        receivingInstitution: 'Mock Bank Ltd',
        verifiedAt: new Date().toISOString(),
        responseCode: '00',
      },
    };
  }

  async getVerification(request: GetVerificationRequest): Promise<GetVerificationResponse> {
    return {
      verification: {
        verificationId: request.verificationId,
        scheme: 'generic',
        matchResult: 'exact_match',
        verifiedName: 'Mock Payee',
        providedName: 'Mock Payee',
        closeMatchReason: null,
        receivingInstitution: 'Mock Bank Ltd',
        verifiedAt: new Date().toISOString(),
        responseCode: '00',
      },
    };
  }

  private detectScheme(request: VerifyPayeeRequest): CoPScheme {
    if (request.iban) return 'sepa_vop';
    if (request.sortCode) return 'uk_cop';
    if (request.pixKey) return 'pix_dict';
    if (request.vpa) return 'upi_vpa';
    return 'generic';
  }
}
