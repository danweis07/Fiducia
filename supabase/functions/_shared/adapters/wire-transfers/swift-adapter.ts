/**
 * SWIFT gpi Wire Transfer Adapter
 *
 * Integrates with the SWIFT gpi (Global Payments Innovation) API v5 for
 * international cross-border wire transfers. Supports:
 *   - gCCT (Customer Credit Transfers) — pacs.008
 *   - gpi Tracker — real-time payment tracking via UETR
 *   - Stop and Recall (SRP) — cancel/recall in-flight wires
 *
 * Authentication: OAuth 2.0 with JWT-Bearer grant (RFC 7523)
 *
 * Required env vars:
 *   SWIFT_BASE_URL            — SWIFT API endpoint (sandbox: https://sandbox.swift.com)
 *   SWIFT_API_KEY             — Application API key (x-api-key)
 *   SWIFT_CONSUMER_KEY        — OAuth consumer key
 *   SWIFT_CONSUMER_SECRET     — OAuth consumer secret
 *   SWIFT_BIC                 — Originator's SWIFT/BIC code
 *   SWIFT_CERT                — Signing certificate (base64-encoded PEM)
 *   SWIFT_CERT_KEY            — Signing private key (base64-encoded PEM)
 *
 * Sandbox:
 *   Free sandbox at https://developer.swift.com
 *   Test lauKey: Abcd1234Abcd1234Abcd1234Abcd1234
 *   Demo app: https://github.com/swiftinc/gpi-v5-demo-app
 *
 * Docs:
 *   Getting Started:  https://developer-dev.swift.com/getting-started-gpi-sandbox-api
 *   gpi Core APIs:    https://developer-dev.swift.com/apis/gpi-apis
 *   Postman:          https://www.postman.com/swift-developer-support/swift-api-sandbox-collections
 */

import type { AdapterConfig, AdapterHealth } from "../types.ts";
import { DEFAULT_RETRY_CONFIG, DEFAULT_CIRCUIT_BREAKER_CONFIG } from "../types.ts";
import type {
  WireTransferAdapter,
  WireOriginationRequest,
  WireTransferResult,
  WireStatusInquiry,
  WireFeeSchedule,
  WireLimits,
} from "./types.ts";

// =============================================================================
// SWIFT GPI ADAPTER
// =============================================================================

