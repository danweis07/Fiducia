/**
 * FedWire Wire Transfer Adapter
 *
 * Integrates with the Federal Reserve's Fedwire Funds Service for domestic
 * same-day wire transfers via the FedLine Developer API.
 *
 * As of July 2025, Fedwire uses ISO 20022 message format (pacs.008 for
 * Customer Credit Transfers). This adapter produces ISO 20022-aligned
 * payloads and tracks wires via IMAD/OMAD references.
 *
 * Access:
 *   FedWire is not a public API — access requires FedLine Solutions
 *   connectivity through an authorized financial institution.
 *   See: https://www.frbservices.org/fedline-solutions/fedline-developer
 *
 * Required env vars:
 *   FEDWIRE_BASE_URL         — FedLine API endpoint
 *   FEDWIRE_API_KEY          — FedLine API key
 *   FEDWIRE_CLIENT_CERT      — mTLS client certificate (base64-encoded PEM)
 *   FEDWIRE_CLIENT_KEY       — mTLS client private key (base64-encoded PEM)
 *   FEDWIRE_ROUTING_NUMBER   — Originator's ABA routing number
 *   FEDWIRE_INSTITUTION_NAME — Originator institution name
 *
 * Docs:
 *   Fedwire Funds Service:   https://www.frbservices.org/financial-services/wires
 *   FedLine Developer:       https://www.frbservices.org/fedline-solutions/fedline-developer
 *   ISO 20022 Tech Guide:    https://www.frbservices.org/resources/financial-services/wires/faq/iso-20022/format-technical-documentation-mystandards
 *   Moov.io Fed (OSS tools): https://github.com/moov-io/fed
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
// FEDWIRE ADAPTER
// =============================================================================

export class FedWireAdapter implements WireTransferAdapter {
  readonly name = "fedwire";
  readonly config: AdapterConfig = {
    id: "fedwire",
    name: "FedWire Funds Service Adapter",
    retry: { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 }, // Lower retries — wires are idempotent via IMAD
    timeout: { requestTimeoutMs: 45000 }, // FedWire can be slow during peak
    circuitBreaker: DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };

  private get baseUrl(): string {
    return Deno.env.get("FEDWIRE_BASE_URL") ?? "";
  }

  private get apiKey(): string {
    return Deno.env.get("FEDWIRE_API_KEY") ?? "";
  }

  private get routingNumber(): string {
    return Deno.env.get("FEDWIRE_ROUTING_NUMBER") ?? "";
  }

  private get institutionName(): string {
    return Deno.env.get("FEDWIRE_INSTITUTION_NAME") ?? "";
  }

  // ---------------------------------------------------------------------------
  // HEALTH CHECK
  // ---------------------------------------------------------------------------

  async healthCheck(): Promise<AdapterHealth> {
    try {
      const res = await this.request("GET", "/health");
      return {
        adapterId: this.config.id,
        healthy: res.ok,
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
  // ORIGINATE
  // ---------------------------------------------------------------------------

  async originate(req: WireOriginationRequest): Promise<WireTransferResult> {
    if (req.type !== "domestic") {
      throw new Error("FedWire adapter only supports domestic wires. Use SWIFT for international.");
    }
    if (!req.routingNumber) {
      throw new Error("ABA routing number is required for FedWire domestic wires");
    }

    // Build ISO 20022 pacs.008 payload
    const isoPayload = this.buildPacs008(req);

    const res = await this.request("POST", "/wire/originate", isoPayload);

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`FedWire origination failed (${res.status}): ${errorBody}`);
    }

    const data = await res.json();
    const acctMasked =
      req.beneficiaryAccountMasked ?? `****${req.beneficiaryAccountNumber.slice(-4)}`;

    return {
      wireId: data.wireId ?? data.id,
      referenceNumber: data.referenceNumber ?? data.endToEndId,
      type: "domestic",
      status: data.status ?? "submitted",
      amountCents: req.amountCents,
      feeCents: data.feeCents ?? 2500,
      currency: "USD",
      beneficiaryName: req.beneficiaryName,
      beneficiaryBankName: req.beneficiaryBankName,
      beneficiaryAccountMasked: acctMasked,
      isoMessageType: "pacs.008",
      imad: data.imad ?? null,
      omad: data.omad ?? null,
      estimatedCompletionDate: data.estimatedCompletionDate ?? null,
      completedAt: data.completedAt ?? null,
      failureReason: data.failureReason ?? null,
      createdAt: data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------------

  async getStatus(wireId: string): Promise<WireStatusInquiry> {
    const res = await this.request("GET", `/wire/${wireId}/status`);

    if (!res.ok) {
      throw new Error(`FedWire status inquiry failed (${res.status})`);
    }

    const data = await res.json();

    return {
      wireId,
      status: data.status,
      imad: data.imad,
      statusHistory: data.statusHistory ?? [
        { status: data.status, timestamp: data.updatedAt ?? new Date().toISOString() },
      ],
    };
  }

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  async cancel(wireId: string): Promise<{ success: boolean; reason?: string }> {
    const res = await this.request("POST", `/wire/${wireId}/cancel`);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, reason: data.message ?? `Cancel failed (${res.status})` };
    }

    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // FEES & LIMITS
  // ---------------------------------------------------------------------------

  async getFees(tenantId: string): Promise<WireFeeSchedule> {
    const res = await this.request("GET", `/fees?tenantId=${tenantId}`);

    if (!res.ok) {
      // Fall back to default CU wire fees
      return {
        domesticFeeCents: 2500,
        internationalFeeCents: 0, // FedWire is domestic only
        expeditedDomesticFeeCents: 3500,
        expeditedInternationalFeeCents: 0,
      };
    }

    return await res.json();
  }

  async getLimits(tenantId: string): Promise<WireLimits> {
    const res = await this.request("GET", `/limits?tenantId=${tenantId}`);

    if (!res.ok) {
      return {
        dailyLimitCents: 25000000,
        perTransactionLimitCents: 10000000,
        usedTodayCents: 0,
        remainingDailyCents: 25000000,
      };
    }

    return await res.json();
  }

  // ---------------------------------------------------------------------------
  // ISO 20022 pacs.008 BUILDER
  // ---------------------------------------------------------------------------

  /**
   * Build a simplified ISO 20022 pacs.008 (FIToFICustomerCreditTransfer)
   * payload for FedWire origination.
   *
   * The full pacs.008 XML envelope is typically assembled by the FedLine
   * gateway — we send the structured data fields.
   */
  private buildPacs008(req: WireOriginationRequest): Record<string, unknown> {
    return {
      messageType: "pacs.008.001.08",
      idempotencyKey: req.idempotencyKey,
      creditTransfer: {
        endToEndId: req.originatorReference ?? req.idempotencyKey,
        amount: {
          cents: req.amountCents,
          currency: "USD",
        },
        debtor: {
          name: this.institutionName,
          accountId: req.fromAccountId,
        },
        debtorAgent: {
          routingNumber: this.routingNumber,
        },
        creditor: {
          name: req.beneficiaryName,
          accountNumber: req.beneficiaryAccountNumber,
        },
        creditorAgent: {
          routingNumber: req.routingNumber,
          name: req.beneficiaryBankName,
        },
        purpose: req.purpose,
        remittanceInfo: req.memo ?? undefined,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // HTTP CLIENT
  // ---------------------------------------------------------------------------

  private async request(
    method: string,
    path: string,
    body?: Record<string, unknown>,
  ): Promise<Response> {
    if (!this.baseUrl) throw new Error("FEDWIRE_BASE_URL is not configured");
    if (!this.apiKey) throw new Error("FEDWIRE_API_KEY is not configured");

    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "X-Routing-Number": this.routingNumber,
    };

    return fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
}
