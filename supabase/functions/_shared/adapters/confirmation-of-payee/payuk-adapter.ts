/**
 * Pay.UK Confirmation of Payee Adapter
 *
 * Real implementation for UK CoP via the Pay.UK Open Banking API.
 * Also supports SEPA VoP fallback via EPC scheme providers.
 *
 * API Reference: Pay.UK CoP v3 — name-matching against sort code + account number
 * or IBAN + BIC for SEPA participants.
 */

import type { AdapterConfig, AdapterHealth } from '../types.ts';
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from '../types.ts';
import type {
  ConfirmationOfPayeeAdapter,
  VerifyPayeeRequest,
  VerifyPayeeResponse,
  GetVerificationRequest,
  GetVerificationResponse,
  CoPScheme,
} from './types.ts';

// =============================================================================
// PAY.UK API TYPES
// =============================================================================

interface PayUKVerifyRequest {
  Identification: {
    SchemeName: string;
    Identification: string;
    SecondaryIdentification?: string;
  };
  Name: string;
}

interface PayUKVerifyResponse {
  Data: {
    VerificationReport: {
      Matched: boolean;
      Name: string;
      ReasonCode: string;
      ReasonDescription: string;
    };
  };
}

// =============================================================================
// ADAPTER IMPLEMENTATION
// =============================================================================

export class PayUKConfirmationOfPayeeAdapter implements ConfirmationOfPayeeAdapter {
  readonly config: AdapterConfig = {
    id: 'payuk-cop',
    name: 'Pay.UK Confirmation of Payee',
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 10000 },
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;

  constructor() {
    this.baseUrl = Deno.env.get('PAYUK_COP_BASE_URL') ?? 'https://api.payuk.org.uk/cop/v3';
    this.clientId = Deno.env.get('PAYUK_CLIENT_ID') ?? '';
    this.clientSecret = Deno.env.get('PAYUK_CLIENT_SECRET') ?? '';
  }

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      return {
        adapterId: this.config.id,
        healthy: response.ok,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: 'closed',
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : 'Health check failed',
      };
    }
  }

  async verifyPayee(request: VerifyPayeeRequest): Promise<VerifyPayeeResponse> {
    const scheme = request.scheme ?? this.detectScheme(request);
    const verificationId = `cop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const payukRequest = this.buildPayUKRequest(request, scheme);

    const response = await fetch(`${this.baseUrl}/name-verification`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payukRequest),
      signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pay.UK CoP API error (${response.status}): ${errorText}`);
    }

    const payukResponse = await response.json() as PayUKVerifyResponse;
    const report = payukResponse.Data.VerificationReport;

    const matchResult = this.mapMatchResult(report.ReasonCode);

    return {
      verification: {
        verificationId,
        scheme,
        matchResult,
        verifiedName: matchResult === 'exact_match' || matchResult === 'close_match'
          ? report.Name
          : null,
        providedName: request.payeeName,
        closeMatchReason: matchResult === 'close_match'
          ? `Name differs: provided '${request.payeeName}', registered '${report.Name}'`
          : null,
        receivingInstitution: null,
        verifiedAt: new Date().toISOString(),
        responseCode: report.ReasonCode,
      },
    };
  }

  async getVerification(request: GetVerificationRequest): Promise<GetVerificationResponse> {
    const response = await fetch(
      `${this.baseUrl}/verifications/${request.verificationId}`,
      {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(this.config.timeout.requestTimeoutMs),
      },
    );

    if (!response.ok) {
      throw new Error(`Pay.UK CoP API error (${response.status})`);
    }

    const data = await response.json() as { verification: GetVerificationResponse['verification'] };
    return { verification: data.verification };
  }

  // ---------------------------------------------------------------------------
  // PRIVATE HELPERS
  // ---------------------------------------------------------------------------

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
      'x-request-id': `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  private buildPayUKRequest(request: VerifyPayeeRequest, scheme: CoPScheme): PayUKVerifyRequest {
    let identification: PayUKVerifyRequest['Identification'];

    switch (scheme) {
      case 'uk_cop':
        identification = {
          SchemeName: 'UK.OBIE.SortCodeAccountNumber',
          Identification: `${request.sortCode}${request.accountNumber}`,
        };
        break;
      case 'sepa_vop':
        identification = {
          SchemeName: 'UK.OBIE.IBAN',
          Identification: request.iban ?? '',
          SecondaryIdentification: request.bic,
        };
        break;
      default:
        identification = {
          SchemeName: 'UK.OBIE.SortCodeAccountNumber',
          Identification: request.accountNumber ?? '',
        };
    }

    return { Identification: identification, Name: request.payeeName };
  }

  private mapMatchResult(reasonCode: string): CoPMatchResult {
    switch (reasonCode) {
      case 'MTCH': return 'exact_match';
      case 'MBAM': return 'close_match';
      case 'NMTC': return 'no_match';
      case 'ANNF': return 'account_not_found';
      case 'OPTO': return 'opted_out';
      case 'NFND': return 'unavailable';
      default: return 'unavailable';
    }
  }

  private detectScheme(request: VerifyPayeeRequest): CoPScheme {
    if (request.sortCode) return 'uk_cop';
    if (request.iban) return 'sepa_vop';
    if (request.pixKey) return 'pix_dict';
    if (request.vpa) return 'upi_vpa';
    return 'generic';
  }
}