export class SwiftGpiAdapter implements WireTransferAdapter {
  readonly name = "swift";
  readonly config: AdapterConfig = {
    id: "swift-gpi",
    name: "SWIFT gpi Wire Transfer Adapter",
    retry: DEFAULT_RETRY_CONFIG,
    timeout: { requestTimeoutMs: 60000 }, // International wires can take longer
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  private get baseUrl(): string {
    return Deno.env.get("SWIFT_BASE_URL") ?? "https://sandbox.swift.com";
  }

  private get apiKey(): string {
    return Deno.env.get("SWIFT_API_KEY") ?? "";
  }

  private get consumerKey(): string {
    return Deno.env.get("SWIFT_CONSUMER_KEY") ?? "";
  }

  private get consumerSecret(): string {
    return Deno.env.get("SWIFT_CONSUMER_SECRET") ?? "";
  }

  private get originatorBic(): string {
    return Deno.env.get("SWIFT_BIC") ?? "";
  }

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      await this.ensureAuthenticated();
      return {
        adapterId: this.config.id,
        healthy: true,
        circuitState: "closed",
        lastCheckedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        adapterId: this.config.id,
        healthy: false,
        circuitState: "open",
        lastCheckedAt: new Date().toISOString(),
        errorMessage: err instanceof Error ? err.message : "Health check failed",
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ORIGINATE — gCCT (pacs.008)
  // ---------------------------------------------------------------------------

  async originate(req: WireOriginationRequest): Promise<WireTransferResult> {
    if (req.type !== "international") {
      throw new Error("SWIFT adapter only supports international wires. Use FedWire for domestic.");
    }
    if (!req.swiftBic) {
      throw new Error("SWIFT/BIC code is required for international wires");
    }

    await this.ensureAuthenticated();

    // Generate UETR (Universal End-to-End Transaction Reference)
    const uetr = crypto.randomUUID();

    const gpiPayload = this.buildGCCTPayload(req, uetr);

    const res = await this.request("POST", "/swift-gpi/v5/payments", gpiPayload);

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`SWIFT gpi origination failed (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    const acctMasked =
      req.beneficiaryAccountMasked ?? `****${req.beneficiaryAccountNumber.slice(-4)}`;

    return {
      wireId: data.paymentId ?? data.transaction_reference,
      referenceNumber: data.endToEndId ?? req.originatorReference ?? req.idempotencyKey,
      type: "international",
      status: data.transaction_status ?? "submitted",
      amountCents: req.amountCents,
      feeCents: data.feeCents ?? 4500,
      currency: req.currency ?? "USD",
      beneficiaryName: req.beneficiaryName,
      beneficiaryBankName: req.beneficiaryBankName,
      beneficiaryAccountMasked: acctMasked,
      isoMessageType: "pacs.008",
      uetr,
      estimatedCompletionDate: data.estimated_delivery ?? null,
      completedAt: data.completedAt ?? null,
      failureReason: data.failureReason ?? null,
      createdAt: data.initiation_time ?? new Date().toISOString(),
      updatedAt: data.last_update_time ?? new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // STATUS — gpi Tracker
  // ---------------------------------------------------------------------------

  async getStatus(wireId: string): Promise<WireStatusInquiry> {
    await this.ensureAuthenticated();

    // SWIFT gpi tracker uses UETR for tracking
    const res = await this.request("GET", `/swift-gpi/v5/payments/${wireId}/tracker`);

    if (!res.ok) {
      throw new Error(`SWIFT gpi tracker inquiry failed (${res.status})`);
    }

    const data = await res.json();

    // Map SWIFT gpi status codes to our status enum
    const statusMap: Record<string, WireTransferResult["status"]> = {
      ACCP: "processing", // Accepted
      ACSC: "completed", // Accepted Settlement Completed
      RJCT: "failed", // Rejected
      PDNG: "pending", // Pending
      ACSP: "processing", // Accepted Settlement in Process
    };

    const events = data.payment_event ?? [];

    return {
      wireId,
      uetr: data.uetr ?? wireId,
      status: statusMap[data.transaction_status] ?? "processing",
      statusHistory: events.map((evt: Record<string, unknown>) => ({
        status: statusMap[evt.transaction_status as string] ?? "processing",
        timestamp: (evt.update_time as string) ?? new Date().toISOString(),
        institution: (evt.from as string) ?? undefined,
        reason: (evt.reason as string) ?? undefined,
      })),
    };
  }

  // ---------------------------------------------------------------------------
  // CANCEL — Stop and Recall (SRP)
  // ---------------------------------------------------------------------------

  async cancel(wireId: string): Promise<{ success: boolean; reason?: string }> {
    await this.ensureAuthenticated();

    const res = await this.request("POST", `/swift-gpi/v5/payments/${wireId}/cancellation`, {
      cancellation_reason_information: "Requested by originator",
      case_identification: `CANCEL-${wireId.slice(0, 8)}`,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, reason: data.message ?? `Cancel failed (${res.status})` };
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // FEES & LIMITS
  // ---------------------------------------------------------------------------

  async getFees(_tenantId: string): Promise<WireFeeSchedule> {
    // SWIFT fees are typically configured per-institution, not via API
    return {
      domesticFeeCents: 0, // SWIFT is international only
      internationalFeeCents: 4500,
      expeditedDomesticFeeCents: 0,
      expeditedInternationalFeeCents: 6500,
    };
  }

  async getLimits(_tenantId: string): Promise<WireLimits> {
    // Limits are typically configured per-institution
    return {
      dailyLimitCents: 50000000, // $500,000
      perTransactionLimitCents: 25000000, // $250,000
      usedTodayCents: 0,
      remainingDailyCents: 50000000,
    };
  }

  // ---------------------------------------------------------------------------
  // gCCT (pacs.008) PAYLOAD BUILDER
  // ---------------------------------------------------------------------------

  private buildGCCTPayload(req: WireOriginationRequest, uetr: string): Record<string, unknown> {
    return {
      uetr,
      payment_identification: {
        end_to_end_identification: req.originatorReference ?? req.idempotencyKey,
        transaction_identification: req.idempotencyKey,
      },
      interbank_settlement_amount: {
        amount: (req.amountCents / 100).toFixed(2),
        currency: req.currency ?? "USD",
      },
      charge_bearer: "SHAR", // Shared charges (standard for gCCT)
      debtor: {
        name: req.memo ?? "Originator",
      },
      debtor_agent: {
        bicfi: this.originatorBic,
      },
      creditor: {
        name: req.beneficiaryName,
      },
      creditor_account: {
        iban: req.iban,
        other: req.iban ? undefined : { identification: req.beneficiaryAccountNumber },
      },
      creditor_agent: {
        bicfi: req.swiftBic,
        name: req.beneficiaryBankName,
      },
      purpose: {
        code: req.purpose,
      },
      remittance_information: req.memo ? { unstructured: [req.memo] } : undefined,
    };
  }

  // ---------------------------------------------------------------------------
  // OAUTH 2.0 AUTHENTICATION
  // ---------------------------------------------------------------------------

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) return;

    if (!this.consumerKey || !this.consumerSecret) {
      throw new Error("SWIFT_CONSUMER_KEY and SWIFT_CONSUMER_SECRET are required");
    }

    const tokenUrl = `${this.baseUrl}/oauth2/v1/token`;
    const credentials = btoa(`${this.consumerKey}:${this.consumerSecret}`);

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`SWIFT OAuth failed (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    this.accessToken = data.access_token;
    // Expire 60 seconds early to avoid edge cases
    this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
  }

  // ---------------------------------------------------------------------------
  // HTTP CLIENT
  // ---------------------------------------------------------------------------

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Response> {
    if (!this.accessToken) throw new Error("Not authenticated");

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "x-bic": this.originatorBic,
    };

    return fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
}
