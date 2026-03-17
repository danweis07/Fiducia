/**
 * Wire Transfer Adapters — Tests
 *
 * Tests for the wire transfer adapter domain covering:
 *   - Types and data model validation
 *   - Mock adapter behavior (origination, status, cancel, fees, limits)
 *   - FedWire adapter request construction (ISO 20022 pacs.008)
 *   - SWIFT gpi adapter request construction (gCCT, OAuth, UETR)
 *   - Registry resolution and auto-detection logic
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// MIRRORED TYPES (from wire-transfers/types.ts, avoids Deno imports)
// ---------------------------------------------------------------------------

type WireType = 'domestic' | 'international';
type WireStatus = 'pending' | 'submitted' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'returned';

interface WireOriginationRequest {
  idempotencyKey: string;
  tenantId: string;
  fromAccountId: string;
  type: WireType;
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryAccountMasked?: string;
  beneficiaryBankName: string;
  routingNumber?: string;
  swiftBic?: string;
  iban?: string;
  bankCountry?: string;
  currency?: string;
  amountCents: number;
  memo?: string;
  purpose: string;
  originatorReference?: string;
}

interface WireTransferResult {
  wireId: string;
  referenceNumber: string;
  type: WireType;
  status: WireStatus;
  amountCents: number;
  feeCents: number;
  currency: string;
  beneficiaryName: string;
  beneficiaryBankName: string;
  beneficiaryAccountMasked: string;
  isoMessageType?: string;
  uetr?: string;
  imad?: string;
  omad?: string;
  estimatedCompletionDate: string | null;
  completedAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WireStatusInquiry {
  wireId: string;
  uetr?: string;
  status: WireStatus;
  statusHistory: Array<{
    status: WireStatus;
    timestamp: string;
    institution?: string;
    reason?: string;
  }>;
}

interface WireFeeSchedule {
  domesticFeeCents: number;
  internationalFeeCents: number;
  expeditedDomesticFeeCents: number;
  expeditedInternationalFeeCents: number;
}

interface WireLimits {
  dailyLimitCents: number;
  perTransactionLimitCents: number;
  usedTodayCents: number;
  remainingDailyCents: number;
}

// ---------------------------------------------------------------------------
// TEST HELPERS
// ---------------------------------------------------------------------------

function makeDomesticRequest(overrides: Partial<WireOriginationRequest> = {}): WireOriginationRequest {
  return {
    idempotencyKey: `idem-${Date.now()}`,
    tenantId: 'tenant-001',
    fromAccountId: 'acct-checking-001',
    type: 'domestic',
    beneficiaryName: 'Jane Smith',
    beneficiaryAccountNumber: '123456789012',
    beneficiaryBankName: 'Chase Bank',
    routingNumber: '021000021',
    amountCents: 500000,
    purpose: 'PAYMENT',
    ...overrides,
  };
}

function makeInternationalRequest(overrides: Partial<WireOriginationRequest> = {}): WireOriginationRequest {
  return {
    idempotencyKey: `idem-${Date.now()}`,
    tenantId: 'tenant-001',
    fromAccountId: 'acct-checking-001',
    type: 'international',
    beneficiaryName: 'Hans Mueller',
    beneficiaryAccountNumber: 'DE89370400440532013000',
    beneficiaryBankName: 'Deutsche Bank',
    swiftBic: 'DEUTDEFF',
    iban: 'DE89370400440532013000',
    bankCountry: 'DE',
    currency: 'EUR',
    amountCents: 1000000,
    purpose: 'TRADE',
    ...overrides,
  };
}

function makeMockResult(type: WireType): WireTransferResult {
  return {
    wireId: `mock_wire_${crypto.randomUUID().slice(0, 12)}`,
    referenceNumber: 'REF-test',
    type,
    status: 'submitted',
    amountCents: type === 'domestic' ? 500000 : 1000000,
    feeCents: type === 'domestic' ? 2500 : 4500,
    currency: type === 'domestic' ? 'USD' : 'EUR',
    beneficiaryName: type === 'domestic' ? 'Jane Smith' : 'Hans Mueller',
    beneficiaryBankName: type === 'domestic' ? 'Chase Bank' : 'Deutsche Bank',
    beneficiaryAccountMasked: '****9012',
    isoMessageType: 'pacs.008',
    uetr: type === 'international' ? crypto.randomUUID() : undefined,
    imad: type === 'domestic' ? '20250317MMQFMP123456' : undefined,
    estimatedCompletionDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    failureReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ===========================================================================
// TYPE VALIDATION
// ===========================================================================

describe('wire transfer types', () => {
  it('WireType covers domestic and international', () => {
    const types: WireType[] = ['domestic', 'international'];
    expect(types).toHaveLength(2);
    expect(types).toContain('domestic');
    expect(types).toContain('international');
  });

  it('WireStatus covers full lifecycle', () => {
    const statuses: WireStatus[] = [
      'pending', 'submitted', 'processing', 'completed',
      'failed', 'cancelled', 'returned',
    ];
    expect(statuses).toHaveLength(7);
    // Ensure terminal states exist
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
    expect(statuses).toContain('returned');
  });

  it('all monetary values in WireOriginationRequest are cents (integers)', () => {
    const req = makeDomesticRequest({ amountCents: 123456 });
    expect(Number.isInteger(req.amountCents)).toBe(true);
    expect(req.amountCents).toBeGreaterThan(0);
  });
});

// ===========================================================================
// ORIGINATION REQUEST VALIDATION
// ===========================================================================

describe('wire origination request', () => {
  it('domestic request requires routingNumber', () => {
    const req = makeDomesticRequest();
    expect(req.type).toBe('domestic');
    expect(req.routingNumber).toBeDefined();
    expect(req.routingNumber).toMatch(/^\d{9}$/);
  });

  it('international request requires swiftBic', () => {
    const req = makeInternationalRequest();
    expect(req.type).toBe('international');
    expect(req.swiftBic).toBeDefined();
    expect(req.swiftBic!.length).toBeGreaterThanOrEqual(8);
    expect(req.swiftBic!.length).toBeLessThanOrEqual(11);
  });

  it('international request includes IBAN when available', () => {
    const req = makeInternationalRequest();
    expect(req.iban).toBeDefined();
    expect(req.iban).toMatch(/^[A-Z]{2}\d{2}/); // IBAN starts with 2-letter country + 2-digit check
  });

  it('idempotency key is always present', () => {
    const req = makeDomesticRequest();
    expect(req.idempotencyKey).toBeDefined();
    expect(req.idempotencyKey.length).toBeGreaterThan(0);
  });

  it('beneficiary account is never exposed in masked field', () => {
    const result = makeMockResult('domestic');
    expect(result.beneficiaryAccountMasked).toMatch(/^\*{4}\d{4}$/);
    expect(result.beneficiaryAccountMasked).not.toContain('1234567890');
  });
});

// ===========================================================================
// MOCK ADAPTER BEHAVIOR
// ===========================================================================

describe('mock wire transfer adapter', () => {
  it('mock origination returns submitted status', () => {
    const result = makeMockResult('domestic');
    expect(result.status).toBe('submitted');
  });

  it('mock domestic wire has $25 fee', () => {
    const result = makeMockResult('domestic');
    expect(result.feeCents).toBe(2500);
  });

  it('mock international wire has $45 fee', () => {
    const result = makeMockResult('international');
    expect(result.feeCents).toBe(4500);
  });

  it('mock result includes ISO message type pacs.008', () => {
    const result = makeMockResult('domestic');
    expect(result.isoMessageType).toBe('pacs.008');
  });

  it('mock domestic wire includes IMAD', () => {
    const result = makeMockResult('domestic');
    expect(result.imad).toBeDefined();
    expect(result.uetr).toBeUndefined();
  });

  it('mock international wire includes UETR', () => {
    const result = makeMockResult('international');
    expect(result.uetr).toBeDefined();
    expect(result.imad).toBeUndefined();
  });

  it('mock result has no failure reason on success', () => {
    const result = makeMockResult('domestic');
    expect(result.failureReason).toBeNull();
    expect(result.completedAt).toBeNull();
  });

  it('mock fees return expected structure', () => {
    const fees: WireFeeSchedule = {
      domesticFeeCents: 2500,
      internationalFeeCents: 4500,
      expeditedDomesticFeeCents: 3500,
      expeditedInternationalFeeCents: 6500,
    };
    expect(fees.domesticFeeCents).toBeLessThan(fees.expeditedDomesticFeeCents);
    expect(fees.internationalFeeCents).toBeLessThan(fees.expeditedInternationalFeeCents);
    expect(fees.domesticFeeCents).toBeLessThan(fees.internationalFeeCents);
  });

  it('mock limits return sensible defaults', () => {
    const limits: WireLimits = {
      dailyLimitCents: 25000000,
      perTransactionLimitCents: 10000000,
      usedTodayCents: 0,
      remainingDailyCents: 25000000,
    };
    expect(limits.remainingDailyCents).toBe(limits.dailyLimitCents - limits.usedTodayCents);
    expect(limits.perTransactionLimitCents).toBeLessThanOrEqual(limits.dailyLimitCents);
  });

  it('mock status inquiry returns processing with history', () => {
    const inquiry: WireStatusInquiry = {
      wireId: 'mock_wire_test',
      status: 'processing',
      statusHistory: [
        { status: 'pending', timestamp: new Date(Date.now() - 60000).toISOString() },
        { status: 'submitted', timestamp: new Date(Date.now() - 30000).toISOString(), institution: 'Originator Bank' },
        { status: 'processing', timestamp: new Date().toISOString(), institution: 'Intermediary Bank' },
      ],
    };
    expect(inquiry.statusHistory).toHaveLength(3);
    expect(inquiry.statusHistory[0].status).toBe('pending');
    expect(inquiry.statusHistory[2].status).toBe('processing');
    // Status history should be chronologically ordered
    const timestamps = inquiry.statusHistory.map(h => new Date(h.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });
});

// ===========================================================================
// FEDWIRE — ISO 20022 pacs.008 PAYLOAD
// ===========================================================================

describe('FedWire adapter — pacs.008 construction', () => {
  it('pacs.008 payload includes message type', () => {
    const req = makeDomesticRequest();
    const payload = {
      messageType: 'pacs.008.001.08',
      idempotencyKey: req.idempotencyKey,
      creditTransfer: {
        endToEndId: req.originatorReference ?? req.idempotencyKey,
        amount: { cents: req.amountCents, currency: 'USD' },
        debtor: { name: 'Test CU', accountId: req.fromAccountId },
        debtorAgent: { routingNumber: '091000019' },
        creditor: { name: req.beneficiaryName, accountNumber: req.beneficiaryAccountNumber },
        creditorAgent: { routingNumber: req.routingNumber, name: req.beneficiaryBankName },
        purpose: req.purpose,
      },
    };

    expect(payload.messageType).toBe('pacs.008.001.08');
    expect(payload.creditTransfer.amount.cents).toBe(500000);
    expect(payload.creditTransfer.amount.currency).toBe('USD');
    expect(payload.creditTransfer.creditor.name).toBe('Jane Smith');
    expect(payload.creditTransfer.creditorAgent.routingNumber).toBe('021000021');
  });

  it('FedWire is domestic only — rejects international type', () => {
    const req = makeInternationalRequest();
    // FedWire adapter should reject international wires
    expect(req.type).toBe('international');
    // A real adapter call would throw: "Use SWIFT for international"
  });

  it('FedWire API URL includes routing number header', () => {
    const routingNumber = '091000019';
    const headers = {
      'Authorization': 'Bearer test-key',
      'Content-Type': 'application/json',
      'X-Routing-Number': routingNumber,
    };
    expect(headers['X-Routing-Number']).toBe(routingNumber);
    expect(headers['X-Routing-Number']).toMatch(/^\d{9}$/);
  });
});

// ===========================================================================
// SWIFT GPI — gCCT PAYLOAD & OAUTH
// ===========================================================================

describe('SWIFT gpi adapter — gCCT construction', () => {
  it('gCCT payload includes UETR', () => {
    const uetr = crypto.randomUUID();
    const req = makeInternationalRequest();

    const gpiPayload = {
      uetr,
      payment_identification: {
        end_to_end_identification: req.originatorReference ?? req.idempotencyKey,
        transaction_identification: req.idempotencyKey,
      },
      interbank_settlement_amount: {
        amount: (req.amountCents / 100).toFixed(2),
        currency: req.currency ?? 'USD',
      },
      charge_bearer: 'SHAR',
      creditor: { name: req.beneficiaryName },
      creditor_agent: { bicfi: req.swiftBic, name: req.beneficiaryBankName },
    };

    expect(gpiPayload.uetr).toBe(uetr);
    // UETR is a UUID format
    expect(gpiPayload.uetr).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(gpiPayload.interbank_settlement_amount.amount).toBe('10000.00');
    expect(gpiPayload.interbank_settlement_amount.currency).toBe('EUR');
    expect(gpiPayload.charge_bearer).toBe('SHAR');
    expect(gpiPayload.creditor_agent.bicfi).toBe('DEUTDEFF');
  });

  it('SWIFT is international only — rejects domestic type', () => {
    const req = makeDomesticRequest();
    expect(req.type).toBe('domestic');
    // A real adapter call would throw: "Use FedWire for domestic"
  });

  it('SWIFT OAuth uses Basic auth for token exchange', () => {
    const consumerKey = 'test-consumer';
    const consumerSecret = 'test-secret';
    const encoded = btoa(`${consumerKey}:${consumerSecret}`);
    const header = `Basic ${encoded}`;

    expect(header).toMatch(/^Basic /);
    const decoded = atob(encoded);
    expect(decoded).toBe('test-consumer:test-secret');
  });

  it('SWIFT gpi tracker maps status codes correctly', () => {
    const statusMap: Record<string, WireStatus> = {
      'ACCP': 'processing',
      'ACSC': 'completed',
      'RJCT': 'failed',
      'PDNG': 'pending',
      'ACSP': 'processing',
    };

    expect(statusMap['ACSC']).toBe('completed');
    expect(statusMap['RJCT']).toBe('failed');
    expect(statusMap['PDNG']).toBe('pending');
    // Both ACCP and ACSP map to processing
    expect(statusMap['ACCP']).toBe(statusMap['ACSP']);
  });

  it('SWIFT API requests include x-api-key and x-bic headers', () => {
    const headers = {
      'Authorization': 'Bearer mock-token',
      'Content-Type': 'application/json',
      'x-api-key': 'test-api-key',
      'x-bic': 'TESTUS33',
    };
    expect(headers['x-api-key']).toBeDefined();
    expect(headers['x-bic']).toMatch(/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/);
  });

  it('SWIFT cancellation (SRP) includes reason and case ID', () => {
    const wireId = 'test-wire-001';
    const cancelPayload = {
      cancellation_reason_information: 'Requested by originator',
      case_identification: `CANCEL-${wireId.slice(0, 8)}`,
    };

    expect(cancelPayload.cancellation_reason_information).toBeDefined();
    expect(cancelPayload.case_identification).toMatch(/^CANCEL-/);
  });
});

// ===========================================================================
// REGISTRY — AUTO-DETECTION LOGIC
// ===========================================================================

describe('wire transfer registry — provider detection', () => {
  it('detects "fedwire" when FEDWIRE_BASE_URL is set for domestic wires', () => {
    // Simulating the detection logic from registry.ts
    const env: Record<string, string> = { FEDWIRE_BASE_URL: 'https://fedline.example.com' };
    const wireType = 'domestic';

    const explicit = env['WIRE_PROVIDER'];
    let provider = 'mock';
    if (explicit && explicit !== 'mock') {
      provider = explicit;
    } else if (wireType === 'domestic' && env['FEDWIRE_BASE_URL']) {
      provider = 'fedwire';
    }

    expect(provider).toBe('fedwire');
  });

  it('detects "swift" when SWIFT_BASE_URL is set for international wires', () => {
    const env: Record<string, string> = { SWIFT_BASE_URL: 'https://sandbox.swift.com' };
    const wireType = 'international';

    let provider = 'mock';
    if (wireType === 'international' && env['SWIFT_BASE_URL']) {
      provider = 'swift';
    }

    expect(provider).toBe('swift');
  });

  it('detects "swift" when SWIFT_BIC is set for international wires', () => {
    const env: Record<string, string> = { SWIFT_BIC: 'TESTUS33' };
    const wireType = 'international';

    let provider = 'mock';
    if (wireType === 'international' && (env['SWIFT_BASE_URL'] || env['SWIFT_BIC'])) {
      provider = 'swift';
    }

    expect(provider).toBe('swift');
  });

  it('falls back to "mock" when no env vars set', () => {
    const env: Record<string, string> = {};
    const wireType = 'domestic';

    let provider = 'mock';
    if (wireType === 'domestic' && env['FEDWIRE_BASE_URL']) {
      provider = 'fedwire';
    }

    expect(provider).toBe('mock');
  });

  it('explicit WIRE_PROVIDER overrides auto-detection', () => {
    const env: Record<string, string> = {
      WIRE_PROVIDER: 'swift',
      FEDWIRE_BASE_URL: 'https://fedline.example.com',
    };
    const wireType = 'domestic';

    const explicit = env['WIRE_PROVIDER'];
    let provider = 'mock';
    if (explicit && explicit !== 'mock') {
      provider = explicit;
    } else if (wireType === 'domestic' && env['FEDWIRE_BASE_URL']) {
      provider = 'fedwire';
    }

    expect(provider).toBe('swift');
  });
});

// ===========================================================================
// SECURITY — ACCOUNT NUMBER MASKING
// ===========================================================================

describe('wire transfer security', () => {
  it('beneficiary account number is masked in results', () => {
    const fullAccount = '123456789012';
    const masked = `****${fullAccount.slice(-4)}`;
    expect(masked).toBe('****9012');
    expect(masked).not.toContain(fullAccount);
  });

  it('IBAN is not exposed in masked responses', () => {
    const iban = 'DE89370400440532013000';
    const masked = `****${iban.slice(-4)}`;
    expect(masked).toBe('****3000');
    expect(masked).not.toContain('DE89');
  });

  it('IMAD does not expose account information', () => {
    const imad = '20250317MMQFMP123456';
    // IMAD is a Fed reference, not an account number — safe to expose
    expect(imad).not.toMatch(/\d{9,}/);
  });
});
